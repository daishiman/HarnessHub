---
status: confirmed
category: dev-workflow
aggregate: 確定
spec_cells: [dev-workflow.web, dev-workflow.mobile, dev-workflow.tablet, dev-workflow.desktop-windows, dev-workflow.desktop-linux, dev-workflow.desktop-macos]
serves_goals: [G1, G4, G5]
---

# 開発フロー (dev-workflow)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-071 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-039 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-039 |

## 確定内容 (質疑録)

### qa-071 (対応セル: web)

**質問**: 既存確定 qa-038/qa-039/qa-051/qa-066/qa-067/qa-070 を全面維持したまま、開発管理パイプラインの方法論 (methodology) として次の 8 要件を追加確定する: (1) マクロ構造、(2) exact-13、(3) 外側ループ、(4) 内側ループ、(5) スコープ分離、(6) 情報配置、(8) 書き戻し、(9) 既存保全と更新統制。ユーザー提供の要件定義 (2026-07-22 /dev-graph spec --resume 引数) に基づき、仕様確定に不可欠な情報が既に揃っているため追加ヒアリングなしで確定する。(要件 7 の命名規則/doc 粒度は qa-070 で確定済み。要件 10 の portable separation は qa-070 で確定済み。要件 11 の Git 差分照合は completeness evaluator の responsibilities に帰属)

**回答**: 既存 qa-038/qa-039/qa-051/qa-066/qa-067/qa-070 の確定内容は全面維持し、本 qa は以下 8 要件をユーザー提供の回答として確定する。出典: ユーザー逐語 (2026-07-22 /dev-graph spec --resume 引数。追加ヒアリング不要として明示)。
【1. マクロ構造 (macro-structure)】小さな task と依存関係を積み上げて feature にし、複数 feature を system にする。グラフには依存関係のある実行タスクだけを載せる (仕様本文・architecture 本文は正規文書に集約し、task/feature は参照と lineage だけを持つ)。実行タスクの最小単位は feature 内の 1 フェーズ相当作業であり、feature 間の依存は feature 粒度で表現する。
【2. exact-13 (13フェーズ固定)】1 feature は P01..P13 の 13 フェーズで構成し、13 フェーズは直列依存 (前フェーズ完了が次フェーズの開始条件)。各フェーズ内の子タスク数は固定せず、達成に必要な粒度で分解し、並列実行可能なものは並列化する。小さい機能でも 13 フェーズを省略しない。1 feature → 13 task への分解は system-dev-planner (/dev-graph plan) が担う。
【3. 外側ループ (outer loop)】feature 全体の改善とフィードバックを回す外側ループを持つ。中心には目的・背景・ゴールを置き、これらを確定してから 13 フェーズを進める。feature の目的・背景・ゴールが未確定のまま実装フェーズへ進まない。
【4. 内側ループ (inner loop)】各フェーズに汎用 task prompt・goal-seek・rubric・feedback loop を持たせ、各フェーズの目的達成まで反復する。フェーズ内の達成基準 (rubric) が PASS するまでループを回す。
【5. スコープ分離 (scope separation)】量が多い・1 task で完結しない・目的・背景から外れる問題は別 task または別 feature に切り出す。切り出した feature も同じ 13 フェーズと品質ゲートを通す。スコープ拡大の誘惑に負けず、切り出しを先行させる。
【6. 情報配置 (information placement)】task graph に仕様本文や architecture 本文を詰め込まない。仕様・architecture・task-spec・docs は正規文書に集約し、task/feature は参照と lineage だけを持つ (内容を複製しない)。正規文書への参照は source_lineage と architecture_refs で追跡する。
【8. 書き戻し (write-back)】実装完了後、結果・判断・改善点を仕様書と architecture へ反映し、次の task/feature が再利用できるようにする。一方通行にしない: 実装→仕様書→次の feature というフィードバックループを確立する。書き戻しの責務は feature の P13 (保守・運用移行) フェーズに含める。
【9. 既存保全と更新統制 (preservation and update control)】AI の追加偏重による重複・矛盾を防ぎ、既存情報を消さずに差分更新する。不要情報の削除や置換は仕組み化された gate (reopen → re-confirm フロー・CI lint) で管理する。既存確定 qa 項目を AI が単独で書き換えない。変更は必ず reopen → 確認 → re-confirm の経路を通す。
要件 7 (命名規則と検索可能性・文書粒度): qa-070 の確定内容 (kebab-case 接頭辞体系・300 行上限 fail-closed CI lint・責務単位分割) が実効値として包含する。要件 10 (portable separation): qa-070 の仕組みとナレッジのオン・オフ分離で確定済み。以上 8 要件 + qa-070 の 2 要件 (portable separation / doc 粒度) + qa-067 の 8 要件 (lifecycle close-loop 他) がG1 (仕組みの持ち出しによる配布・運用効率)・G4 (fail-closed 品質ゲート)・G5 (ドキュメント管理の持続性) に資する。実装は関連 feature (feat-dev-pipeline-improvement の 13 フェーズ・issue-qa070-implementation-feature-20260722) を通じて行う。

