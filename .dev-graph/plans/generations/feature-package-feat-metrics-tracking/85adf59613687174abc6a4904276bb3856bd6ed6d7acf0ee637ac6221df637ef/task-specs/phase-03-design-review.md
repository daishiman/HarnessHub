# System task overlay: 独立設計レビュー — MetricsEvent/MetricsRollup スキーマ・認可設計・試算エンジン owner 決定・S09/S16 rollup 読取専用設計の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "design-review"]
- related_nodes: ["feat-metrics-tracking", "feat-hearing-intake", "feat-publish-pipeline", "feat-domain-model-db", "feat-auth-tenancy", "feat-hub-foundation", "feat-user-org-admin", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P03
- classification: confidence=0.88, reason="P02 の architecture decision (試算エンジン owner 確定・スキーマ・API 契約) を P02 実行者から独立した視点で検証する P03 レビュータスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定した architecture decision (試算エンジン owner・metrics_events/metrics_rollups スキーマ・ingest/summary/rollups API 契約・S09/S16 rollup 読取専用設計) を、設計者から独立した視点でレビューし、判断根拠の妥当性と quality_constraints 8 件との整合性を確認する。

## 背景

P02のarchitecture-decision-record.mdは、共通package境界/public contract owner=feat-hub-foundation、formula/rollup domain provider=feat-metrics-tracking、sheetEstimate consumer=feat-hearing-intakeと確定した。本taskはこのowner/consumer境界、metrics/hearing両consumer contract、duplicate implementation=0、server-only calculationを独立レビューする。加えて metrics_events/metrics_rollups のカラム設計が tenant_id スコープ列必須 (D4) を満たすか、ingest API の短命 token + Idempotency-Key TTL 24h が qa-023 (B2) の記述と一致するか、dim=user の金額換算 admin 限定が SEC4 逆算対策として十分かをレビューする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Entry gate: P02 の architecture-decision-record.md が確定済みであること
- P01 upstream entry gate: N/A: intra-feature depends_on gate
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: applicable + change: S09/S16 の rollup 読取専用設計 (オンライン集計禁止・チャート共通部品消費・bundle 3MiB 予算) の妥当性をレビューする
- Backend: applicable + change: ingest/summary/rollups API ハンドラ構成と Workers cron 段構成の妥当性をレビューする
- API: applicable + change: 3 endpoint 契約 (認証・冪等性・認可マトリクス) の quality_constraints 適合をレビューする
- Data: applicable + change: metrics_events/metrics_rollups のカラム設計・UNIQUE 制約・tenant_id スコープ列必須の適合をレビューする
- Infrastructure: N/A: P02 で追加インフラ新設なしと確定済み。本 task はレビューのみでインフラ変更を伴わない
- Security: applicable + change: 短命 token・Idempotency-Key・dim=user admin 限定・tenant_id WHERE 句強制の設計妥当性をレビューする
- Quality: applicable + change: 試算エンジン owner 判断根拠の独立検証結果を quality gate として記録する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順レビューは P12 以降で扱う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend (P02 の architecture-decision-record.md をレビュー対象として参照するのみで、これら既存 architecture doc 自体は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub (P02 で確定したデプロイ単位を前提にレビューする)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実データ変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/design-review-notes.md (試算エンジン owner 判断根拠の独立検証結果、スキーマ/API/認可設計の quality_constraints 適合確認、指摘事項と対応要否を含む)
- Consumed artifacts: docs/features/feat-metrics-tracking/architecture-decision-record.md, docs/shared-layers.md, .dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json, docs/backend-spec.md (§2.3, §3.3, §4.9)
- Write scope/touches: docs/features/feat-metrics-tracking/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p03) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p03 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p03) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p02]。P02 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- architecture-decision-record.md 自体の書き換え (P02 の成果物を直接修正しない。指摘事項は design-review-notes.md に記録し、P02 への差し戻しは Rollback trigger 経由で行う)
- 実装コードの作成 (本 task はレビューのみ)
- docs/shared-layers.md の書き換え (P02 と同様に本 feature package の write_scope 外)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の4レベルを本taskの成果物に応じて適用する。適用外のレベルは証跡で N/A: 理由を明記する。
- カバレッジ目標: 実行コードを変更する場合は既定80%を維持し、文書のみの場合も受入条件を100%照合する。
- 層別方針: applicableなFrontendはbehaviorベース、Backend・API・DataはAPI 契約・ロジック単体・DB 結合、InfrastructureはIaC静的検証・smokeを適用する。N/Aの層はWorkstream applicabilityの理由を維持する。
- 保守性制約: pixel位置依存とDOM構造依存を禁止し、公開契約ではなく実装詳細へ密結合する過剰テストを作らない。

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-metrics-tracking`
- Required evidence: docs/features/feat-metrics-tracking/design-review-notes.md に試算エンジン owner 判断根拠の検証結果と quality_constraints 8 件との整合確認が記載されていること

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: 本taskの「目的」と「成果物」に定義した単一責務を、受入条件を削らず再実行可能な証跡とともに完了する。
- Generic execution prompt: 目的・背景・前提条件・スコープ・成果物を入力に、手段を固定せず最小の変更で実装と検証を行う。
- Rubric: 受入条件を全件満たし、必要なカバレッジが80%以上で、既存テストの回帰が0件、証跡が再実行可能で、宣言したwrite scope外を変更していなければPASSとする。
- Feedback loop: 実行後に独立評価し、findingを次のpromptへ反映して再実行する。`rubric verdict=PASS`まで反復し、上限到達時はfail-closedで停止する。
- P13 spec/architecture writeback: N/A: P13が正本への書き戻しを所有する。

## Rollout and rollback

- Rollout: design-review-notes.md を作成し指摘事項なしを確認後 P04 のテストファースト設計へ引き継ぐ
- Rollback trigger and steps: 試算エンジン owner 判断根拠または API/スキーマ設計に重大な指摘が見つかった場合、design-review-notes.md に指摘内容を記録し P02 へ差し戻す

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-metrics-tracking.context.json` (`sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759`)
- Phase responsibility: P02 の設計が現行 context を漏れなく、矛盾なく満たすか独立レビューする。
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

