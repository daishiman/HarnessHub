---
status: confirmed
layer: feature-requirements
title: UI 崩れ是正と意味境界改行の要件ベースライン
feature_id: feat-ui-layout-remediation
graph_node_id: feat-ui-layout-remediation
beads_id: HarnessHub-s36m
updated_at: "2026-08-15"
---

# UI 崩れ是正と意味境界改行の要件ベースライン

本書は `feat-ui-layout-remediation` の MVP 要件である。今回の縦切りが直した見え方だけを書く。

## 1. 目的

ナビの完全な文言は Hub が持ち、折ってよい位置だけを共通 UI へ渡す。製品が所有する印刷ボタンは消し、ブラウザ標準の印刷と法務ページは残す。文字リンクでも 44px の操作域を保つ。

## 2. ゴール

- 1280px の幅 212px フルサイドバーで「使用状況・」/「削減効果」が意味の境目で 2 行になり、各語の途中では折れない
- 360px ではフルサイドバーを要求せず、モバイルの「その他」から完全な文言と route へ到達できる
- hearing detail の製品所有「印刷」ボタンと `window.print` 起動が 0 件
- 公開シェルの brand / 法務ナビ / フッター / Alert の次の一手が 44px 未満にならない

## 3. 含むもの

- Hub の完全 label と任意の `labelSegments`
- 共通 UI の `data-hh-meaning-segment`（segment 内 nowrap・segment 間だけ改行）
- 共通 `touchTargetStyle`（表示密度 token は縮めてもタップ領域は 44px のまま）
- legal ページの生 `<a>` 一覧を共通 `NavList` へ統合
- hearing detail の明示的な印刷 Button / `window.print` 起動の除去

## 4. 含まないもの

- 全文 nowrap、サイドバー幅の拡大、画面別 CSS、ゼロ幅文字
- legal 本文と print stylesheet の削除
- 全ページ印刷の新規実装（将来課題 `HarnessHub-wx4h`）
- revision conflict / CAS 処理の変更
