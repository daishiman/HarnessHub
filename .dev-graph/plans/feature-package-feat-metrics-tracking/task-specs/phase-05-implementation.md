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

P02 で試算エンジン純関数の実装 owner を feat-metrics-tracking に確定したため、`packages/estimation` は本 feature の write_scope として本 task で新規実装する (時給=年収÷annualHours・削減分/回・削減率の純関数、tenant_coefficients を引数として受け取りサーバ側でのみ金額換算を行う設計)。`packages/schemas/metrics-tracking/` に MetricsEvent/MetricsRollup の zod スキーマを定義し、`packages/db/schema/metrics-tracking/` に `metrics_events`/`metrics_rollups` の Drizzle スキーマを実装する (`tenant_coefficients` は feat-user-org-admin 側の既存スキーマを読取 import するのみで本 feature では定義しない)。`apps/hub/src/features/metrics-tracking/` に ingest ハンドラ (`POST /api/v1/metrics/events`: 短命 Bearer token 検証・Idempotency-Key 冪等処理・run_count のみ受理・サーバ時刻採用)・summary/rollups ハンドラ (`GET /api/v1/metrics/summary`, `GET /api/v1/metrics/rollups`: rollup 読取専用・dim=user は admin 限定)・Workers cron (日次事前集計 + 週次確定、`packages/estimation` の純関数を呼び出しサーバ側金額換算) を実装する。`apps/hub/src/app/` 配下の S09 (KPI/推移/完了率/ランキング/部門別) と S16 (ハーネス別・週次利用/削減効果) の画面は `packages/ui` のチャート共通部品を消費し、Worker bundle 3MiB 予算内に収める。

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

- Produced artifacts: `packages/estimation/` (試算エンジン純関数実装), `packages/schemas/metrics-tracking/` (MetricsEvent/MetricsRollup zod スキーマ), `packages/db/schema/metrics-tracking/` (Drizzle スキーマ), `apps/hub/src/features/metrics-tracking/` (ingest/summary/rollups ハンドラ・Workers cron), `apps/hub/src/app/` 配下の S09/S16 画面実装
- Consumed artifacts: docs/features/feat-metrics-tracking/architecture-decision-record.md, docs/features/feat-metrics-tracking/test-design.md, apps/hub/src/features/metrics-tracking/__tests__/
- Write scope/touches: apps/hub/src/ の feature 固有配下 (metrics-tracking 関連), packages/schemas/metrics-tracking/, packages/db/schema/metrics-tracking/, packages/estimation/

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

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: P04 で作成したテストスタブが実装コードに対して解決可能な状態 (import 解決・型整合) になっていること。実際のテスト実行と green 確認は P06 で行う

## Rollout and rollback

- Rollout: 実装完了後、feature branch を worktree 上でビルド確認し P06 のテスト実行へ引き継ぐ
- Rollback trigger and steps: 実装が P02 の architecture decision と乖離した場合、該当コミットを revert し P02/P04 の成果物へ差し戻す

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§1, §2.3, §3.3, §4.9, §6.2, §7, §8)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p04
