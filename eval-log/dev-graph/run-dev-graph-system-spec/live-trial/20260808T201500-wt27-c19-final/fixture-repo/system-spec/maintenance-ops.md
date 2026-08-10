---
status: confirmed
category: maintenance-ops
aggregate: 確定
spec_cells: [maintenance-ops.web, maintenance-ops.mobile, maintenance-ops.tablet, maintenance-ops.desktop-windows, maintenance-ops.desktop-linux, maintenance-ops.desktop-macos]
serves_goals: [G3, G4]
---

# 保守運用管理 (maintenance-ops)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-028 |
| モバイル (mobile) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、モバイル向け成果物を作らないため |
| タブレット (tablet) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、タブレット向け成果物を作らないため |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |

## 確定内容 (質疑録)

### qa-028 (対応セル: web)

**質問**: 保守運用管理 × Web (web) について、ログ・稼働確認・バックアップ/復旧手順の運用をどうしますか。その運用にした設計上の理由と、監視の送信先をどう扱うかも併せて教えてください。

**回答**: 構造化ログを標準出力へ、`/health` で稼働確認、バックアップ/復旧手順を README 化。監視の外部送信は行わない。

【適用した上流指針・設計原則と、その原則がこの要件になった理由】
- Google SRE (operations concern) の可観測性原則 → 確定内容の『構造化ログを標準出力へ・`/health` で稼働確認』 → 監視基盤を別途常駐させずに状態を判別できるようにし、G4 を守りながら G3 の異常検知を可能にするため。
- 同 SRE 原則の「監視は目的に従属する」帰結 → 確定内容の『監視の外部送信は行わない』 → 可観測性の追加が G1 を侵さないよう、送出先を標準出力とローカル参照に限定するため。
- Clean Code (`clean-code.md`) の「意図を明示する」原則を運用文書へ適用 → 確定内容の『バックアップ/復旧手順を README 化』 → 唯一の運用者 (本人) が時間を置いても手順を再現でき、G4 のバックアップ運用が属人的記憶に依存しないようにするため。

(上流指針: Google SRE (operations) / deep card: clean-code.md。上の各 - は 1 論点で、spec-state-contract の「qa_log の論点分離」に従い qa-028-p1..p3 として分離索引 entry も追記している。)

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

---

#### 本章での適用

- 上記原則は確定内容 qa-028 (対応セル: web) の判断へ適用する
- 資するゴール: G3, G4

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
