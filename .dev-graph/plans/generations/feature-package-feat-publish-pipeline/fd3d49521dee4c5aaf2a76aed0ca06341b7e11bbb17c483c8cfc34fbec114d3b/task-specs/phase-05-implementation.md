# System task overlay: 実装 — PublishRequest API・状態機械・検査 pipeline (packages/inspection)・R2 upload・promote/rollback・監査 event 記録

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "backend", "implementation"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P05
- classification: confidence=0.85, reason="P02/P04 で確定した設計とテストスタブに基づき apps/hub の publish REST endpoint・状態機械・packages/inspection・promote/rollback・監査 event 記録を実装する P05 実装タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md と P04 の test-design.md に基づき、apps/hub に PublishRequest 状態機械・REST endpoint 12 経路・単一認可ミドルウェア消費・R2 upload consumer・promote/rollback・append-only 監査 event 記録を実装し、packages/inspection に検査 pipeline 共有パッケージを実装する。packages/db/schema/ 配下の変更は一切行わず、feat-domain-model-db が提供するリポジトリ層関数の消費のみを行う。単一認可ミドルウェアの判定ロジック自体は実装せず、feat-auth-tenancy が提供する apps/hub/src/lib/authz/ の消費のみを行う。

## 背景

実装は P02 の architecture decision に厳密に従う。`apps/hub/src/lib/publish/state-machine.ts` に PublishRequest の状態機械 (`Draft | Validating | NeedsFix | Ready | ApprovalPending | Approved | Publishing | Failed | Published` の 9 値、隣接工程間の遷移のみ許可) を純関数として実装する。`packages/inspection/src/` に owner/公開範囲確認・secret scan・必須メタ検証・skills-only 制約・禁止 Hook/script/binary 検出・高リスク instructions パターン検出 (検出時 Yellow 降格)・manifest 補完・試験 install・Catalog 生成の各チェックを個別純関数として実装し、既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) の挙動同値性を P04 のテストで担保しながら移植する。`apps/hub/src/app/api/v1/publish/` (POST 作成・GET 一覧)、`apps/hub/src/app/api/v1/publish/[id]/package/` (PUT multipart upload)、`apps/hub/src/app/api/v1/publish/[id]/submit/` (POST。検査 pipeline を Worker 内同期実行し結果を DB 記録)、`apps/hub/src/app/api/v1/publish/[id]/` (GET polling)、`apps/hub/src/app/api/v1/publish/[id]/approve/` (POST)、`apps/hub/src/app/api/v1/publish/[id]/cancel/` (POST)、`apps/hub/src/app/api/v1/projects/[id]/releases/` (GET)、`apps/hub/src/app/api/v1/channels/[id]/promote/` (POST)、`apps/hub/src/app/api/v1/channels/[id]/rollback/` (POST。2 版目以降のみ rollback 先検査)、`apps/hub/src/app/api/v1/releases/[id]/suspend/` (POST)、`apps/hub/src/app/api/v1/projects/[id]/deployment/` (POST) の 12 経路を実装する。全 endpoint は `apps/hub/src/lib/authz/` (feat-auth-tenancy 提供) を呼び出して role×リソースマトリクス判定を適用し、`packages/schemas/publish-pipeline/` の zod スキーマでリクエストを検証する。POST /publish は Idempotency-Key ヘッダを必須とし、feat-domain-model-db の partial UNIQUE index による TargetChannel 直列化制約違反を 409 として応答する。R2 へのパッケージ保存は feat-domain-model-db の `putPackage()`/`getPackage()` を呼び出す consumer として実装し、SEC7 のサイズ/種別制限を PUT /publish/:id/package で適用する。promote/rollback は feat-domain-model-db が提供する `target_channels.stable_release_id` の atomic UPDATE 関数を呼び出す。全操作 (submit/approve/promote/rollback/suspend/deployment 登録) の完了時に feat-domain-model-db の `AuditRepo.append()` を呼び出し、append-only 監査 event を記録する。docs/backend-spec.md §3.8 は publish.request/publish.approve/publish.reject/channel.promote/channel.rollback/release.suspend の 6 action 名を確定済みだが、submit 遷移 (Validating 開始)・cancel・deployment 登録に対応する action 名は §3.8 の現行語彙に明記がないため、実装時に endpoint 操作と action 名の対応表を明記して `AuditRepo.append()` に渡す action を一意に定め、不足分 (submit/cancel/deployment 登録) は docs/backend-spec.md §3.8 への追記を dev-graph follow-up として記録する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P04 の docs/features/feat-publish-pipeline/test-design.md が存在すること。feat-domain-model-db の publish_requests/releases/target_channels/packages/deployment_references/audit_events リポジトリ層関数、および feat-auth-tenancy の単一認可ミドルウェアが利用可能であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は API 実装のみで frontend 実装物を変更しない
- Backend: applicable + change: apps/hub/src/lib/publish/ (状態機械)、apps/hub/src/app/api/v1/publish 等 (REST endpoint 12 経路) を実装する
- API: applicable + change: packages/schemas/publish-pipeline/ の zod スキーマと OpenAPI 生成対象を実装する
- Data: N/A: packages/db/schema/ への変更は行わない。リポジトリ層関数の消費のみ
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: packages/inspection (検査 pipeline)・単一認可ミドルウェア消費・Idempotency-Key/TargetChannel 直列化を実装する
- Quality: applicable + change: P04 のテストスタブに対応する実装対象を過不足なく実装する
- Documentation: N/A: 本 task はコード実装が中心であり文書更新は伴わない
- Operations: N/A: 運用手順の実装は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はコード実装のみで packages/db/schema/ への変更を伴わない

