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
- Entry gate: goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P08 の docs/features/feat-publish-pipeline/refactoring-migration-note.md が完了していること
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

- Produced artifacts: docs/features/feat-publish-pipeline/quality-assurance-report.md (レート制限・Idempotency-Key TTL・tenant 分離・secret scan CI ゲート・monotonic authz マトリクス参照確認の結果を含む), apps/hub/scripts/check-publish-inspection-gate.mjs, apps/hub/scripts/check-db-schema-boundary.mjs, apps/hub/scripts/check-publish-boundary-gates.mjs, .github/workflows/ci.yml の G15 正例/負例ゲート
- Consumed artifacts: docs/features/feat-publish-pipeline/refactoring-migration-note.md, apps/hub/src/app/api/v1/publish/, packages/inspection/
- Write scope/touches: .github/workflows/ci.yml (G15 step のみ), apps/hub/scripts/check-db-schema-boundary.mjs, apps/hub/scripts/check-publish-boundary-gates.mjs, apps/hub/scripts/check-publish-inspection-gate.mjs, apps/hub/src/app/api/v1/publish/ (レート制限・Idempotency-Key ミドルウェア適用), docs/features/feat-publish-pipeline/quality-assurance-report.md

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
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P08]。resource_scope (.github/workflows/ci.yml, apps/hub/scripts/check-db-schema-boundary.mjs, apps/hub/scripts/check-publish-boundary-gates.mjs, apps/hub/scripts/check-publish-inspection-gate.mjs, apps/hub/src/app/api/v1/publish/, docs/features/feat-publish-pipeline/quality-assurance-report.md) は Write scope/touches および workstream-inventory.json の write_scope と同一集合であり、依存関係により他 task との同時変更を禁止する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 単一認可ミドルウェア本体の monotonic 性実装 (owner=feat-auth-tenancy。本 task は参照確認のみ)
- feat-domain-model-db 側の tenant_id カラム定義・インデックス設計 (owner=feat-domain-model-db)
- 共有 CI の G15 以外の job/step、runner、権限、secret、トリガーの変更 (本 task は feature 固有スクリプトと G15 結線だけを所有する)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルを成果物の性質に応じて適用し、適用外のレベルは証跡内で理由を明記する。
- カバレッジ目標: 実行コードを変更する場合は既定 80% 以上を維持し、文書のみの場合も受入条件の全項目を検査する。
- 層別方針: applicable な Frontend は behavior、Backend・API・Data は API 契約と DB 結合、Infrastructure は IaC と smoke を検査する。N/A の層は `Workstream applicability` の理由を維持する。
- 保守性制約: pixel 位置依存と DOM 構造依存のテストを禁止し、公開契約ではなく実装詳細へ密結合する過剰なテストを作らない。

## Verification and evidence

- Automated commands:
  1. `pnpm --filter hub exec vitest run tests/publish-pipeline/rate-limit.test.ts tests/publish-pipeline/idempotency.test.ts tests/publish-pipeline/routes.test.ts`
  2. `node scripts/ci/check-tenant-isolation-gate.mjs`
  3. `pnpm check:auth`
  4. `pnpm check:secrets`
  5. `node apps/hub/scripts/check-publish-inspection-gate.mjs`
  6. `node apps/hub/scripts/check-db-schema-boundary.mjs`
  7. `node apps/hub/scripts/check-publish-boundary-gates.mjs`
  8. `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publish-pipeline`
- Expected exit: 全コマンドが exit 0。G15 self-test は意図的な secret-scan bypass と DB owner 境界違反を非 0 で拒否する。
- Required evidence: docs/features/feat-publish-pipeline/quality-assurance-report.md にレート制限 (10 回/分)・Idempotency-Key (TTL 24 時間、payload 不一致時 422)・tenant 分離・secret scan CI ゲート・monotonic authz マトリクス参照確認の全結果が記載され、.github/workflows/ci.yml の G15 から正例/負例ゲートが必ず実行されること. Normative evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: 本 task の「目的」と「成果物」に定義した単一責務を、受入条件を削らず再実行可能な証跡とともに完了する。
- Generic execution prompt: 目的・背景・前提条件・スコープ・成果物を入力に、手段を固定せず最小の変更で実装と検証を行う。
- Rubric: 受入条件を全件満たし、必要なカバレッジが 80% 以上で、既存テストの回帰が 0 件、証跡が再実行可能で、宣言した write scope 外を変更していれば FAIL とする。
- Feedback loop: 実行後に独立評価し、finding を次の prompt へ反映して再実行する。`rubric verdict=PASS` まで反復し、上限到達時は fail-closed で停止する。
- P13 spec/architecture writeback: N/A: P13 が書き戻しを所有する。

## Rollout and rollback

- Rollout: quality-assurance-report.md で全項目の適用確認を完了してから P10 (独立最終レビュー) へ引き継ぐ
- Rollback trigger and steps: レート制限や Idempotency-Key の挙動が qa-037 の確定仕様と一致しない場合、apps/hub/src/app/api/v1/publish/ の該当実装を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publish-pipeline.context.json` (`sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41`)
- Phase responsibility: 品質・security・operations・CI gate を現行正本に照らして保証する。
- Purpose: 作者の自己完結 publish (G1) の中核として、PublishRequest 状態機械 (§7.2)・検査 pipeline (static validation/secret scan/policy)・stable pointer promote/rollback を実装する
- Goal: publish → 検査 → Ready → Publishing → Published が atomic に完走し、失敗時は旧 stable が無傷で残る状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- REST API (zod 単一ソース → OpenAPI)
- 状態機械 + TargetChannel 直列化
- 検査 pipeline (共有パッケージ化)
- R2 保存 + Catalog pointer の atomic 更新
- promote/rollback + 監査 event
- Scope out:
- Publisher クライアント側
- カタログ UI
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 状態遷移が §7.2 準拠で property test を通る
- 検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される
- 全操作が append-only 監査 event に記録される
- Architecture/source refs:
- architecture/harness-hub-backend.md
- architecture/harness-hub-data.md
- architecture/harness-hub-security.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P09 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publish-pipeline.context.json; docs/backend-spec.md §4.6; system-spec/backend.md qa-059; docs/security-spec.md §6.3/§7.3
- Effective phase contract: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/publish/`
- `apps/hub/src/lib/publish/auth-principal.ts`
- `packages/schemas/publish-pipeline/`
- Mandatory evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D4), system-spec/spec-state.json qa_log (qa-006, qa-037)
- Detailed authoritative source: docs/backend-spec.md §8 (非機能予算・ポーリング統一)
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P08
