---
graph_node_id: "issue-dev-workflow-tier-selector-absent-stale-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["spec-drift","verification-tier","reopen","follow-up"]
priority: "medium"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "dev-workflow【3】の『selector 未実装』記述が実装後に stale"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T04:14:46Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/spec-state.json","system-spec/dev-workflow.md","plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py"]
purpose: "確定章の記述と実装の乖離を解消し、章だけを読んで実装できる状態を保つ。"
goal: "dev-workflow.md【3】が selector 実装済みを前提とした記述に更新され、tier_selector: absent の既定条項が過去形として整理されている。"
scope_in: ["qa-214【3】の該当節を R4-reopen 経由で更新","更新後の再 compile (compile-spec-doc.py) と確定章の再生成"]
scope_out: ["tier 規則そのものの変更","3 tier の定義変更"]
acceptance: ["章本文が『2026-08-09 時点で未実装である』を主張していない","確定セルの更新が apply-spec-transition.py 経由のみで行われている","validate-coverage-matrix.py が exit 0 を維持している"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/dev-workflow-tier-selector-absent-stale-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "確定章の記述と実装の乖離を解消し、章だけを読んで実装できる状態を保つ。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/dev-workflow-tier-selector-absent-stale-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-true","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-09T03:42:00Z","evidence_refs":["system-spec/dev-workflow.md#qa-216","docs/features/feat-dev-pipeline-improvement/verification-tiering-final-review-spec-reflection-receipt.md"],"policy":"manual","reconciled_at":"2026-08-09T03:42:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
---

## 背景

`system-spec/dev-workflow.md`【3. select-verification-tier.py 未実装時の既定 (施策4)】は
「本仕様が参照する `select-verification-tier.py` は 2026-08-09 時点で未実装である」と述べる。
2026-08-09 に script が実装されたため、この記述は事実と食い違う。

## なぜ即時に直さなかったか

章本文は `compile-spec-doc.py` が spec-state の確定セル (qa-214) から生成する派生物であり、
章を直接編集する経路は C11 guard が遮断する。本文を変えるには確定セルの R4-reopen が必要で、
これは確定条件そのものに触れる操作なのでユーザー承認を要する。

## やること

1. 該当セルを `reopen` (reason 付き) し、selector 実装済みを前提とした統合 entry を新規 qa として起票
2. `confirm` で再確定し、`set-approval` で承認記録へ紐づける
3. `compile-spec-doc.py` で章を再生成

`tier_selector: "absent"` の既定条項は削除せず、「selector 不在時の退避規則」として残すこと。
将来 selector が壊れた場合の fallback 契約は依然として必要である。
