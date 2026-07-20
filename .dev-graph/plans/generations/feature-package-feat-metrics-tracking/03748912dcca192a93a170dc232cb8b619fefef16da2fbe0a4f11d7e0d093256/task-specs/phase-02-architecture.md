# System task overlay: アーキテクチャ設計 — MetricsEvent/MetricsRollup スキーマ・ingest/rollup/summary API 契約・試算エンジン owner 確定・S09/S16 画面構成設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "architecture-decision"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P02
- classification: confidence=0.9, reason="MetricsEvent/MetricsRollup のスキーマ・API 契約・cron 設計に加え、試算エンジン実装 owner の食い違い (docs/shared-layers.md §2 vs 本 feature scope_in) を解消する P02 architecture decision タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

MetricsEvent/MetricsRollup のスキーマ・ingest/summary/rollups API 契約・Workers cron 週次 rollup・S09/S16 画面構成を設計するとともに、P01 で記録した試算エンジン実装 owner の未解決事項 (estimation-engine-single-pure-function-owner-unresolved) を本 task の architecture decision として確定する。

## 背景

docs/shared-layers.md §1-§2は、複数featureが使う共通packageの境界・公開contract・横断品質gateをfeat-hub-foundationへ一元化し、試算式などdomain固有logicは担当featureが同じ境界へ提供すると定める。よってpackages/estimation境界owner=hub-foundation、formula/rollup provider=metrics、sheetEstimate consumer=hearing-intakeとして正本上のowner/consumer境界は解消済みである。

判断基準はdocs/shared-layers.md §1-§2の現行契約である。共通化対象はmetricsの効果試算とhearing-intakeのsheetEstimateという2つ以上のconsumerが使うpackage境界/public primitivesであり、この境界と横断品質gateはfeat-hub-foundationが所有する。一方、時給・削減時間・削減額formulaとrollupはmetricsのdomain logic、sheet生成用snapshot計算はhearingのconsumer責務として同じ公開primitivesへ接続する。consumer数を1件と見なす旧判断や『第3利用者まで重複可』を根拠にした二重実装は採用しない。

**Architecture decision**: docs/shared-layers.md §1-§2に従い、`packages/estimation`のpackage境界・公開contract・横断品質gateはfeat-hub-foundationが単一ownerである。本featureは`packages/estimation/src/metrics.ts`へ時給/削減時間/削減額formulaとrollupのdomain logicを提供し、hearing-intakeは同じ公開primitivesによるsheetEstimateを消費する。metricsはpackage全体やsheet consumerのownerを上書きせず、duplicate implementation=0をconsumer contract testで検証する。

