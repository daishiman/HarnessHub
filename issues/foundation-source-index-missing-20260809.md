---
graph_node_id: "issue-foundation-source-index-missing-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["spec-state","foundation","traceability","follow-up"]
priority: "medium"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "requirements_foundation の U1-U9 source-index が qa_log に存在しない"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T03:46:13.693333Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/spec-state.json","plugins/system-spec-harness/scripts/validate-coverage-matrix.py"]
purpose: "上位概念 U1-U9 の各項が、どの対話に由来するかを機械追跡できる状態にする。"
goal: "validate-coverage-matrix.py --require-foundation が exit 0 になり、U1-U9 が全て出典 qa entry へ接地している。"
scope_in: ["U1-U9 それぞれの由来対話を qa-foundation-uN entry として qa_log へ追記","追記は apply-spec-transition.py 経由のみ"]
scope_out: ["requirements_foundation の内容そのものの見直し","--require-foundation の CI 必須化"]
acceptance: ["validate-coverage-matrix.py --matrix system-spec/spec-state.json --require-foundation が exit 0","各 qa-foundation-uN が source.kind を持ち、逐語の改変が無い"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/foundation-source-index-missing-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "上位概念 U1-U9 の各項が、どの対話に由来するかを機械追跡できる状態にする。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/foundation-source-index-missing-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-w0sv","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
---

## 事実

`validate-coverage-matrix.py --matrix system-spec/spec-state.json --require-foundation` は
2026-08-09 時点で 9 件の違反を返す。内訳は U1 から U9 まで一律に
「`requirements_foundation`: UN source-index (qa-foundation-uN) が qa_log に不在」である。

origin/main 時点の同ゲートは 18 件だったので、状況は悪化していない (approval_ref 付与と
serves_goals 整備で半減した)。残る 9 件は上位概念そのものの出典記録が未整備という別問題。

## なぜ問題か

`requirements_foundation` (U1-U9) は全技術章が `serves_goals` で辿る anchor である。
その anchor 自体がどの対話に由来するか記録されていないと、「誰がいつ何を根拠に決めたか」を
遡れない。承認記録の追跡 (F-0025 / HarnessHub-jb6r) と同じ構造の穴が、上位概念側に残っている。

## やること

U1-U9 それぞれの由来対話を `qa-foundation-uN` entry として `qa_log` へ追記する。
追記は `apply-spec-transition.py` 経由のみ (単一 writer 契約)。既登録 entry の逐語は改変しない。

## 注意

`--require-foundation` は opt-in ゲートであり CI 必須ではない。本 issue の完了をもって
必須化するかは別途判断すること (必須化を先にすると、整備前の全 run が赤くなる)。
