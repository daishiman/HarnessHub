---
status: recorded
layer: feature-spec-reflection
task: feat-semantic-emphasis-icons
beads_ids:
  - HarnessHub-xo7n
  - HarnessHub-6oi5
  - HarnessHub-mlvc
  - HarnessHub-xere
parent_feature: feat-semantic-emphasis-icons
related_nodes:
  - feat-card-mutation-safety
  - feat-card-list-shell
  - feat-card-block-authoring
recorded_at: 2026-08-15
spec_impact: reflected
dev_graph_node_id: feat-semantic-emphasis-icons
---

# 成果物カード関連 仕様反映受領書 (2026-08-15)

## 1. 依頼と目的

成果物・ドキュメント・ヒアリングシートをカードで見やすくする一連の変更を最終レビューし、
仕様・設計へ戻す。見た目の正本と、二重送信・後勝ち上書きを防ぐデータ契約が、コードと文書で
別方向へ進まないようにする。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。
- qa-232 / qa-233 / qa-234 を `system-spec/` の ui-ux / frontend / security へ確定反映した。
- Docs / Sheets 通常 CRUD の冪等 POST と entity revision CAS を backend / database へ追記した。
- 一覧カード既定と本文カードブロックは仕様として確定済み。製品実装は後続 feature の残課題。

## 3. 仕様影響の判断理由

| 観点 | 判断 |
|---|---|
| 単なる内部リファクタリングか | いいえ。強調の見え方と通常編集の安全契約が利用者に見える |
| 数値・データ契約が変わるか | はい。`infoBlue` token、entity revision、Idempotency-Key を純増する |
| 品質ゲートが変わるか | はい。絵文字 lint を CI G19 として fail-closed に結線する |
| 外部データ契約が変わるか | 通常 Docs / Sheets CRUD のみ。Catalog / PublishRequest / 外部 import は非変更 |

## 4. 正規反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | ui-ux qa-232、frontend qa-233、security qa-234、backend/database の mutation 追記 |
| `specs/` | implementation-writebacks へ本変更の要約 |
| `architecture/` | design-system の callout / lint、frontend の source digest、backend の CAS 追記 |
| `features/` | 4 feature と context JSON |
| `tasks/` | feat-semantic-emphasis-icons P01–P13 |
| `docs/` | emphasis 証跡一式、本受領書、shared-layers G19 |
| Beads | xo7n / 6oi5 / mlvc / xere の最終レビューと PR を notes へ追記 |

## 5. 実装レビュー結果

- callout 4 種は絵文字ではなく `lightbulb` / `alertTriangle` / `alertOctagon` / `infoCircle`。
- 面の色は `infoBlueSoft` / `dangerSoft` / `warningSoft`。形でも種別が分かる。
- Docs / Sheets の通常 POST は 24h 冪等台帳、PATCH は entity revision CAS。
- カード一覧シェルと本文 `:::cards` は仕様のみ。本 PR では製品 UI を実装しない。
- 配色切替・ナビ経路変更・Build ボード編集列は別件のため commit しない。

## 6. 品質ゲート (MVP 最小)

| ゲート | 結果 |
|---|---|
| `validate-system-plan.py --feature-package feature-package/feat-semantic-emphasis-icons` | pass、violations `[]`、digest `b10daedf…` |
| 絵文字 lint | 543 file、exit 0 |
| pytest `test_card_feature_contracts` + emoji lint tests | 36 passed |
| Vitest (mutation / Markdown) | 実行時に rollup optional 欠落で未完。再インストール後に focused 実行する |

## 7. 残課題

1. `feat-card-list-shell` の製品実装 (カード既定の 3 一覧)。
2. `feat-card-block-authoring` の製品実装 (`:::cards` と 2 ペイン)。
3. 所有境界 lint (`HarnessHub` follow-up / `issue-icon-ownership-boundary-lint-20260814`)。
4. callout 4 種を入れた VRT baseline の再取得 (catalog-data)。
5. 本番デプロイと実画面確認。

## 8. 説明

### 中学生向け

大事な注意書きを、端末ごとに形が変わる絵文字ではなく、決まった色と形のアイコンで出すようにした。
書類を保存するときは、同じボタンを二度押しても二重に作られず、古い画面のまま上書きもしない。
一覧をカードで見やすくする仕様は決めたが、その画面自体は次の作業に残している。

### 専門向け

semantic token + packages/ui 所有の inline SVG に強調を閉じ、G19 で絵文字混入を fail-closed にした。
通常 CRUD は tenant/workspace/resource/operation 複合キーの冪等台帳と entity revision CAS を
既存 Docs / Sheets caller へ結線した。qa-232 系は確定章へ還流し、list-shell / block-authoring は
仕様確定・未実装のまま残す。
