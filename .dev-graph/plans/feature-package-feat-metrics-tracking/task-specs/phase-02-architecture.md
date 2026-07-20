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

docs/shared-layers.md §2「共通バックエンド層」冒頭は「複数 feature が使うものはここに登録し、実装 owner を feat-hub-foundation (基盤) に一元化する」と定め、同章の表に「試算エンジン (純関数) | 時給/削減時間/削減額/シート試算の単一実装。係数 (annualHours・分/回・削減率) はテナント設定 | B3, SEC5」を掲載している。一方 features/feat-metrics-tracking.md の scope_in は「試算エンジン純関数 (時給=年収÷annualHours・分/回・削減率、単一実装)」を明記しており、owner 記述が食い違っている (出典: feat-user-org-admin plan-findings.json 2026-07-17 evaluator finding, severity=low, bucket=upstream/shared-layer-owner-ambiguity)。

判断基準は以下の 2 点である。第一に docs/shared-layers.md §5「変更管理」は「共通層に第 3 の利用者が現れたときに初めて共通化する (2 回目までは重複を許す) — 早すぎる抽象化の禁止」と定める。第二に実際の呼び出しフットプリントを確認すると、試算エンジンの純関数 (hourlyRate/savedMinutes/savedAmountJPY 算出) を実行時に呼び出すのは本 feature の Workers cron 週次 rollup 処理 (B3) の 1 箇所のみである。S17 (feat-user-org-admin 管轄) は本 feature が生成した `metrics_rollups` を読むだけで試算エンジンの純関数自体を呼び出さず、Publisher 側はクライアント側金額換算が scope_out (SEC5) のため試算エンジンを呼ばない。加えて feat-user-org-admin は自身の P02 で「試算エンジン scope 外」「TenantCoefficient の保存管理のみ担当」と確定済みである (出典: .dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json, severity=info, bucket=verified/independent-fork)。したがって現時点で試算エンジンの消費者は 1 feature のみであり、shared-layers.md §5 の共通化基準 (第 3 の利用者) を満たさない。

**Architecture decision**: 試算エンジン純関数 (`packages/estimation`) の実装 owner は本 feature (feat-metrics-tracking) に確定する。`tenant_coefficients` (annualHours・minutes_per_run・sheet_reduction_rate・updated_by) の値自体は feat-user-org-admin が保存管理するテナント設定 (D4 row-level scope) だが、これを読み取り金額換算を行う純関数ロジックは feat-metrics-tracking の Workers cron 週次 rollup 処理内で単一実装として持つ。影響範囲は docs/shared-layers.md §2 の「試算エンジン (純関数)」行の owner 記述であり、消費 feature が 2 未満のため feat-hub-foundation への一元化は時期尚早と判定する。訂正先は docs/shared-layers.md §2 の該当行だが、この書き換えは本 feature package の write_scope 外 (docs/features/feat-metrics-tracking/ 配下限定) であるため、本 task では決定内容を architecture-decision-record.md へ記録するのみとし、実際の shared-layers.md 書き換えは shared-layers.md §5 の変更管理プロセスに従い dev-graph 側の後続変更 (follow-up) として扱う。features/feat-metrics-tracking.md の上流未解決節は本 decision の確定をもって解消済みとし、P03 以降はこの結論 (owner=feat-metrics-tracking, 実装先=packages/estimation/) を前提として進める。

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

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-metrics-tracking/architecture-decision-record.md に試算エンジン owner 確定の判断基準・影響範囲・訂正先が明記され、metrics_events/metrics_rollups カラム一覧・API 契約 3 件・cron 段構成・S09/S16 画面構成表が記載されていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し P03 の独立設計レビューへ引き継ぐ
- Rollback trigger and steps: 試算エンジン owner 判断の前提 (呼び出しフットプリント分析・feat-user-org-admin の確定事実) に誤りが判明した場合、architecture-decision-record.md の該当節を差し戻し、P01 の要件ベースラインへ再照会する

## Handoff

- Executor: system build route
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I10, D4), system-spec/spec-state.json qa_log (qa-021〜025, qa-031)
- Detailed authoritative source: docs/backend-spec.md (§1, §2.3, §3.3, §4.9, §6.2, §7, §8), docs/shared-layers.md (§2, §5)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend
- Feature: feat-metrics-tracking
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-metrics-tracking-p01
