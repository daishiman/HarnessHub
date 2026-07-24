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
| Web (web) | 確定 | 確定質疑: qa-069 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-039 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-039 |

## 確定内容 (質疑録)

### qa-069 (対応セル: web)

**質問**: dev-graph/beads (bd) のタスク優先度選定 (schedule/ready の判断軸) を、どのような基準へ変更しますか? 現行の品質・本質先行の選定で何が問題になっていますか?

**回答**: 現行は AI が文脈から『本質的なシステムを作り上げること』を最優先に選定するため、同じ基盤タスクを繰り返し実行して解決せず、依存関係でつながった他タスクまで止まり、いちばん作りたかった機能から離れていく (根本原因は品質と再現性を求めすぎる完璧主義がスケジューラの優先度に転写されたこと)。変更後の判断軸は (1) 目的=何のために作るか、(2) 背景=どういう経緯で必要になったか、(3) MVP=今必要な動くもの、の3軸とし、品質を先回りする基盤・本質課題解決タスクよりも『まず使えるものを構築する』タスクを優先して選定する。まず作って、使って、課題をあぶり出す回転 (build-use-learn) に戻すことが狙い。具体的には feature/task の選定時に MVP 適合 (今必要な動くものに直結するか) を第一ソートキーへ昇格し、品質・再現性強化系は MVP 成立後に繰り延べる。CI/CD・quality gate 等の既確定の dev-workflow 要件 (qa-066) 自体は維持し、優先度選定の判断軸のみ組み替える

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
