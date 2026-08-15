---
status: confirmed
layer: feature-evidence
---

# テスト実行報告 (feat-demo-coverage-dataset / P06)

P04 で設計した 6 テストカテゴリを P05 の実装に対して実行した結果の記録である。判定そのものは P07 が行い、この文書は実測値だけを残す。

- 実行日: 2026-08-15
- 対象: `packages/db/scripts/seed-coverage.ts`, `packages/db/scripts/verify-demo-coverage-matrix.ts`, `packages/db/scripts/demo-coverage/**`
- 実行環境: macOS (darwin 25.3.0) / Node.js arm64 / libSQL ローカルファイル DB
- 結果: **6 カテゴリ 31 件すべて pass。fail 0 件。**

## 1. カテゴリ別の結果

```bash
pnpm --filter @harness-hub/db exec vitest run __tests__/seed-coverage
```

| カテゴリ | テストファイル | 件数 | 結果 | 所要 |
|---|---|---|---|---|
| T1 網羅性 | `__tests__/seed-coverage/coverage-matrix.test.ts` | 7 | pass | 35ms |
| T2 enum 全値 | `__tests__/seed-coverage/enum-coverage.test.ts` | 5 | pass | 211ms |
| T3 冪等性 | `__tests__/seed-coverage/idempotency.test.ts` | 5 | pass | 1,577ms |
| T4 ローカル専用ガード | `__tests__/seed-coverage/local-guard.test.ts` | 4 | pass | 14,728ms |
| T5 長文折返し | `__tests__/seed-coverage/long-text.test.ts` | 5 | pass | 31ms |
| T6 大量ページング境界 | `__tests__/seed-coverage/bulk-boundary.test.ts` | 5 | pass | 143ms |
| **合計** | 6 ファイル | **31** | **6/6 pass** | 15.14s |

T4 が突出して遅いのは、CLI を子プロセスとして 3 本起こして終了コードを実測しているためである。vitest 既定の 5 秒タイムアウトでは足りないため、当該 3 件には個別に 120〜180 秒のタイムアウトを設定している。

## 2. パッケージ全体の実行

```bash
pnpm --filter @harness-hub/db test    # = vitest run --coverage
```

| 項目 | 実測 |
|---|---|
| テストファイル | 49 passed (49) |
| テスト | 388 passed (388) |
| 型検査 (`tsc --noEmit`) | エラー 0 件 |

## 3. 冪等性 — CLI レベルの 2 回連続実行

テスト内 (T3) の確認に加え、CLI を同一 DB へ連続 2 回実行し、投入後の DB 状態が完全に一致することを実測した。

```bash
# 1 回目 (空 DB → スキーマ作成 + 投入)
tsx scripts/seed-coverage.ts --url file:<db>     # exit 0 / 35 テーブル 637 件
# 状態ダンプ (テーブル名 / 行数 / 全行の正規化 SHA-256)
node dump-db.cjs <db> > dump1.txt

# 2 回目 (同一 DB へ再投入)
tsx scripts/seed-coverage.ts --url file:<db>     # exit 0 / 35 テーブル 637 件
node dump-db.cjs <db> > dump2.txt

diff dump1.txt dump2.txt                          # exit 0 (差分 0 行)
```

| 項目 | 1 回目 | 2 回目 |
|---|---|---|
| 終了コード | 0 | 0 |
| スキーマ | 新規作成 | 既存を利用 |
| 投入テーブル数 | 35 | 35 |
| 投入行数 | 637 | 637 |
| 状態ダンプの差分 | — | **0 行 (完全一致)** |

ダンプは行の並び順と列の並び順に依存しないよう、各行をキー順に整列した JSON へ正規化してから並べ替え、テーブル単位で SHA-256 を取っている。行数だけの比較では「同数だが中身が違う」を見逃すため、内容まで含めて一致を確認した。

## 4. ローカル専用ガード — 終了コードの実測

