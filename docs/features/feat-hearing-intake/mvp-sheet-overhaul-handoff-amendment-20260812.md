---
status: accepted
layer: feature-handoff-amendment
task: issue-hearing-sheet-overhaul-20260812
beads_id: HarnessHub-a70b
parent_feature: feat-hearing-intake
recorded_at: 2026-08-12
---

# feat-hearing-intake MVP 追補 (シート作成 UX 刷新 / 2026-08-12)

promoted exact-13 package (`tasks/feat-hearing-intake/sys-hearing-intake-p01.md` 〜 `sys-hearing-intake-p13.md`) は改変しない。
本ファイルは実装後の additive 投影であり、P01〜P13 の正本を置き換えない。

## 変更要約

| 項目 | 変更前 | 変更後 |
|---|---|---|
| S10 画面数 | 8 画面 (整理・まとめ + 確認が分離) | **7 画面** (最終段を「整理・確認」に統合) |
| profile enum | 各軸 4〜5 + unknown | **加算のみ** (用途+3 / 役割+2 / 文脈+2 / 動機+2 / 共有意図+2 / 優先度+2) |
| 作成時添付 | S12 のみ (案内だけ) | **ウィザードでステージング** → 送信後に順次 upload (25MB・画像/動画/CSV/Excel) |
| 情報源 / 本当の課題 | UI 未配線または欠落 | 現状・用途プロファイルで入力可 |
| S12 申請時入力 | 5 項目のみ | **form_snapshot 全項目を論理グループ表示** |
| S17 個別詳細 | 氏名・在籍のみ | **email / 最終ログイン** を読み取り表示 |

## 不変条件

- FormData 入力は 30 項目、保存 snapshot は `salary` を除く 29 項目 (契約フィールド数は維持。enum 値だけ拡張)。
- 既存 enum 値の削除・改名はしない (旧 snapshot 互換)。
- AI キュー (`kind=sheet_generation`)、受付番号、tenant 認可、公開 token 契約は不変。
- DB migration は不要 (JSON 値の enum 加算と UI のみ)。

## タスク仕様への投影

| 関連 phase | 投影内容 |
|---|---|
| P05 実装 | ウィザード UI・添付ステージング・詳細表示の実装差分 |
| P04/P06 テスト | attachment-validation / wizard-interactions の追加 |
| P12 運用 | runbook の 7 画面・作成時添付の記述 |
