#!/usr/bin/env node
// 公開検査ゲートの静的検査 (feat-publish-pipeline P09 / qa-006 / I2 /
// quality_constraint green-auto-publish-yellow-red-needs-fix-i2)。
//
// I2 は公開時検査を「static validation・secret scan・policy 判定」の 3 本立てと定めている。
// この検査を書くきっかけは実際の欠落である: Hub の検査入口は当初
// `createPackageInspectionRules()` (= 構造ルールのみ) を pipeline へ渡しており、
// **secret scan が 1 度も走っていなかった**。142 件のユニットテストは全て緑だった。
// ルール個別のテストは「書いた振る舞い」を守るが、「書き忘れた合成」は守らないからである。
//
// 振る舞いのテスト (packages/inspection/src/publish-inspection.test.ts) は
// 「合成された束が 3 stage を覆う」ことを見る。本スクリプトはその手前、
// **合成の入口が 1 本しかない**ことを見る。両方が要る:
// 束が正しくても、Hub 側が束を使わず自前で組み直せば secret scan は消えるためである。
//
// 検査するのは 4 点。いずれも source の文字列から決定的に決まる:
//   1. (T-INS-01) packages/inspection が `createPublishInspectionRules` を公開入口から出している
//   2. (T-INS-02) その合成が package rules と secret scan preset の **両方** を含む
//   3. (T-INS-03) Hub の検査入口が `createPublishInspectionRules` を使っている
//   4. (T-INS-04) 公開経路 (src/lib/publish/, src/app/api/v1/) から検査 pipeline を起動するのは
//      検査入口 1 ファイルだけ (別の場所で `runInspection` を呼べると、
//      secret scan を外した束で公開できてしまう)
//
// 4 を「apps/hub 全体」ではなく **公開経路からの到達可能性** で書いているのは、
// `src/shared/inspection/` (owner=feat-hub-foundation) に汎用の registry があるためである。
// あれは任意のルールを登録して走らせられるので、文面どおりに読めば bypass になりうる。
// ただし本 feature が消してよい資産ではない (別 feature の登録共通層)。
// 消せない抜け道は「塞ぐ」のではなく「公開経路から届かない」ことを検査で固定する。
// 公開経路が 1 度でもあれを import した時点で、この検査が落ちる。
//
// 使い方:
//   node apps/hub/scripts/check-publish-inspection-gate.mjs
//   node apps/hub/scripts/check-publish-inspection-gate.mjs --json <path>

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const HUB_ROOT = resolve(HERE, '..');
const REPO_ROOT = resolve(HUB_ROOT, '..', '..');

/** 合成の正本。ここ以外に公開検査のルール束を作ってはならない。 */
const COMPOSITION_FILE = resolve(REPO_ROOT, 'packages/inspection/src/publish-inspection.ts');
/** packages/inspection の公開入口。Publisher もここ経由で同じ束を取る。 */
const INSPECTION_ENTRY = resolve(REPO_ROOT, 'packages/inspection/src/index.ts');
/** Hub 側の検査入口。ZIP 展開と順序を担い、判定ルールは合成の正本から取る。 */
const HUB_INSPECTION_FILE = resolve(REPO_ROOT, 'apps/hub/src/lib/publish/package-inspection.ts');

/** 合成関数の名前。ここを改名したら本スクリプトも一緒に直す (改名で静かに外れないように名指しする)。 */
const COMPOSITION_FN = 'createPublishInspectionRules';
/** 合成が必ず含む要素。名前は packages/inspection の export と一致していること。 */
const REQUIRED_PARTS = ['createPackageInspectionRules', 'createDefaultSecretScanRules'];
/** 検査 pipeline を起動する関数。これを呼べる場所を 1 つに絞る。 */
const PIPELINE_ENTRYPOINTS = ['runInspection', 'createInspectionPipeline', 'inspect('];

/**
 * 公開経路。ここから検査 pipeline を起動してよいのは `HUB_INSPECTION_FILE` だけ。
 * route (`app/api/v1/`) を含めるのは、service を経ずに route が直接検査を組む形も塞ぐため。
 */
const PUBLISH_PATH_DIRS = ['src/lib/publish', 'src/app/api/v1'];

/**
 * 汎用の検査 registry。ルールを持たない結線層で owner は feat-hub-foundation。
 * 公開経路がこれを掴むと任意のルール束で検査を走らせられるので、到達を禁じる。
 */
const GENERIC_REGISTRY_HINTS = ['shared/inspection', 'createHubInspectionRegistry', 'runHubInspection'];

const SOURCE_EXT = ['.ts', '.tsx', '.mts'];
const EXCLUDE_DIRS = ['node_modules', '.next', '.open-next', 'dist', 'coverage'];

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

