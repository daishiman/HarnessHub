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
| Web (web) | 確定 | 確定質疑: qa-027 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。運用対象は Hub (web) と作者環境 (macOS/Windows) のみ |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。運用対象は Hub (web) と作者環境 (macOS/Windows) のみ |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-044 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop は対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-044 |

## 確定内容 (質疑録)

### qa-027 (対応セル: web)

**質問**: Harness Studio mockup の反映で保守運用 (web) の確定内容はどう変わるか?

**回答**: qa-011/qa-019 で確定した保守運用方針 (/health・Workers logs/analytics・外部死活監視・SLO ダッシュボード・エラーバジェットアラート・バックアップ + 四半期 restore drill) を全面維持し、Studio 反映で以下を追加確定する。(1) AI キュー (D5 pull 型) の滞留監視: pull されない job の滞留時間を運用指標として可視化し、閾値超過で提供者へ滞留アラート (アプリ内通知) を出す。(2) メール送信 (D6 Resend) の運用: 送信失敗のリトライと失敗ログ、日次 100 通制限到達時のバッチ分割。アプリ内通知を常に正本とし、メール不達でも情報が欠けない設計を維持する。(3) 実行ログ ingest の異常値検知: 急増・重複を週次 rollup 時に検出し運用レポートへ含める (SEC5 の信頼性を運用側からも担保)。(4) ユーザー棚卸し: 退職者アカウントの無効化・owner 再割当の確認を四半期棚卸しに追加する (S17 の管理操作と対応)。

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
