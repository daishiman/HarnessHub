// G6 secret scan ゲート。qa-038【2】が「publish pipeline と同一の検査ロジック共有 package を CI からも呼ぶ」と
// 確定しているため、CI はこの package の実装を経由して秘密情報を検査する (= CI が実在する第 2 consumer)。
// 検出 0 件で pass、1 件以上で fail (fail-closed)。
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { defineSecretScanRule } from './rules';
import { runInspection } from './pipeline';
import type { InspectionFile, InspectionRule, InspectionTarget } from './types';

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');

/**
 * 走査範囲は Hub monorepo に限定する。
 * リポジトリには plugin の vendor 資産やドキュメントのサンプル値が同居しており、
 * それらまで対象にすると誤検出でゲートが常時赤になり、いずれ無効化される。
 */
const SCAN_DIRS = ['apps', 'packages', 'scripts', '.github'];
const EXCLUDE_DIRS = ['node_modules', '.next', '.open-next', 'dist', 'build', 'coverage', '.git', 'artifacts'];
const SCAN_EXT = ['.ts', '.tsx', '.mts', '.js', '.mjs', '.jsx', '.json', '.yml', '.yaml', '.jsonc'];

/** 本ファイル自身は検出パターン文字列を含むため走査対象から外す (自己検出の回避)。 */
const SELF = path.relative(REPO_ROOT, fileURLToPath(import.meta.url));

/** 検査ルール。実装は defineSecretScanRule (公開 API) を使い、CLI 用の別実装を作らない。 */
const SECRET_RULES: readonly InspectionRule[] = [
  defineSecretScanRule({
    id: 'secret-scan/private-key-block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  }),
  defineSecretScanRule({
    id: 'secret-scan/aws-access-key-id',
    // AWS 公式ドキュメントの例示キー (AKIAIOSFODNN7EXAMPLE) は除外する。
    // 検査 pipeline の contract test が fixture として使用しており、実秘密ではないため。
    // 除外はこの 1 値に限定する (「test 配下は全部除外」にすると本物の混入を見逃す)。
    pattern: /\bAKIA(?!IOSFODNN7EXAMPLE\b)[0-9A-Z]{16}\b/,
  }),
  defineSecretScanRule({
    id: 'secret-scan/github-token',
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  }),
  defineSecretScanRule({
    id: 'secret-scan/cloudflare-api-token',
    // Cloudflare API token は 40 文字の base62。代入形の文脈があるものだけを対象にする
    pattern: /CLOUDFLARE_API_TOKEN\s*[:=]\s*["'][A-Za-z0-9_-]{30,}["']/,
  }),
  defineSecretScanRule({
    id: 'secret-scan/generic-assigned-secret',
    // secret/token/password への literal 代入。${...} や env 参照は対象外
    pattern: /\b(?:api[_-]?key|secret|password|auth[_-]?token)\s*[:=]\s*["'](?!\$\{)(?!process\.env)[A-Za-z0-9/+=_-]{24,}["']/i,
  }),
];

function collectFiles(dir: string, acc: InspectionFile[]): InspectionFile[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (EXCLUDE_DIRS.includes(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
      continue;
    }
    if (!SCAN_EXT.some((ext) => entry.endsWith(ext))) continue;
    const relPath = path.relative(REPO_ROOT, full);
    if (relPath === SELF) continue;
    acc.push({ path: relPath, content: readFileSync(full, 'utf8') });
  }
  return acc;
}

function buildTarget(files: readonly InspectionFile[]): InspectionTarget {
  return { files, metadata: { scope: 'hub-monorepo' } };
}

describe('G6 secret scan: Hub monorepo に秘密情報が混入していない', () => {
  const files = SCAN_DIRS.reduce<InspectionFile[]>((acc, dir) => collectFiles(path.join(REPO_ROOT, dir), acc), []);
  const result = runInspection(SECRET_RULES, buildTarget(files));

  it('走査が空振りしていない', () => {
    // 0 ファイルでも「検出 0 件」になるため、空振りによる偽の緑を排除する
    expect(files.length).toBeGreaterThan(50);
  });

  it('検出 0 件である', () => {
    const detected = result.findings.map((f) => `${f.location?.path}:${f.location?.line} ${f.message}`);
    expect(detected).toEqual([]);
    expect(result.verdict).toBe('pass');
  });
});

// ゲートの実効性検証。これが無いと「常に検出 0 件」と報告するだけの空ゲートになる
describe('G6 secret scan: 実効性 (意図的な秘密情報を検出できる)', () => {
  it.each([
    ['private key', '-----BEGIN RSA PRIVATE KEY-----'],
    ['AWS access key id', 'const id = "AKIA1234567890ABCDEF";'],
    ['GitHub token', 'token: ghp_0123456789abcdefghijklmnopqrstuvwxyz'],
    ['assigned api key', 'const apiKey = "abcdefghijklmnopqrstuvwxyz012345";'],
  ])('%s を検出する', (_label, content) => {
    const result = runInspection(SECRET_RULES, buildTarget([{ path: 'fixture.ts', content }]));
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.verdict).toBe('fail');
  });

  it('環境変数参照は検出しない (誤検出でゲートを無効化させないため)', () => {
    const content = 'const token = process.env.CLOUDFLARE_API_TOKEN;\nconst k = `${secretRef}`;';
    const result = runInspection(SECRET_RULES, buildTarget([{ path: 'fixture.ts', content }]));
    expect(result.findings).toEqual([]);
  });

  it('検出値はマスクされて出力される (証跡に平文を残さない)', () => {
    const result = runInspection(SECRET_RULES, buildTarget([
      { path: 'fixture.ts', content: 'const id = "AKIA1234567890ABCDEF";' },
    ]));
    expect(result.findings[0]?.message).not.toContain('AKIA1234567890ABCDEF');
  });
});
