---
status: recorded
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-13
feature_node_ids:
  - feat-hub-foundation
dev_graph_node_id: issue-dark-mode-persistence-reload-20260813
beads_ids:
  - HarnessHub-sj20
recorded_at: 2026-08-13
---

# 表示設定の再読み込み復元 — 仕様反映受領書

## 1. 依頼と目的

ログイン済み利用者がダークモードを保存しても再読み込みで戻る不具合を直す。
既存契約 (`user_settings` が正本) を実装へ揃える。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。製品 API / DB / 認可の意味は変えていない。
- 既存 frontend-spec の「`user_settings` が正本」を、ログイン済みシェルの起動時 GET 復元として明示した。
- 実装は `HubShell` 上の `UiPreferencesHydrator` が `GET /api/v1/me/display-settings` を読む。
- 公開画面では本人設定 API を呼ばない。取得失敗時もシェルは落ちない。

## 3. 正規反映先

| 層 | 反映 |
|---|---|
| `system-spec/` | `frontend.md` 章末追記。R4-reopen なし |
| `specs/` | compiled system specification へ 2026-08-13 追記 |
| `architecture/` | `harness-hub-frontend.md` |
| `features/` | `feat-hub-foundation.md` 追補 |
| `tasks/` | promoted package 非改変。task 層の追補は本受領書と issue 本文 |
| `docs/` | `frontend-spec.md` §2.1 / 本受領書 |

## 4. R4-reopen 不要の理由

1. 表示設定 API の path / schema / 認可は変えていない。
2. 配色トークン・density・locale の値域は変えていない。
3. 未ログイン画面の既定 (`auto`) は維持する。
4. 新規 qa 番号は不要。既存契約の実装ギャップ解消である。

## 5. 品質ゲート (MVP 最小)

| ゲート | 結果 |
|---|---|
| `validate-system-plan.py` feat-hub-foundation | PASS（baseline exemption、digest 8735bb16、violations 0） |
| display-theme-persistence focused tests | 2 PASS |

## 6. 残課題

- 本番ブラウザでの目視 (MVP では Vitest を正)
- 共通シェルへの hydrator 追加による client bundle 余白 (`HarnessHub-a7tk` / `HarnessHub-gs7d`)