This section is normative for P03 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-metrics-tracking.context.json; docs/shared-layers.md §2; docs/backend-spec.md §6.2; confirmed feat-hub-foundation shared-layer contract
- Effective phase contract: packages/estimation のpackage boundary/public contractは feat-hub-foundation が単一ownerとして確立し、metricsはformula/rollupというdomain logicを提供・消費する。共通package ownerをmetricsへ上書きしない。consumerはmetricsだけではなく hearingのsheetEstimateも含む。metricsEstimate/sheetEstimateは同じ純関数primitivesを参照し、クライアント金額計算を禁止する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/estimation/src/metrics.ts`
- `apps/hub/src/features/metrics-tracking/`
- Mandatory evidence: hub-owned public contract、metrics/hearing両consumer contract test、duplicate implementation=0、server-only calculation、rollup/ingest evidenceを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.


## Confirmed Metrics contract closure (2026-08-10)

This section is normative for P03 and supersedes every older statement in this task that conflicts with `appr-043` or `qa-226`〜`qa-229`. P02を独立レビューし、resolver越境・D1部分書込み・snapshot再現性をNO-GO条件にする。

- Source pin: `system-spec/spec-state.json#qa-226`〜`#qa-229` and `#appr-043`; compiled chapters are `system-spec/ui-ux.md`, `frontend.md`, `backend.md`, `database.md`. Exact SHA-256 values are pinned in `goal-spec.json#lineage`.
- Project/resolver: `feat-hearing-intake` creates or links Project idempotently in the HearingSheet finalization Turso transaction. Metrics accepts no client/token `project_id`; `harnessId` resolves through the published Harness/Release/Project port with tenant/workspace/project/published-status parity or fails closed.
- Ingest/event: strict body is `harnessId` plus integer `runCount`; principal supplies actor and server supplies `occurred_at`. `metrics_events` uses `actor_user_id`, nullable `department_id`, `request_digest`, nullable `idempotency_key`, and `idempotency_expires_at`; same key+digest within 24h replays 200, different digest is 422 zero-count, and expiry releases only the claim without mutating business facts.
- Rollup/writer: `metrics_rollups` has period `daily|weekly`, dimension `tenant|harness|department|project|user`, `dimension_key`, period bounds, run/saved values and computed/create/update timestamps. All dimensions for tenant+workspace+period+period_start commit in one Turso transaction; D1 write is typed unavailable and zero-write until all-or-nothing parity is proven.
- KPI/anomaly: `completionRate` uses the period-end HearingSheet snapshot; `utilizationRate` uses the period-end published-Harness snapshot intersected with used Harnesses. Separate DTOs carry numerator, denominator, period, snapshotAt, nullable rate and reason; denominator zero maps to `denominator_empty` / “—”. Anomaly requires four complete prior weeks and non-zero median. Fewer than four complete weeks returns `insufficient_history`; median zero returns `zero_median`. Both are evaluation-unavailable states distinct from `anomaly=false` and emit no notification. Evaluable anomalies are notification-only, with delivery idempotent by observation date/scope/user/rule version.
- UI/routes: canonical routes are S09=`/dashboard` and S16=`/tracking`; legacy `/metrics*` is redirect-only. Each server-rendered inline SVG is immediately followed by an always-present equivalent HTML table from the same response model without JavaScript, extra fetch, tooltip or disclosure dependency.
- Migration/retention: `packages/db/migrations/0008_metrics-tracking-and-build-stage-events.sql`, `meta/0008_snapshot.json` and journal entry are immutable history. Future Metrics delta, required backfill/forward-fix, release and rollback evidence are separate from Build. Events remain in Turso indefinitely; daily usage monitoring and daily+weekly cron evidence are required.
- Typed external handoff (non-DAG): `feat-hearing-intake` provides Project/completion snapshot; `feat-publish-pipeline` provides published registry/utilization snapshot; `feat-domain-model-db` provides Turso transaction and immutable lineage; `feat-auth-tenancy` provides principal/scope; `feat-hub-foundation` owns estimation/UI public contracts; `feat-user-org-admin` owns coefficients/PII/notification preferences. Each requires a typed port, contract test, provider evidence and fail-closed unavailable behavior. These IDs are provenance in `related_nodes`, never cross-feature task `depends_on` edges.
- Real package gates: `pnpm --filter @harness-hub/db test`, `pnpm --filter @harness-hub/db typecheck`, `pnpm --filter @harness-hub/db check:ddl`, `pnpm --filter @harness-hub/schemas test`, `pnpm --filter @harness-hub/estimation test`, `pnpm --filter @harness-hub/hub test`, `pnpm --filter @harness-hub/hub typecheck`, and `pnpm --filter @harness-hub/ui test:a11y` as applicable. Planner rerun remains `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-metrics-tracking`.


## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§2.3, §3.3, §4.9), docs/shared-layers.md (§2, §5)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p02
