---
status: confirmed
layer: implementation-notes
parent_feature: feat-card-list-shell
beads_id: HarnessHub-ma7t
dev_graph_node_id: feat-card-list-shell
recorded_at: 2026-08-16
---

# 実装メモ: 一覧カードシェル

製品実装は PR #731（`fc2dc9c2`）で main に入った。本メモは最終レビュー時点の接地場所である。

## 接地

- `packages/ui` の `DataTable` に `viewMode` を純増。同じ column model からカードと表を描く
- 絞込正本: `useUrlFilters`（URL query）。view mode だけ sessionStorage
- `status_counts` と title/body/tags OR 検索は repository 応答への純増
- 認可は query の最初の境界。権限外の行は items・件数・検索対象のどれにも出ない

## 画面

- Docs: `apps/hub/src/app/(dashboard)/docs/document-list.tsx`
- Sheets: `apps/hub/src/app/(dashboard)/sheets/hearing-sheet-list.tsx`
- Catalog: `apps/hub/src/components/catalog/CatalogList.tsx`

## 検証（MVP）

PR #731 時点: UI 481 / Hub 188+30 / DB 24 / emoji lint 546 / 関連 system-plan pass。
本番 URL の目視は未実施。
