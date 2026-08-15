---
graph_node_id: "issue-register-package-projection-idempotency-drift-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["dev-graph","register-package","idempotency","task-projection","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "register-package 再実行が projection 6 項目差で同一 digest を拒否する"
owners: ["daishiman"]
created_at: "2026-07-27T21:24:33.65077Z"
updated_at: "2026-08-08T05:03:40Z"
status: "closed"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement"]
resource_scope: ["plugins/dev-graph/scripts/register-package.py","plugins/dev-graph/lib/registration_projection.py","plugins/dev-graph/scripts/upsert-node.py","plugins/dev-graph/tests/test_register_package.py","plugins/dev-graph/tests/register_package_test_support.py","plugins/dev-graph/tests/test_register_package_projection_idempotency.py","issues/sys-register-package-projection-idempotency-drift-20260728.md","docs/features/feat-dev-pipeline-improvement/register-package-projection-idempotency-spec-reflection-receipt.md"]
purpose: "exact-13 package の登録と task Markdown 投影が同じ node 契約へ収束し、同一 generation の再登録を安全な no-op にする"
goal: "register-package → upsert-node 後に同じ generation を dry-run すると idempotent=true で成功し、必須 frontmatter 6 項目と receipt 不変性も維持される状態"
mvp_alignment: null
scope_in: ["register-package と task projection の所有フィールド統一","同一 source digest 再実行の idempotency 判定修正","exact-13・graph schema・source digest・receipt の回帰テスト"]
scope_out: ["qa-071 要件本文の変更","既存 generation digest の書き換え","task frontmatter 必須 6 項目の削除"]
acceptance: ["正規の register → upsert 後に同じ generation の register-package --dry-run が idempotent=true で成功する","purpose / goal / scope_in / scope_out / acceptance / architecture_refs が task Markdown と graph node の両方に保持される","exact-13・graph schema・source digest・generation receipt の回帰テストが PASS する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-register-package-projection-idempotency-drift-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a79836c5df950f5b3ce08a982653b57dd4880e33deea08365ad2a5ec161eb499","evaluator":"codex-final-review","evidence_ref":"docs/features/feat-dev-pipeline-improvement/register-package-projection-idempotency-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-03T00:00:00Z","origin_kind":"generated","source_digest":"a79836c5df950f5b3ce08a982653b57dd4880e33deea08365ad2a5ec161eb499","source_path":"plugins/dev-graph/scripts/register-package.py","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.98
classification_reason: "HarnessHub-8wo 最終レビューで正規 register → upsert → register dry-run を再現し、同一 source digest の内容差エラーを実測したため"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-register-package-projection-idempotency-drift-20260728.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-cvli","linked_at":"2026-07-27T21:24:33.65077Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-27T21:24:33.65077Z","missing_sections":[],"status":"complete"}
---

## 背景

qa-071 本文伝播（`HarnessHub-8wo`）の最終レビューで、同じ generation を
正規手順どおり再検証したところ、`register-package.py --dry-run` が
`duplicate node ids have different content for the same source digest` で停止した。

`register-package.py` が保存する exact-13 node には、task Markdown の
frontmatter で必須となる次の 6 項目がない。

- `purpose`
- `goal`
- `scope_in`
- `scope_out`
- `acceptance`
- `architecture_refs`

登録後の投影では `upsert-node.py` がこの 6 項目を補うため、source digest が同じでも
保存済み node と再登録時の resolved node が一致しない。初回登録は成功するが、
同じ入力の再実行が冪等（べきとう＝何回実行しても同じ結果になる性質）にならない。

## 期待する成果

1. `register-package.py` と task projection の所有フィールドを一本化する。
2. 正規の register → upsert 後に、同じ generation の dry-run が
   `idempotent=true` で成功する。
3. 6 項目を削って見かけ上そろえず、task frontmatter 契約を維持する。
4. exact-13、graph schema、source digest、generation receipt の不変条件を
   回帰テストで固定する。

## 実装・検証状況 (2026-08-02)

`plugins/dev-graph/lib/registration_projection.py` に、C02 projection が所有する六項目の限定保持と
`updated_at` の単調性比較を分離した。`register-package.py` は同一 generation の既存
node を確認するとき、この六項目だけを保存済み node から補い、明示 manifest 値は優先する。
時刻後退・不正時刻・他フィールド差分は従来どおり drift として拒否する。

正例（register → task projection → 同 generation register dry-run）、supersede、明示値、
時刻後退・不正時刻の負例を回帰テストで固定した。仕様・設計への反映と最終品質ゲートの
受領は
[`register-package-projection-idempotency-spec-reflection-receipt.md`](../docs/features/feat-dev-pipeline-improvement/register-package-projection-idempotency-spec-reflection-receipt.md)
を正とする。linked PR が main へ merge されるまでは本 issue の completion を確定しない。

## 検出条件

- generation:
  `af8a73df2d7518c1dcfb972254b44ca993801e7ddac1dd1f98ab60e7d1affda6`
- 検出元 Beads: `HarnessHub-8wo`
- follow-up Beads: `HarnessHub-cvli`

## スコープ外

- qa-071 の要件本文の変更
- 既存 generation の digest 書き換え
- task frontmatter 必須 6 項目の削除
