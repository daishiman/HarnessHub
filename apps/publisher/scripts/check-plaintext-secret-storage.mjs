#!/usr/bin/env node
// token/secret の非平文保存の恒久検査 (P09 / docs/security-spec-authentication.md §2.2)。
//
// Publisher CLI の token 永続化は OS 資格情報域 (macOS Keychain / Windows Credential Manager) を
// 子プロセス経由 (`security` CLI / PowerShell PasswordVault) で叩く経路 1 本に閉じている
// (apps/publisher/src/auth/credential-store.ts)。access token は 15 分で失効する短命値のため
// そもそも保存しない (packages/schemas/publisher-plugin/credential-record.ts)。
// 本検査はこの設計が将来の変更で崩れていないかを 4 観点で機械的に確認する:
//   1. (fs-write-absence)     本番コードが Node fs 経由でファイルへ書き込んでいない
//                             (書き込みが要るなら OS 資格情報域を通すべきで、fs 直書きの
//                             出現自体が「平文ファイル保存」の兆候になる)
//   2. (env-credential-absence) token/secret 相当の環境変数を読み書きしていない
//   3. (secret-file-absence)  .env 等の平文 secret ファイルが commit されていない
//   4. (log-leak-absence)     token を保持する識別子を log/console 呼び出しへ直接渡していない
//
// いずれも「識別子・API 名の出現」で決定的に判定できる (実行環境や OS に依存しない)。
//
// 使い方:
//   node apps/publisher/scripts/check-plaintext-secret-storage.mjs
//   node apps/publisher/scripts/check-plaintext-secret-storage.mjs --json <path>

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLISHER_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(PUBLISHER_ROOT, '..', '..');

const SOURCE_EXT = ['.ts', '.tsx', '.mts'];
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', 'coverage', '.git'];
/** テストコードは fake token を大量に扱う (e2e-fixture.ts 等) ため本番コードのみを対象にする。 */
const TEST_MARKERS = ['__tests__', '.test.ts'];

const TOKEN_IDENTIFIER = /\b(?:access_token|accessToken|refresh_token|refreshToken|device_code|deviceCode)\b/;

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (SOURCE_EXT.some((ext) => entry.endsWith(ext))) acc.push(full);
  }
  return acc;
}

function isProductionSource(file) {
  return !TEST_MARKERS.some((marker) => file.includes(marker));
}

function checkFsWriteAbsence(files) {
  const pattern = /\b(?:writeFileSync|appendFileSync|createWriteStream)\s*\(|\bfs\.writeFile\s*\(/g;
  const findings = [];
  for (const file of files) {
    const rel = relative(REPO_ROOT, file).split('\\').join('/');
    const source = readFileSync(file, 'utf8');
    pattern.lastIndex = 0;
    for (const m of source.matchAll(pattern)) {
      findings.push({
        kind: 'fs-write-absence',
        file: rel,
        line: source.slice(0, m.index).split('\n').length,
        detail:
          'Node fs へのファイル書き込みが本番コードに存在する。token 永続化は OS 資格情報域 (credential-store.ts) のみを経由すること',
      });
    }
  }
  return findings;
}

function checkEnvCredentialAbsence(files) {
  const pattern = /process\.env\.[A-Za-z_]*(?:TOKEN|SECRET|CREDENTIAL|PASSWORD)[A-Za-z_]*/gi;
  const findings = [];
  for (const file of files) {
    const rel = relative(REPO_ROOT, file).split('\\').join('/');
    const source = readFileSync(file, 'utf8');
    pattern.lastIndex = 0;
    for (const m of source.matchAll(pattern)) {
      findings.push({
        kind: 'env-credential-absence',
        file: rel,
        line: source.slice(0, m.index).split('\n').length,
        token: m[0],
        detail: '環境変数を token/secret の保存先として参照している (OS 資格情報域のみを使うこと)',
      });
    }
  }
  return findings;
}

function checkLogLeakAbsence(files) {
  const findings = [];
  for (const file of files) {
    const rel = relative(REPO_ROOT, file).split('\\').join('/');
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const hasLogCall = /\bconsole\.(?:log|error|warn|info)\s*\(|(?:^|[^.\w])log\s*\(/.test(line);
      if (hasLogCall && TOKEN_IDENTIFIER.test(line)) {
        findings.push({
          kind: 'log-leak-absence',
          file: rel,
          line: index + 1,
          detail: 'log/console 呼び出しの引数に token 相当の識別子が渡っている',
        });
      }
    });
  }
  return findings;
}

/** リポジトリに commit された平文 secret ファイルの不在を確認する (Git 管理外の node_modules 等は除外済み)。 */
function checkSecretFileAbsence() {
  const forbiddenNames = /^\.env(?:\..+)?$|^credentials\.json$/;
  const forbiddenExt = ['.pem', '.key'];
  const findings = [];

  function scan(dir) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      if (EXCLUDE_DIRS.includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        scan(full);
        continue;
      }
      if (forbiddenNames.test(entry) || forbiddenExt.some((ext) => entry.endsWith(ext))) {
        findings.push({
          kind: 'secret-file-absence',
          file: relative(REPO_ROOT, full).split('\\').join('/'),
          line: 0,
          detail: '平文 secret ファイルらしき名前のファイルが commit されている',
        });
      }
    }
  }

  scan(PUBLISHER_ROOT);
  return findings;
}

function main() {
  const jsonIndex = process.argv.indexOf('--json');
  const jsonPath = jsonIndex > -1 ? resolve(process.argv[jsonIndex + 1]) : null;

  const allFiles = walk(join(PUBLISHER_ROOT, 'src'));
  const productionFiles = allFiles.filter(isProductionSource);

  const findings = [
    ...checkFsWriteAbsence(productionFiles),
    ...checkEnvCredentialAbsence(productionFiles),
    ...checkLogLeakAbsence(productionFiles),
    ...checkSecretFileAbsence(),
  ];

  const result = {
    check: 'plaintext-secret-storage-absence',
    scanned_production_files: productionFiles.length,
    dimensions: ['fs-write-absence', 'env-credential-absence', 'log-leak-absence', 'secret-file-absence'],
    violation_count: findings.length,
    findings,
  };

  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (findings.length === 0) {
    console.log(
      `[plaintext-secret-storage-absence] OK: 走査 ${productionFiles.length} 本番ファイル / 4 観点 / 違反 0 件`,
    );
    process.exit(0);
  }
  console.error(`[plaintext-secret-storage-absence] NG: 違反 ${findings.length} 件`);
  for (const f of findings) console.error(`  - [${f.kind}] ${f.file}:${f.line}: ${f.detail}`);
  console.error(
    '  token/secret は apps/publisher/src/auth/credential-store.ts (OS 資格情報域) 経由でのみ扱ってください。',
  );
  process.exit(1);
}

main();
