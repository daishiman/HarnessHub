---
status: confirmed
layer: design-review
task: SYS-STAGE0-DISTRIBUTION-GATE-P03
parent_feature: feat-stage0-distribution-gate
feature_package_id: feature-package/feat-stage0-distribution-gate
source: docs/features/feat-stage0-distribution-gate/architecture-decision-record.md
feature_context_digest: sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a
architecture_refs: [arch-harness-hub-infrastructure]
reviewer_independence: P02 非著者による独立レビュー
cli_observed_version: "2.1.216"
cli_observed_at: "2026-07-20T22:30:41Z"
parent_doc: docs/features/feat-stage0-distribution-gate/design-review-notes.md
---

# feat-stage0-distribution-gate 設計レビュー — 環境・証拠区分 (P03)

> 親文書: [design-review-notes.md](design-review-notes.md)。Windows 実機不在の帰結と、レビュー記録における事実・推測の区分の詳細正本。

## 4. Windows 実機がこの環境に存在しないことの帰結

これは重点確認事項であり、独立に検証した結果 **本 feature 全体の最大のブロッカー**である。

**事実**: 実行環境は darwin である。R9 のとおり、`.github/workflows/` に Windows ランナーの定義はなく、リポジトリ全体を grep しても Windows 実機・Windows VM・windows-latest の調達手段への言及は**一切存在しない** (feature の要件文が「Windows E2E」と書いている箇所を除く)。

**各決定への効き方**:

| 決定 | 効き方 |
|---|---|
| D4 | **直撃**。A3 は Windows での install / 列挙 / 実行の 3 点成立を必須にする。実機がなければ手順 5 (skill の実行) は原理的に実施できない。D4 の「実行できない場合は `blocked` として記録し `pass` にしない」という規定により、**A3 は fail、baseline §7.2 により P07/P10/P13 と feature 完了はすべて fail-closed** になる |
| D3 | PowerShell スクリプトが**一度も実行検証されないまま P05 の成果物になる**。sh 側だけが検証済みという非対称が生じ、F-8 の「2 本構成の保守コスト」が実測されないまま D5 の判定に入る |
| D1 / D2 | 影響は小さい (macOS だけでも成立/不成立の判定は可能)。ただし A1 の canonical path 成功記録を macOS のみで取った場合、それが Windows でも成立するかは未検証のまま残る |
| D5 | 上記により A2 の前提 (A1-A3 が揃うまで登録しない、ADR D5 の「登録の前提」) が満たされず、**登録自体が実行できない** |

**評価**: D4 が fail-closed を正しく機能させている点は設計として正しい。**しかし ADR は「Windows 実機をどう調達するか」を一言も扱っておらず、その結果、現在の計画は決定論的に完了不能である。** これは ADR の誤りというより、feature 計画レベルで未解決の前提である。

**C2 (費用ゼロ) との関係 (推測、確度: 中)**: Windows 実機の調達候補は (a) 作者所有の Windows PC (b) GitHub Actions の windows ランナー (public リポジトリなので無償、R7) (c) クラウド Windows VM (有償 → C2 違反) である。(b) は費用面では C2 を満たすが、A3(c) が要求する「skill を実行して期待出力を得る」には認証済みの Claude Code セッションが必要で、CI 上での認証情報の取り扱いは新たな security 論点 (P09 の対象) を生む。**したがって (a) が唯一 C2 と C1 の双方に無理なく収まる選択肢である可能性が高い。**

**エスカレーション (P03 からの申し送り)**: 「作者が Windows 実機にアクセスできるか」を P04 着手前に確認すべきである。アクセスできない場合、本 feature は A3 未達で確定するため、P05 以降に工数を投じる前に dev-graph へ計画差し戻しを行うのが合理的である。

## 5. 事実と推測の区分

本文書の主張の種別を明示する。

**fact (正本または実測で裏が取れているもの)**

- R1-R9 の実測すべて
- F-1 (baseline §4.2 の原文との矛盾)、F-3 (A1/qa-003 の原文一致と A1 達成可能性)、F-13 (writer 実装の必須制約)、F-14 (writer が receipt を出力しないこと)、F-15 のうち「優先 4 が baseline §6 の 8 制約のいずれも指していないこと」、F-16 (§7.3 E5/E6 に対応する決定が ADR に存在しないこと)
- §4 の「リポジトリ内に Windows 実機の調達手段が存在しない」

**inference (正本から導いた解釈。確度付き)**

- F-7 の「共倒れ/共成立になる」: 確度 **高**。D3 の責務記述が D1 と同じ CLI 呼び出しである以上、source を変えない限り機構は同一になる
- F-10 の「Windows では認証情報が設定ディレクトリ配下にある」: 確度 **中**。macOS 側 (R5) からの外挿であり、Windows 実機で未検証
- F-2 の「Content-Type が取得可否に影響し得る」: 確度 **低〜中**。CLI の取得実装は未確認
- F-6 の「`claude plugin install` が npm source 解決時に内部で npm 実行系を呼ぶ可能性」: 確度 **低〜中**。CLI 内部実装は未確認
- §4 の「(a) 作者所有 Windows PC が唯一現実的」: 確度 **中**。CI 上の認証実現性を実測していない

**未検証 (本 P03 では判定を保留したもの)**

- F1-F3 (marketplace / source type の仕様) の一次 GET 照合。正本自身が C02 の follow-up と記しており、P03 の権限外である (F-9)。**P06 は実行直前に code.claude.com の changelog 再照合を行うこと** (baseline §6 `npm-source-official-support-changelog-recheck-claude-code-plugins` の要求そのもの)。R1 が示す約 9.5 時間で 1 リビジョンという進行速度は、この再照合が形式ではなく実質的に必要であることを裏付けている
