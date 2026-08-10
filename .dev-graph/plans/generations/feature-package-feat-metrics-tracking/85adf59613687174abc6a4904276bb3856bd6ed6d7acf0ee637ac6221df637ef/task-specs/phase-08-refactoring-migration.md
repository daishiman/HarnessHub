# System task overlay: リファクタリング/マイグレーション — metrics_events/metrics_rollups テーブルマイグレーション生成と後方互換性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-metrics-tracking (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-metrics-tracking", "studio-extension", "metrics-tracking", "refactoring-migration"]
- related_nodes: ["feat-metrics-tracking", "feat-hearing-intake", "feat-publish-pipeline", "feat-domain-model-db", "feat-auth-tenancy", "feat-hub-foundation", "feat-user-org-admin", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-frontend"]
- parent_feature: feat-metrics-tracking
- phase_ref: P08
- classification: confidence=0.83, reason="P05 で実装した metrics_events/metrics_rollups スキーマに対する DB マイグレーション生成と、実装確定後の重複コード整理を行う P08 リファクタリング/マイグレーションタスク (required-node、N/A 許容)", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-metrics-tracking/sys-metrics-tracking-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

適用済み combined 0008 を不変保持したまま、P05 で確定した qa-229 exact schema と現行DBとの差分を Metrics 専用の新規連番 delta、必要な backfill/forward-fix、release/rollback evidenceとして生成し、Build migration lineageから分離されていることを確認する。

## 背景

`packages/db/migrations/0008_metrics-tracking-and-build-stage-events.sql`、`meta/0008_snapshot.json`、`meta/_journal.json` の0008 entryは歴史的baselineであり、変更・分割・削除・改名・再採番しない。現行列から actor_user_id/occurred_at/project_id/idempotency claim、rollup workspace/dimension/period境界、owner snapshot/read modelへ移るためにデータ変換が必要なら「backfillなし」と仮定せず、expand→backfill→検証→将来contractの順でMetrics専用deltaへ明記する。rollbackは既存表DROPではなくforward-fixとrelease単位の証跡を持つ。tenant_coefficientsのwrite ownerはfeat-user-org-adminのまま、Metricsはread contractだけを消費する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-metrics-tracking, arch-harness-hub-data
- Entry gate: P07 の acceptance-record.md で goal-spec acceptance 3 件が pass 済みであること
- P01 upstream entry gate: N/A: intra-feature depends_on gate
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は DB マイグレーションとコード整理が中心であり frontend 実装物への変更を伴わない
- Backend: applicable + change: ingest/summary/rollups ハンドラ間の重複ロジック整理を行う (該当箇所がある場合のみ)
- API: N/A: API 契約自体は P02 で確定済みで本 task では変更しない
- Data: applicable + change: metrics_events/metrics_rollups の DB マイグレーションファイルを生成する
- Infrastructure: N/A: 既存デプロイ単位内でのマイグレーション適用のみで追加インフラを新設しない
- Security: N/A: 本 task はマイグレーション生成とコード整理のみでセキュリティ設計自体は変更しない
- Quality: applicable + change: マイグレーション適用後も P06 のテストが green を維持することを確認する
- Documentation: applicable + change: docs/features/feat-metrics-tracking/refactoring-migration-note.md を新規作成する
- Operations: N/A: マイグレーション適用の運用手順化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data (metrics_events/metrics_rollups のマイグレーション生成は P02 で確定したスキーマ設計に従う。既存 architecture doc は書き換えない)
- Deploy unit/environment: cloudflare-workers/hub (Turso/libSQL へのマイグレーション適用)
- Compatibility/migration/backfill: 0008 immutable検査、Metrics専用delta、必要backfill/forward-fix、旧/新reader互換、Build migration非包含を必須gateとする

## 成果物

- Produced artifacts: docs/features/feat-metrics-tracking/refactoring-migration-note.md、`packages/db/migrations/` の0008より後のMetrics専用delta、対応snapshot/journal、backfill/forward-fix検証証跡
- Consumed artifacts: docs/features/feat-metrics-tracking/acceptance-record.md, packages/db/schema/metrics-tracking/, packages/db/migrations/0008_metrics-tracking-and-build-stage-events.sql, packages/db/migrations/meta/0008_snapshot.json, packages/db/migrations/meta/_journal.json
- Write scope/touches: docs/features/feat-metrics-tracking/refactoring-migration-note.md, packages/db/schema/metrics-tracking/, packages/db/migrations/ の新規Metrics deltaと対応metaのみ（0008既存filesはread-only）

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-metrics-tracking-p08) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-metrics-tracking-p08 として払い出す
- Worktree lease: graph_node_id (sys-metrics-tracking-p08) の worktree lease を claim し heartbeat 送出、完了時 release
- Parallel safety: depends_on=[sys-metrics-tracking-p07]。P07 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 共有スキーマファイル (feat-domain-model-db 管轄) への変更
- tenant_coefficients テーブルのマイグレーション (owner=feat-user-org-admin)
- 新規機能の追加 (本 task はマイグレーション生成と軽微な整理のみ)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の4レベルを本taskの成果物に応じて適用する。適用外のレベルは証跡で N/A: 理由を明記する。
- カバレッジ目標: 実行コードを変更する場合は既定80%を維持し、文書のみの場合も受入条件を100%照合する。
- 層別方針: applicableなFrontendはbehaviorベース、Backend・API・DataはAPI 契約・ロジック単体・DB 結合、InfrastructureはIaC静的検証・smokeを適用する。N/Aの層はWorkstream applicabilityの理由を維持する。
- 保守性制約: pixel位置依存とDOM構造依存を禁止し、公開契約ではなく実装詳細へ密結合する過剰テストを作らない。

