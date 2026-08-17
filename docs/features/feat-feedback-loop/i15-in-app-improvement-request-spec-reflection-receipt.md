---
status: recorded
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-uypz
  - HarnessHub-m0bd
  - HarnessHub-eiky
  - HarnessHub-duej
  - HarnessHub-9wdm
dev_graph_node_ids:
  - issue-in-app-improvement-request-spec-20260817
  - issue-audit-multi-dispatch-null-verdict-20260808
  - issue-c19-live-trial-rerun-task-contract-r2-20260803
related_feature: feat-feedback-loop
spec_impact: reflected
recorded_at: 2026-08-17
---

# I15 画面内改善要望 — 仕様反映受領書

## 1. 何を言われて・何をやったか

今回変更している作業ツリーの最終レビューを依頼された。目的は、画面内改善要望 (I15)
の確定仕様と、それを正規フローで取り込むハーネス補正を、無関係差分を混ぜずに公開できる
状態にすること。背景は、本 worktree で system-spec ヒアリング〜compile〜C19 import まで
走らせ、qa-232 以降と D9–D12 が confirmed になったこと。

## 2. 結論

**製品仕様への影響はある。** I15 と D9–D12 を system-spec 正規フローで確定し、
`system-spec/`・`specs/`・`architecture/` へ取り込んだ。Hub の画面・API・DB 実装は
この PR に含めない。

**開発パイプライン内部契約にも影響がある。** 監査 fork 台帳を schema 1.3
（SubagentStop 完了行 + dispatch token）へ進め、C19 resume を 4 gate に揃え、
C04 に system-spec snapshot validator を足した。

## 3. TL;DR

画面を離れずに改善要望を送る約束を仕様書へ正式に書いた。サイトそのものはまだ作っていない。

## 4. 層ごとの反映

| 層 | 判定 | 内容 |
|---|---|---|
| `system-spec/` | 反映済み | qa-232 以降、I15、D9–D12、章本文、fetched-references、completeness PASS、resume-receipt |
| `specs/` | 反映済み | C19 が `specs/system-spec-index.md` を登録 |
| `architecture/` | 反映済み | `architecture/system-spec-overview.md` を登録。frontend/backend/dev-workflow に I15 / schema 1.3 を追記 |
| `features/` | 追跡のみ | `feat-feedback-loop` の exact-13 目的は不変。I15 は追補として related_nodes に接続 |
| `docs/` | 反映済み | 本受領書と I15 addendum。P01 baseline は書き換えない |
| `tasks/` | handoff 追加 | 凍結済み P01–P13 は手編集せず、I15 handoff を追加 |

## 5. ハーネス側の変更要約

1. **監査台帳 schema 1.3** (`HarnessHub-uypz`): 非同期 fork は PostToolUse だけでは
   pending のまま残る。`SubagentStop` を第 2 writer にし、`AUDIT_DISPATCH` token で
   dispatch 行と completion 行を exact join する。
2. **C19** (`HarnessHub-m0bd`): resume は coverage / source_citation / knowledge_graph /
   evaluator の 4 gate。最終 live-trial `20260817T094952Z-mp9j-c19-r6-final` は PASS。
3. **doc-fetch** (`HarnessHub-eiky`): 実取得と版ドリフト検査を skill / assembler 側へ降ろす。
4. **C04 snapshot** : requirements が C19 の 4 gate snapshot を正規 validator で見る。
5. **required-info / evidence parity** (`HarnessHub-9wdm` / `HarnessHub-duej`):
   本 PR に混在する writer/validator 補正は含めるが、残る compile writeback 差分は残課題。

## 6. 検証結果（MVP 最小）

| 検証 | 結果 |
|---|---|
| completeness-report | PASS（digest `7ed726cf…5426b`） |
| C19 live-trial r6-final | PASS / nudge 0 / gate 0 |
| C04 live-trial r2 | PASS |
| focused pytest | 本レビューで再実行 |
| `validate-system-plan.py` feat-feedback-loop | 本レビューで再実行 |
| Hub アプリの browser 検証 | 対象外（実装なし） |

## 7. 残課題

1. I15 の Hub 実装（常設ボタン、撮影、診断、専用 R2、GitHub 出口）。別 issue で起こす。
2. `HarnessHub-uypz` の current runtime 3 並列 live-trial は schema 1.3 でも正式許可しない。
3. `HarnessHub-duej` の checked-in compile parity の残り。
4. rubric 1.3.2 文言（PG-001/002）は別変更のため本 PR に含めない。

## 8. 開発内容の説明

### 中学生向け

今見ている画面のまま「ここを直して」と送れるようにする約束を、仕様書に書いた。
送る人は短い文章と印をつけるだけ。裏側で画面の写真と、壊れた理由のメモが付く。
先生役の AI が読むための GitHub のチケットにも、同じ内容が重複せず載る約束にした。
まだ実際のボタンは画面に付いていない。

### 専門

I15 は authenticated surface の常設 widget。キャプチャは `modern-screenshot` の
`domToCanvas`（getDisplayMedia は許可ダイアログで体験が折れるため不採用）。
診断は総量 32KB・指示文 60,000 文字予算。出口は GitHub Issue + Contents API
（token は Workers Secret、Issues/Contents の read-write、対象 1 repo）。
画像は専用 R2。クライアントは Octokit ではなく fetch 薄実装。
冪等は submission key と本文ハッシュ。本 PR は仕様とハーネスのみ。
