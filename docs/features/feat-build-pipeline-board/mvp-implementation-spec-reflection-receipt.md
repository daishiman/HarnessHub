---
status: confirmed
layer: feature-spec-reflection
beads_id: HarnessHub-9am
dev_graph_node_id: feat-build-pipeline-board
package_digest: sha256:30497959f1a517481e8ea8a52429e27f1bcc381331375543a1c370638e7cabf6
recorded_at: 2026-08-10
---

# feat-build-pipeline-board MVP 仕様反映受領書

## 1. 判定

仕様・設計への影響は **あり**。

Build 集約・`build_stage_events`、migration `0008`（Metrics と lineage 共有・以後の
delta は feature 分離）、一覧/詳細/工程遷移 API、S13 ボード UI、admin 限定 + 監査、
PublishRequest 接続、shell navigation を実装したため、frontend / backend / database /
security / ui-ux の正本を更新する必要がある。

## 2. 正規フローの受領

| 領域 | 正本 | 受領した契約 |
|---|---|---|
| 7 工程 | ADR / `system-spec/backend.md` | hearing→…→publish の隣接遷移のみ。1 段階ロールバック可 |
| 認可 | `system-spec/security.md` / ui-ux | 閲覧は member 以上。工程変更は workspace-admin 以上 + 監査 |
| 公開 | PublishRequest 接続 | publish 工程は PublishRequest=`published` と整合。Build に公開状態機械を複製しない |
| UI | `system-spec/frontend.md` | StageBoard 共通部品を消費。axe 0 を focused test で固定 |
| migration | `system-spec/database.md` / ADR | 既存 combined `0008` は immutable。今後の delta は feature 分離 |

## 3. 反映先

- `system-spec/`: backend / database / frontend / ui-ux / security と `spec-state.json`
- `docs/features/metrics-build-pipeline-mvp-addendum.md`: MVP 実装索引
- `architecture/`: data / backend / frontend への差分追記
- `features/` / `tasks/` / `docs/features/feat-build-pipeline-board/`

## 4. MVP 意図的ギャップ（後続）

- 正規 route は S13=`/pipeline`。本 MVP の実装・nav は当面 `/builds` を実体とする。
- POST create / PATCH metadata の完全 API 面は ADR 目標に対し段階実装。一覧・詳細・stage 遷移を MVP 核とする。
- 本番 deploy / smoke は P13 相当の残課題。

## 5. 500 行ルール

手書き実装・テストは 500 行以下。機械生成正本は分割しない。

## 6. 完了境界

本受領書は **MVP 実装 + 仕様反映** の完了を示す。
Beads epic `HarnessHub-9am` と子 P03〜P13 の durable close は draft PR merge 後。
