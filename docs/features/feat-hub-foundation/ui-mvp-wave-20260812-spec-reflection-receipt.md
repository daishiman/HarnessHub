---
status: accepted
layer: feature-spec-reflection
spec_impact: reflected
reviewed_at: 2026-08-12
feature_node_id: feat-hub-foundation
dev_graph_node_id: issue-ui-identifier-display-name-20260811
beads_ids:
  - HarnessHub-62ah
  - HarnessHub-2mu6
  - HarnessHub-oanz
  - HarnessHub-z45h
  - HarnessHub-vaov
  - HarnessHub-ck3d
  - HarnessHub-5yen
---

# UI MVP wave 2026-08-12 仕様反映受領書

## 1. 依頼と目的

今回変更中の UI 一貫性・情報設計・表示名まわりを最終レビューし、実装・task 仕様・正規仕様・Beads・draft PR を同じ契約へ揃える。読める表示名、一覧の操作性、取得失敗と操作失敗の分離、route surface の台帳閉じを MVP として出荷する。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。ただし認可境界・DB schema・公開 API の判定結果は不変。
- 反映先: `docs/`（UI foundation・screen-inventory・security authentication・information-design sheets）、`specs/harness-hub-ui-foundation-addendum.md`、`architecture/harness-hub-frontend.md`、本受領書、関連 issue nodes。
- **system-spec の R4-reopen は不要**と判断した。理由: 認可 claim 集合と deny 規則は変わらず、追加した `name` / `workspace_names` は optional の表示専用で、到達可否・role 判定・edge middleware の入力に使わない。既存の frontend / ui-ux / auth 確定章を逸脱する新規 qa 番号は発生していない。
- 生成物 `tokens.css` が 500 行を超えるが、正本は `tokens.ts` / `base-css.ts`（いずれも 500 行以下）で、成果物は `gen:tokens-css` の出力として exempt。手書きの変更対象は 500 行以下。
- Project 名の解決（HarnessHub-62ah 第2段）は `createScopedCrud` の workspace scope 欠落（HarnessHub-pwph）が前提のため本 wave の scope 外。

## 3. 仕様影響の判断理由

| 観点 | 判断 |
|---|---|
| 単なる内部リファクタか | いいえ。session 表示 claim、IdBadge、ListState、FilterBar、route surface 台帳を契約化した |
| 認可・security 境界が変わるか | いいえ。判定は従来どおり `workspace_ids` / role / status。表示 claim は optional で判定禁止 |
| 操作契約が変わるか | はい。一覧の sticky 列・条件記憶・絞り込み確定、エラー状態の排他、見出し sticky を共通化した |
| 外部データ契約が変わるか | いいえ。DB 列・公開 REST の意味は不変。session JWT に optional 表示フィールドを追加しただけ |

## 4. 正規反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | R4-reopen なし（判断理由は §2）。auth/frontend 章の qa 番号追加なし |
| `specs/` | UI 基盤追補の resource_scope / surface 契約追記 |
| `architecture/` | frontend 2026-08-12 節（表示名・情報設計・ListState） |
| `features/` | 各 feature の `information-design/*.md`、本受領書 |
| `tasks/` | feat-hub-foundation P13 追補実行記録 |
| `docs/` | UI foundation guide、screen-inventory、security authentication、product backlog |
| Dev Graph / Beads | primary node `issue-ui-identifier-display-name-20260811` と関連 issue |

## 5. 実装レビュー（MVP・最小）

### 受け入れできたもの

1. ヘッダーの利用者・Workspace は表示名が取れたときだけ名前体裁、否则 IdBadge。
2. session に名前が無い場合・cookie 上限超過時に表示 claim を落としてもサインインと到達範囲を維持。
3. 主要一覧の列 sticky / 並べ替え / 条件記憶 / ListState 排他。
4. route surface 表と information-design sheet・test evidence の対応。
5. dark/light/auto の `color-scheme` 宣言と tokens 再生成。

### 残すもの

| Beads | 内容 | 理由 |
|---|---|---|
| HarnessHub-62ah 第2段 | Project 名の解決 | HarnessHub-pwph（crud workspace scope）が前提 |
| HarnessHub-5yen | 規約本文の差し替え | 法務確認済み本文の提供待ち（差し込み口のみ完了） |
| HarnessHub-p26n | 相対日時の併記 | 本 wave は絶対日時 (JST) の統一まで |
| HarnessHub-7mc6 | Linux VRT baseline | CI 環境でのみ更新 |
| HarnessHub-preq | navigation VRT 意図差分 | 別課題で baseline 確定済みメモあり |

## 6. 品質ゲート（MVP 最小）

| ゲート | 結果 |
|---|---|
| task spec: `feature-package-feat-hub-foundation` | PASS。`violations: []`、`contract_baseline_exemption: true` |
| screen-inventory closure | PASS。`tests/specs/test_screen_inventory_closure.py` 5 passed |
| typecheck (schemas / db / ui / hub) | PASS |
| packages/ui test | PASS |
| packages/schemas test | PASS |
| packages/db workspaces-repo | PASS。16 tests |
| hub focused (ui-shell / ui-foundation / workspace-switch) | PASS。14 files / 125 tests |
| 無関係差分の混入 | rubric 自動生成・無関係 eval-log は commit 対象外 |

## 7. 説明

### 中学生向け

画面に並んでいた長い英数字の ID を、できるだけ「山田さん」「営業部」のような名前で出すようにした。表も探しやすくし、読み込み失敗と保存失敗を別々に出す。どの画面も同じ組み立て方で作る。

### 専門向け

optional session claims で presentation と authorization を分離し、cookie 上限時は表示 claim のみを drop する fail-open for reachability を採った。情報設計は screen-inventory を SSOT、sheet を根拠、closure test を全単射検査とする。`packages/ui` が IdBadge / ListState / FilterBar / sticky stack の owner、`apps/hub` が session・route・業務データを結線する。
