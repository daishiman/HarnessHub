---
status: accepted
layer: feature-information-design
feature: feat-user-org-admin
surface_sheet: true
reviewed_at: 2026-08-12
---

# S18 Notion 連携設定 情報設計シート

## 利用文脈

member 以上は現在の workspace 共有設定を確認し、登録済みのページへ到達する。workspace-admin 以上は、Notion ページ URL または Integration API キーの登録・変更・解除を行う。API キーは秘密情報のため、member には変更用の入力欄や操作を表示しない。

## 画面プロファイル

Surface: `S18.NOTION` / route: `/settings/notion`。role、task-mode、density、wide/middle/narrow pattern、sticky policy は `docs/screen-inventory.md` の同 surface 行だけを正本とする。

## 表示項目と権限境界

| 対象 | member+ | workspace-admin+ | 表示加工 |
|---|---|---|---|
| 連携方式 | 閲覧 | 閲覧・変更 | URL 方式 / API キー方式 |
| ページ URL | 閲覧 | 閲覧・変更 | 未登録は「未登録」 |
| API キー | 末尾 4 文字のマスクのみ | マスク閲覧・新規値の入力 | 平文は DOM と応答に出さない |
| 保存・解除 | 表示しない | 実行可 | API 側も同じ action で再検査 |

読取りと変更の capability を同じ画面内で分ける。ボタンを disabled で残すと「条件を満たせば押せる」と読めるため、member の DOM には変更操作を作らず、管理者への依頼を文で示す。

## pattern 選定

| 候補 | 判定 |
|---|---|
| 現在値の定義リスト + 管理者向けフォーム | 1 件の workspace 設定を読んだ後、権限がある人だけが同じ面で変更できる。**採用** |
| table | 対象が 1 件で比較が無いため不採用 |
| 別 route の閲覧面と編集面 | 導線と状態を二重化するため不採用 |

## 成功指標と証跡境界

- machine gate: member の DOM に保存・解除が無いこと、workspace-admin のみ到達できること、応答が API キー平文を含まないこと。
- manual gate: 閲覧のみの利用者が「なぜ変更できないか」と次の依頼先を理解できること。
