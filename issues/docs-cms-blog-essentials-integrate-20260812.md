---
graph_node_id: "issue-docs-cms-blog-essentials-integrate-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["docs","cms","scheduled-publish","blog","mvp"]
priority: "high"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "Docs CMS ブログ運用4項目を main 正本へ安全統合する"
owners: ["daishiman"]
created_at: "2026-08-12T12:00:00Z"
updated_at: "2026-08-12T12:00:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-docs-cms"]
resource_scope: ["apps/hub/src/features/docs-cms","packages/db/schema/docs-cms","packages/db/migrations","docs/features/feat-docs-cms"]
purpose: "PR #713 のブログ運用4項目を、main の画像/外部同期 lineage と矛盾なく統合し draft PR として提出する"
goal: "category/tags/thumbnail/excerpt/publish_at と 0014 migration が main 上で動作し、仕様層へ additive 反映され、CI 向け draft PR が存在する"
scope_in: ["publish_at additive migration","予約公開 cron/CAS","分類 UI/API","main 統合と競合解消","docs/features/system-spec/architecture/tasks 反映"]
scope_out: ["外部公開サイト","scheduled 永続 enum","Linux 実ブラウザ/VRT の本セッション完走"]
acceptance: ["origin/main を取り込み済み","0014 は publish_at+index のみ","external ETag/CAS と画像 upload を退行させない","仕様反映受領書がある","draft PR が base=main で開いている"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data"]
parent_feature: "feat-docs-cms"
feature_package_id: null
phase_ref: null
file_path: "issues/docs-cms-blog-essentials-integrate-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":null,"evaluator":"final-review-mvp","evidence_ref":"docs/features/feat-docs-cms/mvp-blog-essentials-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-12T12:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 1.0
classification_reason: "ユーザーが PR #713 統合と仕様反映・draft PR を明示依頼した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/docs-cms-blog-essentials-integrate-20260812.md","confidence":1.0}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-zkcl","linked_at":"2026-08-12T12:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T12:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

PR #713 (ブログ運用に必要な分類/タグ/アイキャッチ/予約公開) を、main の Docs CMS 画像・外部同期正本と安全に統合する。

## 背景

旧 base 上の #713 は main の #707/#712/#709 と競合し、migration 番号重複と二重正本リスクがあった。

## 実装方針

main lineage (0011 分類 → 0012 external → 0013 hearing → 0014 publish_at) を正本とし、予約公開は導出状態 + bounded cron とする。
