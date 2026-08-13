---
status: accepted
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-13
feature_node_id: feat-hub-foundation
dev_graph_node_id: issue-visual-system-v2-20260813
beads_ids:
  - HarnessHub-l0o6
---

# 配色仕様書 v2 仕様反映受領書

## 1. 依頼と目的

配色仕様書 v2 を共通 token / shell へ実装した差分を最終レビューし、仕様・設計へ戻す。見た目の正本がコードと文書で別方向へ進むことを防ぐ。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。
- 公開 API、DB schema、認証認可判定、Cloudflare deploy unit は変更しない。
- 確定質疑 qa-226 の「md=768」逐語は今回 R4-reopen していない。実装正本は `breakpointTokens` と UI 基盤追補 FR-UIF-003/014。正式 reopen は残課題。
- `origin/main` (`d373c75f`) は local `main` と一致済み。その local `main` を本 branch へ merge した。

## 3. 仕様影響の判断理由

| 観点 | 判断 |
|---|---|
| 単なる内部リファクタリングか | いいえ。色・書体・幅・現在地判定が利用者に見える |
| 数値契約が変わるか | はい。md 768→640、lg 1120→1024、sidebar 220→212 |
| 品質ゲートが変わるか | いいえ。検査 viewport 360/768/1280 と VRT 契約は維持 |
| 外部データ契約が変わるか | いいえ。API・DB・認可結果は不変 |

## 4. 正規反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | frontend / ui-ux へ post-compile writeback |
| `specs/` | UI 基盤追補 FR-UIF-003/014 と implementation-writebacks |
| `architecture/` | harness-hub-frontend の token / breakpoint 境界 |
| `features/` | feat-hub-foundation の post-closeout 追補 |
| `tasks/` | P12 追補実行記録 |
| `docs/` | frontend-spec / UI foundation / responsive / screen-inventory / 本受領書 |
| Beads | 本 issue の最終レビュー・検証・PR 状態を notes へ追記 |

## 5. 実装レビュー結果

- 色はグラファイト × アンバー。AI専用色は廃止し、`accent` は動作中専用。
- IBM Plex Sans / JetBrains Mono を `next/font` で self-host し、日本語はシステムフォントへ落とす。root layout が CSS 変数を全画面へ配る。
- `resolveCurrentNavTarget` を Sidebar / MobileTabBar へ配線し、`/metrics` と `/metrics/usage` の二重現在地を止めた。
- Card / Panel だけ `radius.card=10px`。他の `md` 消費者は動かさない。
- 無関係な skill kit / installer 差分は commit しない。

## 6. 品質ゲート

| ゲート | 結果 |
|---|---|
| task spec validator (`feat-hub-foundation`) | pass、violations `[]`、digest `8735bb…`（legacy baseline exemption） |
| UI focused | 3 files / 163 tests PASS（shell / tokens / base-css） |
| Hub focused | 3 files / 29 tests PASS（nav-and-shell / a11y / oidc-admin-a11y） |
| diff whitespace | `git diff --check` PASS（対象 path） |

x64 Node では `@rollup/rollup-darwin-x64` が無く Vitest を起動できない。arm64 Node (`/opt/homebrew/bin/node`) で focused 実行した。Linux VRT と repository 全量 `pnpm verify` は MVP 範囲外。

## 7. 残課題

1. qa-226 の md=768 逐語は FR-UIF-003 の `md=641` により上書き済み。
2. Linux VRT baseline の再取得。
3. 本番デプロイ後の実画面確認。

## 8. 説明

### 中学生向け

画面の色を青や紫から、鉛筆の灰色と少しのオレンジに変えた。文字も読みやすい組み合わせにした。スマホとパソコンの切り替わる幅も、新しい見た目の指定に合わせた。

### 専門向け

`packages/ui` の semantic token を Option A（グラファイト × アンバー）へ置換し、`breakpointTokens` を 480/641/1025 にした。nav 現在地は prefix 一致のまま最長一致へ畳む。仕様は addendum + post-compile writeback へ還流した。