### qa-039 (対応セル: desktop-windows, desktop-macos)

**質問**: 開発フロー（dev-workflow）× デスクトップ (Windows)（desktop-windows）/ デスクトップ (macOS)（desktop-macos）は対象ですか? 対象なら要件を教えてください。

**回答**: 対象。提供者/作者のローカル開発環境 (macOS 主・Windows 従。既存 auth/security の desktop-windows/desktop-macos 行と同じ作者環境の定義) における開発フローを以下で確定する。

【1. ローカル環境の構成】
- Claude Code (実装・AI レビュー) + pnpm (corepack 経由・他パッケージマネージャ禁止) + git + wrangler CLI。
- 開発は macOS を主環境、Windows を従環境とし、両者で同一の pnpm script が動作すること (パス区切り・改行コード・シェル依存のコマンドを pnpm script に埋め込まない)。

【2. CI と local の乖離防止】
- PR の required status checks (qa-038 の 2) と同一のコマンドを pnpm script として local からも実行可能にする (例: pnpm verify が lint / typecheck / test / bundle size を CI と同じ実装で回す)。CI 専用の検査手順を CI 側だけに持たない。
- これにより「local では通るが CI で落ちる」を構造的に減らし、1 名 + AI 運用 (C1) での往復回数を抑える。

【3. commit 前のローカルゲート】
- pre-commit hook で lint / format を任意実行 (fail-closed にはしない。merge 前ゲートの正本は CI であり、local hook は早期検知の補助に留める)。
- secret の誤 commit 防止のため、secret scan は local hook でも実行できるようにする (正本の遮断は CI 側)。

【4. ローカルからの本番操作の禁止】
- production への wrangler deploy と production Turso への migration 適用を、提供者のローカル端末から日常的に行わない。両者の正本経路は CI (qa-038 の 4/5) に一本化する。ローカルからの本番 deploy は CI 障害時の緊急経路としてのみ位置付け、実施時は事後に PR/commit へ記録を残す。
- ローカル開発では preview 用 Turso または local SQLite を binding し、production DB を指さない。

【5. Web App 出口との区別】
- 作者 local session で wrangler CLI をスクリプト実行して顧客の Web App を公開する経路 (I5) は、Hub 本体の開発フローとは別物である。I5 は作者の業務ツール公開の実行系であり、本カテゴリが定義するのは Hub 本体 (提供者が開発するプロダクト) の開発フローに限る。

## 上流指針 (doctrine anchor)

- 本カテゴリは共通シード (categories) 外のプロジェクト固有カテゴリで、approved な pending 例外 (owner: daishiman) として上流指針を確定している。

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| operations | Google SRE | 運用手順・障害対応・トイル削減・ポストモーテムの上流指針 | https://sre.google/workbook/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

- `ref-system-design-knowledge/references/resource-map.yaml` (このカテゴリ専用の deep card は resource-map に未定義。本章の設計判断は「上流指針 (doctrine anchor)」節の authority と「確定内容 (質疑録)」を正本とする)

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
