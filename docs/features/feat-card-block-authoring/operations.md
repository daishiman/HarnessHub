---
status: confirmed
layer: operations
parent_feature: feat-card-block-authoring
beads_id: HarnessHub-iz3n
dev_graph_node_id: feat-card-block-authoring
recorded_at: 2026-08-16
---

# 運用: 本文カードブロック

文書の本文を 2 列または 3 列のカードで組む。大きな画面では編集とプレビューを同時に見る。

## 書き方

```md
:::cards cols=2
:::card
左の話
:::
:::card
右の話
:::
:::
```

- `cols=3` で 3 列
- ツールバーから 2 列 / 3 列の雛形を挿入できる
- 大きな画面: 左が編集、右がプレビュー
- 狭い画面: 同じ 2 面をタブで切替
- 保存済みプレビューは「他の人が見る内容」。編集中プレビューはまだ保存していない下書き

## 壊れたときの扱い

印の付け方を間違えても文書全体は消えない。素の Markdown として残り、編集中だけ直せる警告が出る。保存は止めない。

## 残作業

本番での実画面確認。画像は既存の Docs 画像 API / R2 だけを使う。
