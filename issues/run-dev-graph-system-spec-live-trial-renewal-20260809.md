---
graph_node_id: "issue-run-dev-graph-system-spec-live-trial-renewal-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["live-trial","behavior-digest","dev-graph","follow-up"]
priority: "high"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "run-dev-graph-system-spec の live-trial を現 behavior digest で再実行する"
owners: ["daishiman"]
created_at: "2026-08-09T04:10:00Z"
updated_at: "2026-08-09T10:50:03Z"
status: "closed"
depends_on: []
related_nodes: ["issue-verification-evaluator-cache-20260809","spec-harness-hub-verification-tiering-20260809"]
resource_scope: ["plugins/dev-graph/skills/run-dev-graph-system-spec","eval-log/dev-graph/run-dev-graph-system-spec/live-trial","scripts/lint-live-trial-verdict.py"]
purpose: "system-spec writer と compile の behavior closure 変更後に、run-dev-graph-system-spec の実走受入証拠を現行 SHA へ更新する。"
goal: "現 behavior digest に束縛された live tier の PASS verdict が存在し、lint-live-trial-verdict.py が exit 0 になる。"
scope_in: ["live-trial 再実行","DEGRADED 理由の人間レビュー","新 verdict の保存"]
scope_out: ["verification tier selector の変更","製品 runtime の変更","古い verdict の改変"]
acceptance: ["現 behavior digest で trial を完走","verdict=PASS か、非 PASS の具体的 blocker を別 Beads へ分離","stale-sha と downgraded 違反が 0"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/run-dev-graph-system-spec-live-trial-renewal-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T04:10:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "final review の full CI で current behavior digest と既存 DEGRADED verdict の不一致を再現した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/run-dev-graph-system-spec-live-trial-renewal-20260809.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-p65r","linked_at":"2026-08-09T04:02:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-09T04:10:00Z","missing_sections":[],"status":"complete"}
---

## 背景

最終レビューの `scripts/run-ci-checks.sh` で、`run-dev-graph-system-spec` の既存 live-trial verdict が現 behavior digest と不一致になった。また既存 verdict 自体が `DEGRADED` で、live 受入証拠として使えない。

## やること

1. 現行 skill と system-spec harness の依存閉包で live-trial を実行する。
2. 既存の downgrade 理由「goal-proxy 乖離」を人間レビューし、再現するなら具体的な修正課題へ分離する。
3. 古い証拠は改変せず、新 run に PASS または明示 blocker の verdict を保存する。

## 完了条件

`python3 scripts/lint-live-trial-verdict.py --all` が stale-sha、downgraded、DEGRADED を報告しない。
