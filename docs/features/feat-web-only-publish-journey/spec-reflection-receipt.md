---
title: "feat-web-only-publish-journey 仕様反映受領書"
layer: "feature-evidence"
feature: "feat-web-only-publish-journey"
graph_node_id: "feat-web-only-publish-journey"
beads_ids:
  - "HarnessHub-jgj2"
recorded_at: "2026-08-10"
status: "accepted_with_release_pending"
---

# feat-web-only-publish-journey 仕様反映受領書

## 結論

今回の変更は **仕様・設計への影響あり**。CLI を使わない利用者が Hub Web だけで
Project 準備 → Skill 公開 → 全状態確認 → 導入案内まで到達できる経路を、既存の
PublishRequest 検査 pipeline に収束させる実装を追加した。製品境界（状態機械本体、
H7 実導入、web_app の wrangler 経路）は変更せず、導線と権限境界・表示契約を正本へ反映した。

## 正規フローでの反映判定

| 層 | 判定 | 記録または反映内容 |
| --- | --- | --- |
| `system-spec/` | 更新 | `testing-qa.md` / `spec-state.json` は production smoke と cancel の dual principal 契約を維持・追記。製品 API 骨格は既存 qa-103/104 のまま。 |
| `specs/` | 更新 | `harness-hub-post-signin-workspace-scope-addendum.md` D 節の Web 完結導線を実装語彙（checkpoint、H7 fail-closed、web_app 除外）へ整合。 |
| `architecture/` | 更新 | `harness-hub-frontend.md` に S01 ウィザード・Idempotency checkpoint・H7 導入案内の実装境界を追記。`harness-hub-backend.md` に cancel の session/Bearer 同一境界を追記。 |
| `features/` | 更新 | `features/feat-web-only-publish-journey.md` の scope / acceptance を MVP 実装へ同期。 |
| `tasks/` | 参照のみ | 本 feature は exact-13 package 未生成の macro epic。関連する publish-pipeline / feedback P13 の残課題注記を更新。 |
| `docs/` | 更新 | `frontend-spec.md` S01、`user-journeys.md` J1、`backend-spec*` の cancel dual principal、本受領書。 |

## 実装の要点

- 画面: `apps/hub/src/app/(workspace)/catalog/publish/page.tsx` + `PublishWizard`
- クライアント: `lib/publish-journey/*`（HTTP adapter、段階別 Idempotency-Key）
- API: `POST /api/v1/projects`（session、owner 固定）、既存 publish API の再利用
- 認可: `publish.cancel` を session or Bearer / owner に拡張（Needs Fix 再投入）
- Device: `/device` に CLI 専用注意と S01 導線、未開始コード警告
- H7: 成功終端に catalog/install 成功リンクを出さない fail-closed 案内

## 品質ゲート受領 (MVP 最小)

| ゲート | 結果 |
| --- | --- |
| typecheck (schemas / ui / hub) | PASS |
| Hub focused Vitest (web-only + publish-pipeline 他) | PASS（314 tests / 19 files、本 batch 共通実行） |
| Publisher publish-command | PASS（10 tests） |
| validate-system-plan feat-publish-pipeline | PASS（violations 0、contract 1.3.0） |
| 本番 production smoke (新 SHA) | 未実施（残課題） |

## 残課題

- H7 未成立のため実導入は Stage 0 側の別課題
- 新 SHA の production deploy / smoke は `HarnessHub-jgj2` を durable close しない
- web_app の Web 公開は scope_out（Publisher CLI 維持）

## 500 行制約

実装・テストの手書き成果物は 500 行以下。本変更で 500 行超の分割対象は無し
（`PublishWizard.tsx` 420 行、`smoke-production-coverage.ts` 497 行）。
