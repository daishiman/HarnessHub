---
status: confirmed
layer: feature-evidence
---

# 受入判定報告 (feat-demo-coverage-dataset / P07)

goal-spec の acceptance 7 項目を、P06 の実行結果 (`test-run-report.md`) に照らして 1 対 1 で判定した記録である。判定の根拠は P06 で実測した値だけを使い、この文書では新たなテスト実行を行わない。

- 判定日: 2026-08-15
- 判定対象: `packages/db/scripts/seed-coverage.ts` / `packages/db/scripts/verify-demo-coverage-matrix.ts` / `packages/db/scripts/demo-coverage/**`
- 根拠: `docs/features/feat-demo-coverage-dataset/test-run-report.md` (P06) / `route-state-matrix.md` (P05)
- **判定結果: 7 項目すべて pass。fail 0 件。差し戻し 0 件。**

## 1. 判定サマリ

| # | acceptance (goal-spec 原文) | 判定 | 主根拠 |
|---|---|---|---|
| A1 | seed 投入後、28 route それぞれについて 5 状態 (空/1件/大量/長文/エラー) へ到達する手順が存在し実行できる | **pass** | T1 (7件) / 検査 CLI exit 0 / report §5 |
| A2 | 各ドメインモデルの enum ステータスが全値、最低 1 件ずつ seed に含まれる (未使用値 0 件を機械検査する) | **pass** | T2 (5件) / report §1 |
| A3 | 大量パターンが 50 件以上で、一覧のページング境界を跨ぐ | **pass** | T6 (5件) / report §1 |
| A4 | 長文パターンが日本語の折返しを実際に発生させる長さを持つ | **pass** | T5 (5件) / report §1 |
| A5 | 同じ seed を連続 2 回実行し、投入後の状態が一致する | **pass** | T3 (5件) / report §3 (ダンプ差分 0 行) |
| A6 | ローカル以外の DB URL を指定した seed 実行が非 0 終了で拒否される | **pass** | T4 (4件) / report §4 (exit 2) |
| A7 | route × 状態の対応表に未カバーの組が 0 件であることを機械検査する | **pass** | 検査 CLI exit 0 / report §5 |

## 2. 項目別の判定

### A1 — 28 route × 5 状態への到達手順 → pass

対応表 `COVERAGE_MATRIX` が 28 route ちょうどを持ち (T1-1)、各 route が 5 状態のキーをちょうど持つ (T1-2)。140 セル全件が「到達手順あり」か「非適用 (理由記号 N1〜N7)」のいずれかへ解決する (T1-3, T1-4)。適用セル 105 件はすべて非空の到達手順 (役割・URL・fixture) を持つ (T1-5)。

「手順が存在する」だけでなく「実行できる」ことは、到達手順が指す fixture の論理キーが seed の投入対象に実在するかを検査 CLI が突き合わせることで担保している。表だけ埋まって実行すると画面が空、という状態はここで落ちる。

route 集合が実装と乖離していないことは T1-7 が `page.tsx` の実測集合と突き合わせて確認している。

> **判断:** 非適用 35 件があるため「28 × 5 = 140 すべてに手順がある」わけではない。acceptance の文言は「到達する手順が存在し実行できる」であり、原理的に発生しない状態 (静的ページの大量表示など) に手順を捏造することはこの意図に反する。理由記号を固定して機械検査の対象に含めることで、手抜きと区別できる形にしたうえで pass とした。理由記号の定義は `route-state-matrix.md` §2 にある。

### A2 — enum 全値が最低 1 件ずつ → pass

宣言 (`DOMAIN_ENUMS`) が 40 カラム / 129 値であり、schema の実定義も 40 カラム / 129 値である (T2-1)。宣言の値集合と schema の実定義が完全一致する (T2-2)。投入後の DB で、129 値それぞれが 1 行以上存在する (T2-3)。**未使用値 0 件**。

「機械検査する」という要件は、宣言を schema から自動導出しないことで満たしている。自動導出すると schema に enum が増えたときテスト側も黙って追随し、投入し忘れを検知できなくなる。宣言と実定義を独立に持って突き合わせているため、増えた値は T2-1/T2-2 で落ちる。

サインイン経路と衝突する値 (`tenants.status=suspended` など) は別テナントの行として投入されており、動作前提を壊さずに全値を満たしている (T2-4 / ADR §10.1)。

### A3 — 大量パターンが 50 件以上でページング境界を跨ぐ → pass

8 系列すべてが 50 件以上である (T6-2)。

| 系列 | 件数 | 対応する境界 |
|---|---|---|
| `build/bulk` | 101 | `/builds` のカーソルページング 100 件 (`BOARD_PAGE_LIMIT`) |
| `metrics-rollup/bulk` | 60 | `/metrics` のランキング表示 10 件 (`METRICS_RANKING_LIMIT`) |
| `project/bulk` | 60 | 一覧の既定表示 |
| `document/bulk` | 60 | 同上 |
| `feedback/bulk` | 60 | 同上 |
| `hearing-sheet/bulk` | 60 | 同上 |
| `user/bulk` | 55 | 同上 |
| `audit-event/bulk` | 60 | 同上 |

