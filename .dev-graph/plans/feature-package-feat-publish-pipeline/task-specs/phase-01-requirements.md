# System task overlay: PublishRequest 状態機械・検査 pipeline・promote/rollback 要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "backend", "requirements-baseline"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P01
- classification: confidence=0.91, reason="goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-publish-pipeline.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.91, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-publish-pipeline の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (PublishRequest 状態機械の §7.2 完全準拠、検査 pipeline の共有純関数パッケージ化、Green 自動公開/Yellow・Red の Needs Fix 差戻し、immutable Release + TargetChannel 別 stable pointer による atomic な公開・更新・rollback、R2 content-addressed PackageRegistry、append-only 監査 event、REST + zod 単一ソース + 単一認可ミドルウェア、TargetChannel 直列化) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Hub の公開パイプラインは、作者の自己完結 publish (G1) の中核として、PublishRequest 状態機械 (system-spec §7.2 完全準拠, qa-009) を実装する。状態機械は Draft → Validating → (Needs Fix → Draft 差戻し / Ready → (Approval Pending → Approved [Stage 2 で有効化] または Approved [policy 自動承認=Green]) → Publishing → (Failed [既存 stable 維持] / Published [Release 生成 → Promote])) の遷移を持ち、MVP サブセットでは Yellow/Red 相当は一律 Needs Fix へ差戻し、Approval Pending は Stage 2 まで到達しない (docs/backend-spec.md §5.1)。検査 pipeline (owner/公開範囲確認・secret scan・必須メタ検証・skills-only 制約・禁止 Hook/script/binary 検出・高リスク instructions パターン検出時 Yellow 降格・manifest 補完・試験 install・Catalog 生成) は packages/inspection として純関数の共有パッケージに実装し、Publisher (ローカル pre-check) と Hub (公式検査) で同一パッケージを共有して二重実装を回避する。既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) を仕様の正本 (移植元) として TypeScript へ移植し、挙動同値性をテストで担保する (qa-010, qa-020, C3 整合)。Release は immutable とし、TargetChannel ごとの stable pointer 切替により公開・更新・rollback を atomic に行う (I3, qa-002)。同一 TargetChannel への PublishRequest は先行が終端状態 (Published/Failed/Draft 差戻し) になるまで後続を Draft に留める直列化を行う。SkillPackage 実体は Cloudflare R2 の immutable content-addressed PackageRegistry として保存し、DB には content hash と reference のみを保持する (qa-004, qa-011)。全操作 (submit・approve・promote・rollback・suspend・deployment 登録) は audit_events へ append-only で記録し、テナント単位の hash chain (seq/prev_hash/event_hash) により改ざん検知可能な構造とする (qa-006, qa-037)。Hub API は REST + OpenAPI とし、zod schema (packages/schemas) を単一ソースとして OpenAPI 仕様を生成する。認可は全 API で Tenant/Workspace スコープを強制する単一ミドルウェアに集約する (deny-by-default)。POST /publish は Idempotency-Key 必須で、直列化違反は 409 を返す (qa-009, qa-020, qa-033)。

