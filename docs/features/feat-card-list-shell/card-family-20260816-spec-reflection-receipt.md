---
status: recorded
layer: feature-spec-reflection
task: feat-card-list-shell
beads_ids:
  - HarnessHub-ma7t
  - HarnessHub-iz3n
  - HarnessHub-9am.5
parent_feature: feat-card-list-shell
related_nodes:
  - feat-card-block-authoring
  - feat-build-pipeline-board
  - feat-metrics-tracking
  - feat-user-org-admin
recorded_at: 2026-08-16
spec_impact: reflected
dev_graph_node_id: feat-card-list-shell
---

# 成果物カード関連 製品実装 仕様反映受領書 (2026-08-16)

## 1. 依頼と目的

PR #727 で仕様だけ残していた一覧カードと本文カードブロックを製品へ落とし、
同じ作業ツリーにあった配色切替・計測 route 収束・Build カード編集も一緒に正本へ戻す。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。
- 確定 QA (qa-232 / qa-233) は reopen しない。契約は既に確定済みで、今回は実装 writeback。
- 新規契約は配色 5 種、`appearance.usage_read`、Build create/update、S09/S16 の正本 route。
  これらは `system-spec/` の確定章を書き換えず、architecture / specs writebacks / docs へ写した。

## 3. 判断理由

| 観点 | 判断 |
|---|---|
| 単なる内部リファクタリングか | いいえ。一覧の見え方、本文の書き方、配色、計測の URL が利用者に見える |
| 数値・データ契約が変わるか | はい。`status_counts`、palette、Build 編集列を純増する |
| 品質ゲートが変わるか | いいえ。G19 と既存 axe / VRT 経路を再利用する |
| 確定 QA を変えるか | いいえ。qa-232 / qa-233 の逐語は実装に落としただけで、回答本文は不変 |

## 4. 正規反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | 確定章は非変更。理由は §2 |
| `specs/` | implementation-writebacks へ本 wave を追記 |
| `architecture/` | frontend の正本 route、backend の create/update、data の 0016/0017、security の新 action、design-system の配色 |
| `features/` | list-shell / block-authoring を実装済みへ。metrics / build / user-org-admin へ追記 |
| `tasks/` | P05 / P12 へ実装追記 |
| `docs/` | screen-inventory、frontend-spec、本受領書、個別受領書 |
| Beads | ma7t / iz3n / 9am.5 の最終レビューと PR を notes へ追記 |

## 5. 品質ゲート (MVP 最小)

| ゲート | 結果 |
|---|---|
| `validate-system-plan.py` feat-build-pipeline-board / feat-metrics-tracking / feat-user-org-admin | pass、violations `[]` |
| `lint-ui-text-emoji.py` | 546 file、exit 0 |
| `validate-graph-schema.py` | valid、violations `[]` |
| Vitest UI (Markdown / DataTable / AppearancePicker / tokens) | 4 files / 481 passed |
| Vitest Hub (nav / redirect / appearance / build create / URL filter / 画面契約) | 18 files / 188 passed |
| Vitest DB (docs-cms / hearing-intake) | 2 files / 24 passed |

Vitest は初回、`@rollup/rollup-darwin-x64` 欠落で起動できなかった。`pnpm install --offline --frozen-lockfile` のあと再実行して GREEN。

## 6. 実装レビュー結果

- 3 一覧はカード既定。同じ DataTable column model から表へ切り替えられる。
- tab / q / filter は URL query。view mode だけ sessionStorage。
- `:::cards cols=2|3` は packages/ui の remark plugin。sanitize 差分は 2 要素 + 1 属性。
- `/metrics` → `/dashboard`、`/metrics/usage` → `/tracking` の 308。分析ナビの「ダッシュボード」は
  `/metrics` のまま残し、ホームと現在地が二重にならないようにした。
- 配色 5 種は token を CSS 変数で引き、AppearancePicker が token 表を client に載せない。
- Build create/update は admin 限定。sheet との 1:1 は unique index。

## 7. 残課題

1. 「状態不明」タブは件数表示のみで、行集合は「すべて」と同じ (API に unknown 述語が無い)。
2. S13 の正規 path `/pipeline` は未接続。当面 `/builds`。
3. 本番 migration 適用と実画面確認。
4. `/home` は未使用の重複面のため本 PR に含めない。
5. 所有境界 lint と callout VRT は前 wave の残。
