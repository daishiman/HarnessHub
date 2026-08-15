---
graph_node_id: "feat-ui-layout-remediation"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["macro-feature","ui-ux","layout","line-break","print","S1","S2","S3"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "全画面の UI 崩れ是正と折返し位置の意図化・印刷導線の非表示"
owners: ["daishiman"]
created_at: "2026-08-14T00:00:00Z"
updated_at: "2026-08-15T00:00:00Z"
status: "draft"
depends_on: ["feat-ui-integrity-audit-harness"]
related_nodes: ["feat-demo-coverage-dataset","feat-ui-integrity-audit-harness","feat-post-signin-landing-surface"]
resource_scope: ["apps/hub/src/app","apps/hub/src/components","packages/ui/src"]
purpose: "ナビの完全な文言を保ったまま意味境界でのみ折り、不要な製品所有の印刷起動導線だけを除去する。"
goal: "1280px のフルサイドバーで意味境界 2 行、360px でモバイル導線から全 route への到達、製品所有の印刷ボタン/`window.print` 導線 0 件を共通契約とする。"
scope_in: ["Hub 側の完全 label と任意の意味 segment 宣言","共通 UI 側の segment 内 nowrap・segment 間改行","1280px のフルサイドバーでの意味境界 2 行確認","360px のモバイル導線から完全 label と route への到達確認","hearing detail の明示的な印刷 Button と window.print 起動のみ除去"]
scope_out: ["全文言の nowrap、サイドバー幅増加、画面別 CSS、ゼロ幅文字","legal コンテンツと print stylesheet の削除","存在しない印刷専用 URL の追加または到達不可要件","revision conflict/CAS 処理の変更","全ページ印刷の新規実装"]
acceptance: ["1280px の幅 212px のフルサイドバーで「使用状況・」/「削減効果」が意味境界 2 行となり、各 segment 内は折れない","360px はモバイル導線から完全なナビ文言と route へ到達できる","折返し位置は共通 UI の仕組みで実装され、画面別 CSS を複製しない","製品所有の印刷ボタンと window.print 起動導線は 0 件で、legal と print stylesheet は保持される","revision conflict/CAS 処理と既存テストは非退行である"]
architecture_refs: ["arch-harness-hub-design-system","arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-ui-layout-remediation.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-14T00:00:00Z","origin_kind":"generated","source_digest":"8b9c1ca3e35c6a8a5e4eecf510aec342e4ccbd2dbca78c6c091196e058bcfa99","source_path":"system-spec/ui-ux.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec と 2026-08-14 の利用者要望 S1-S8 から導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-ui-layout-remediation.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-14T00:00:00Z","missing_sections":[],"status":"incomplete"}
---

# UI 崩れ是正と意味境界改行

## 目的

ナビの完全な文言は Hub が保持し、任意の意味セグメントだけを共通 UI へ渡す。共通 UI はセグメント内を折らず、セグメント間だけで改行する。

## レスポンシブ契約

- 1280px: フルサイドバーで「使用状況・」/「削減効果」の意味境界 2 行を確認する。
- 360px: フルサイドバーを要求せず、モバイル導線から完全な文言と全 route へ到達できることを確認する。

全文言 nowrap、幅増加、画面別 CSS、ゼロ幅文字は使わない。

## 印刷契約

hearing detail の製品所有の印刷 Button と `window.print` 起動だけを除去する。legal コンテンツ、print stylesheet、revision conflict/CAS 処理は保持する。印刷専用 URL は存在しないため要件にしない。

## 依存

全 route の実走受入は `feat-ui-integrity-audit-harness` に依存する。
