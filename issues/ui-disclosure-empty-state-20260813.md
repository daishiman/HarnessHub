---
graph_node_id: "issue-ui-disclosure-empty-state-20260813"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-foundation","workspace-switch","docs-cms","disclosure","empty-state","mvp"]
priority: "high"
start_date: "2026-08-13"
target_date: null
iteration: null
title: "一時メニュー開閉契約と Docs 0件導線の最終レビュー"
owners: ["daishiman"]
created_at: "2026-08-13T00:00:00Z"
updated_at: "2026-08-13T00:15:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-workspace-switch-ux","feat-docs-cms","feat-hub-foundation","arch-harness-hub-frontend"]
resource_scope: ["packages/ui/src/shell/","packages/ui/src/components/Modal.tsx","packages/ui/src/internal/focus-trap.ts","apps/hub/src/app/(dashboard)/docs/","docs/","specs/","architecture/","features/","tasks/","system-spec/","issues/ui-disclosure-empty-state-20260813.md"]
purpose: "navigation disclosure の light dismiss/排他開閉と Modal dismissible、Docs 一覧0件の権限別導線を同一契約へ揃えて draft PR にする"
goal: "TransientDisclosure・dismissible・Docs empty CTA の実装・仕様・テスト・Beads・draft PR が同じ契約を指す"
scope_in: ["TransientDisclosure 共通 client island","Modal/BottomSheet dismissible 契約","Docs 一覧 empty state の権限別 CTA","docs/features/system-spec/architecture/tasks への仕様反映","main 統合と base main の draft PR"]
scope_out: ["公開 API / DB schema / 認可判定の変更","Cloudflare 本番デプロイ","Linux VRT / 本番 browser 全画面確認"]
acceptance: ["対象差分だけが commit される","task package 品質ゲートが pass","focused unit/a11y tests が pass","仕様反映受領書がある","draft PR が base=main で開いている"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-disclosure-empty-state-20260813.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"e5900d5395e62410df725b48b45af9777b6ec2b27c8a95220b975275033c50c9","evaluator":"final-review-mvp","evidence_ref":"docs/features/feat-hub-foundation/ui-disclosure-empty-state-20260813-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-13T00:00:00Z","origin_kind":"manual","source_digest":"4dad0c4f7f2765467ee616cd99403128f651074b06d05f74b7e12be017a2e9dd","source_path":"packages/ui/src/shell/TransientDisclosure.tsx","source_plugin":"manual-final-review","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "ユーザーが最終レビュー・仕様反映・draft PR を明示依頼した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-disclosure-empty-state-20260813.md","confidence":1.0}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-0wj9","linked_at":"2026-08-13T00:10:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-13T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

共通シェルの一時メニュー（Workspace 切替・アカウント・モバイル「その他」）と、
未保存保護付き overlay、Docs 一覧の 0 件表示を同じ契約へ揃える。

## 背景

- 素の `<details>` だけでは外側クリック・Escape・別メニューとの排他が揃わない
- Modal の `closeOnBackdrop` は Escape/閉じるボタンと意味がずれ、未保存保護が弱い
- Docs 一覧の真の 0 件と絞込 0 件が同じ空メッセージだと次の一手が曖昧

## 受入 (MVP)

1. navigation disclosure は同時に 1 つだけ開き、外側クリック・Escape・別メニュー開始で閉じる
2. `dismissible=false` の Modal / BottomSheet は背景・Escape・閉じるから閉じない
3. Docs 未絞込 0 件は作成権限ありで「最初のドキュメントを作成」、権限なしで権限説明
4. 絞込 0 件は「絞り込みを解除」を優先する
5. 仕様層へ additive 反映し、draft PR を base main で開く
