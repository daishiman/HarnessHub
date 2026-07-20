# System task overlay: テストファースト設計 — 状態機械 property test・検査 pipeline 挙動同値テスト・直列化/監査テスト設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "quality", "test-design"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P04
- classification: confidence=0.87, reason="quality_constraints 8 件 (状態機械 property test・検査 pipeline 挙動同値・Green/Yellow/Red 判定・immutable Release/atomic rollback・R2 consumer・append-only 監査・REST zod/認可・TargetChannel 直列化) をテストケースへ写像する P04 テストファースト設計タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02/P03 で確定・レビュー済みの設計に基づき、実装 (P05) に先立って全テストケースを設計する。対象は (1) PublishRequest 状態機械の property-based test (全遷移の網羅的検証と不正遷移の拒否検証)、(2) 検査 pipeline の Python 資産に対する挙動同値性テスト (各チェック項目ごと)、(3) TargetChannel 直列化の並行性テスト (409 応答検証)、(4) R2 content-addressed 書込の冪等性テスト、(5) audit_events hash chain の一貫性テスト、(6) REST endpoint 契約テスト (zod 検証・単一認可ミドルウェア適用・Idempotency-Key 挙動)、(7) rollback の 2 版目以降限定検査テストの 7 系統である。

## 背景

goal-spec の quality_constraints 8 件はいずれも machine-verifiable な受入基準として定義されており、各制約からテストケースへの対応関係を本 task で明示的に設計する。状態機械の property test は `Draft | Validating | NeedsFix | Ready | ApprovalPending | Approved | Publishing | Failed | Published` の全状態対に対して、docs/backend-spec.md §5.1 の遷移図で許可されている遷移のみが成功し、それ以外の遷移が全て拒否されることを網羅的に検証する (publish-request-state-machine-section7-2-property-test-qa009)。検査 pipeline の挙動同値性テストは、既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) の各関数につき、同一入力に対して TypeScript 移植版が同一出力を返すことをテストケース化する (inspection-pipeline-shared-pure-function-package-qa010-qa020)。Green/Yellow/Red 判定テストは、検査結果が Green の場合に自動公開へ進むこと、Yellow/Red の場合に一律 NeedsFix へ差戻ること、差戻り時に旧 stable が無傷であることを検証する (green-auto-publish-yellow-red-needs-fix-i2)。immutable Release/atomic rollback テストは、Release の status 列以外への UPDATE がリポジトリ層で拒否されること、rollback が 2 版目以降でのみ許可され rollback 先の検査を実行すること、Publishing 失敗時に stable pointer が更新されないことを検証する (immutable-release-targetchannel-stable-pointer-atomic-rollback-i3)。R2 consumer テストは、同一 content_hash への重複書込が拒否されること (immutable) を検証する (r2-content-addressed-package-registry-domain-model-db-consumer)。append-only 監査テストは、全操作 (submit/approve/promote/rollback/suspend/deployment 登録) が audit_events へ記録され、hash chain の整合性が保たれることを検証する (append-only-audit-event-all-publish-operations)。REST/zod/認可テストは、各 endpoint が zod スキーマでリクエストを検証し、単一認可ミドルウェアの role×リソースマトリクスに従って認可判定を行い、POST /publish が Idempotency-Key 必須でありその欠落時に適切なエラーを返すことを検証する (rest-zod-single-source-authz-middleware-qa009)。TargetChannel 直列化テストは、同一 TargetChannel への 2 件目以降の PublishRequest 作成が先行が終端状態になるまで 409 を返すことを検証する (targetchannel-serialization-single-inflight-publishrequest)。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P03 の docs/features/feat-publish-pipeline/design-review-notes.md が存在し重大な指摘なしで完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: apps/hub/src/__tests__/publish-pipeline/ に状態機械・REST endpoint のテストスタブを作成する
- API: applicable + change: REST endpoint 契約テストのスタブを作成する
- Data: N/A: テスト対象データアクセスは feat-domain-model-db のリポジトリ層関数のモックを利用し、スキーマ自体は変更しない
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: secret scan・高リスク instructions パターン検出・単一認可ミドルウェア適用のテストケースを設計する
- Quality: applicable + change: quality_constraints 8 件と acceptance 3 件を過不足なくテストケースへ写像する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/test-design.md を新規作成する
- Operations: N/A: 運用テスト (スモークテスト) は P13 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はテスト設計のみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/test-design.md (quality_constraints 8 件・acceptance 3 件への対応表と 7 系統のテストケース一覧を含む), apps/hub/src/__tests__/publish-pipeline/ (状態機械・REST endpoint のテストスタブ), packages/inspection/src/__tests__/ (検査 pipeline 挙動同値テストのスタブ)
- Consumed artifacts: docs/features/feat-publish-pipeline/architecture-decision-record.md, docs/features/feat-publish-pipeline/design-review-notes.md, docs/backend-spec.md
- Write scope/touches: docs/features/feat-publish-pipeline/test-design.md, apps/hub/src/__tests__/publish-pipeline/, packages/inspection/src/__tests__/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p04) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p04 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P03]。resource_scope (docs/features/feat-publish-pipeline/test-design.md, apps/hub/src/__tests__/publish-pipeline/, packages/inspection/src/__tests__/) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 実装コード自体の作成 (テストが検証する対象コードの実装は P05 で行う)
- feat-domain-model-db 側のリポジトリ層関数のテスト (owner=feat-domain-model-db。本 feature はモックを用いる)
- Publisher クライアント側のローカル pre-check テスト (owner=feat-publisher-plugin。本 feature は packages/inspection パッケージ自体のテストのみを設計する)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-publish-pipeline/test-design.md に quality_constraints 8 件と acceptance 3 件全てに対応するテストケースが記載され、apps/hub/src/__tests__/publish-pipeline/ と packages/inspection/src/__tests__/ にスタブが作成されていること. Normative evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。

## Rollout and rollback

- Rollout: test-design.md と各テストスタブを作成し、quality_constraints 8 件との対応漏れがないことを確認してから P05 (実装) へ引き継ぐ
- Rollback trigger and steps: quality_constraints とテストケースの対応漏れが判明した場合、test-design.md の対応表を修正し不足カテゴリを追加する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publish-pipeline.context.json` (`sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41`)
- Phase responsibility: 全 acceptance と品質制約を実装前のテストケースへ写像する。
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

This section is normative for P04 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/backend-spec.md §5.1, §6.1, §4.6
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P03
