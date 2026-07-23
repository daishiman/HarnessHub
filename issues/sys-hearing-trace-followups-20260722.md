---
graph_node_id: "issue-hearing-trace-followups-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["system-spec","hearing-audit","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "spec-state: qa-067 のユーザー確認記録欠落 (C06 MEDIUM) と質問様式の中立化 (C06 LOW) のフォローアップ"
owners: ["daishiman"]
created_at: "2026-07-21T23:30:33Z"
updated_at: "2026-07-22T09:30:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-d7-hearing-trace-20260721","feat-dev-pipeline-improvement"]
resource_scope: ["system-spec/spec-state.json"]
purpose: "C06 hearing 監査 (2026-07-22) の MEDIUM/LOW findings を追跡し、qa-067 の確認記録遡及と質問様式の中立化を行う"
goal: "qa-067 に確認記録が遡及付与され、R2/R3 の質問様式が中立形式 (採否両案の提示) になり、C06 監査が両 finding で FAIL しない"
scope_in: ["qa-067 確認記録の遡及付与方式の確定 (次回 reopen 時の確認ラウンド等)","R2/R3 質問様式の中立化 (appr-006 の『選択肢を先に提示→推奨は後段』方針へ合流)"]
scope_out: ["qa-067 確定内容 (8 要件) の変更","qa_log 過去エントリの改変"]
acceptance: ["qa-067 系の確認記録が approval_log または qa_log から遡及できる","R2/R3 質問テンプレが採用/不採用の対称選択肢を持つ"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hearing-trace-followups-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-22T09:30:00Z","origin_kind":"generated","source_digest":"4abdb8c76b091e9422db8d92a06fc4006f4b2f5d0226b30afc7363168f71e7e4","source_path":"system-spec/spec-state.json","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.95
classification_reason: "C06 hearing 監査 (2026-07-22, qa-070 再確定 run) の MEDIUM (qa-067 確認記録欠落)・LOW (誘導質問形式) findings を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hearing-trace-followups-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-4z0","linked_at":"2026-07-22T00:49:29Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T23:30:33Z","missing_sections":[],"status":"complete"}
---

# 概要

C06 (system-spec-hearing-auditor) の 2026-07-22 監査 (qa-069→qa-070 再確定 run) で、qa-067 が『調査で観測した事実に基づき確定する』形式でユーザー確認の明示記録を欠くこと (MEDIUM)、qa-067/qa-069 の質問文が『反映しない』という対称的代替案を提示していないこと (LOW) が検出された。

## 背景と問題

qa-069 は AskUserQuestion 確認ラウンド (appr-008) を経て qa-070 で是正済みだが、qa-067 は確定済み下流成果物 (feat-dev-pipeline-improvement + 13 task) が参照するため本体 reopen を保留した。質問様式の非対称は appr-006 で確立した『選択肢を先に提示→推奨は後段』方針と未合流。

## 対応方針

次回 spec 改訂時に qa-067 系の確認記録を遡及付与し、R2-interview / R3-reask の質問様式へ採用/不採用の対称選択肢を組み込む。qa-067 の確定内容 (8 要件) 自体は変更しない。