/** コメントの中身だけを落とす (行数は保つ)。説明文中の関数名を実装として数えないため。 */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (text) => text.replace(/[^\n]/g, ' '));
}

function readCode(file) {
  return existsSync(file) ? stripComments(readFileSync(file, 'utf8')) : null;
}

function main() {
  const jsonIndex = process.argv.indexOf('--json');
  const jsonPath = jsonIndex > -1 ? resolve(process.argv[jsonIndex + 1]) : null;
  const findings = [];
  const rel = (file) => relative(REPO_ROOT, file);

  // 1: 公開入口からの露出
  const entryCode = readCode(INSPECTION_ENTRY);
  if (entryCode === null) {
    findings.push({
      kind: 'inspection-entry-missing',
      test_id: 'T-INS-01',
      file: rel(INSPECTION_ENTRY),
      detail: 'packages/inspection の公開入口が見つかりません',
    });
  } else if (!entryCode.includes(COMPOSITION_FN)) {
    findings.push({
      kind: 'composition-not-exported',
      test_id: 'T-INS-01',
      file: rel(INSPECTION_ENTRY),
      detail: `公開入口が ${COMPOSITION_FN} を export していません (Publisher が同じ束を取れない)`,
    });
  }

  // 2: 合成の中身
  const compositionCode = readCode(COMPOSITION_FILE);
  if (compositionCode === null) {
    findings.push({
      kind: 'composition-missing',
      test_id: 'T-INS-02',
      file: rel(COMPOSITION_FILE),
      detail: '公開検査の合成ファイルが見つかりません',
    });
  } else {
    for (const part of REQUIRED_PARTS) {
      if (!compositionCode.includes(part)) {
        findings.push({
          kind: 'composition-incomplete',
          test_id: 'T-INS-02',
          file: rel(COMPOSITION_FILE),
          detail: `${COMPOSITION_FN} が ${part} を含んでいません (I2 の 3 本立てが欠けます)`,
        });
      }
    }
  }

  // 3: Hub の検査入口が合成の正本を使っている
  const hubCode = readCode(HUB_INSPECTION_FILE);
  if (hubCode === null) {
    findings.push({
      kind: 'hub-inspection-missing',
      test_id: 'T-INS-03',
      file: rel(HUB_INSPECTION_FILE),
      detail: 'Hub の検査入口が見つかりません',
    });
  } else if (!hubCode.includes(COMPOSITION_FN)) {
    findings.push({
      kind: 'hub-composes-own-rules',
      test_id: 'T-INS-03',
      file: rel(HUB_INSPECTION_FILE),
      detail: `Hub の検査入口が ${COMPOSITION_FN} を使っていません (secret scan を外した束で公開できます)`,
    });
  }

  // 4: 公開経路から検査を起動できる場所が 1 つだけ
  const hubFiles = PUBLISH_PATH_DIRS.flatMap((dir) => walk(join(HUB_ROOT, dir)));
  for (const file of hubFiles) {
    if (file === HUB_INSPECTION_FILE) continue;
    const code = stripComments(readFileSync(file, 'utf8'));

    const used = PIPELINE_ENTRYPOINTS.filter((name) => code.includes(name));
    if (used.length > 0) {
      findings.push({
        kind: 'pipeline-invoked-outside-entry',
        test_id: 'T-INS-04',
        file: rel(file),
        detail: `検査 pipeline (${used.join(', ')}) を検査入口の外から起動しています`,
      });
    }

    const registry = GENERIC_REGISTRY_HINTS.filter((name) => code.includes(name));
    if (registry.length > 0) {
      findings.push({
        kind: 'generic-registry-reachable',
        test_id: 'T-INS-04',
        file: rel(file),
        detail: `汎用検査 registry (${registry.join(', ')}) が公開経路から到達可能です`,
      });
    }
  }

  const result = {
    check: 'publish-inspection-gate',
    test_ids: ['T-INS-01', 'T-INS-02', 'T-INS-03', 'T-INS-04'],
    composition_file: rel(COMPOSITION_FILE),
    hub_inspection_file: rel(HUB_INSPECTION_FILE),
    scanned_files: hubFiles.length,
    violation_count: findings.length,
    findings,
  };

  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (findings.length === 0) {
    console.log(`[publish-inspection-gate] OK: 走査 ${hubFiles.length} ファイル / 違反 0 件`);
    process.exit(0);
  }
  console.error(`[publish-inspection-gate] NG: ${findings.length} 件`);
  for (const f of findings) console.error(`  - [${f.kind}] ${f.file}: ${f.detail}`);
  console.error('  公開検査は static validation + secret scan + policy の 3 本立てです (I2)。');
  process.exit(1);
}

main();