加えて本 task は次のデータ・API 設計を確定する。`metrics_events` (id, tenant_id, workspace_id, project_id, user_id, harness_id, run_count, idempotency_key, server_received_at; UNIQUE(tenant_id, idempotency_key); append-only, 無期限保持 qa-031) と `metrics_rollups` (id, tenant_id, period, period_start, dim [tenant/department/project/user/harness], dim_key, run_count, saved_minutes, saved_amount_jpy, computed_at; UNIQUE(tenant_id, period, period_start, dim, dim_key)) を新規スキーマとして設計する (docs/backend-spec.md §2.3)。`tenant_coefficients` は feat-user-org-admin 側の既存テーブルを読取 consume するのみで本 feature では新規作成しない。API は `POST /api/v1/metrics/events` (短命 Bearer token + Idempotency-Key 必須、run_count のみ受理、重複 key は 200 冪等応答)・`GET /api/v1/metrics/summary` (rollup 読取、member 以上開放)・`GET /api/v1/metrics/rollups` (dim=tenant/department/project は member 以上、dim=user の金額換算は admin 限定、SEC4 逆算対策) の 3 endpoint を契約として確定する (docs/backend-spec.md §4.9)。Workers cron は日次事前集計 + 週次確定の 2 段構成とし、金額換算はこの cron 内サーバ側のみで行い、summary/rollups API は rollup 読取専用としてオンライン集計を禁止する (Turso 読取予算対策、docs/backend-spec.md §7, §8)。S09 (KPI/推移/完了率/ランキング/部門別) と S16 (ハーネス別・週次利用/削減効果) は packages/ui のチャート共通部品を消費し、Worker bundle 3MiB 予算内に収める画面構成を設計する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P01 の requirements-baseline.md が確定済みであること (docs/features/feat-metrics-tracking/requirements-baseline.md 存在)、feature_context_digest=sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759 と confirmation_status=confirmed が維持されていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: S09/S16 の画面構成 (KPI カード・推移グラフ・完了率・ランキング・部門別削減・ハーネス別週次利用) をチャート共通部品消費前提で設計する
- Backend: applicable + change: ingest/summary/rollups API のハンドラ構成と Workers cron 週次 rollup のジョブ設計を確定する
- API: applicable + change: `POST /api/v1/metrics/events`・`GET /api/v1/metrics/summary`・`GET /api/v1/metrics/rollups` の 3 endpoint 契約 (認証方式・冪等性・認可マトリクス) を確定する
- Data: applicable + change: `metrics_events`/`metrics_rollups` のカラム設計・インデックス・UNIQUE 制約を確定する。`tenant_coefficients` は feat-user-org-admin 側の既存テーブルを読取 consume するのみで新規作成しない
- Infrastructure: N/A: 既存 Cloudflare Workers/Hub デプロイ単位を再利用し追加インフラを新設しない
- Security: applicable + change: 短命 token・Idempotency-Key TTL 24h・dim=user 金額換算 admin 限定 (SEC4)・tenant_id スコープ WHERE 句強制の設計を確定する
- Quality: applicable + change: architecture decision (試算エンジン owner) の判断基準・影響範囲・訂正先を machine-verifiable な記録として残す
- Documentation: applicable + change: docs/features/feat-metrics-tracking/architecture-decision-record.md を新規作成する
- Operations: N/A: cron 運用手順の具体化は P12 で行う。本 task は cron の段構成設計までとする

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend (ingest/summary/rollups API ハンドラ構成), arch-harness-hub-data (metrics_events/metrics_rollups スキーマ, tenant_coefficients 読取 consume 契約), arch-harness-hub-frontend (S09/S16 画面構成とチャート共通部品消費方針)。試算エンジン owner 確定は本 task の architecture decision そのものであり、上記いずれの既存 architecture doc も書き換えない (record は docs/features/feat-metrics-tracking/ 配下に閉じる)
- Deploy unit/environment: cloudflare-workers/hub (Hub Worker 内に ingest/summary/rollups API と週次 rollup cron を同居させる)
- Compatibility/migration/backfill: metrics_events/metrics_rollups は新規テーブルのため backfill 対象データはない。マイグレーション生成自体は P08 で行う

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/architecture-decision-record.md (試算エンジン owner 確定の判断基準・影響範囲・訂正先、metrics_events/metrics_rollups カラム一覧、ingest/summary/rollups API 契約、Workers cron 段構成、S09/S16 画面構成表、チャート共通部品消費方針を含む)
- Consumed artifacts: docs/features/feat-metrics-tracking/requirements-baseline.md, docs/shared-layers.md, docs/backend-spec.md (§1, §2.3, §3.3, §4.9, §6.2, §7, §8), .dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json
- Write scope/touches: docs/features/feat-metrics-tracking/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p02) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p02 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p02) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p01]。P01 完了後に着手する。resource_scope (docs/features/feat-metrics-tracking/architecture-decision-record.md) は他 task と非重複
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- docs/shared-layers.md 自体の書き換え実行 (本 feature package の write_scope 外。決定記録のみ行い、実際の反映は follow-up として dev-graph へ差し戻す)
- `tenant_coefficients` テーブルの新規作成 (owner=feat-user-org-admin。本 feature は読取 consume のみ)
- チャート共通部品自体の実装 (owner=hub-foundation)
- S17 画面設計 (owner=feat-user-org-admin)
- 実装コードの作成 (本 task は設計のみ、実装は P05)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-metrics-tracking/architecture-decision-record.md に試算エンジン owner 確定の判断基準・影響範囲・訂正先が明記され、metrics_events/metrics_rollups カラム一覧・API 契約 3 件・cron 段構成・S09/S16 画面構成表が記載されていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し P03 の独立設計レビューへ引き継ぐ
- Rollback trigger and steps: 試算エンジン owner 判断の前提 (呼び出しフットプリント分析・feat-user-org-admin の確定事実) に誤りが判明した場合、architecture-decision-record.md の該当節を差し戻し、P01 の要件ベースラインへ再照会する

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-metrics-tracking.context.json` (`sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759`)
- Phase responsibility: 現行 architecture_refs と全 scope を実装境界・deploy unit・owner に割り当てる。
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

This section is normative for P02 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-metrics-tracking.context.json; docs/shared-layers.md §2; docs/backend-spec.md §6.2; confirmed feat-hub-foundation shared-layer contract
- Effective phase contract: packages/estimation のpackage boundary/public contractは feat-hub-foundation が単一ownerとして確立し、metricsはformula/rollupというdomain logicを提供・消費する。共通package ownerをmetricsへ上書きしない。consumerはmetricsだけではなく hearingのsheetEstimateも含む。metricsEstimate/sheetEstimateは同じ純関数primitivesを参照し、クライアント金額計算を禁止する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/estimation/src/metrics.ts`
- `apps/hub/src/features/metrics-tracking/`
- Mandatory evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§1, §2.3, §3.3, §4.9, §6.2, §7, §8), docs/shared-layers.md (§2, §5)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p01
