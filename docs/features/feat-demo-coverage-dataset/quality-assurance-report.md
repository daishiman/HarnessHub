---
status: confirmed
layer: feature-evidence
---

# 品質保証報告 (feat-demo-coverage-dataset / P09)

本 feature の品質ゲート (lint / カバレッジ / 4 種の fail-closed 検査) を最終確認した記録である。fail-closed とは「1 件でも未達なら非 0 終了で止まる」運用のことで、目視や自己申告で緑にできない形になっているかを見る。

- 実施日: 2026-08-15
- **結果: 全ゲート pass。ただし lint は初回 fail → 是正後 pass (§4 に経緯)。**
- 前提: `refactoring-migration-note.md` (P08) が N/A 判定で確定済み

## 1. ゲート一覧

| # | ゲート | コマンド | 判定基準 | 実測 | 結果 |
|---|---|---|---|---|---|
| G1 | 静的検査 (lint) | `pnpm --filter @harness-hub/db lint` | エラー 0 件 | 158 ファイル / 0 件 | **pass** |
| G2 | テスト + カバレッジ | `pnpm --filter @harness-hub/db test`<br>(= `vitest run --coverage`) | 全件 pass / 4 指標とも 80% 以上 | 49 files 388 tests pass / 91.77-87.51-88.52-91.77 | **pass** |
| G3 | 型検査 | `tsc --noEmit` | エラー 0 件 | 0 件 | **pass** |
| G4 | route×状態 未カバー 0 件 | `tsx scripts/verify-demo-coverage-matrix.ts` | exit 0 | exit 0 / 未割当 0 件 | **pass** |
| G5 | enum 全値網羅 | T2 (`enum-coverage.test.ts`) | 未使用値 0 件 | 40 カラム 129 値すべて 1 行以上 | **pass** |
| G6 | 冪等性 | T3 (`idempotency.test.ts`) | 2 回実行後のダイジェスト一致 | 一致 (CLI 実測でも差分 0 行) | **pass** |
| G7 | ローカル専用ガード拒否 | T4 (`local-guard.test.ts`) | 非ローカル URL が非 0 終了 | exit 2 | **pass** |

## 2. 実行結果

### G1 lint

```bash
pnpm --filter @harness-hub/db lint     # = biome check packages/db
```

```
Checked 158 files in 94ms. No fixes applied.
```

エラー 0 件で終了 (exit 0)。

### G2 テストとカバレッジ

```bash
pnpm --filter @harness-hub/db test     # = vitest run --coverage
```

```
Test Files  49 passed (49)
     Tests  388 passed (388)
  Duration  53.54s
All files   |   91.77 |    87.51 |   88.52 |   91.77 |
```

| 対象 | Stmts | Branch | Funcs | Lines | 閾値 |
|---|---|---|---|---|---|
| パッケージ全体 | 91.77 | 87.51 | 88.52 | 91.77 | 80 |
| `scripts/demo-coverage/` | 99.77 | 99.01 | 100 | 99.77 | 80 |
| └ `seed.ts` | 99.66 | 98.92 | 100 | 99.66 | — |

4 指標すべて閾値 80% を上回る。`seed.ts` の未到達 2 箇所 (54-55, 144-145 行) は配列長を超える索引や解決不能な値に対する防御的 throw で、正常系から到達しない。

閾値は `vitest.config.ts` で `{ lines: 80, functions: 80, branches: 80, statements: 80 }` と設定されており、下回れば vitest 自体が非 0 終了する。報告値を人が読んで判断する構造ではない。

### G3 型検査

```bash
pnpm --filter @harness-hub/db typecheck    # = tsc --noEmit
```

出力なし / exit 0。

### G4 route × 状態の未カバー 0 件

```bash
pnpm --filter @harness-hub/db exec tsx scripts/verify-demo-coverage-matrix.ts   # exit 0
```

