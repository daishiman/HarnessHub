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
  - HarnessHub-p26n
  - HarnessHub-pwph
  - HarnessHub-nqo5
  - HarnessHub-preq
---

# UI MVP wave 2026-08-12 仕様反映受領書

## 1. 依頼と目的

今回変更中の UI 一貫性・情報設計・表示名まわりを最終レビューし、実装・task 仕様・正規仕様・Beads・draft PR を同じ契約へ揃える。読める表示名、一覧の探しやすさ、取得失敗と操作失敗の分離、route surface の台帳閉じ、相対日時併記、一覧検索の安全な共通化を MVP として出荷する。

## 2. 結論

- **仕様・設計影響: あり (`reflected`)**。認可境界・DB 列の意味・公開 API の deny 判定は不変。一覧の任意検索語 (`q`) と metrics の `rankingTotals` は **既存 endpoint への加算契約**であり、到達可否や role 判定は変えない。
- 反映先: `docs/`（UI foundation・screen-inventory）、`specs/harness-hub-ui-foundation-addendum.md`、`architecture/harness-hub-frontend.md`、`features/feat-hub-foundation.md`、`tasks/feat-hub-foundation/sys-hub-foundation-p13.md`、本受領書、関連 issue nodes。
- **system-spec の R4-reopen は不要**と判断した。理由:
  1. 認可 claim 集合と deny 規則は不変。`name` / `workspace_names` は optional の表示専用。
  2. 一覧 `q` は既存 list/export の **任意クエリ**で、対象列は各 domain の schema JSDoc が正本。空白のみ拒否と LIKE メタ文字エスケープは安全側の実装契約であり、新 qa を要する業務規則ではない。
  3. `rankingTotals` は ranking 上位 N 件では数えられない母集団を返す加算フィールドで、KPI の意味定義を変えない。
  4. 相対日時は presentation のみ（絶対表記を消さない、JST カレンダー日差、30 日上限）。
- 生成物 `tokens.css` が 500 行を超えるが、正本は `tokens.ts` / `base-css.ts`（いずれも 500 行以下）で、成果物は `gen:tokens-css` の出力として exempt。手書きの変更対象は 500 行以下（`packages/ui/src/shell/information.tsx` 447 行、`DataTable.tsx` 494 行）。
- Project 名解決（HarnessHub-62ah 第2段）は `HarnessHub-pwph` 完了後に実装済み。残る follow-up は法務本文・Linux VRT・session cookie 上限など。

## 3. 仕様影響の判断理由

| 観点 | 判断 |
|---|---|
| 単なる内部リファクタか | いいえ。session 表示 claim、IdBadge、ListState、FilterBar、DateTimeText、route surface 台帳、list search を契約化した |
| 認可・security 境界が変わるか | いいえ。判定は従来どおり `workspace_ids` / role / status。表示 claim は判定禁止。salary は検索対象外 |
| 操作契約が変わるか | はい。一覧 sticky・条件記憶・ヘッダー検索結線・相対日時併記・失敗状態の排他 |
| 外部データ契約が変わるか | **加算のみ**。DB 列は不変。list/export の任意 `q`、metrics の `rankingTotals`、session の optional 表示 claim を追加 |

## 4. 正規反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/` | R4-reopen なし（判断理由は §2）。auth/frontend 章の qa 番号追加なし |
| `specs/` | UI 基盤追補の surface / 一覧検索 / 日時契約追記 |
| `architecture/` | frontend 2026-08-12 節（表示名・情報設計・ListState・DateTimeText・list search） |
| `features/` | `feat-hub-foundation.md` 追記、information-design sheets、本受領書 |
| `tasks/` | feat-hub-foundation P13 追補実行記録（exact-13 に 14 個目は追加しない） |
| `docs/` | UI foundation guide、screen-inventory |
| Dev Graph / Beads | primary node `issue-ui-identifier-display-name-20260811` と関連 issue |

## 5. 実装レビュー（MVP・最小）

### 受け入れできたもの

1. ヘッダーの利用者・Workspace は表示名が取れたときだけ名前体裁、否则 IdBadge。Project 名も名称主表示・ID は送信値。
2. session に名前が無い場合・cookie 上限超過時に表示 claim を落としてもサインインと到達範囲を維持。
3. 主要一覧の列 sticky / 並べ替え / 条件記憶 / ListState 排他。
4. route surface 表と information-design sheet・test evidence の対応（closure + screen-pattern gate）。
5. dark/light/auto の `color-scheme` 宣言と tokens 再生成。
6. 日時は絶対表記 (JST) を常に残し、直近 30 日は `DateTimeText` で相対表記を描画後併記。
7. docs / feedback / users / sheets のヘッダー検索と `q` 契約。LIKE `%`/`_` は repository 共通でエスケープ。
8. metrics ranking はサーバ側で上位 N 件に切り、`rankingTotals` で稼働率の母集団を返す。
9. 係数既定値と wizard 試算プレビューの単一出所化（client bundle に drizzle を入れない）。

### 残すもの

| Beads | 内容 | 理由 |
|---|---|---|
| HarnessHub-5yen | 規約本文の差し替え | 法務確認済み本文の提供待ち（差し込み口のみ完了） |
| HarnessHub-7mc6 | Linux VRT baseline | CI/Linux ランナー上でのみ更新可 |
| HarnessHub-alyy | session cookie workspace_ids 上限 | 認証方式の作り替えが必要。UI wave に混ぜない |
| HarnessHub-ydf8 | docs master-detail 要否の実測 | 情報設計の future gate。今回は layout を先に作らない |
| HarnessHub-9wdm | required-info 回答の writer 接地 | 親 PR #699 から分離済み |

## 6. 品質ゲート（MVP 最小）

| ゲート | 結果 |
|---|---|
| task spec: `feature-package-feat-hub-foundation` | PASS。`violations: []`、`contract_baseline_exemption: true` |
| screen-inventory closure | PASS。5 tests |
| schemas typecheck + metrics contracts | PASS。30 tests |
| db typecheck + search/metrics | PASS。18 tests |
| hub focused (nav/metrics/relative-time/screen-pattern/users/hearing/coefficients) | PASS。9 files / 107 tests（1 todo） |
| 無関係差分の混入 | `eval-log/review-queue.jsonl` と rubric 提案は commit 対象外 |

## 7. 説明

### 中学生向け

画面に並んでいた長い英数字の ID を、できるだけ「山田さん」「営業部」のような名前で出すようにした。表も探しやすくし、読み込み失敗と保存失敗を別々に出す。日付は「2026/08/12 10:00」に加えて、近いものだけ「3 日前」も一緒に出す。どの画面も同じ部品で組み立てる。

### 専門向け

optional session claims で presentation と authorization を分離し、cookie 上限時は表示 claim のみを drop する fail-open for reachability を採った。情報設計は screen-inventory を SSOT、sheet を根拠、closure test と screen-pattern gate で片側更新を検出する。list search は `listSearchTermSchema` + `containsTerm`/`ESCAPE` の単一 writer。相対日時は hydration-safe に描画後付与し、絶対表記を消さない。`packages/ui` が IdBadge / ListState / FilterBar / sticky stack の owner、`apps/hub` が session・route・業務データを結線する。