## 成果物

- Produced artifacts: apps/hub/src/lib/publish/ (状態機械), apps/hub/src/app/api/v1/publish/ (作成/一覧/package/submit/取得/approve/cancel), apps/hub/src/app/api/v1/projects/[id]/releases/, apps/hub/src/app/api/v1/projects/[id]/deployment/, apps/hub/src/app/api/v1/channels/[id]/promote/, apps/hub/src/app/api/v1/channels/[id]/rollback/, apps/hub/src/app/api/v1/releases/[id]/suspend/, packages/inspection/ (検査 pipeline 共有パッケージ), packages/schemas/publish-pipeline/, apps/hub/src/app/api/v1/publish/, apps/hub/src/lib/publish/auth-principal.ts, packages/schemas/publish-pipeline/ (normative implementation artifacts)
- Consumed artifacts: docs/features/feat-publish-pipeline/architecture-decision-record.md, docs/features/feat-publish-pipeline/test-design.md, docs/backend-spec.md §4.6/§5.1/§6.1, feat-domain-model-db の packages/db/repository/ (publish_requests/releases/target_channels/packages/deployment_references/audit_events), feat-auth-tenancy の apps/hub/src/lib/authz/
- Write scope/touches: apps/hub/src/lib/publish/, apps/hub/src/app/api/v1/publish/, apps/hub/src/app/api/v1/projects/[id]/releases/, apps/hub/src/app/api/v1/projects/[id]/deployment/, apps/hub/src/app/api/v1/channels/, apps/hub/src/app/api/v1/releases/[id]/suspend/, packages/inspection/, packages/schemas/publish-pipeline/ (packages/db/schema/ 配下は対象外), apps/hub/src/app/api/v1/publish/, apps/hub/src/lib/publish/auth-principal.ts, packages/schemas/publish-pipeline/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p05) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p05 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P04]。resource_scope (apps/hub/src/lib/publish, apps/hub/src/app/api/v1/publish, apps/hub/src/app/api/v1/projects/[id]/releases, apps/hub/src/app/api/v1/projects/[id]/deployment, apps/hub/src/app/api/v1/channels, apps/hub/src/app/api/v1/releases/[id]/suspend, packages/inspection, packages/schemas/publish-pipeline) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- publish_requests/releases/target_channels/packages/deployment_references/audit_events のスキーマ定義・migration (owner=feat-domain-model-db)
- 単一認可ミドルウェアの実装 (owner=feat-auth-tenancy)
- Publisher クライアント側のローカル pre-check 実行の実装 (owner=feat-publisher-plugin。本 task は packages/inspection パッケージの提供のみ)
- カタログ UI・承認キュー UI の実装 (owner=feat-dual-catalog-web / feat-workspace-governance)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: apps/hub/src/lib/publish/, apps/hub/src/app/api/v1/publish/ 他 REST endpoint 12 経路, packages/inspection/, packages/schemas/publish-pipeline/ が実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っていること. Normative evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。

## Rollout and rollback

- Rollout: apps/hub と packages/inspection の実装を完了し、単一認可ミドルウェア・リポジトリ層関数の呼び出し境界が P02 の architecture decision に一致していることを確認してから P06 (テスト実行) へ引き継ぐ
- Rollback trigger and steps: 実装が P02 の architecture decision と矛盾する場合 (例: packages/db/schema/ への直接書込が混入した場合、認可判定ロジックが単一ミドルウェア外に実装された場合、検査ロジックが Publisher/Hub で重複実装された場合)、該当コードを削除し P02 の設計に沿って再実装する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publish-pipeline.context.json` (`sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41`)
- Phase responsibility: P04 を先行条件として現行 scope_in を実装し、scope_out を混入させない。
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

This section is normative for P05 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publish-pipeline.context.json; docs/backend-spec.md §4.6; system-spec/backend.md qa-059; docs/security-spec.md §6.3/§7.3
- Effective phase contract: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/publish/`
- `apps/hub/src/lib/publish/auth-principal.ts`
- `packages/schemas/publish-pipeline/`
- Mandatory evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I2, I3, D4, G1, G4), system-spec/spec-state.json qa_log (qa-002, qa-004, qa-006, qa-009, qa-010, qa-011, qa-020, qa-033, qa-037)
- Detailed authoritative source: docs/backend-spec.md §4.6 (公開エンドポイント 12 経路), §5.1 (PublishRequest 状態機械), §6.1 (検査 pipeline 最小検査項目), §3.8 (監査対象 action 名の現行語彙)
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P04
