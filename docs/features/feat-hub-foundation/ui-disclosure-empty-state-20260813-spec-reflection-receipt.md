---
status: recorded
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-13
feature_node_ids:
  - feat-hub-foundation
  - feat-workspace-switch-ux
  - feat-docs-cms
dev_graph_node_id: issue-ui-disclosure-empty-state-20260813
beads_ids:
  - HarnessHub-0wj9
  - HarnessHub-f91a
recorded_at: 2026-08-13
---

# 一時メニュー開閉契約と Docs 0件導線 — 仕様反映受領書

## 1. 依頼と目的

今回変更中の UI シェル開閉契約と Docs 一覧 0 件導線を最終レビューし、実装・仕様・
Beads・draft PR を同じ契約へ揃える。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。
- 認可境界・DB 列・公開 API の deny 判定は不変。
- 変更は presentation / interaction contract の refinement:
  1. navigation disclosure の light dismiss・Escape・排他開閉
  2. Modal / BottomSheet の `dismissible`（旧 `closeOnBackdrop` を包括）
  3. Docs 一覧 empty の権限別 CTA と絞込解除

## 3. 正規反映先

| 層 | 反映 |
|---|---|
| `system-spec/` | `ui-ux.md` / `frontend.md` に post-compile writeback。R4-reopen なし |
| `specs/` | UI 基盤追補 FR-UIF-012/013・AC-UIF-015/016、post-signin addendum の server-first 文言 |
| `architecture/` | `harness-hub-frontend.md` に disclosure / dismissible / S15 empty |
| `features/` | `feat-workspace-switch-ux.md`、docs CMS S15 情報設計 |
| `tasks/` | promoted package 非改変。P13 後 writeback を追記 |
| `docs/` | frontend-spec / UI foundation / 実装メモ / 本受領書 |

## 4. R4-reopen 不要の理由

1. role / `ACTION_RULES` / session claim の判定集合は変えない。
2. disclosure は既存 `details/summary` 契約の操作補強であり、modal へ格上げしない。
3. `dismissible` は未保存破棄防止の UI 契約で、永続データ意味を変えない。
4. Docs empty CTA は既存 `docs.write_tenant` 判定を server page で一度だけ行い一覧へ渡す。

## 5. 品質ゲート (MVP 最小)

| ゲート | 結果 |
|---|---|
| `validate-system-plan.py` feat-docs-cms | PASS（baseline exemption） |
| `validate-system-plan.py` feat-hub-foundation | PASS（baseline exemption） |
| UI shell / Modal focused tests | 実行記録を PR 本文へ |
| Docs DOCS-UI-030..032 / a11y | 実行記録を PR 本文へ |

## 6. 残課題

- 本番 browser でのメニュー排他と Docs 0 件目視（MVP では最小）
- Linux VRT baseline（HarnessHub-7mc6）
- Workspace switch epic の production smoke 後 durable close（HarnessHub-f91a）
