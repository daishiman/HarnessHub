---
status: confirmed
category: maintenance-ops
aggregate: 確定
spec_cells: [maintenance-ops.web, maintenance-ops.mobile, maintenance-ops.tablet, maintenance-ops.desktop-windows, maintenance-ops.desktop-linux, maintenance-ops.desktop-macos]
serves_goals: [G1, G2, G5]
---

# 保守運用管理 (maintenance-ops)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-058 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。運用対象は Hub (web) と作者環境 (macOS/Windows) のみ |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。運用対象は Hub (web) と作者環境 (macOS/Windows) のみ |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-044 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-044 |

## 確定内容 (質疑録)

### qa-058 (対応セル: web)

**質問**: 構築優先順位 P0-P5 に伴う監視・運用の段階的有効化 (docs/infrastructure-spec.md §13・docs/shared-layers.md の 2026-07-18 追記) を保守運用仕様へ反映するか。

**回答**: 監視・運用ジョブは必要 phase で段階的に有効化する: P1 で AiJob キュー滞留監視 (qa-027 の監視対象) と生成完了通知、P2 で orphan 通知 (承認 queue UI は P5 でも監査記録は P2 から有効)、P4 で metrics rollup cron・Turso 使用量監視・週次通知、P5 で dashboard/承認/監査 UI 向け route の外形確認。P0 時点では metrics rollup・週次サマリー・dashboard monitor を有効化しない。AI 処理主体の表記は D5 確定 (pull 型 = Claude Code セッション消費・サーバ側 AI 課金なし) へ統一 (旧「D5 候補」表記の解消)。既確定の監視・バックアップ・運用手順 (qa-027 ほか) は不変で有効化タイミングだけを追加確定。

### qa-044 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者デスクトップ環境 (macOS / Windows) の保守運用 (更新導線・サポート・資格情報とローカル環境の維持) は何を正本とするか? (C07 監査指摘への対応: maintenance-ops.desktop-windows/desktop-macos の qa_ref=qa-011 は Hub web 側運用中心の回答で desktop 固有の裏付けが薄い。既確定内容の集約による専用質疑化であり新規決定は含まない)

**回答**: 既確定の qa-011 / qa-027 / qa-039 / qa-041 の desktop 該当部分を maintenance-ops.desktop の専用正本として集約確定する。(1) plugin 更新導線 (qa-011): 作者環境の Publisher / Skill 更新は marketplace / Bootstrap Installer の更新導線 (「更新あり」表示 + 手動 update) で提供し、自動強制更新はしない。(2) 作者サポート (qa-011): 相談は予約制 office hour (供給上限あり §11.3)。(3) 退職・棚卸し (qa-027): 四半期のユーザー棚卸し (退職者アカウント無効化・owner 再割当確認) は作者デスクトップの token 失効 (Hub Web からの即時失効 = qa-041) と対にして実施する。(4) ローカル環境の維持 (qa-039): CI と同一実装の pnpm verify (lint/typecheck/test/bundle size) を local から実行可能に保ち「local では通るが CI で落ちる」を構造的に減らす。pre-commit hook (lint/format/secret scan) は早期検知の補助で、正本の遮断は CI 側。(5) 資格情報のインシデント初動 (qa-041): token 窃取疑い時は Hub Web から失効 → family 全失効 → 監査確認 (docs/security-spec.md §8.6)。refresh token 再利用検知は provider-admin + 該当 workspace-admin へ即時通知。(6) 障害縮退 (qa-011 維持): Hub 障害時も作者環境の導入済み Skill・公開済み Web App は動作継続し、新規公開・追加・更新のみ停止する。本 qa は maintenance-ops.desktop 行への接地点を提供し、詳細 runbook は maintenance-ops (qa-011/qa-027) の web 行確定に従属する。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Clean Code — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/clean-code.md`

#### 目的

codeを、次の変更者が意図・制約・failureを短時間で理解し、安全に変更・検証できる作業媒体にする。

#### 解決する問題

- 名前と抽象度が意図を表さず、readerが実装詳細からbusiness ruleを逆算する。
- 一つの変更理由が複数moduleへ散り、副作用とerror pathを予測できない。
- 重複したruleが別々に更新され、仕様のSSOTが崩れる。
- testがimplementation detailへ結合し、refactoringを妨げる。

#### 適用条件

- 複数人・長期保守・高変更頻度・重要ruleがあり、理解と変更の費用が支配的。
- test/lint/review/observabilityで改善効果をfeedbackできる。
- domain languageとcoding conventionをteamで合意・更新できる。

#### 非適用条件

- throwaway explorationでは全規則を先行適用せず、学習後に残すcodeだけを整理する。
- generated/vendor codeへ手動styleを強制しない。generation inputとboundaryを管理する。
- 短い関数、class化、DRY等を絶対値として扱い、局所的な明瞭さを悪化させる場合は適用しない。

#### トレードオフ・失敗モード

- naming/refactoring/testへ時間を使うため、寿命とriskが低いcodeでは投資超過になり得る。
- micro-function化でcontrol flowが多数fileへ散り、かえって読みにくくなる。
- DRYを急ぎ、異なるdomain conceptを一つの抽象へ結合して変更を難しくする。
- commentを全否定して、理由、trade-off、外部制約、security decisionまで消す。
- coverageやlint scoreを目的化し、重要behaviorの未検証を隠す。

#### goalへの寄与

- goalに関わるbusiness ruleを名前とtestで明示し、仕様→code→evidenceのtraceを短くする。
- maintenance objectiveには変更lead time、review指摘、escaped defect、rollback率などのoutcomeを使う。
- 無料toolの導入自体を成功とせず、teamが継続運用でき、重要riskを減らすかで判断する。

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