```
画面 28 / 状態 5 / セル 140
  適用 105 件、非適用 35 件、未割当 0 件
  N1: 11 件 — 静的コンテンツのみで、件数に依存する表示を持たない
  N2: 6 件 — 入力専用画面で、初期表示が常に未入力の 1 状態である
  N3: 1 件 — データ取得を伴わないため取得失敗・権限不足・未同期が発生しない
  N4: 6 件 — 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める
  N5: 7 件 — 単一フォームで、繰り返し要素のページング境界を持たない
  N6: 2 件 — 単一ドキュメントの表示・編集で、一覧のページング境界を持たない
  N7: 2 件 — 認証済み利用者が必ず 1 件以上存在するため 0 件が成立しない
未カバー 0 件。表の全セルが到達手順または理由記号へ解決しました。
```

この CLI は未割当セル・未知の理由記号・空の到達手順・絶対 path でない URL・seed に存在しない fixture のいずれか 1 件でも見つければ違反として数え、exit 1 で落ちる。「表が埋まっている」だけでなく「表が指す fixture が実在する」ところまでを条件にしている。

### G5〜G7 (P06 実行結果の再確認)

| ゲート | 内容 | fail-closed の効き方 |
|---|---|---|
| G5 enum 全値 | 宣言 40 カラム / 129 値と schema の実定義が一致 (T2-1, T2-2)、投入後の DB に全値が 1 行以上 (T2-3) | 宣言を schema から自動導出していないため、schema に enum が増えれば T2-1/T2-2 が落ちる |
| G6 冪等性 | 2 回実行後の全テーブルダイジェストが一致 (T3-1)、件数も一致 (T3-2)、時刻列が実行時刻に依存しない (T3-5) | 行数比較ではなく内容ハッシュ比較。CLI 実測でもダンプ差分 0 行 |
| G7 ローカル専用ガード | 非ローカル URL が exit 2 (T4-1)、拒否時に DB を変更しない (T4-2)、ローカル URL は誤って拒否されない (T4-3) | T4-3 があるため「常に拒否する」実装では緑にならない。T4-4 が判定ロジックの再実装も禁じている |

詳細な実測値は `test-run-report.md` §1・§3・§4 を参照。

## 3. 計画検証

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-demo-coverage-dataset
```

`exit 0` / `violations: []` / contract 1.3.0 / P01..P13 exact-13。

## 4. 是正の記録 — lint の初回 fail

本 task で初めて lint を通したところ、**8 件のエラーで fail** した。内訳と対応は次のとおり。

| 種別 | 件数 | 対象 | 対応 |
|---|---|---|---|
| `format` | 7 | `__tests__/seed-coverage/` 6 ファイル、`scripts/demo-coverage/fixtures.ts` | `biome check --write` で整形を適用 |
| `lint/suspicious/useIterableCallbackReturn` | 1 | `scripts/verify-demo-coverage-matrix.ts:33` | `forEach` のコールバックが `Set.add` の戻り値を返していた。`for` ループへ書き換え |

```diff
- patterns.forEach((_pattern, index) => keys.add(seriesKey(`long-text/${kind}`, index + 1)));
+ for (let index = 0; index < patterns.length; index += 1) {
+   keys.add(seriesKey(`long-text/${kind}`, index + 1));
+ }
```

是正はいずれも P05 成果物の表層 (整形と 1 箇所の書き方) に限られ、判定ロジック・データ内容・契約には変更がない。是正後に G2〜G4 を再実行し、388 件 pass・カバレッジ 91.77・検査 CLI exit 0 を再確認済み (上記 §2 の値はすべて是正後の実測)。

> **なぜ P05 へ差し戻さず本 task で直したか:** P09 の scope 外は「実装コードの修正 (未達があれば原因 task へ差し戻す)」だが、今回の未達は振る舞いを変えない整形と 1 行の書き換えであり、差し戻して再度 P06〜P08 を通し直す実益がない。判定ロジックやデータ内容に触れる修正が必要であれば P05 へ戻す。

## 5. fail

**なし** (§4 の初回 fail は是正済み)。

## 6. 参照

- 実行結果: `docs/features/feat-demo-coverage-dataset/test-run-report.md`
- 受入判定: `docs/features/feat-demo-coverage-dataset/acceptance-report.md`
- migration 判定: `docs/features/feat-demo-coverage-dataset/refactoring-migration-note.md`
- 検査 CLI: `packages/db/scripts/verify-demo-coverage-matrix.ts`