宣言した境界値が実コードの定数と一致することを T6-1 が定義ファイルを読んで照合し、`/builds` 系列が 101 件でカーソルページング境界 100 を超えることを T6-3 が確認している。境界の前後 3 点 (99/100/101) で跨ぎ判定が「跨がない / 跨がない / 跨ぐ」となることを T6-4 が検査しており、判定そのものが常に真を返す実装になっていないことを担保している。投入後の実レコード数が宣言値以上であることは T6-5 が確認している。

### A4 — 長文パターンが折返しを発生させる長さ → pass

4 キーすべてが ADR §6.2 の最小文字数を満たす (T5-1)。

| キー | 最小規約 | 実測 |
|---|---|---|
| `heading` | 40 | 41 / 44 |
| `body` | 200 | 218 / 228 |
| `tagName` | 20 | 22 / 22 |
| `personName` | 25 | 27 / 26 |

「長さを持つ」だけでは折返しの検査にならないため、次の 3 条件も併せて満たしている。

- **L1**: 見出しと本文が句読点・中黒・全角括弧のいずれかを含む (T5-2)。実運用に近い折返し候補位置を持つ。
- **L2**: タグ名が空白・ハイフン等の単語区切りを含まない (T5-3)。区切りのない連続文字列でこそ横溢れが出る。
- **L3**: 各文面の最頻文字が 20% 未満である (T5-4)。同じ文字の反復で字数を埋めた「長いだけで折返しが起きない」文面を排除する。

判定関数自体が最小文字数の境界で合否を分けることを T5-5 が確認している。

> **判断:** 「折返しが実際に発生したか」の確認は画面描画の観点であり、本 feature のデータ内容ベースの検査範囲外である (test-design.md §5 の C1)。データ側が満たすべき条件を上記 4 つに翻訳して判定した。

### A5 — 連続 2 回実行で状態が一致 → pass

2 回実行後の全テーブルのダイジェストが 1 回目と一致し (T3-1)、2 回目の投入件数サマリが 1 回目と一致する (T3-2)。時刻列が実行時刻に依存しないことも確認済み (T3-5) で、これがないと 2 回目に `updated_at` だけが変わって一致が崩れる。

CLI レベルでも同一 DB へ連続 2 回投入し、正規化ハッシュダンプの **差分 0 行** を実測した (report §3、35 テーブル / 637 件)。行数だけの比較では「同数だが中身が違う」を見逃すため、各行をキー順整列 JSON へ正規化してからテーブル単位で SHA-256 を取っている。

一致を成立させている決定論 ID は、同じ論理キーが常に同じ ID を返し (T3-3)、論理キーも導出 ID も衝突しない (T3-4) ことを確認済みである。

### A6 — 非ローカル URL の実行が非 0 終了で拒否される → pass

| 与えた URL | 実測 |
|---|---|
| `libsql://harness-hub-prod.turso.io` | **exit 2** |
| `https://example.turso.io` | **exit 2** |
| `file:<ローカルパス>` | exit 0 (受理) |
| 未指定 (env も未設定) | exit 2 (usage) |

非ローカル URL が終了コード 2 で終わり (T4-1)、拒否された実行が対象 DB を一切変更しない (T4-2)。ローカル URL が URL 形式を理由に誤って拒否されないこと (T4-3) も確認しており、「常に拒否する」実装で見かけ上 pass する経路を塞いでいる。CLI が判定ロジックを再実装せず共通実装を使っていることは T4-4 が確認している。

### A7 — 対応表の未カバー 0 件を機械検査 → pass

`verify-demo-coverage-matrix.ts` が **exit 0**。出力は次のとおり (report §5)。

```
画面 28 / 状態 5 / セル 140
  適用 105 件、非適用 35 件、未割当 0 件
  N1: 11 件 / N2: 6 件 / N3: 1 件 / N4: 6 件 / N5: 7 件 / N6: 2 件 / N7: 2 件
未カバー 0 件。表の全セルが到達手順または理由記号へ解決しました。
```

集計が適用 105 / 非適用 35 と一致することは T1-6 も独立に確認している。CLI は未知の理由記号・空の到達手順・絶対 path でない URL・存在しない fixture をいずれも違反として数え、1 件でもあれば exit 1 で落ちる。

## 3. fail と差し戻し

**なし。** 7 項目すべて pass のため、原因 task (`SYS-DEMO-COVERAGE-DATASET-P05` など) への差し戻しは発生していない。

## 4. 判定の限界 (次工程への申し送り)

本 feature の acceptance は**データ内容**に対する契約であり、次の 2 点は判定対象外である。いずれも本 feature の scope 外として ADR / test-design で明示済み。

1. **画面上で実際に崩れが直ったか** — 投入データを使った目視・自動 UI 検証は別 scope。本 feature は「崩れを発見できるデータが揃っている」ところまでを保証する。
2. **CLI 2 本のカバレッジ率** — 子プロセス起動のため vitest のプロセス内計測に載らない。終了コード契約 (§A6) と出力実測 (§A7) で担保している (report §6 の注記)。

## 5. 計画検証

```bash
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-demo-coverage-dataset
```

`exit 0` / `violations: []` / contract 1.3.0 / P01..P13 exact-13。

## 6. 参照

- 実行結果: `docs/features/feat-demo-coverage-dataset/test-run-report.md`
- 対応表: `docs/features/feat-demo-coverage-dataset/route-state-matrix.md`
- 検査設計: `docs/features/feat-demo-coverage-dataset/test-design.md`
- 設計判断: `docs/features/feat-demo-coverage-dataset/architecture-decision-record.md`
