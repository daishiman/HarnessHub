---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P01
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
source: .dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/goal-spec.json
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
package_digest: sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502
architecture_refs: [arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow]
---

# feat-hub-foundation 要件ベースライン

> **位置づけ**: P01 (Hub 基盤 要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

> **転記元の世代**: 現行 canonical feature context は `features/feat-hub-foundation.context.json` (`sha256:938ecf38…`)。旧世代 (`sha256:06c97e2e…`、acceptance 3 件 / quality_constraints 8 件) を参照する記述は本文書により置き換えられる。

> **構築順オーバーレイ (baseline 外)**: **P0 技術基盤**。認証と P1/P2 を載せる最小 Worker/DB/CI/共通 shell だけを先行し、dashboard など低優先 UI は作らない。正本: [system-design-overview.md](../../system-design-overview.md) §3 / [README.md](../README.md)。

## 1. 目的 (purpose)

費用ゼロ制約 (C2) 下で Hub の実行基盤 (Cloudflare Workers 一体型 + OpenNext) と CI/CD・監視・SLO 運用の土台を確立する

## 2. ゴール (goal)

pnpm 強制 CI → wrangler deploy が自動化され、/health・監視・SLO 99.5% 計測が稼働し、Worker 3MiB 予算内で Next.js と共通層の単一実装が動作する状態

## 3. スコープ

### 3.1 scope_in (転記原文 6 件)

1. Next.js + TypeScript + pnpm monorepo scaffold
2. @opennextjs/cloudflare デプロイ
3. GitHub Actions CI/CD (npm 混入 fail)
4. /health + 外部死活監視
5. SLO ダッシュボード + bundle サイズ予算 CI
6. docs/shared-layers.md §1〜§3 の共通 UI・backend・CI/CD/運用層の実装 owner と package 境界

### 3.2 scope_out (転記原文 2 件)

1. 業務ドメインロジック
2. テナント固有の OIDC/role/Device Flow policy (共通 auth adapter・認可 MW の package 境界のみ対象)

補足 (task 分掌上の除外。goal-spec scope_out の feature 間分掌への展開):

- テナント固有 OIDC/role/Device Flow policy の要件定義は feat-auth-tenancy の scope。**共通 auth adapter・deny-by-default 認可 middleware の package 境界・公開 contract・consumer contract test は本 feature の scope_in** (published task spec: Workstream applicability / Security)
- DB スキーマ実体の要件定義は feat-domain-model-db の scope
- 実装コードの作成は P05 以降の scope (本 task は要件確定のみ)

## 4. 受入基準 (acceptance — goal-spec 4 件の確定転記)

### 4.1 転記原文と判定責務

| # | acceptance (転記原文) | 一次判定 phase | 最終判定 phase |
|---|---|---|---|
| A1 | CI が test→deploy を完走する | P06 (テスト実行) | P07 → P10 |
| A2 | Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する | P06 (bundle 計測) | P07 → P10 |
| A3 | SLO 99.5% の計測と /health が稼働する | P06 (/health 応答・外形監視) | P07 → P10 |
| A4 | shared-layers 登録済み共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照する | P06 (consumer contract test) + P09 (duplicate detector) | P07 → P10 |

- A4 は P01 世代 (`938ecf38`) で追加された第 4 acceptance であり、P04/P06/P07/P09/P10/P11 が**実判定**する (§9)。文書化・計画は判定根拠にならない。

### 4.2 検証方法 (machine-verifiable)

P04 が実行可能 test ID を定義し P06 が実行する際の、A1-A4 それぞれの合否判定条件を以下に固定する。ここに書かれた条件以外を pass 根拠にしてはならない。

| # | 合否判定条件 |
|---|---|
| A1 | GitHub Actions の単一 workflow run 内で test job → deploy job の順に success 終了していること。deploy job が skip / manual 承認待ちで終わった run は pass にしない |
| A2 | CI に gzip 後 Worker bundle サイズ計測 step が存在し、閾値 3 MiB 超過時に非ゼロ終了で fail すること。かつ当該 run の実測値が 3 MiB 以内であること |
| A3 | `GET /health` が 200 を返し、外形監視 (Better Stack Free, qa-034) が 3 分間隔で計測し、月次可用性 99.5% を算定できる時系列が取得できていること |

A4 (`shared-layers 登録済み共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照する`) の合否判定条件は以下に固定する。

#### A4-1 consumer contract test の pass 条件

- **対象**: §8 の共通層登録簿に載る全共通層。各層について、その public API を参照する consumer を **2 系統以上**で実行する contract test が存在し、全件 pass すること。
- **consumer の数え方**: 判定時点でリポジトリに**実在する** consumer のみを対象にする。§8 の消費列に挙がっていても未実装の feature は対象に数えない (未実装 feature を待って永久 fail する状態を作らないため)。実在 consumer が 1 系統しかない共通層は、`apps/hub` の利用箇所に加えて `apps/hub/tests/` 配下の独立 consumer fixture を第 2 系統として立て、**public API 経由のみ**で成立させる。
- **fail 条件**: 実在する consumer が共通層の public API を経由せず独自実装・相対 path 直接参照で同じ責務を満たしている場合、その共通層の A4 を fail とする。「未実装だから未参照」は fail にしない。
- **pass の記録単位**: 共通層 × consumer の組ごとに test ID を持ち、P04 の `docs/features/feat-hub-foundation/test-design.md` に列挙、P06 が実行結果を残す。

#### A4-2 duplicate implementation detector = 0 の定義

- **検出対象の範囲**: **§8 の登録簿に載っている共通層に限る**。未登録の重複はこの detector の対象外とする。これは shared-layers 前文の「第 3 の利用者が現れて初めて共通化する (2 回目までは重複を許す)」原則との両立措置であり、**登録＝共通化済みの宣言**であるため、登録後の重複のみを違反として扱う。早すぎる抽象化を CI で強制しない。
- **検出単位 (静的解析、以下 2 種のいずれかに該当したら 1 件)**:
  1. **owner 外実装**: 登録共通層の public API と同名の export が、§8 で定めた実装先 package/ディレクトリの**外**に存在する。
  2. **境界迂回参照**: consumer が共通層の実装を package 名 (workspace 参照) ではなく相対 path・deep import で参照している。
- **判定**: 上記 2 種の合計が **0 件**であること。1 件でも検出された場合、P09 が CI を非ゼロ終了で fail させる (fail-closed)。抑止する場合は `docs/shared-layers.md` の登録簿変更を伴う正式な例外登録のみを経路とし、CI 側の除外リスト追記だけでの回避は認めない。
- **実装手段の制約**: detector は AST 類似度・コードクローン検出のような確率的手法を用いず、**名前と参照経路のみ**で決定的に判定する (C1: 個人運用での偽陽性調査コストを負わないため)。

#### A4-3 判定に用いる証跡パス

| 証跡 | パス | 生成 phase |
|---|---|---|
| E1 全登録共通層の owner / public API / consumer 一覧 | `docs/features/feat-hub-foundation/evidence/shared-layer-ownership.json` | P05 → P11 |
| E2 consumer contract test 実行結果 | `docs/features/feat-hub-foundation/evidence/` 配下 (test ID と合否) | P06 → P11 |
| E3 duplicate scan 結果 (件数 0 と検出内訳) | `docs/features/feat-hub-foundation/evidence/duplicate-scan.json` + `docs/features/feat-hub-foundation/quality-assurance-report.md` | P09 → P11 |

- P07 / P10 は上記 3 経路の**実ファイル**を exact lookup で確認できるまで A4 を pass にできない (§9.3)。

## 5. scope_in 責務追跡 (未割当 0 件)

現行 feature context (`sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`) の scope_in 6 件について、実行責務を持つ phase を全件割り当てる。空欄・未割当が 1 件でも存在する場合、本 baseline は不成立として P02 へ引き継がない。

| # | scope_in (転記原文) | 実行 phase | 対応 acceptance |
|---|---|---|---|
| S1 | Next.js + TypeScript + pnpm monorepo scaffold | P02 (構成確定) → P05 (実装) | A1, A2 |
| S2 | @opennextjs/cloudflare デプロイ | P05 (実装) → P13 (本番デプロイ) | A1, A2 |
| S3 | GitHub Actions CI/CD (npm 混入 fail) | P05 (実装) → P06 (実行) → P09 (fail-closed 化) | A1 |
| S4 | /health + 外部死活監視 | P05 (実装) → P06 (実行) | A3 |
| S5 | SLO ダッシュボード + bundle サイズ予算 CI | P05 (実装) → P06 (計測) → P09 (gate 化) | A2, A3 |
| S6 | docs/shared-layers.md §1〜§3 の共通 UI・backend・CI/CD/運用層の実装 owner と package 境界 | P02 (境界確定) → P05 (公開 contract 実体) → P04/P06 (consumer contract test) → P09 (duplicate detector) | A4 |

- 未割当件数: **0 件** (scope_in 6 件すべてに実行 phase と対応 acceptance を割当済み)
- acceptance 未割当件数: **0 件** (A1-A4 すべてに一次判定・最終判定 phase を割当済み。§4.1)
- scope_out 2 件 (業務ドメインロジック / テナント固有 OIDC・role・Device Flow policy) はいずれの phase にも割り当てない。割り当てが発生した時点で scope 逸脱として差し戻す。

## 6. 品質制約 (quality_constraints — goal-spec 9 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| C2-zero-cost | 費用ゼロ制約: 固定費を極小化し従量課金・無料枠を優先する。顧客 Workspace 数が増えても固定費が比例して増えないこと | system-spec/00-requirements-definition.md U8 (C2) |
| C1-solo-ops | 個人運用制約: 実装・運用は提供者1名+AI (Claude Code / Codex) のみ。運用負荷の低さと保守性を技術選定の最優先基準とする | system-spec/00-requirements-definition.md U8 (C1) |
| worker-bundle-budget | Cloudflare Workers Free プランの Worker サイズ上限は 3MiB (gzip後)。CI で bundle サイズ計測を必須とし、超過時はコード分割・依存削減で対処する | system-spec/00-requirements-definition.md D1 決定 (cf-workers-opennext採用時の注意事項); docs/shared-layers.md §3 |
| pnpm-only-no-npm | パッケージマネージャは pnpm のみ (npm 不使用、packageManager フィールドで pin)。CI で npm 混入検査を行う | system-spec/frontend.md qa-007; docs/shared-layers.md §3 |
| slo-error-budget | 可用性 SLO = 99.5%/月 (許容停止 約3.6時間/月)。月間エラーバジェット 0.5% を消費し切った場合は新規公開機能の変更を凍結し信頼性回復を優先する | system-spec/infrastructure.md qa-019 |
| cwv-good | Core Web Vitals 全指標 good (LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1) を Worker 3MiB 制限下の bundle 予算管理・R2/edge 配信・不要 JS 削減で達成する | system-spec/frontend.md qa-018 |
| wrangler-deploy | デプロイは wrangler CLI。Hub と WebApp 出口で同一ツール系統を用いる | system-spec/infrastructure.md qa-003; docs/shared-layers.md §3 |
| github-actions-ci | GitHub Actions による CI 品質ゲート (pnpm混入検査 / axe a11y違反ゼロ / bundle予算 Worker 3MiB / Tenant分離テスト / 検査pipeline挙動同値テスト) を備える | docs/shared-layers.md §3 |
| shared-layers-single-implementation-owner | acceptanceは4件、quality_constraintsは9件。P05は雛形だけでなく、packages/ui・packages/schemas・packages/inspection・packages/estimation、auth adapter/認可middleware、audit/AiJob/Notification/PII共通adapterの公開contract実体、CI/運用共通境界を単一ownerとして実装する。domain-specific logicはconsumer featureに残す。P04/P06/P07/P09/P10/P11は複数consumer contract testと重複実装detector=0を第4 acceptanceとして実判定する。 | docs/shared-layers.md §1-§5; features/feat-hub-foundation.context.json |

## 7. 確定 QA との紐付け

| QA | 本 feature への確定内容 |
|---|---|
| qa-003 (infrastructure) | Cloudflare Workers 一体型 hosting (@opennextjs/cloudflare)・wrangler CLI デプロイ・R2 native binding・無料枠 10 万 req/日 |
| qa-019 (infrastructure) | SLO 99.5%/月・エラーバジェット 0.5% 消費時の変更凍結・監視 (logs/analytics + /health + 外部死活)・四半期 restore drill |
| qa-007 (frontend) | Next.js + TypeScript・pnpm (npm 不使用、packageManager pin)・App Router SSR on Workers |
| qa-018 (frontend) | WCAG 2.2 AA (axe CI 違反ゼロ)・Core Web Vitals good・bundle 予算管理 |
| qa-034 (infrastructure 詳細) | 既存保有ドメイン流用・外形監視 Better Stack Free・main merge 全自動デプロイ (詳細正本: docs/infrastructure-spec.md)。**環境構成は qa-038 が上書き**（下記） |
| qa-038 (環境・CI 確定) | **常設 staging を持たない**（preview は PR ごとに使い捨て、PR close で破棄）。required status checks 8 項目。deploy 前に CI が migration を production へ自動適用。expand/contract 3 段階強制 |
| qa-039 (開発ワークフロー) | corepack による pnpm pin（他パッケージマネージャ禁止）。required status checks と同一コマンドの local 実行 (`pnpm verify`) |

> **qa-034 と qa-038 の調停（2026-07-21 ユーザー確定 / P03 指摘 R-01）**: 環境構成について qa-034（production + staging の 2 環境）と qa-038（常設 staging なし）が矛盾していた。**後発かつ C1・C2 への影響を明示して判断された qa-038 を正とする**。Worker / Turso DB / R2 / secret を 2 組常時維持すると無料枠消費と運用導線が二重化するため。詳細は architecture-decision-record.md §4・§11.1。
| qa-020 (共通化) | 共通層の二重実装禁止。過剰な層分割は C1 に反するため「2 つ以上の feature が使うもの」のみ共通化する (docs/shared-layers.md 前文) |

- 上位決定: D1 (cf-workers-opennext 採用)。正本参照: architecture/harness-hub-infrastructure.md / architecture/harness-hub-frontend.md (いずれも system-spec 確定章への参照型 wrapper)

## 8. 共通層登録簿 (docs/shared-layers.md §1〜§3 の owner・package 境界)

scope_in S6 の対象。正本は [docs/shared-layers.md](../../shared-layers.md) であり、本節はその §1〜§3 を本 feature の責務境界として baseline に固定したものである。**実装 owner はすべて feat-hub-foundation**、ドメイン固有ロジックは消費 feature に残す。

### 8.1 共通 UI (shared-layers §1) — 実装先 `packages/ui/`

| 共通部品 | 一括担保するもの | 主な消費 feature/画面 | 根拠 |
|---|---|---|---|
| design tokens (色・余白・タイポ) | コントラスト比 4.5:1 以上を token 段階で保証 | 全画面 | qa-018 |
| フォーム部品 (input / select / button) | キーボード操作・フォーカス管理・ラベル/代替テキスト | S01, S04, S05, S07, S10 | qa-018 |
| テーブル / 一覧部品 | ソート・スクリーンリーダー対応・レイアウトシフト防止 | S01, S04, S06, S11, S14, S15, S17 | qa-018 |
| 進捗・状態表示部品 | PublishRequest / AiJob 等のポーリング表示・スケルトン (CLS 抑制) | S01, S03, S05, S10-S12 | qa-018 |
| 確認ダイアログ | 破壊的操作の確認 + 可逆性明示の統一パターン | S02, S04, S05 | qa-018 |
| 通知・エラー表示 | 平易な日本語 + 次の一手の統一フォーマット | 全画面 | qa-018 |
| KPI カード / チャート | bundle 3MiB 予算内の軽量実装・配色コントラスト | metrics-tracking, hearing-intake, user-org-admin | mockups 分析 §4 |
| ステップウィザード | 進捗表示・戻る/次へ・キーボード操作 | hearing-intake (S10), publisher-plugin (S01) | mockups 分析 §4 |
| ステージボード (かんばん風) | 工程チップ・リスク表示 | build-pipeline-board | mockups 分析 §4 |
| Markdown レンダラ + エディタ | XSS sanitize (SEC7)・プレビュー | docs-cms, feedback-loop, hearing-intake | mockups 分析 §4 |
| 状態チップ / スコープチップ / トースト / タブ / インライン編集テーブル | 状態語彙の統一 | 全 Studio 画面 | mockups 分析 §4 |
| テーマ・表示密度・言語 (ja/en) | design tokens への組込み (ライト/ダーク/自動) | 全画面 | mockups 分析 §4 |

### 8.2 共通バックエンド層 (shared-layers §2)

| 共通層 | 責務 | 本 feature の実装先 | 根拠 |
|---|---|---|---|
| zod schemas (単一ソース) | API 入出力の検証と型・OpenAPI 生成。Publisher と Hub で共有 | `packages/schemas/` | qa-009, qa-020 |
| 認可ミドルウェア (単一層) | 全 API で Tenant/Workspace スコープ強制 (deny-by-default) | `apps/hub/src/middleware/` | qa-006, qa-020, D4 |
| auth adapter | Auth.js への依存を adapter 境界に閉じる | `apps/hub/src/shared/` | qa-020, D3 |
| repository 層 (Drizzle) | DB アクセスをここに閉じる | 境界のみ本 feature。**DB スキーマ実体は feat-domain-model-db 所有**であり P05 の実装 path 集合に含まれない | qa-020, D2 |
| 検査 pipeline (純関数・共有 package) | static validation / secret scan / policy 判定を Publisher と Hub で同一実装 | `packages/inspection/` | qa-010, qa-020, C3 |
| 監査 event logger | 全変更操作の append-only 記録 | `apps/hub/src/shared/` | I8 |
| 試算エンジン (純関数) | 時給/削減時間/削減額/シート試算の単一実装。係数はテナント設定 | `packages/estimation/` | B3, SEC5 |
| 実行ログ ingest + rollup | 短命 token 認証・冪等キー・サーバ時刻・事前集計 | `apps/hub/src/shared/` | B2/B3 |
| AI 処理キュー (pull 型) | job queue。Claude Code セッションが pull して処理・書戻し (D5 確定) | `apps/hub/src/shared/` | B5/B6 |
| 通知ディスパッチ | アプリ内 + メール通知 | `apps/hub/src/shared/` | B8 |
| PII ガード | 要保護属性の admin 限定表示・API 非公開・監査・export マスク | `apps/hub/src/shared/` | SEC4 |

### 8.3 共通インフラ (shared-layers §3) — 実装先 `.github/workflows/ci.yml` ほか

| 共通機構 | 内容 | 対応 acceptance |
|---|---|---|
| CI 品質ゲート | pnpm 混入検査 / axe (a11y 違反ゼロ) / bundle 予算 (Worker 3MiB) / Tenant 分離テスト / 検査 pipeline 挙動同値テスト | A1, A2, A4 |
| デプロイ | wrangler CLI (GitHub Actions)。Hub と WebApp 出口で同一ツール系統 | A1 |
| 監視 | /health + Workers logs/analytics + 外部死活監視 + SLO ダッシュボード + エラーバジェットアラート | A3 |
| バックアップ | Turso 日次 export → R2。四半期 restore drill (復元できないバックアップは成功と数えない) | — (運用手順の具体化は P12) |

> `packages/` の最終構成 (pnpm workspace レイアウト) の確定は **P02/P03** で行う (shared-layers §4)。本節は「どの共通層を誰が単一 owner として持つか」を固定するものであり、ディレクトリ名の最終決定ではない。

## 9. Normative closure — 共通層 単一実装 owner 契約 (2026-07-19 確定)

本節は P01 が確定し、**P02 以降の全 task に対して規範 (normative)** として作用する。本節と矛盾する記述が後続 task spec・旧世代 goal-spec に現れた場合は本節を優先する。

### 9.1 件数の固定

- acceptance は **4 件** (§4)、quality_constraints は **9 件** (§6)。3 件 / 8 件を前提とする記述は旧世代 (`06c97e2e`) のものであり無効。

### 9.2 P05 の実装責務 (雛形不可)

P05 は雛形 (placeholder / 空 package) ではなく、以下を**単一 owner として公開 contract の実体まで**実装する。

- `packages/ui`・`packages/schemas`・`packages/inspection`・`packages/estimation`
- auth adapter / 認可 middleware
- audit・AiJob・Notification・PII 共通 adapter の公開 contract 実体
- CI / 運用の共通境界 (`.github/workflows/ci.yml`)

domain-specific logic は consumer feature に残す (共通境界へ提供させ、`feat-hub-foundation` に業務ロジックを集約しない)。

### 9.3 A4 の実判定 (計画・文書での代替不可)

- P04 は共通 package 単体テストと、**複数 consumer が同一実装を参照する contract test** を設計する。
- P06 がそれを実行し、P09 が duplicate detector を CI gate として fail-closed 化する。
- P07 / P10 は**実行済み証跡のみ**を裁定対象とする。「P05 で実装予定」「P12 で文書化する」を A4 の pass 根拠にできない。
- P11 は 4 acceptance・共通 package 一覧・consumer contract test・duplicate 0 の証跡を集約する。

### 9.4 必須証跡 (mandatory evidence)

| # | 証跡 | 確認 phase |
|---|---|---|
| E1 | 全登録共通層の owner / public API / consumer 一覧 | P05 → P11 |
| E2 | consumer contract tests (複数 consumer が同一実装を参照することの実行結果) | P04 設計 → P06 実行 → P07/P10 |
| E3 | duplicate implementation scan = 0 | P09 (CI gate) → P07/P10 |
| E4 | CI (test→deploy 完走) 証跡 | P06 → P07/P10 |
| E5 | bundle 3MiB 以内の計測証跡 | P06 → P07/P10 |
| E6 | SLO 99.5% 計測 / `/health` 稼働証跡 | P06 → P07/P10 |

E1-E3 の具体的な証跡パスは §4.2 A4-3 を正本とする。

### 9.5 trace rule (phase 間の証跡受け渡し規則)

- P04 が実行可能 test ID を定義する → P05 がその対象を実装する → P06 が実行する。
- P07 / P10 は実行済み証跡のみを裁定する。
- P09 は適用対象となる検査を fail-closed にする。
- P11 は source digest と再実行コマンドを保全する。
- P12 / P13 は、**不足している実装・証跡を文書や計画で代替できない**。

## 10. 転記元と検証

- 転記元 (promoted): `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/goal-spec.json`
- canonical feature context: `features/feat-hub-foundation.context.json` (`sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`)
- published task spec: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-01-requirements.md` (`sha256:8ce36d6134ac4774d31e30fa5da78dd9015f5ba66784f72f05a70c4ba157049c`)
- 本文書の受入条件 (P01 acceptance):
  1. goal-spec の acceptance 4 件 (§4) と quality_constraints 9 件 (§6) が過不足なく転記されていること
  2. 現行 feature context (`938ecf38`) の scope_in / acceptance 全件に実行責務 phase が割り当てられ、未割当 0 件であること (§5・§4.1)
  3. docs/shared-layers.md §1〜§3 と第 4 acceptance (A4) が要件ベースラインに含まれていること (§8・§4.1)
  4. Normative closure (§9) が固定され、A4 を計画・文書で代替できない実判定契約が明示されていること
- 検証コマンド: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hub-foundation`（世代非依存形式。current pointer から現行世代を解決する。`--staging .` は repository root から解決できないため使わない。contract §2.3）
