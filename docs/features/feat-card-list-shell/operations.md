---
status: confirmed
layer: operations
parent_feature: feat-card-list-shell
beads_id: HarnessHub-ma7t
dev_graph_node_id: feat-card-list-shell
recorded_at: 2026-08-16
---

# 運用: 一覧のカード型シェル

Docs / Sheets / Catalog の 3 一覧は、最初からカードで見える。表で見比べたいときだけ切り替える。

## 日常操作

- 画面: `/docs`・`/sheets`・`/catalog`
- 既定表示: カードグリッド
- 表へ切替: 画面上の表示切替。次回も同じ見え方を覚える（ブラウザの sessionStorage。絞込条件は覚えない）
- 状態タブ・検索・絞込: URL の query が正本。共有・再読込・戻る/進むで同じ結果になる
- 検索 `q`: 題名・本文・タグのいずれかに一致（OR）。状態タブや他の絞込とは AND

## 状態タブの読み方

| 一覧 | タブ | 中身 |
|---|---|---|
| Docs | 公開 / 下書き / 状態不明 | `published` / `draft` / `null` |
| Sheets | 進行中 / 完了 / 状態不明 | `received\|generating\|review` / `completed` / `null` |
| Catalog | 利用可 / 停止 / 状態不明 | `available` / `suspended\|deprecated` / `null` |

「状態不明」タブは件数だけを出す。行の集合は「すべて」と同じ（API に unknown 述語が無い）。

## 空のとき

- 本当に 0 件と、絞込の結果 0 件は別の空表示
- 絞込 0 件では、今かかっている条件を外す chip を出す

## 残作業

本番 migration 適用後の実画面確認。「状態不明」タブでの行絞り込み。
