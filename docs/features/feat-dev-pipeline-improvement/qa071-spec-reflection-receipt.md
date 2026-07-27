---
status: confirmed
layer: feature-evidence
beads_ids:
  - HarnessHub-8wo
  - HarnessHub-cvli
dev_graph_node_id: issue-qa071-feature-body-propagation-20260726
feature_node_id: feat-dev-pipeline-improvement
spec_impact: none
reviewed_at: 2026-07-28
---

# qa-071 本文伝播の仕様反映受領書

## 1. 受領対象

`HarnessHub-8wo` では、qa-071 で確定済みの開発方法論 8 要件を
`feat-dev-pipeline-improvement` の feature context、goal-spec、
P01〜P13 task spec へ再 plan 経由で意味的に伝播した。

- Beads ID: `HarnessHub-8wo`
- dev-graph node ID: `issue-qa071-feature-body-propagation-20260726`
- 対象 feature node: `feat-dev-pipeline-improvement`
- generation: `af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6`
- superseded generation: `9be3809dad465db6de2af20a8b475ae4d9e01d0abe544d5592f3cdf7de91a33b`

## 2. 仕様・設計影響の判定

判定は **none（今回の差分による新しい仕様・設計影響なし）**。

qa-071 の要件本文と承認記録は、先行変更で
`system-spec/spec-state.json` の `qa_log/qa-071` と
`approvals/appr-009` へ正規フローで確定済みである。
今回の変更は、その確定済み入力を下流の feature/task 実行契約へ投影するもので、
新しい利用者要件、API、データ構造、セキュリティ境界、配備方式を追加しない。

`plugins/dev-graph/scripts/register-package.py` の変更も、PR を持たない
`local_only` node が既存の `manual` 完了経路へ到達できるようにする内部整合修正である。
`docs/features/feat-dev-pipeline-improvement/operations.md` §1 に既にある
「local-only は manual policy」という運用契約を実装へ一致させるもので、
製品仕様や architecture decision の追加ではない。

## 3. 確認した正本と設計

| 層 | 確認結果 |
|---|---|
| `system-spec/` | `spec-state.json` の qa-071 / appr-009 が確定済み。新要件なし |
| `specs/` | Harness Hub 製品の外部契約に変更なし |
| `architecture/` | component・責務境界・データフロー・配備構成に変更なし |
| `features/` | purpose / goal / scope / acceptance とライフサイクルを新 generation へ更新 |
| `tasks/` | P01〜P13 を新 generation から再投影し、8 要件の trace を保持 |
| `docs/` | requirements baseline、運用注記、本受領書へ反映 |

`system-spec/`、`specs/`、`architecture/` を実装状態の写しで更新すると、
確定要件と実行状態の二重正本を作るため編集しない。
実行状態は dev-graph、再 plan の本文は feature package と
`features/`・`tasks/` が所有する。

## 4. 正規フローによる反映

凍結済み task を手編集せず、次の経路で反映した。

1. qa-071 対応済み feature context を入力に契約 1.2.0 で再 plan
2. generation `af8a73df…` を validate・evaluate
3. promote して旧 generation `9be3809d…` を superseded 化
4. C02 の `register-package.py` / `upsert-node.py` で graph と Markdown を再登録
5. source digest・generation lineage・graph schema を決定論的に再検証

## 5. 品質と文書分割

feature/task の手書き Markdown はすべて 300 行以下であり、
ユーザー指定の 500 行上限も満たす。
500 行を超えていた `register-package.py` は、JSON Schema 検証を
`validate-registration-schema.py`、上流契約の事前確認を
`validate-registration-preflight.py` へ責務分離した。完了ポリシーの回帰テストも
`test_register_package_completion_policy.py` へ分け、各ファイルを
500 行以下にした。分割後の C02 挙動閉包は live trial
`20260727T230007Z-node-qa071-ci-r3` で再実走し、現行 digest
`596229f7a0b53a416bca062b10c2050a0901161e6dafd6a4151346f5d1f6b92c`
に対して fresh evaluator と criteria evidence gate の PASS を記録した。
generation JSON、graph store、live-trial transcript は writer が生成する
機械証跡なので、人手で分割して digest・provenance を壊さない。

## 6. 残課題

- `HarnessHub-cvli`: `register-package` の登録 node と、
  `upsert-node` が補う task frontmatter 6 項目の所有境界を一本化し、
  同一 generation の再登録を冪等にする。
- `HarnessHub-n7gw`: 既存 `local_only` node の completion policy 移行は
  実装済み・Beads closed だが、提出先の draft PR #82 は 2026-07-28 時点で
  未 merge、conflicting、`verify` failure である。今回の対象 13 task は
  正規 writer で `manual` へ収束させ、広域移行の差分は本 PR に混ぜない。

これらは qa-071 の要件本文や generation の semantic coverage とは別の
writer / lifecycle 整合課題であり、今回の本文伝播の受入を妨げない。
