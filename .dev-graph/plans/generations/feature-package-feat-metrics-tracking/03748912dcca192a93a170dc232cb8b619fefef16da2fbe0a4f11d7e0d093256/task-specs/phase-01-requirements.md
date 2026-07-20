# System task overlay: 効果測定 (実行ログ ingest・週次 rollup・KPI ダッシュボード) 要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "requirements-baseline"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P01
- classification: confidence=0.92, reason="goal-spec (goal-spec.json) と features/feat-metrics-tracking.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-metrics-tracking の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (MetricsEvent/MetricsRollup エンティティ・短命 token + 冪等キー ingest・Workers cron 週次 rollup・試算エンジン純関数・S09/S16 ダッシュボード) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 6 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Studio mockup 反映により、効果測定機能は実行ログ ingest (B2: 短命 token・冪等キー・クライアントは回数のみ送信) と Workers cron による週次 rollup (B3: 金額換算はサーバ側のみ) を経て、S09 ダッシュボード (KPI/推移/完了率/ランキング/部門別)・S16 利用・削減効果 (ハーネス別・週次)・S17 個別集計 (feat-user-org-admin 管轄) へ供給する feature として確定した (features/feat-metrics-tracking.md, confirmation_status=confirmed; system-spec/00-requirements-definition.md I10、紐づくゴール G4/G5)。実行ログは SEC5 により時間・金額の自己申告を受け付けず、クライアントは実行回数 (run_count) のみを送信しサーバ時刻で記録する (system-spec/spec-state.json qa-025)。ingest API `POST /api/v1/metrics/events` は短命 Bearer token + `Idempotency-Key` ヘッダ (scope=(tenant,endpoint)・TTL 24h) で保護し、重複 key は 200 で冪等応答する (qa-023 B2、docs/backend-spec.md §4.9)。rollup は Workers cron (日次 + 週次確定) で `metrics_events` → `metrics_rollups` へ事前集計し、ダッシュボード系 API は rollup 読取専用として生イベントのオンライン集計を禁止する (qa-023 B3、docs/backend-spec.md §2.3, §7, §8)。試算エンジンのpackage境界・公開contract・横断品質gateはdocs/shared-layers.md §1-§2に従いfeat-hub-foundationが単一ownerとして確立し、本featureは同じ境界へ時給/削減時間/削減額のformulaとrollupというdomain logicを提供する。hearing-intakeも同じ公開primitivesのsheetEstimateを消費し、重複実装を作らない。`tenant_coefficients` は D4 (row-level tenant scope) に従いテナント別管理し係数変更は監査 event 必須とする (qa-024)。S09/S16 は `GET /api/v1/metrics/summary`・`GET /api/v1/metrics/rollups` の rollup 読取専用 API から描画し、dim=user の金額換算は admin 限定とする (SEC4 逆算対策、qa-021、docs/backend-spec.md §4.9)。チャートは共通部品 (packages/ui) を消費し Worker bundle 3MiB 予算内の軽量実装とする (qa-022)。`metrics_events` は無期限 DB 保持とし (2026-07-17 ユーザー決定)、Turso 使用量日次監視 cron と実行回数中央値 10 倍超の日次異常検知 cron (`metrics.anomaly`、ブロックしない) を運用に組み込む (qa-031)。本 task は、実装に入る前にこれらの確定要件を再解釈や欠落なく baseline 化し、後続タスクの手戻りを防ぐ。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行depends_onを都度評価し、task edgeへ複製しない。

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: goal-spec.json の feature_context_digest が sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759 に一致し、features/feat-metrics-tracking.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物 (S09/S16 画面) を変更しない。frontend 要件の具体化は P02 設計・P05 実装で行う
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (ingest/rollup/summary API・Workers cron) を変更しない
- API: N/A: API 契約の置き場と形状の確定は P02 の workstream 設計で行う。本 task は要件記述のみ
- Data: N/A: MetricsEvent/MetricsRollup エンティティ (tenant_id/workspace_id スコープ列) のカラム定義詳細設計は P02 で行う。本 task は要件記述のみ
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: metrics-ingest-short-token-idempotency-count-only-b2-sec5・metrics-rollup-cron-server-conversion-b3・tenant-coefficients-scope-audit-d4・dashboard-s09-s16-rollup-read-only-authz-sec4 の 4 件のセキュリティ関連 quality_constraints を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 8 件を machine-verifiable な受入基準として requirements-baseline.md に固定する。estimation-engine-single-pure-function-owner-unresolved は現行正本により『共通package境界owner=feat-hub-foundation、formula/rollup provider=feat-metrics-tracking、sheetEstimate consumer=feat-hearing-intake』へ解消済みとして固定する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/requirements-baseline.md を新規作成する
- Operations: N/A: Turso 使用量監視・異常検知 cron 運用の具体化は P09/P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (features/feat-metrics-tracking.md architecture_refs の正本参照。D4/I10/qa-021(S09/S16)/qa-022/qa-023(B2/B3)/qa-024/qa-025(SEC4/SEC5)/qa-031 を含む)
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで、MetricsEvent/MetricsRollup エンティティへの実変更を伴わない (実変更は P05/P08 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 6 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件の確定転記、および共通package境界owner=hub-foundation / formula・rollup provider=metrics / sheetEstimate consumer=hearingという解消済みowner境界を含む)
- Consumed artifacts: goal-spec.json, features/feat-metrics-tracking.md, features/feat-metrics-tracking.context.json, system-spec/00-requirements-definition.md, system-spec/spec-state.json, docs/backend-spec.md, docs/shared-layers.md
- Write scope/touches: docs/features/feat-metrics-tracking/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-metrics-tracking-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-metrics-tracking-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-metrics-tracking/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- クライアント側での金額換算・自己申告 (goal-spec scope_out。SEC5 で禁止)
- 外部 BI 連携 (goal-spec scope_out)
- S17 画面実装・role 管理・年収係数 PII ガード (owner=feat-user-org-admin。本 feature は rollup 供給までがスコープ)
- チャート共通部品自体の実装 (owner=hub-foundation。本 feature は消費のみ)
- packages/estimation共通境界の再実装（owner=hub-foundation）。本featureはformula/rollup provider要件だけを持ち、hearingのsheetEstimate consumer契約もbaselineへ固定する
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-metrics-tracking/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件 (metrics-ingest-short-token-idempotency-count-only-b2-sec5, metrics-rollup-cron-server-conversion-b3, estimation-engine-single-pure-function-owner-unresolved, tenant-coefficients-scope-audit-d4, dashboard-s09-s16-rollup-read-only-authz-sec4, frontend-chart-bundle-budget-server-estimate-display-only-qa022, s17-individual-metrics-supplied-to-user-org-admin-boundary, metrics-retention-indefinite-usage-monitoring-anomaly-detection) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-metrics-tracking.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-metrics-tracking.context.json` (`sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance を要件ベースラインへ全件固定する。
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

This section is normative for P01 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-metrics-tracking.context.json; docs/shared-layers.md §2; docs/backend-spec.md §6.2; confirmed feat-hub-foundation shared-layer contract
- Effective phase contract: packages/estimation のpackage boundary/public contractは feat-hub-foundation が単一ownerとして確立し、metricsはformula/rollupというdomain logicを提供・消費する。共通package ownerをmetricsへ上書きしない。consumerはmetricsだけではなく hearingのsheetEstimateも含む。metricsEstimate/sheetEstimateは同じ純関数primitivesを参照し、クライアント金額計算を禁止する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/estimation/src/metrics.ts`
- `apps/hub/src/features/metrics-tracking/`
- Mandatory evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4, 紐づくゴール G4/G5), system-spec/spec-state.json qa_log (qa-021, qa-022, qa-023, qa-024, qa-025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§1 コード構造規約, §2.3 metrics_events/metrics_rollups/tenant_coefficients テーブル定義, §3.3 認可マトリクス, §4.9 ingest/summary/rollups API, §6.2 試算エンジン, §7 cron 表, §8 非機能), docs/shared-layers.md (§2 試算エンジン(純関数) の owner 記述)
- Architecture: arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
