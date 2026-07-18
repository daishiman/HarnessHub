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
| Web (web) | 確定 | 確定質疑: qa-038 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリを持たず、モバイル端末を開発者クライアント環境として使わない (既存 auth/security の mobile 行と同根拠)。Hub 本体の開発フローは web 行 (CI/CD) と desktop-windows/desktop-macos 行 (作者ローカル環境) でカバーする |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリを持たず、タブレット端末を開発者クライアント環境として使わない (既存 auth/security の tablet 行と同根拠)。Hub 本体の開発フローは web 行と desktop-windows/desktop-macos 行でカバーする |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-039 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop を開発者クライアント環境として使わない (作者環境は macOS + Windows。既存 auth/security の desktop-linux 行と同根拠)。GitHub Actions の ubuntu-latest runner は Linux 上で動作するが、これは開発者の client platform ではなく CI 実行基盤であり web 行 (qa-038) の CI/CD 要件としてカバーする |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-039 |

## 確定内容 (質疑録)

### qa-038 (対応セル: web)

**質問**: 開発フロー（dev-workflow）× Web（web）は対象ですか? 対象なら要件を教えてください。具体的には (1) ブランチ戦略と PR フロー、(2) 環境戦略 (デプロイ先)、(3) 本番デプロイ (CD) の発火条件、(4) DB マイグレーション (Turso/Drizzle) の適用フローを、制約 C1 (実装・運用は提供者 1 名 + AI) と C2 (固定費極小化・無料枠優先) の下で確定してください。

**回答**: 対象。Hub 本体 (Next.js + OpenNext on Cloudflare Workers) の開発・CI/CD・リリースフローを以下で確定する (AskUserQuestion 4 問すべて推奨案を選択、2026-07-17)。

