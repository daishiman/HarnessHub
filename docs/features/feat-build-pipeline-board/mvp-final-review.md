---
status: confirmed
layer: feature-final-review
beads_id: HarnessHub-9am
dev_graph_node_id: feat-build-pipeline-board
recorded_at: 2026-08-10
---

# feat-build-pipeline-board MVP 最終レビュー

## 目的

ハーネス構築を 7 工程ボードで見える化し、admin が安全に工程を進め、公開工程を既存 PublishRequest とつなぐ。

## 実装サマリ

| 層 | 内容 |
|---|---|
| DB | `builds` / `build_stage_events`（migration `0008` 共有 lineage）+ repository |
| API | `GET /api/v1/builds`、`GET /:id`、`POST /:id/stage` |
| 認可 | stage 変更は workspace-admin 以上 + 監査 event |
| UI | `/builds` StageBoard（7 列）、insight nav「パイプライン」 |
| 契約 | `@harness-hub/schemas` build-pipeline-board contracts |

## 検証（MVP 最小）

| ゲート | 結果 |
|---|---|
| `validate-system-plan.py --feature-package feature-package/feat-build-pipeline-board` | PASS / violations 0 / digest `30497959…` |
| schemas build-pipeline-board | 9 tests PASS |
| db build-stage-transition | 12 tests PASS |
| hub build-pipeline-board + a11y | focused suite 内で PASS |

## 残課題

1. 正規 route `/pipeline` への alias
2. create / metadata PATCH の API 面完成
3. P13 本番 deploy / smoke
4. Beads P03〜P13 の順次 close（merge 後）
