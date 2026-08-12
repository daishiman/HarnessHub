---
graph_node_id: "arch-harness-hub-frontend-ui-mvp-wave"
artifact_kind: "architecture"
artifact_subtypes: ["frontend"]
project_id: "harness-hub"
title: "Harness Hub Frontend — UI MVP wave (2026-08-12)"
status: "active"
parent: "arch-harness-hub-frontend"
---

# Frontend UI MVP wave (2026-08-12)

親: [harness-hub-frontend.md](./harness-hub-frontend.md)。300 行上限のため wave 詳細を分離する。

## 表示名

- session claims に optional の `name` / `workspace_names` を載せる。
- 解決は `apps/hub/src/lib/auth/display-name.ts`（氏名 → メール → 無し）。
- 人が読めない値は `IdBadge` へ落とす。
- 認可判定は `workspace_ids` / role / status のみ。表示 claim は到達可否に使わない。
- cookie 4096B を越えそうなときは表示名だけを捨てる。
- Project 名は名称を主表示し、API 送信値は ID のまま（取得失敗時のみ IdBadge へ縮退）。

## 情報設計の閉じ方

- route surface profile の正本は `docs/screen-inventory.md`。
- 画面ごとの取捨と pattern 選定根拠は `docs/features/*/information-design/*.md`。
- 全単射検査は `tests/specs/test_screen_inventory_closure.py`。
- pattern と実装印の突き合わせは `apps/hub/tests/ui-foundation/screen-pattern-gate.test.ts`
  （判定件数 0 と違反 0 を区別する）。

## 一覧・状態

- `DataTable` sticky 先頭列、`FilterBar` + 条件記憶、`ListState` で
  取得失敗 / 読込中 / 0 件 / 中身を排他表示。
- ヘッダー検索 (`?q=`) は一覧 API が実際に `q` を処理する領域だけに結線する
  （docs / feedback / users / sheets 等）。
- 検索語は `listSearchTermSchema`、SQL 側は `packages/db/repository/search.ts` の
  `containsTerm`（LIKE メタ文字 ESCAPE）へ一本化する。
- salary 等のマスク対象は検索列に入れない。

## 日時

- 絶対表記は `formatDate` / `formatDateTime`（JST 固定）。
- 相対表記は `DateTimeText` が描画後に併記する（hydration 不一致回避。上限 30 日）。
- 絶対表記は消さない。

## metrics

- ranking はサーバ側で上位 `METRICS_RANKING_LIMIT` 件に切る。
- 母集団は `rankingTotals` で返す（画面側で全件を切らない）。

## 見た目の基盤

- dark/light/auto すべてに `color-scheme` を宣言。
- sticky の重なり順は shell > screen header > table header。
- 公開画面は sticky 要否を `StickyHeaderOffset` と共通 shell 契約で扱う。

## 正本

- [UI 基盤追補](../specs/harness-hub-ui-foundation-addendum.md)
- [UI foundation guide](../docs/frontend-ui-foundation-spec.md)
- [認証](../docs/security-spec-authentication.md)
- 受領 [2026-08-12 wave](../docs/features/feat-hub-foundation/ui-mvp-wave-20260812-spec-reflection-receipt.md)