本 task は上記の確定要件を再解釈や欠落なく baseline 化するとともに、goal-spec の quality_constraints には含まれない **cross-feature 境界の未確定事項** を上流未解決事項として本 baseline に明記し、P02 の必須解消事項として引き継ぐ。具体的には、publish_requests・releases・target_channels・packages・deployment_references・audit_events・idempotency_ledger の各テーブルの**スキーマ定義**は feat-domain-model-db が packages/db/schema/core/ で所有する既存確定 (`.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md` の architecture decision で明記されたコアドメイン 18 テーブルの一部) であり、本 feature はこれらのテーブルへの**利用 (書込/参照ロジック)** と REST endpoint・状態機械・検査 pipeline・promote/rollback ロジックの実装のみを所有する consumer である。また、単一認可ミドルウェア (apps/hub/src/lib/authz/) は feat-auth-tenancy が所有する既存確定であり、本 feature はこれを消費して deny-by-default の role×リソースマトリクス判定を適用するのみで、認可判定ロジック自体を再実装しない。Publisher クライアント側のローカル pre-check 実行 (feat-publisher-plugin の責務) と、承認キュー UI・カタログ UI (feat-workspace-governance / feat-dual-catalog-web の責務) との境界も、検査 pipeline パッケージの owner が本 feature である一方でその UI 消費側は別 feature であることを含めて P02 で確定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、features/feat-publish-pipeline.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物を変更しない (公開状態の閲覧導線は既存 S03/S05 の確定を踏襲する)
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (apps/hub/src/app/api/v1/publish 等) を変更しない
- API: N/A: publish/promote/rollback 12 経路 (§4.6) の契約詳細は P02 で定義する。本 task は要件記述のみ
- Data: N/A: publish_requests/releases/target_channels/packages/deployment_references/audit_events は feat-domain-model-db が owner であり、本 feature はスキーマを変更しない。利用ロジックの詳細設計は P02 で行う
- Infrastructure: N/A: R2 バケット・デプロイ単位は feat-hub-foundation/feat-domain-model-db が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: publish-request-state-machine-section7-2-property-test-qa009・inspection-pipeline-shared-pure-function-package-qa010-qa020・green-auto-publish-yellow-red-needs-fix-i2・immutable-release-targetchannel-stable-pointer-atomic-rollback-i3・r2-content-addressed-package-registry-domain-model-db-consumer・append-only-audit-event-all-publish-operations・rest-zod-single-source-authz-middleware-qa009・targetchannel-serialization-single-inflight-publishrequest の 8 件の quality_constraints を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 8 件を machine-verifiable な受入基準として requirements-baseline.md に固定する。スキーマ owner 境界・認可ミドルウェア消費境界・検査 pipeline owner/消費境界を P02 必須解消事項として明記する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/requirements-baseline.md を新規作成する
- Operations: N/A: orphan_candidate 通知・rollback 運用手順の具体化は P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security (features/feat-publish-pipeline.md architecture_refs の正本参照。I1/I2/I3/D4/G1/G4 と qa-002/qa-004/qa-006/qa-009/qa-010/qa-011/qa-020/qa-033/qa-037 を含む)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされる。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで実コードへの変更を伴わない (実変更は P05 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件の確定転記、および publish_requests 等のスキーマ owner 境界・単一認可ミドルウェア消費境界・検査 pipeline owner/消費境界の cross-feature 境界を P02 必須解消事項として明記した記載を含む)
- Consumed artifacts: .dev-graph/staging/goal-spec.json, features/feat-publish-pipeline.md, features/feat-publish-pipeline.context.json, system-spec/00-requirements-definition.md, system-spec/spec-state.json, docs/backend-spec.md, .dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md
- Write scope/touches: docs/features/feat-publish-pipeline/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-publish-pipeline-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-publish-pipeline/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- コアドメインスキーマ定義 (owner=feat-domain-model-db。publish_requests/releases/target_channels/packages/deployment_references/audit_events/idempotency_ledger 含む全テーブルの列定義)
- 単一認可ミドルウェアの実装 (owner=feat-auth-tenancy。本 feature は apps/hub/src/lib/authz/ を消費するのみ)
- Publisher クライアント側のローカル pre-check 実行 (owner=feat-publisher-plugin。検査ロジック自体 [packages/inspection] は本 feature が owner として提供する)
- カタログ UI・承認キュー UI (owner=feat-dual-catalog-web / feat-workspace-governance)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-publish-pipeline/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件 (publish-request-state-machine-section7-2-property-test-qa009, inspection-pipeline-shared-pure-function-package-qa010-qa020, green-auto-publish-yellow-red-needs-fix-i2, immutable-release-targetchannel-stable-pointer-atomic-rollback-i3, r2-content-addressed-package-registry-domain-model-db-consumer, append-only-audit-event-all-publish-operations, rest-zod-single-source-authz-middleware-qa009, targetchannel-serialization-single-inflight-publishrequest) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-publish-pipeline.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I1, I2, I3, D4, G1, G4), system-spec/spec-state.json qa_log (qa-002, qa-004, qa-006, qa-009, qa-010, qa-011, qa-020, qa-033, qa-037)
- Detailed authoritative source: docs/backend-spec.md (§1 コード構造規約, §4.6 publish/promote/rollback エンドポイント, §5.1 PublishRequest 状態機械, §6.1 検査 pipeline 共有パッケージ)
- Architecture: arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
