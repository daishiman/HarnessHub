---
graph_node_id: "LT-TASK-001"
artifact_kind: "task"
artifact_subtypes: []
project_id: "dev-graph-live-trial"
domain: "verification"
tags: ["live-trial","safe"]
priority: "medium"
start_date: null
target_date: null
iteration: "R3"
title: "Validate isolated live trial (updated remotely r7)"
owners: ["harness-maintainers"]
created_at: "2026-07-13T07:50:00Z"
updated_at: "2026-08-08T09:51:08.306961Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["docs/live-trial-output.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/LT-TASK-001.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","evaluator":"fixture-evaluator","evidence_ref":"evidence/LT-TASK-001.json"}
source_lineage: {"imported_at":"2026-07-13T07:50:00Z","origin_kind":"manual","source_digest":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","source_path":"tasks/LT-TASK-001.md","source_plugin":null,"source_version":"1.0.0"}
classification_confidence: 1.0
classification_reason: "Deterministic acceptance fixture"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/LT-TASK-001.md","confidence":1.0}]
issue_linkage: {"issue_number":1,"linked_at":"2026-07-13T07:50:00Z","repo":"example/dev-graph-live-trial"}
tracker_binding: "github"
beads_linkage: null
github_publication: {"labels":["live-trial","safe"],"milestone":null,"mode":"issue_and_projects","project_aliases":["planning"]}
github_project_linkages: [{"field_snapshot":{"priority":"Medium","status":"In Progress"},"item_id":"PVTI_lADOFixture001","last_error_code":null,"last_synced_at":"2026-08-08T09:51:08.044513Z","linked_at":"2026-07-13T07:50:00Z","owner_login":"example","owner_type":"user","project_alias":"planning","project_id":"PVT_kwDOFixture001","project_number":1,"sync_state":"synced"}]
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-13T07:50:00Z","missing_sections":[],"status":"complete"}
---

# 目的

隔離された live-trial fixture が安全に検索・描画・schedule される。

## 背景

実リポジトリや外部 tracker に副作用を出さずに受け入れ挙動を確認する。

## 入力と前提条件

- 入力: `.dev-graph/state/graph.json`
- 前提: `tracker_binding=github`

## 出力と成果物

- 生成物: trial ごとの検証出力
- 更新対象: GitHub Issue/Project fields via adapter fixture

## 依存関係

- `depends_on`: N/A: 依存なし
- ブロッカー: N/A: なし

## 実装対象

- Frontend: N/A: fixture
- Backend/API: N/A: fixture
- Database/Data: N/A: fixture
- Infrastructure: N/A: fixture
- Security/Privacy: 外部副作用を禁止する
- Documentation: live-trial 証跡

## Write scope と競合制約

- `touches`: `docs/live-trial-output.md`
- 排他資源: fixture repository
- 並列実行条件: write trial と同時実行しない
- branch: fixture branch only
- worktree lease: N/A
- completion projection: N/A: 完了更新を行わない

## GitHub publication

- Mode: issue_and_projects
- Project aliases: planning
- Issue labels/milestone: live-trial, safe
- Publication gate: `status=active && confirmation_status=confirmed && evaluation_status=pass && implementation_readiness.status=complete`
- Completion policy: manual
- PR linkage requirement: linked_pr_merged
- Closed without merge: keep_active
- Local reconciliation: manual sync

## 実行手順

1. adapter fixture 経由で GitHub Issue/Project を同期する。

## 受入条件

- [ ] 同一状態の二回目 sync で changes=0 である。

## 検証方法

- 自動検証: adapter fixture による決定論的検証
- 手動検証: live-trial transcript を確認する
- 証跡: trial workdir

## リスクとロールバック

- リスク: fixture の誤用
- ロールバック: fixture directory を再生成する

## Handoff

- 実装 route: human
- 次に利用するノード: LT-TASK-001
