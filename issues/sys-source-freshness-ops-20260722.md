---
graph_node_id: "issue-source-freshness-ops-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["system-spec","freshness","operations"]
priority: "low"
start_date: null
target_date: null
iteration: null
title: "C08 出典追随運用 (claude-code-plugins H7 再照合 / drizzle rc 再確認 / wrangler pinned version 検討)"
owners: ["daishiman"]
created_at: "2026-07-21T23:30:33Z"
updated_at: "2026-07-22T00:49:29Z"
status: "draft"
depends_on: []
related_nodes: ["feat-stage0-distribution-gate"]
resource_scope: ["system-spec/index.md","system-spec/fetched-references.json"]
purpose: "C08 出典鮮度監査 (2026-07-22) の low findings 3 件を運用として追跡する"
goal: "高頻度リリース系の出典 3 件に追随運用が定義され、実装着手時の再照合が漏れない状態"
scope_in: ["claude-code-plugins: H7 (Stage 0 technical gate) 直前の changelog 再照合と marketplace.json 仕様不変確認 (2026-07-22 第2回監査: anchor v2.1.215 に対し現行 v2.1.216・moderate。git-subdir source type の一部クライアント schema 検証エラー事例も H7 で要確認)","drizzle-orm: v1 系採用時の GitHub releases 最新 rc 再確認 (npm rc dist-tag は rc.3 を指し rc.4 を取得できない構造に注意)","wrangler: pinned version 記録追加の要否検討","nextjs: 記録 16.2.10 に対し現行 16.2.11 (patch 1 世代遅れ・low)。次回 doc-fetch で更新"]
scope_out: ["fetched-references.json の即時再取得 (現記録は全件鮮度 PASS)"]
acceptance: ["4 件の再照合タイミングが該当 feature/task の手順に組み込まれている","nextjs / claude-code-plugins の記録が次回 run-system-spec-doc-fetch で現行版へ更新されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-source-freshness-ops-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T23:54:58Z","origin_kind":"manual","source_digest":"ece8e03c27620e76a1cf4e06598f2e0d8067234974f605d54e2186501f59f17f","source_path":"system-spec/index.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "C08 出典鮮度監査 (2026-07-22) の low findings 3 件 (追随運用の示唆) を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-source-freshness-ops-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-e2u","linked_at":"2026-07-22T00:49:29Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T23:30:33Z","missing_sections":[],"status":"complete"}
---

# 概要

C08 出典鮮度監査の low/moderate findings を運用として追跡する。初回監査 (2026-07-22, verdict PASS) の 3 件に加え、completeness evaluator の事後 fork 監査 (同日, verdict FAIL・軽微・安全側検出) で 2 件のドリフトが追加検出された。

## 対象

1. claude-code-plugins (moderate): 記録 anchor v2.1.196・追跡値 v2.1.215 に対し、現行 CLI は v2.1.216 (2026-07-20)。H7 実施直前に code.claude.com/docs/en/changelog を再照合し、marketplace.json 仕様 (source type npm 含む) に変更がないことを再確認する。git-subdir source type で一部クライアント (v2.1.66, v2.1.78) が schema 検証エラーを起こした事例が GitHub issue に報告されており、H7 技術ゲートでクライアント互換性も確認する。
2. nextjs (low): 記録 16.2.10 に対し現行 16.2.11 (patch 1 世代遅れ)。次回 run-system-spec-doc-fetch で更新する。
3. drizzle-orm: v1 系採用時は github.com/drizzle-team/drizzle-orm/releases で最新 rc を都度再確認する。npm の rc dist-tag は rc.3 を指し `drizzle-orm@rc` では rc.4 を取得できない構造に注意。
4. wrangler: 記録は docs 索引の last_updated のみ。CI/CD が version 依存に敏感なら pinned version 記録の追加を検討する (提案)。

## 対応方針

該当 feature/task (H7 は feat-stage0-distribution-gate 系) の手順へ再照合タイミングを組み込む。nextjs / claude-code-plugins の記録更新は次回 spec run の doc-fetch (C02) で行い、本 issue は手動で fetched-references.json を書き換えない (単一 writer 境界の維持)。
