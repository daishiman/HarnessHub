#!/usr/bin/env node
// tenant 分離テストの「名指しゲート」検査
// (qa-038【2】テナント分離テスト / SEC3 / D4 row-level-scope / issue-auth-tenancy-ci-wiring-20260725)。
//
// `pnpm -r test` を回せば tenant-isolation.test.ts も走る。ただしそれは
// **テストスイートに含まれているから走っているだけ**で、ファイルが分割・改名されたり
// ケースが skip されたりしても緑のまま通る。qa-038【2】は tenant 分離テストを
// 必須 CI ゲートとして名指ししているので、「名指しした対象が実在し、期待するケースが
// 1 件も脱落していない」ことを、テストを実行する前に fail-closed で確かめる。
//
// 検査するのは 3 点。いずれもファイル内容から決定的に決まる (実行環境に依存しない):
//   1. 名指し対象ファイルが実在する (分割・改名の検出)
//   2. security-spec §8.4 の T-ISO-01〜07 が全て現れる (ケース削除の検出)
//   3. skip / todo / only による無効化が無い (静かに外れる経路の遮断)
//
// 3 を入れているのは、1 と 2 だけだと「ファイルもケース ID も残っているが
// `it.skip` で 1 件も実行されない」形をすり抜けるため。ゲートは
// **走らなくなったことに気づける**ところまでを担保する。
//
// 使い方:
//   node scripts/ci/check-tenant-isolation-gate.mjs
//   node scripts/ci/check-tenant-isolation-gate.mjs --json <path>

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

/** 必須 CI ゲートとして名指しする対象。repository root からの相対。 */
const TARGET = 'apps/hub/tests/auth-tenancy/tenant-isolation.test.ts';

/** security-spec §8.4 の分離テスト ID。1 つでも欠けたら網羅が崩れている。 */
const REQUIRED_CASE_IDS = ['T-ISO-01', 'T-ISO-02', 'T-ISO-03', 'T-ISO-04', 'T-ISO-05', 'T-ISO-06', 'T-ISO-07'];

/** 実装時点のケース数。減ったら「統合された」のか「消えた」のかを人が判断する。 */
const EXPECTED_CASE_COUNT = 12;

/**
 * 行コメントとブロックコメントの中身を落とす。
 * 「skip しない」と書いた**説明文**を違反として数えないため。
 * 行数 (改行) は保つ — 行番号がずれると指摘が読めなくなる。
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
}

/**
 * 宣言されたケース数。`it.skip(` や `it.each(` のような修飾子付きも 1 件として数える。
 * 「無効化された」は下の detectDisabledCases が別途報告するので、
 * ここでは**ケースが消えた (削除・統合された)** ことだけを見る。
 * 修飾子を数え落とすと、skip 1 件で「ケース数が減った」と「skip がある」の 2 つが同時に出て、
 * どちらが本当の原因か読めなくなる。
 */
function countCases(code) {
  return (code.match(/\b(?:it|xit|test|xtest)\b(?:\s*\.\s*[A-Za-z]+)*\s*\(/g) ?? []).length;
}

/**
 * 実行されなくなる修飾子。
 * - skip / todo … そのケースが走らない
 * - only        … **他が全て走らなくなる**。1 件だけ緑で残り 11 件が消える形なので同じ扱いにする
 * - skipIf/runIf … 環境変数などの条件次第で走らない。CI で静かに外れる経路そのもの
 * `concurrent` (並行実行) や `fails` (失敗を期待) は実行されるため対象にしない。
 */
const DISABLING_MODIFIER = '(?:skip|todo|only|skipIf|runIf)';

/**
 * `it.skip(` だけでなく `it.each([...]).skip(` のようなチェーン末尾も捕まえるため、
 * 「同じ行に it / test / describe があり、その後ろに無効化修飾子の呼び出しがある」で判定する。
 * 修飾子だけを単独で探すと無関係な `.skip(` を拾うため、必ず宣言子とセットで見る。
 */
const DISABLED_CALL = new RegExp(`\\b(?:it|test|describe)\\b[^\\n]*?\\.\\s*${DISABLING_MODIFIER}\\s*\\(`);

/** 旧記法の skip。vitest でも解釈されるので同じく落とす。 */
const LEGACY_DISABLED_CALL = /\b(?:xit|xtest|xdescribe)\s*\(/;

/**
 * skip / todo / only によって無効化されたケースを検出する。
 *
 * @param {string} code コメントを除去済みのテストソース
 * @returns {{ line: number, snippet: string }[]} 違反箇所 (空配列なら違反なし)
 */
function detectDisabledCases(code) {
  const violations = [];
  const lines = code.split('\n');
  for (const [index, line] of lines.entries()) {
    if (DISABLED_CALL.test(line) || LEGACY_DISABLED_CALL.test(line)) {
      violations.push({ line: index + 1, snippet: line.trim() });
    }
  }
  return violations;
}

function main() {
  const jsonIndex = process.argv.indexOf('--json');
  const jsonPath = jsonIndex > -1 ? resolve(process.argv[jsonIndex + 1]) : null;

  const targetPath = join(REPO_ROOT, TARGET);
  const problems = [];

  let caseCount = 0;
  let missingIds = [];
  let disabled = [];

  if (!existsSync(targetPath)) {
    problems.push(
      `必須ゲート対象 ${TARGET} が存在しません (分割・改名された場合は本スクリプトの TARGET も同時に更新すること)`,
    );
  } else {
    const raw = readFileSync(targetPath, 'utf8');
    const code = stripComments(raw);

    // ケース ID は it() のタイトル文字列に書かれるため、コメント除去後のソースで数える
    missingIds = REQUIRED_CASE_IDS.filter((id) => !code.includes(id));
    if (missingIds.length > 0) {
      problems.push(`security-spec §8.4 の分離テスト ID が見つかりません: ${missingIds.join(', ')}`);
    }

    caseCount = countCases(code);
    if (caseCount < EXPECTED_CASE_COUNT) {
      problems.push(
        `ケース数が ${EXPECTED_CASE_COUNT} 件から ${caseCount} 件へ減っています (統合したなら EXPECTED_CASE_COUNT も同時に改める)`,
      );
    }

    disabled = detectDisabledCases(code);
    if (disabled.length > 0) {
      const detail = disabled.map((v) => `L${v.line}: ${v.snippet}`).join(' / ');
      problems.push(`skip / todo / only により無効化されたケースがあります: ${detail}`);
    }
  }

  const summary = {
    check: 'tenant-isolation-gate',
    target: TARGET,
    exists: existsSync(targetPath),
    case_count: caseCount,
    expected_case_count: EXPECTED_CASE_COUNT,
    required_case_ids: REQUIRED_CASE_IDS,
    missing_case_ids: missingIds,
    disabled_cases: disabled,
    problems,
    passed: problems.length === 0,
  };

  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`);
  }

  if (problems.length === 0) {
    console.log(
      `[tenant-isolation-gate] OK: ${TARGET} / ${caseCount} ケース / 必須 ID ${REQUIRED_CASE_IDS.length} 種を確認`,
    );
    process.exit(0);
  }
  for (const problem of problems) {
    console.error(`[tenant-isolation-gate] NG: ${problem}`);
  }
  process.exit(1);
}

main();