【1. ブランチ戦略と PR フロー = GitHub Flow + PR 必須】
- 単一 main + 短命 feature branch の GitHub Flow を採る。常設 develop / release branch は持たない (C1: branch 間同期の運用負荷を避ける)。
- main は protected branch とし、直 push と force push を禁止する。変更は必ず PR を経由する。
- branch 命名は feat/* / fix/* / docs/* / chore/*。merge は squash merge に統一し、main の履歴を 1 PR = 1 commit に保つ (rollback 単位と deploy 単位を一致させるため)。
- PR は required status checks が全て green かつ review 承認済みでのみ merge 可能。実装者が提供者 1 名でも PR を必須とする理由は、(a) CI を merge 前ゲートにできること、(b) AI (Claude Code) レビューの投入点になること、(c) 変更の監査証跡が PR 単位で残り G4 (統制点の一元化) と整合すること。
- レビューは AI (Claude Code) による PR レビューを必須の投入点とし、提供者が最終承認する。1 名運用のため人的な第二レビュアは要求しない。

【2. PR の required status checks (CI ゲート)】GitHub Actions (qa-003 で確定済みの CI/CD 基盤) 上で以下を PR ごとに実行し、全て green を merge 条件とする。
- pnpm 強制: packageManager フィールド + corepack で pnpm 以外のパッケージマネージャを拒否する (qa-003 の pnpm 強制方針を CI で機械強制)。
- lint (ESLint) / format 検査
- typecheck (tsc --noEmit)
- unit / integration test (vitest)
- Worker bundle size 予算: 3MiB 以下 (Workers Free の gzip 後 3MiB 制限。qa-003 / Studio 反映で追加したチャート等の部品込みで維持する)
- secret scan: publish pipeline (I2) と同一の検査ロジック共有パッケージを CI からも呼び、Hub 本体のソースにも同じ基準を適用する
- テナント分離テスト: D4 row-level-scope の分離テストを必須 CI とする (SEC3。全テーブルの tenant_id/workspace_id 必須と、scope 外行が読めないことを検証)
- migration 破壊的 DDL 検査: 単一 PR での列削除・列 rename・NOT NULL 追加を検出したら CI を fail させる (下記 4 の expand/contract 強制)
- OpenAPI / zod 契約の drift 検査: zod 単一ソース (qa-009) から生成した OpenAPI が commit 済み成果物と一致すること

【3. 環境戦略 = PR ごと preview + production】
- PR ごとに Cloudflare Workers の preview deployment (versions upload による preview URL) を発行し、merge 前に実画面で確認できるようにする。Studio mockup (docs/mockups/harness-studio-v2.html) を到達目標とする UI の突き合わせを preview 上で行う。
- preview は使い捨て (PR close で破棄)。常設 staging は持たない。理由: Worker / Turso DB / R2 バケット / secret を 2 組常時維持すると無料枠消費と運用導線が二重化し、C1・C2 と衝突するため。
- production は単一 Worker (qa-003 の D1 = 単一 Worker 一体型) を維持する。
- preview の DB binding は production の Turso を指さない。preview 専用 Turso DB (seed 済み) を用い、preview から本番データへ到達不能にする (SEC3 のテナント分離とは別軸の環境分離)。
- 固定費は 0 円のまま (Cloudflare Workers Free の preview 機能内。追加サービスなし)。

【4. 本番デプロイ (CD) = main merge で自動デプロイ】
- main への merge を唯一の発火条件とし、GitHub Actions が build → migration 適用 → wrangler deploy → production 反映まで自動実行する。
- GitHub Environments の手動承認 protection rule は置かない。理由: PR 段階で CI green + レビューのゲートを既に通しており、1 名運用では自己承認の形式化とデプロイ滞留を生むだけで実効的な統制が増えないため。
- deploy 失敗・本番異常時は rollback で復旧する (下記 5)。
- secret は GitHub Actions secrets に保持し、deploy 時に Workers の環境 binding へ渡す。CI ログ・リポジトリに平文 secret を置かない (qa-008 / SEC の secret は環境 binding のみ の方針を CI 経路にも適用)。

【5. DB マイグレーション = CI 自動適用 + expand/contract 強制】
- deploy 前に CI が drizzle migrate を production Turso へ自動適用する (手動適用は採らない。適用忘れによる schema と deploy のずれを構造的に排除する)。
- Workers の deploy は atomic に戻せるが DB 変更は戻せないため、単一 PR での破壊的変更 (列削除・rename・NOT NULL 追加) を CI が拒否し、expand/contract の 3 段階に強制分割する: PR-1 で additive 変更 (nullable 列追加等) → deploy し新旧コード両対応、PR-2 でコード移行 → deploy、PR-3 で旧列削除 → deploy。
- この分割により各段階で「旧 Worker × 新 schema」が常に互換となり、いつ rollback しても本番が壊れない。
- D2 ヘッジ (Turso → D1 退避経路) の維持のため、migration は SQLite 方言互換の範囲に限定し、Turso 固有拡張に依存する DDL を使わない (qa-004)。

【6. rollback】
- Hub 本体: Workers の直前 version へ再 deploy して復旧する (wrangler の version rollback)。DB は expand/contract により rollback 互換が保たれているため、コードのみ戻せば整合する。
- harness package (顧客の業務ツール) の rollback は本フローの対象外で、既存の immutable Release + TargetChannel の stable pointer 切替 (I3) が担う別経路である。両者を混同しない。

【7. リリース単位とバージョニング】
- Hub 本体は semver tag によるリリースを持たず、main の 1 commit (= 1 squash merge PR) を deploy 単位とする continuous deployment とする。squash merge により rollback 単位と PR が 1:1 で対応する。
- harness package の version 自動採番 (I3) は Publisher が持つ別軸であり、Hub 本体のリリースとは独立している。

【8. 非対象 (このフローに含めないもの)】
- 顧客/作者に GitHub アカウント・Git 操作を要求する経路は本フローに含まない。作者の公開体験は I1/I6 (publish 1 操作・URL 型 marketplace) が担い、Hub 本体の開発フローとは完全に分離する (G1 の Git 操作ゼロ を侵さない)。

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
