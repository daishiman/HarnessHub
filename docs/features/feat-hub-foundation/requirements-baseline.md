---
status: confirmed
task: SYS-HUB-FOUNDATION-P01
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
source: .dev-graph/plans/feature-package-feat-hub-foundation/goal-spec.json
feature_context_digest: sha256:06c97e2ee833b6bb42f76d38f2f133eededd1dc5422a75153f4d3a7a1c42111a
architecture_refs: [arch-harness-hub-infrastructure, arch-harness-hub-frontend]
---

# feat-hub-foundation 要件ベースライン

> **位置づけ**: P01 (Hub 基盤 要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

費用ゼロ制約 (C2) 下で Hub の実行基盤 (Cloudflare Workers 一体型 + OpenNext) と CI/CD・監視・SLO 運用の土台を確立する

## 2. ゴール (goal)

pnpm 強制 CI → wrangler deploy が自動化され、/health・監視・SLO 99.5% 計測が稼働し、Worker 3MiB 予算内で Next.js が動作する状態

## 3. スコープ

### 3.1 scope_in

1. Next.js + TypeScript + pnpm monorepo scaffold
2. @opennextjs/cloudflare デプロイ
3. GitHub Actions CI/CD (npm 混入 fail)
4. /health + 外部死活監視
5. SLO ダッシュボード + bundle サイズ予算 CI

### 3.2 scope_out

1. 業務ドメインロジック
2. 認証

補足 (task 分掌上の除外。goal-spec scope_out の feature 間分掌への展開):

- 認証・認可の要件定義は feat-auth-tenancy の scope
- DB スキーマ実体の要件定義は feat-domain-model-db の scope

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記)

| # | acceptance (転記原文) | 検証方法 (machine-verifiable) |
|---|---|---|
| A1 | CI が test→deploy を完走する | GitHub Actions の workflow run が test job → deploy job の順で success 終了していること |
| A2 | Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する | CI に gzip 後 bundle サイズ計測 step が存在し、3 MiB 超過で fail すること。実測値 ≤ 3 MiB |
| A3 | SLO 99.5% の計測と /health が稼働する | `GET /health` が 200 を返し、外形監視 (Better Stack Free, qa-034) が 3 分間隔で計測し SLO 99.5%/月 を算定できること |

## 5. 品質制約 (quality_constraints — goal-spec 8 件の確定転記)

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

## 6. 確定 QA との紐付け

| QA | 本 feature への確定内容 |
|---|---|
| qa-003 (infrastructure) | Cloudflare Workers 一体型 hosting (@opennextjs/cloudflare)・wrangler CLI デプロイ・R2 native binding・無料枠 10 万 req/日 |
| qa-019 (infrastructure) | SLO 99.5%/月・エラーバジェット 0.5% 消費時の変更凍結・監視 (logs/analytics + /health + 外部死活)・四半期 restore drill |
| qa-007 (frontend) | Next.js + TypeScript・pnpm (npm 不使用、packageManager pin)・App Router SSR on Workers |
| qa-018 (frontend) | WCAG 2.2 AA (axe CI 違反ゼロ)・Core Web Vitals good・bundle 予算管理 |
| qa-034 (infrastructure 詳細) | production + staging 2 環境・既存保有ドメイン流用・外形監視 Better Stack Free・main merge 全自動デプロイ (詳細正本: docs/infrastructure-spec.md) |

- 上位決定: D1 (cf-workers-opennext 採用)。正本参照: architecture/harness-hub-infrastructure.md / architecture/harness-hub-frontend.md (いずれも system-spec 確定章への参照型 wrapper)

## 7. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-hub-foundation/goal-spec.json` (promoted。feature_context_digest = sha256:06c97e2e…、features/feat-hub-foundation.md と文言完全一致を plan 時に検証済み)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 8 件 (§5) が過不足なく転記されていること
