# System task overlay: 実装 — MetricsEvent/MetricsRollup スキーマ・ingest/summary/rollups API・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 画面の実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "implementation"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P05
- classification: confidence=0.85, reason="P02/P04 で確定した設計とテストスタブに基づき MetricsEvent/MetricsRollup スキーマ・API・cron・試算エンジン・S09/S16 画面を実装する P05 実装タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture decision と P04 のテストスタブに基づき、MetricsEvent/MetricsRollup スキーマ・ingest/summary/rollups API・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 画面を実装し、P04 のテストが通る状態にする。

## 背景

P02で共通package境界owner=feat-hub-foundationと確定したため、本featureはpackage全体を所有せず`packages/estimation/src/metrics.ts`へformula/rollup domain moduleだけを提供する (時給=年収÷annualHours・削減分/回・削減率の純関数、tenant_coefficients を引数として受け取りサーバ側でのみ金額換算を行う設計)。`packages/schemas/metrics-tracking/` に MetricsEvent/MetricsRollup の zod スキーマを定義し、`packages/db/schema/metrics-tracking/` に `metrics_events`/`metrics_rollups` の Drizzle スキーマを実装する (`tenant_coefficients` は feat-user-org-admin 側の既存スキーマを読取 import するのみで本 feature では定義しない)。`apps/hub/src/features/metrics-tracking/` に ingest ハンドラ (`POST /api/v1/metrics/events`: 短命 Bearer token 検証・Idempotency-Key 冪等処理・run_count のみ受理・サーバ時刻採用)・summary/rollups ハンドラ (`GET /api/v1/metrics/summary`, `GET /api/v1/metrics/rollups`: rollup 読取専用・dim=user は admin 限定)・Workers cron (日次事前集計 + 週次確定、`packages/estimation` の純関数を呼び出しサーバ側金額換算) を実装する。`apps/hub/src/app/` 配下の S09 (KPI/推移/完了率/ランキング/部門別) と S16 (ハーネス別・週次利用/削減効果) の画面は `packages/ui` のチャート共通部品を消費し、Worker bundle 3MiB 予算内に収める。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P04 の test-design.md とテストスタブが確定済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: S09/S16 画面 (apps/hub/src/app/ 配下) をチャート共通部品消費・bundle 3MiB 予算内で実装する
- Backend: applicable + change: ingest/summary/rollups ハンドラと Workers cron 週次 rollup を実装する
- API: applicable + change: 3 endpoint (`POST /api/v1/metrics/events`, `GET /api/v1/metrics/summary`, `GET /api/v1/metrics/rollups`) を P02 契約通りに実装する
- Data: applicable + change: `packages/schemas/metrics-tracking/` と `packages/db/schema/metrics-tracking/` に MetricsEvent/MetricsRollup を実装する
- Infrastructure: N/A: 既存 Cloudflare Workers/Hub デプロイ単位内で実装し追加インフラを新設しない
- Security: applicable + change: 短命 token 検証・Idempotency-Key 冪等処理・dim=user admin 限定・tenant_id スコープ WHERE 句強制を実装する
- Quality: applicable + change: P04 のテストが実装に対して green になることを確認する (テスト実行自体は P06)
- Documentation: N/A: 実装コードのコメントのみで独立文書は作成しない (運用文書は P12)
- Operations: N/A: cron の運用手順化は P12 で行う。本 task はジョブ実装のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (P02 で確定した設計をそのまま実装する。既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: metrics_events/metrics_rollups は新規テーブルのためマイグレーション生成は P08 で行う。本 task はスキーマ定義コードの実装までとする

## 成果物

- Produced artifacts: `packages/estimation/src/metrics.ts` (hub-owned公開境界へ提供するformula/rollup module), `packages/schemas/metrics-tracking/` (MetricsEvent/MetricsRollup zod スキーマ), `packages/db/schema/metrics-tracking/` (Drizzle スキーマ), `apps/hub/src/features/metrics-tracking/` (ingest/summary/rollups ハンドラ・Workers cron), `apps/hub/src/app/` 配下の S09/S16 画面実装, packages/estimation/src/metrics.ts, apps/hub/src/features/metrics-tracking/ (normative implementation artifacts)
- Consumed artifacts: docs/features/feat-metrics-tracking/architecture-decision-record.md, docs/features/feat-metrics-tracking/test-design.md, apps/hub/src/features/metrics-tracking/__tests__/
- Write scope/touches: apps/hub/src/ の feature 固有配下 (metrics-tracking 関連), packages/schemas/metrics-tracking/, packages/db/schema/metrics-tracking/, packages/estimation/src/metrics.ts, apps/hub/src/features/metrics-tracking/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p05) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p05 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p05) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p04]。P04 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- クライアント側での金額換算・自己申告実装 (SEC5 で禁止)
- 外部 BI 連携実装
- S17 画面実装 (owner=feat-user-org-admin)
- チャート共通部品自体の実装 (owner=hub-foundation、本 task は消費のみ)
- `tenant_coefficients` テーブルの新規実装 (owner=feat-user-org-admin、本 task は読取 consume のみ)
- テストの実行と結果記録 (P06 で行う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: P04 で作成したテストスタブが実装コードに対して解決可能な状態 (import 解決・型整合) になっていること。実際のテスト実行と green 確認は P06 で行う. Normative evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。

## Rollout and rollback

- Rollout: 実装完了後、feature branch を worktree 上でビルド確認し P06 のテスト実行へ引き継ぐ
- Rollback trigger and steps: 実装が P02 の architecture decision と乖離した場合、該当コミットを revert し P02/P04 の成果物へ差し戻す

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-metrics-tracking.context.json` (`sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759`)
- Phase responsibility: P04 を先行条件として現行 scope_in を実装し、scope_out を混入させない。
- Purpose: 導入ハーネスの利用実態と削減効果 (G5) を可視化するため、実行ログ ingest (B2: 短命 token・冪等キー・回数のみ)・週次 rollup (B3: Workers cron)・試算エンジン共通層 (サーバ側係数換算) と S09/S16 ダッシュボードを提供する (I10)
- Goal: 実行ログがサーバ側で信頼可能に集計され (SEC5)、S09 ダッシュボード・S16 利用/削減効果・S17 個別集計が週次 rollup から描画される状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- MetricsEvent/MetricsRollup エンティティ + ingest API (B2)
- Workers cron 週次 rollup (B3)
- 試算エンジン純関数 (時給=年収÷annualHours・分/回・削減率、単一実装)
- S09 ダッシュボード (KPI/推移/完了率/ランキング/部門別)
- S16 利用・削減効果 (ハーネス別・週次)
- チャート共通部品の消費 (bundle 3MiB 予算内)
- Scope out:
- クライアント側での金額換算・自己申告 (SEC5 で禁止)
- 外部 BI 連携
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- ingest が短命 token + 冪等キーで保護され重複計上しない
- 金額換算がサーバ側のみで行われる (クライアント申告は回数のみ)
- S09/S16 が rollup 由来のデータで描画され CWV good を維持する
- Architecture/source refs:
- architecture/harness-hub-backend.md
- architecture/harness-hub-data.md
- architecture/harness-hub-frontend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P05 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-metrics-tracking.context.json; docs/shared-layers.md §2; docs/backend-spec.md §6.2; confirmed feat-hub-foundation shared-layer contract
- Effective phase contract: packages/estimation のpackage boundary/public contractは feat-hub-foundation が単一ownerとして確立し、metricsはformula/rollupというdomain logicを提供・消費する。共通package ownerをmetricsへ上書きしない。consumerはmetricsだけではなく hearingのsheetEstimateも含む。metricsEstimate/sheetEstimateは同じ純関数primitivesを参照し、クライアント金額計算を禁止する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/estimation/src/metrics.ts`
- `apps/hub/src/features/metrics-tracking/`
- Mandatory evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§1, §2.3, §3.3, §4.9, §6.2, §7, §8)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p04