## Verification and evidence

- Automated commands: `pnpm --filter @harness-hub/db test`, `pnpm --filter @harness-hub/db typecheck`, `pnpm --filter @harness-hub/db check:ddl`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-metrics-tracking`
- Required evidence: docs/features/feat-metrics-tracking/refactoring-migration-note.md にマイグレーション内容と後方互換性確認結果 (既存テーブルへの破壊的変更なし) が記載されていること

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: 本taskの「目的」と「成果物」に定義した単一責務を、受入条件を削らず再実行可能な証跡とともに完了する。
- Generic execution prompt: 目的・背景・前提条件・スコープ・成果物を入力に、手段を固定せず最小の変更で実装と検証を行う。
- Rubric: 受入条件を全件満たし、必要なカバレッジが80%以上で、既存テストの回帰が0件、証跡が再実行可能で、宣言したwrite scope外を変更していなければPASSとする。
- Feedback loop: 実行後に独立評価し、findingを次のpromptへ反映して再実行する。`rubric verdict=PASS`まで反復し、上限到達時はfail-closedで停止する。
- P13 spec/architecture writeback: N/A: P13が正本への書き戻しを所有する。

## Rollout and rollback

- Rollout: マイグレーションファイルを生成し P06 のテストが green を維持することを確認後 P09 の品質保証へ引き継ぐ
- Rollback trigger and steps: 適用前のdeltaで非互換が判明した場合は未適用draftを破棄してP05へ差し戻す。適用後は0008・delta・journal履歴を変更または取り下げず、機能flag/Workerを直前版へ戻し、互換性を回復する追加のMetrics専用forward-fix deltaを発行する

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-metrics-tracking.context.json` (`sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
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


## Confirmed Metrics contract closure (2026-08-10)

This section is normative for P08 and supersedes every older statement in this task that conflicts with `appr-043` or `qa-226`〜`qa-229`. 0008を不変保持し、Metrics専用の将来delta/backfill/forward-fix lineageを作る。

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

- System specification: system-spec/00-requirements-definition.md (D4), system-spec/spec-state.json qa_log (qa-024)
- Detailed authoritative source: docs/backend-spec.md (§2.3)
- Architecture: arch-harness-hub-data
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p07
