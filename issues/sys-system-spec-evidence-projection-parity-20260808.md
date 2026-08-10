---
graph_node_id: "issue-system-spec-evidence-projection-parity-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["system-spec-harness","evidence","projection","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "system-spec 証拠 projection の certificate・qa_log・compile parity を揃える"
owners: ["daishiman"]
created_at: "2026-08-08T11:00:00Z"
updated_at: "2026-08-08T11:06:29.987762Z"
status: "draft"
depends_on: []
related_nodes: ["issue-audit-fork-ledger-forgery-20260728"]
resource_scope: ["system-spec/spec-state.json","system-spec/coverage-matrix.json","system-spec/coverage-certificate.json","system-spec/index.md","specs/","architecture/"]
purpose: "同じ system-spec 証拠から作る certificate、foundation qa_log、compile 出力の意味を一致させる"
goal: "blocking_items の文章と配列が一致し、U1-U9 source-index が qa_log から追跡でき、compile 出力と正本 writeback の差が意図的か stale か判定できる"
scope_in: ["coverage_certificate.blocking_items の意味統一","U1-U9 source-index と qa_log の同期","compile 出力と手動 writeback drift の分類・解消"]
scope_out: ["新しい製品要求の追加","既存 writeback の証拠なし一括上書き"]
acceptance: ["complete 時の blocking_items prose と machine array が矛盾しない","--require-foundation が U1-U9 全件 PASS する","compile diff が0件、または意図的差分を機械判定できる"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-system-spec-evidence-projection-parity-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T11:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.94
classification_reason: "最終品質ゲートで certificate の prose/array 不一致、foundation U1-U9 qa_log 欠落9件、compile と checked-in writeback の既存 drift を同じ証拠 projection 境界で確認した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-system-spec-evidence-projection-parity-20260808.md","confidence":0.94}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-duej","linked_at":"2026-08-08T11:05:26.131720Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-08T11:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

最終品質ゲートで、同じ system-spec 証拠から作る3つの projection（読みやすい別表現）に既存の意味差を確認した。coverage certificate は文章で blocking item なしと書く一方、配列に被覆済み5項目を返す。foundation U1-U9 は source-index にあるが qa_log 参照が9件不足する。compile は成功するが、checked-in 文書には手動 writeback があり8文書が一致しない。

## 目的と背景

これらを今回の PASS に見せかけて上書きせず、同じ証拠から生成される projection の意味を揃える follow-up として追跡する。

## スコープ

- `blocking_items` の prose と machine array の意味統一
- foundation U1-U9 の source-index と qa_log 参照同期
- compile 出力と手動 writeback の stale/current 分類

## 受入条件

- [ ] complete certificate の文章と配列が矛盾しない
- [ ] `--require-foundation` が U1-U9 全件 PASS する
- [ ] compile diff が0件、または意図的差分を機械的に分類できる
