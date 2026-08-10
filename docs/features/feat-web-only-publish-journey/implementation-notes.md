---
title: "feat-web-only-publish-journey 実装メモ (MVP)"
layer: "feature-evidence"
feature: "feat-web-only-publish-journey"
graph_node_id: "feat-web-only-publish-journey"
beads_ids:
  - "HarnessHub-jgj2"
recorded_at: "2026-08-10"
---

# 実装メモ — Web 完結公開導線 (MVP)

## 入口

| 経路 | 役割 |
| --- | --- |
| `/catalog/publish` | S01 ウィザード本体 |
| Catalog 一覧 CTA | 公開ウィザードへの導線 |
| `/device` | CLI 専用である旨 + S01 への逃げ道 |
| `POST /api/v1/projects` | session で Project 作成（owner 固定） |

## 状態と再試行

1. Project 作成または既存 Project 選択
2. PublishRequest 作成（Idempotency-Key）
3. package upload（別キー）
4. submit → 検査 pipeline（CLI と同一 Hub 側実装）
5. Needs Fix 時は `POST /publish/:id/cancel`（session 可）で Draft へ戻し、同一 request に再投入

## 表示契約

- 全 status と公開要求 ID を隠さない
- findings 文言は CLI と共通 schema（`finding-presentation`）
- H7 未成立中は「導入できる」表現と catalog/install 成功リンクを出さない
- `web_app` は UI 選択肢に出さない

## テスト配置

- `apps/hub/src/__tests__/web-only-publish/`
- 既存 `tests/publish-pipeline/*` の cancel dual principal 拡張
- `apps/publisher` の cancel 経路は Bearer のまま