| 与えた URL | 期待 | 実測 | 出力 |
|---|---|---|---|
| `libsql://harness-hub-prod.turso.io` | 拒否 | **exit 2** | `seed-coverage はローカル DB 専用です (…受け取った URL: …)` |
| `https://example.turso.io` | 拒否 | **exit 2** | 同上 |
| `file:<ローカルパス>` | 受理 | **exit 0** | `スキーマを新規作成しました。` |
| 未指定 (env も未設定) | 使用法エラー | **exit 2** | `usage: seed-coverage --url file:<path>` |

拒否時に対象 DB が変更されないことは T4-2 が別途確認している (pass)。

## 5. 網羅性検査の出力

```bash
pnpm --filter @harness-hub/db exec tsx scripts/verify-demo-coverage-matrix.ts   # exit 0
```

```
画面 28 / 状態 5 / セル 140
  適用 105 件、非適用 35 件、未割当 0 件
  N1: 11 件 / N2: 6 件 / N3: 1 件 / N4: 6 件 / N5: 7 件 / N6: 2 件 / N7: 2 件
未カバー 0 件。表の全セルが到達手順または理由記号へ解決しました。
```

**未カバー 0 件**。非適用 35 件はすべて既知の理由記号 N1〜N7 に解決している。加えて、到達手順が指す fixture の論理キーがすべて seed の投入対象に実在することも同時に検査している (表だけ埋まって実行すると空、という状態を防ぐため)。

## 6. カバレッジ実測

| 対象 | Stmts | Branch | Funcs | Lines |
|---|---|---|---|---|
| `scripts/demo-coverage/` 全体 | 99.77 | 99.01 | 100 | 99.77 |
| ├ `boundaries.ts` | 100 | 100 | 100 | 100 |
| ├ `coverage-matrix.ts` | 100 | 100 | 100 | 100 |
| ├ `enums.ts` | 100 | 100 | 100 | 100 |
| ├ `fixtures.ts` | 100 | 100 | 100 | 100 |
| ├ `seed-id.ts` | 100 | 100 | 100 | 100 |
| └ `seed.ts` | 99.66 | 98.92 | 100 | 99.66 |
| パッケージ全体 | 91.78 | 87.51 | 88.52 | 91.78 |

閾値は lines / functions / branches / statements 各 80% で、すべて上回っている。`seed.ts` の未到達 2 箇所 (54-55 行, 144-145 行) は、配列長を超える索引や解決不能な値に対する防御的な throw であり、正常系からは到達しない。

### 計測範囲についての注記

本 run で `scripts/demo-coverage/**/*.ts` を `vitest.config.ts` の `coverage.include` へ追加した。参照されなくなった宣言が残っても誰も気付かない状態を避けるためである。

一方、CLI 2 本 (`scripts/seed-coverage.ts` / `scripts/verify-demo-coverage-matrix.ts`) は計測対象に含めていない。T4 がこれらを**子プロセスとして起動**して終了コードを実測する設計のため、vitest のプロセス内カバレッジ計測には原理的に載らないからである。include に加えると実行されているのに 0% と表示され、閾値を割って全体が赤くなる。この 2 本の挙動は、カバレッジ率ではなく §4 の終了コード実測と §5 の出力実測で担保している。

## 7. 計画検証

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-demo-coverage-dataset
```

`exit 0` / `violations: []` / contract 1.3.0 / P01..P13 exact-13。本 task に関する違反 0 件。

## 8. fail と差し戻し

**なし。** 6 カテゴリ 31 件すべて pass のため、`SYS-DEMO-COVERAGE-DATASET-P05` への差し戻しは発生していない。

## 9. 参照

- 検査設計: `docs/features/feat-demo-coverage-dataset/test-design.md`
- 対応表: `docs/features/feat-demo-coverage-dataset/route-state-matrix.md`
- 設計判断: `docs/features/feat-demo-coverage-dataset/architecture-decision-record.md`
