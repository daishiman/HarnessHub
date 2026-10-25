---
status: confirmed
layer: implementation-notes
parent_feature: feat-card-block-authoring
beads_id: HarnessHub-iz3n
dev_graph_node_id: feat-card-block-authoring
recorded_at: 2026-08-16
---

# 実装メモ: 本文カードブロック

製品実装は PR #731（`fc2dc9c2`）で main に入った。

## 接地

- `packages/ui` の remark plugin が `:::cards cols=2|3` を `hh-cards` / `hh-card` へ変換
- sanitize 差分は `hh-cards` / `hh-card` と正規化済み `data-cols` だけ
- 未知 cols は 2 列へ寄せる。未閉じ・不正な入れ子は例外を投げず素の Markdown へ縮退
- 大画面 2 ペイン、狭幅 Tabs。両方の preview は同じ `MarkdownView`

## 検証（MVP）

Markdown / DataTable の focused Vitest を含む UI 481 pass。本番 URL の目視は未実施。
