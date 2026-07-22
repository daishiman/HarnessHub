---
graph_node_id: "issue-security-web-qaref-chain-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["system-spec","matrix-audit","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "security.web の qa_ref 系譜引用の断絶 (C07 medium): qa-042/qa-046 本文に qa-020 維持句がない"
owners: ["daishiman"]
created_at: "2026-07-21T23:58:50Z"
updated_at: "2026-07-22T09:30:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-hearing-trace-followups-20260722"]
resource_scope: ["system-spec/spec-state.json"]
purpose: "C07 マトリクス監査 (2026-07-22) の medium finding を追跡し、security.web の chain-of-custody (qa_ref 系譜の本文引用) を他カテゴリと同水準へ回復する"
goal: "security.web の確定 qa の answer 本文から qa-020 (認可単一ミドルウェア集約のコード構造規約) へ ID citation で遡及でき、C07 の qa_ref 要確認が 0 件になっている"
scope_in: ["security.web 系確定 qa (qa-050 または後継) の answer 本文へ『qa-020 (コード構造規約の security 適用) を全面維持』句を C01 writer 経由で明示追加"]
scope_out: ["security 確定内容の変更 (decide()/resolveEffectiveRole()/withAuthz() 単一接点は qa-020 規約を実質反映済み)","qa_log 過去エントリの改変 (追記は新 qa として登録)"]
acceptance: ["security.web の qa_ref chain が backend/database/frontend と同様に answer 本文の ID citation で qa-020 へ到達する","C07 監査で qa_ref 要確認 0 件"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-security-web-qaref-chain-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-22T09:30:00Z","origin_kind":"generated","source_digest":"4abdb8c76b091e9422db8d92a06fc4006f4b2f5d0226b30afc7363168f71e7e4","source_path":"system-spec/spec-state.json","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.95
classification_reason: "C07 matrix 監査 (2026-07-22 事後 fork) の medium finding (security.web chain-of-custody 断絶) を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-security-web-qaref-chain-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ntj","linked_at":"2026-07-22T00:49:29Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T23:58:50Z","missing_sections":[],"status":"complete"}
---

# 概要

C07 (system-spec-matrix-auditor) の 2026-07-22 事後 fork 監査で、security.web の確定 qa_ref 系譜 (qa-061 → qa-050 → qa-042/qa-046) の answer 本文に qa-017/qa-020/qa-025 の ID citation が存在せず、コード構造規約 (qa-020: 認可単一ミドルウェア集約) への遡及が本文チェーンで途切れていることが medium として検出された。

## 背景と問題

backend.web / database.web / frontend.web の 3 系統は多段 chain 経由で qa-017/qa-020 へ明示的に到達できるが、security.web のみ断絶が継続している。過去指摘 (reopen_log 937/943) の是正意図が、後続の深掘り再確定 (qa-042/qa-046/qa-050) で再び失われた。内容自体 (decide()/resolveEffectiveRole()/withAuthz() を単一接点とする) は qa-020 の規約を実質反映しており、出典 ID 引用の断絶に限定される。

## 対応方針

次回 spec 改訂時に、security.web の確定 qa の answer 本文へ『qa-020 (コード構造規約の security 適用) を全面維持』の一文を C01 transition writer 経由 (R4-reopen → 新 qa) で明示追加し、他 4 カテゴリと同水準の chain-of-custody を回復する。確定内容そのものは変更しない。
