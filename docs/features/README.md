---
status: confirmed
layer: delivery-index
source: docs/system-design-overview.md#構築優先順位
---

# Feature 構築順インデックス

> **正本境界**: 構築順の正本は [system-design-overview.md](../system-design-overview.md) §3「構築優先順位」。本書は feature から優先 phase と依存先を逆引きするための派生索引であり、各 `requirements-baseline.md` の P01 確定転記 (§1〜§6/§7) を変更しない。

| phase | feature | この phase で閉じる成果 | 先行契約 |
|---|---|---|---|
| P0 | [feat-stage0-distribution-gate](../../features/feat-stage0-distribution-gate.md) ([baseline](feat-stage0-distribution-gate/requirements-baseline.md)) | install/download の採用配布経路を実機で確定 | なし |
| P0 | [feat-hub-foundation](../../features/feat-hub-foundation.md) ([baseline](feat-hub-foundation/requirements-baseline.md)) | 保護画面を載せられる共通 shell・CI・health | Stage 0 と並行可 |
| P0 | [feat-domain-model-db](../../features/feat-domain-model-db.md) ([baseline](feat-domain-model-db/requirements-baseline.md)) | tenant/workspace/project scope を持つ repository 基盤 | hub-foundation |
| P0 | [feat-auth-tenancy](../../features/feat-auth-tenancy.md) ([baseline](feat-auth-tenancy/requirements-baseline.md)) | SSO、共通 route guard、単一認可 MW、テナント分離テスト | hub-foundation + domain-model-db |
| P0 | [feat-tenant-data-retention](../../features/feat-tenant-data-retention.md) | C4 改訂後の業務データ保管 API、R2 封筒暗号化、即時完全削除 | hub-foundation + domain-model-db + auth-tenancy |
| **P1** | **[feat-hearing-intake](../../features/feat-hearing-intake.md) ([baseline](feat-hearing-intake/requirements-baseline.md))** | **S10 作成 → S11 結果一覧 → S12 結果詳細 + 完了通知** | P0 Auth Gate |
| **P2** | **[feat-publish-pipeline](../../features/feat-publish-pipeline.md) ([baseline](feat-publish-pipeline/requirements-baseline.md))** | package 取込、検査、immutable Release、stable pointer | P0 |
| **P2** | **[feat-publisher-plugin](../../features/feat-publisher-plugin.md)** | CLI 取込の主経路、Web upload wizard との受け渡し | publish-pipeline |
| **P2** | **[feat-dual-catalog-web](../../features/feat-dual-catalog-web.md)** | **S01 upload/一覧 → S02 管理・install/download → S03 公開状態** | publish-pipeline + Stage 0 distribution gate |
| **P2** | **[feat-build-pipeline-board](../../features/feat-build-pipeline-board.md) ([baseline](feat-build-pipeline-board/requirements-baseline.md))** · [runbook](feat-build-pipeline-board/runbook.md) · [P04–P12 受領](feat-build-pipeline-board/p04-p12-final-review-spec-reflection-receipt.md) | S13 の 7 工程（MVP=3 endpoint）。publish 工程は PublishRequest を参照 | publish-pipeline + hearing-intake |
| P3 | [feat-feedback-loop](../../features/feat-feedback-loop.md) ([baseline](feat-feedback-loop/requirements-baseline.md) · [I15 追補](feat-feedback-loop/i15-in-app-improvement-request-addendum.md)) | S14 改善要望の受付・レビュー・AI 応答。I15 は画面内投稿の仕様のみ | publish-pipeline |
| P3 | [feat-docs-cms](../../features/feat-docs-cms.md) ([baseline](feat-docs-cms/requirements-baseline.md)) | S15 文書一覧/閲覧/編集・AI 下書き | P0 + Markdown 共通層 |
| P3 | [feat-card-list-shell](../../features/feat-card-list-shell.md) · [運用](feat-card-list-shell/operations.md) · [実装メモ](feat-card-list-shell/implementation-notes.md) · [受領](feat-card-list-shell/card-family-20260816-spec-reflection-receipt.md) | Docs / Sheets / Catalog をカード既定の共通一覧へ | docs-cms + hearing-intake + dual-catalog + mutation-safety + emphasis-icons |
| P3 | [feat-card-block-authoring](../../features/feat-card-block-authoring.md) · [運用](feat-card-block-authoring/operations.md) · [実装メモ](feat-card-block-authoring/implementation-notes.md) | 本文の `:::cards` と大画面 2 ペイン | docs-cms + mutation-safety + emphasis-icons |
| P4 | [feat-user-org-admin](../../features/feat-user-org-admin.md) ([baseline](feat-user-org-admin/requirements-baseline.md)) | S17/S18、係数・PII ガード。高度な管理 UI は後段 | P0 |
| P4/P5 | [feat-metrics-tracking](../../features/feat-metrics-tracking.md) ([baseline](feat-metrics-tracking/requirements-baseline.md)) | P4=S16 ingest/rollup、P5=S09 dashboard 仕上げ | user-org-admin |
| P5 | [feat-workspace-governance](../../features/feat-workspace-governance.md) | S05/S06、承認キュー・監査閲覧・高度な RBAC UI | dual-catalog-web + auth-tenancy |
| 横断 QA | [feat-demo-coverage-dataset](feat-demo-coverage-dataset/requirements-baseline.md) | 28 route × 5 状態の確認用データ（ローカル専用） | domain-model-db |
| 横断 QA | [feat-ui-integrity-audit-harness](feat-ui-integrity-audit-harness/requirements-baseline.md) | 実 route 契約の UI 崩れ監査（168 キー、0 件は PASS にしない） | demo-coverage-dataset |
| 横断 QA | [feat-ui-layout-remediation](feat-ui-layout-remediation/requirements-baseline.md) | 意味境界改行・製品所有印刷の非表示・44px 操作域 | ui-integrity-audit-harness |

## 優先 slice の受け入れ境界

| slice | 必須 | 後回しにできるもの |
|---|---|---|
| P1 ヒアリング | 4 step 入力、受付番号、生成中/失敗/再試行、本人用一覧、管理者用全件一覧、結果詳細、PDF 表示用出力、build 導線 | dashboard 集計、管理者向け高度な分析 |
| P2 プラグイン Hub | S01 の公開 CTA、CLI 取込 + ZIP 代替、公開設定、検査結果、版/状態管理、Workspace 内検索、安定版 install/download、WebApp 起動 | public visibility、Yellow 承認 UI、詳細な download 分析 |

`feat-publisher-plugin` / `feat-dual-catalog-web` / `feat-workspace-governance` / `feat-tenant-data-retention` は現時点で専用の `docs/features/*/requirements-baseline.md` が未生成のため、P02 で新しい baseline を捏造せず既存の `features/*.md` と本索引を参照する。baseline を生成する場合は dev-graph の promoted goal-spec を先に正本化する。`feat-tenant-data-retention` の抽出根拠は [feat-domain-model-db baseline §6.2](feat-domain-model-db/requirements-baseline.md) に残す。
