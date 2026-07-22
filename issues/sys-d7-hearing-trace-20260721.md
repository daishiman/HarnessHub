---
graph_node_id: "issue-d7-hearing-trace-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["system-spec","hearing-audit","follow-up"]
priority: "low"
start_date: null
target_date: null
iteration: null
title: "spec-state: D7 (環境構成決定) に qa_log への遡及参照が無く hearing 往復の中立性を独立検証できない"
owners: ["daishiman"]
created_at: "2026-07-21T18:30:00Z"
updated_at: "2026-07-22T00:49:29Z"
status: "draft"
depends_on: []
related_nodes: ["issue-audit-followups-20260717","feat-dev-pipeline-improvement"]
resource_scope: ["system-spec/spec-state.json"]
purpose: "C06 hearing 監査 (2026-07-21) の medium finding を追跡し、D7 決定の hearing 往復を qa_log へ遡及可能にする"
goal: "D7 の決定往復が qa として登録され、user_decision.note に質疑証跡 id が記録され、C06 トレーサビリティ軸が PASS になっている"
scope_in: ["D7 決定往復の qa 追記登録 (writer 経由)","D7 user_decision.note への質疑証跡 id 記録"]
scope_out: ["D7 決定内容の変更 (ephemeral-preview-only は確定済み)","qa_log 過去エントリの改変"]
acceptance: ["D7 が D5/D6 と同様に qa_log の実在 id へ遡及できる","C06 監査のトレーサビリティ軸が D7 起因で FAIL しない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-d7-hearing-trace-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T18:30:00Z","origin_kind":"manual","source_digest":null,"source_path":"system-spec/spec-state.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "C06 hearing 監査 (c06-hearing-sync 2026-07-21) の medium finding (D7 遡及参照欠落) を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-d7-hearing-trace-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9rg","linked_at":"2026-07-22T00:49:29Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T18:30:00Z","missing_sections":[],"status":"complete"}
---

# 概要

C06 (system-spec-hearing-auditor) の 2026-07-21 監査で、decisions 配列の D7 (環境構成: 常設 staging 可否、confirmed_at=2026-07-21) が qa_log への遡及参照を持たないことが medium finding として検出された。

## 背景と問題

D5 (質疑証跡: qa-028)・D6 (質疑証跡: qa-029) と異なり、D7 の user_decision.note には対応する qa id の記録が無く、AskUserQuestion 往復の逐語記録が qa_log に存在しない。このため決定プロセスの中立性を独立監査で検証できない。

## 対応方針

次回 spec 改訂時に、D7 の決定往復 (質問・選択肢・ユーザー回答) を qa として elicit writer 経由で追記登録し、D7 の user_decision.note へ質疑証跡 id を記録する。決定内容 (ephemeral-preview-only) 自体は確定済みであり変更しない。
