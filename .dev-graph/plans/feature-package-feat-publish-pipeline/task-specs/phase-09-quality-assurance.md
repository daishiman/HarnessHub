# System task overlay: 品質・セキュリティ・運用保証 — レート制限・Idempotency-Key・tenant 分離・secret scan CI ゲート確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "security", "quality-assurance"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P09
- classification: confidence=0.85, reason="qa-037 のレート制限・Idempotency-Key TTL・tenant 分離・secret scan の非機能要件を機械的に保証する P09 品質保証タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P08 完了後、qa-037 で確定した非機能要件 (publish endpoint のレート制限 10 回/分、Idempotency-Key の TTL 24 時間・スコープ (tenant, endpoint)・payload 不一致時 422、tenant/workspace の row-level スコープ隔離、secret scan の CI ゲート化) を publish endpoint 群に適用し、quality-assurance-report.md として結果を記録する。

## 背景

qa-037 は publish endpoint のレート制限を 10 回/分と確定しており、429 応答時は Retry-After ヘッダを付与する。Idempotency-Key は (tenant_id, endpoint) をスコープとして 24 時間 TTL で管理し、同一キーでの payload 不一致時は 422 を返す。tenant/workspace の row-level スコープ隔離は D4 の確定決定に基づき、publish_requests/releases/target_channels への全クエリで tenant_id によるフィルタ漏れがないことを機械的に確認する。secret scan は検査 pipeline (packages/inspection) の一部として既に P05 で実装済みだが、本 task ではその CI ゲート化 (secret scan 未実行または fail のまま publish が成功しないことの保証) を確認する。authorization matrix の monotonic 性 (上位ロールが下位ロールの権限を失わないこと) も qa-037 の要件であり、apps/hub/src/lib/authz/ 側の責務ではあるが、本 feature の publish endpoint がそのマトリクスを正しく参照していることを本 task で確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P08 の docs/features/feat-publish-pipeline/refactoring-migration-note.md が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: apps/hub/src/app/api/v1/publish/ にレート制限・Idempotency-Key TTL 処理を適用する
- API: applicable + change: 429/422 応答仕様を確定する
- Data: N/A: tenant 分離はクエリ層の確認のみで packages/db/schema/ への変更を伴わない
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: レート制限・Idempotency-Key・tenant 分離・secret scan CI ゲート・monotonic authz マトリクス参照確認を実装する
- Quality: applicable + change: quality-assurance-report.md で全項目の確認結果を記録する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/quality-assurance-report.md を新規作成する
- Operations: applicable + change: apps/hub/scripts/ に secret scan CI ゲートスクリプトを追加する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は非機能要件の適用確認であり、既存スキーマへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/quality-assurance-report.md (レート制限・Idempotency-Key TTL・tenant 分離・secret scan CI ゲート・monotonic authz マトリクス参照確認の結果を含む), apps/hub/scripts/ (secret scan CI ゲートスクリプト)
- Consumed artifacts: docs/features/feat-publish-pipeline/refactoring-migration-note.md, apps/hub/src/app/api/v1/publish/, packages/inspection/
- Write scope/touches: apps/hub/src/app/api/v1/publish/ (レート制限・Idempotency-Key ミドルウェア適用), apps/hub/scripts/, docs/features/feat-publish-pipeline/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p09) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p09 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P08]。resource_scope (apps/hub/src/app/api/v1/publish, apps/hub/scripts, docs/features/feat-publish-pipeline/quality-assurance-report.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 単一認可ミドルウェア本体の monotonic 性実装 (owner=feat-auth-tenancy。本 task は参照確認のみ)
- feat-domain-model-db 側の tenant_id カラム定義・インデックス設計 (owner=feat-domain-model-db)
- 共有 CI パイプライン本体の変更 (共有 CI は不可侵。本 task は feature 固有スクリプトの追加のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-publish-pipeline/quality-assurance-report.md にレート制限 (10 回/分)・Idempotency-Key (TTL 24 時間、payload 不一致時 422)・tenant 分離・secret scan CI ゲート・monotonic authz マトリクス参照確認の全結果が記載されていること

## Rollout and rollback

- Rollout: quality-assurance-report.md で全項目の適用確認を完了してから P10 (独立最終レビュー) へ引き継ぐ
- Rollback trigger and steps: レート制限や Idempotency-Key の挙動が qa-037 の確定仕様と一致しない場合、apps/hub/src/app/api/v1/publish/ の該当実装を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D4), system-spec/spec-state.json qa_log (qa-006, qa-037)
- Detailed authoritative source: docs/backend-spec.md §8 (非機能予算・ポーリング統一)
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P08
