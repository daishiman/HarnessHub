# System task overlay: テストファースト設計 — ingest 冪等性・rollup 事前集計・試算エンジン単体・tenant 分離・dim=user 認可・bundle 予算・異常検知 cron のテスト設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "test-design"]
- related_nodes: ["feat-metrics-tracking", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P04
- classification: confidence=0.87, reason="quality_constraints 8 件 (ingest 冪等性・rollup 事前集計・試算エンジン単一実装・tenant 分離・dim=user 認可・bundle 予算・S17 境界・保持/異常検知) をテストケースへ写像する P04 テストファースト設計タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02/P03 で確定した設計に基づき、実装 (P05) に先立って goal-spec の quality_constraints 8 件を検証可能なテストケース (単体・結合・分離テスト) へ写像し、テストスタブを作成する。

## 背景

goal-spec の quality_constraints は 8 件あり、それぞれ以下のテストカテゴリに対応する。(1) ingest の短命 token + Idempotency-Key による冪等性・run_count のみ受理・サーバ時刻採用・重複 200 冪等応答 (metrics-ingest-short-token-idempotency-count-only-b2-sec5)。(2) Workers cron による rollup 事前集計・summary/rollups API のオンライン集計禁止 (metrics-rollup-cron-server-conversion-b3)。(3) 試算エンジン純関数 (packages/estimation) の単体テスト、P02で確定したowner/consumer境界（package boundary=hub-foundation、formula/rollup=metrics、sheetEstimate consumer=hearing） を前提とした呼び出し経路検証 (estimation-engine-single-pure-function-owner-unresolved の解消確認を含む)。(4) tenant_coefficients 読取と metrics_events/metrics_rollups の tenant_id スコープ分離テスト・係数変更監査 event (tenant-coefficients-scope-audit-d4)。(5) dim=tenant/department/project は member 以上開放、dim=user の金額換算は admin 限定という認可マトリクスの結合テスト (dashboard-s09-s16-rollup-read-only-authz-sec4)。(6) S09/S16 の Worker bundle 3MiB 予算内であることの計測テストとサーバ計算値表示専用であることの UI テスト (frontend-chart-bundle-budget-server-estimate-display-only-qa022)。(7) S17 (feat-user-org-admin) へのrollup 供給契約 (API レスポンス形状) の契約テスト (s17-individual-metrics-supplied-to-user-org-admin-boundary)。(8) metrics_events 無期限保持前提のクエリ性能・Turso 使用量日次監視 cron・実行回数中央値 10 倍超の異常検知 cron (`metrics.anomaly`、非ブロッキング) のテスト (metrics-retention-indefinite-usage-monitoring-anomaly-detection)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P03 の design-review-notes.md が指摘事項なしで確定済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: S09/S16 の bundle 予算計測テストとサーバ計算値表示専用の UI テストスタブを作成する
- Backend: applicable + change: ingest 冪等性・rollup cron・試算エンジン単体・異常検知 cron のテストスタブを作成する
- API: applicable + change: 3 endpoint の契約テスト (認証・冪等性・認可マトリクス・S17 供給契約) を作成する
- Data: applicable + change: tenant_id スコープ分離テスト・UNIQUE 制約違反テストを作成する
- Infrastructure: N/A: テスト実行基盤は feat-hub-foundation の既存 CI を利用し新設しない
- Security: applicable + change: 短命 token 失効・Idempotency-Key TTL 24h 経過・dim=user admin 限定のセキュリティテストを作成する
- Quality: applicable + change: quality_constraints 8 件それぞれに対応するテストケースの網羅表を作成する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/test-design.md を新規作成する
- Operations: applicable + change: Turso 使用量日次監視 cron と異常検知 cron のテストスタブを作成する (運用手順自体は P12 で扱う)

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (P02/P03 で確定した設計を前提にテストを設計する。既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub (テストは Workers 実行環境を想定したモック/スタブで構成する)
- Compatibility/migration/backfill: N/A: 本 task はテスト設計のみで実データ変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/test-design.md (quality_constraints 8 件とテストケースの対応表), apps/hub/src/features/metrics-tracking/__tests__/ 配下のテストスタブ一式 (ingest 冪等性・rollup cron・試算エンジン単体・tenant 分離・認可マトリクス・bundle 予算・S17 契約・異常検知 cron)
- Consumed artifacts: docs/features/feat-metrics-tracking/architecture-decision-record.md, docs/features/feat-metrics-tracking/design-review-notes.md, docs/backend-spec.md (§2.3, §3.3, §4.9, §7, §8)
- Write scope/touches: docs/features/feat-metrics-tracking/test-design.md, apps/hub/src/features/metrics-tracking/__tests__/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p04) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p04 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p04) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p03]。P03 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの作成 (テストが検証する本体実装は P05 で行う。本 task はテストスタブのみ)
- チャート共通部品自体のテスト (owner=hub-foundation)
- S17 画面自体のテスト (owner=feat-user-org-admin)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-metrics-tracking/test-design.md に quality_constraints 8 件全てに対応するテストケースが記載され、apps/hub/src/features/metrics-tracking/__tests__/ にスタブが作成されていること. Normative evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。

## Rollout and rollback

- Rollout: test-design.md とテストスタブを作成し P05 の実装へ引き継ぐ
- Rollback trigger and steps: quality_constraints とテストケースの対応漏れが判明した場合、test-design.md の対応表を修正し不足カテゴリを追加する

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-metrics-tracking.context.json` (`sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759`)
- Phase responsibility: 全 acceptance と品質制約を実装前のテストケースへ写像する。
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

This section is normative for P04 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-metrics-tracking.context.json; docs/shared-layers.md §2; docs/backend-spec.md §6.2; confirmed feat-hub-foundation shared-layer contract
- Effective phase contract: packages/estimation のpackage boundary/public contractは feat-hub-foundation が単一ownerとして確立し、metricsはformula/rollupというdomain logicを提供・消費する。共通package ownerをmetricsへ上書きしない。consumerはmetricsだけではなく hearingのsheetEstimateも含む。metricsEstimate/sheetEstimateは同じ純関数primitivesを参照し、クライアント金額計算を禁止する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/estimation/src/metrics.ts`
- `apps/hub/src/features/metrics-tracking/`
- Mandatory evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §3.3, §4.9, §6.2, §7, §8)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p03
