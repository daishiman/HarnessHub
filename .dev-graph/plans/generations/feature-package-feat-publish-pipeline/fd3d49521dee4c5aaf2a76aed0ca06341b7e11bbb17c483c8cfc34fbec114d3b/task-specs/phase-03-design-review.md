# System task overlay: 独立設計レビュー — スキーマ owner 境界・状態機械設計・検査 pipeline 設計の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "quality", "design-review"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P03
- classification: confidence=0.88, reason="P02 の architecture decision (スキーマ owner 境界・単一認可ミドルウェア owner・検査 pipeline owner・状態機械実装方式) を P02 実行者から独立した視点で検証する P03 レビュータスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md に記載された (1) publish_requests 等のスキーマ owner 確定、(2) 単一認可ミドルウェア owner 確定、(3) 検査 pipeline owner/消費境界確定、(4) PublishRequest 状態機械実装方式、(5) REST API 12 経路の zod スキーマ設計、(6) TargetChannel 直列化実装方式について、P02 の実行者から独立した視点で妥当性を検証し、設計上の欠落・矛盾・cross-feature 境界の誤りがないことを確認する。

## 背景

exact-13 契約の完了条件は「P07/P10/P11 の evidence から feature acceptance が満たされること」であり、P03 の独立レビューは P10 (最終独立レビュー) より前の早期ゲートとして、実装 (P05) 着手前に設計の誤りを検出する役割を持つ。特に本 feature は 3 つの cross-feature 境界判断 (feat-domain-model-db へのスキーマ owner 帰属、feat-auth-tenancy への認可ミドルウェア owner 帰属、feat-publisher-plugin への検査 pipeline 消費側帰属) を含むため、これらの判断が P02 の 3 系統の証跡 (文書証跡・構造的制約・責務分離の原則) に基づいて妥当であるかを検証することが本 task の中心的な責務である。加えて、状態機械の 9 状態がすべて docs/backend-spec.md §5.1 の遷移図と一致しているか、MVP サブセット (Yellow/Red の一律 Needs Fix 差戻し、Approval Pending 未到達) の扱いが goal-spec の quality_constraints (green-auto-publish-yellow-red-needs-fix-i2) と整合しているかを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P02 の docs/features/feat-publish-pipeline/architecture-decision-record.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: N/A: 本 task は既存設計文書のレビューであり実装物を変更しない
- API: N/A: レビュー対象は P02 の設計文書であり API 実装物ではない
- Data: N/A: スキーマ owner 境界のレビューであり、スキーマ自体の変更は行わない
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: 単一認可ミドルウェア消費方式・secret scan/高リスク instructions パターン検出設計の妥当性を検証する
- Quality: applicable + change: 3 系統の cross-feature 境界判断の妥当性、状態機械 9 状態の §7.2 準拠性、TargetChannel 直列化実装方式の妥当性を検証する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順のレビューは P12 完了後の P10 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実コードへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/design-review-notes.md (3 系統の cross-feature 境界判断の検証結果、状態機械設計・検査 pipeline 設計・REST API 設計・TargetChannel 直列化実装方式の妥当性確認結果を含む)
- Consumed artifacts: docs/features/feat-publish-pipeline/architecture-decision-record.md, docs/backend-spec.md, .dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md, .dev-graph/plans/feature-package-feat-auth-tenancy/task-specs/phase-05-implementation.md
- Write scope/touches: docs/features/feat-publish-pipeline/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p03) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p03 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P02]。resource_scope (docs/features/feat-publish-pipeline/design-review-notes.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- P02 の architecture decision の再作成 (指摘事項がある場合は P02 へ差し戻すのみで、本 task 自体は変更を行わない)
- 実装コードのレビュー (実装物のレビューは P06/P09/P10 で行う)
- Publisher/カタログ UI 側の設計レビュー (owner=feat-publisher-plugin / feat-dual-catalog-web / feat-workspace-governance)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-publish-pipeline/design-review-notes.md に 3 系統の cross-feature 境界判断根拠の検証結果と、状態機械・検査 pipeline・単一認可ミドルウェア消費・TargetChannel 直列化の各設計の妥当性確認結果が記載されていること

## Rollout and rollback

- Rollout: design-review-notes.md で全設計項目の妥当性が確認されたことを確認してから P04 (テストファースト設計) へ引き継ぐ
- Rollback trigger and steps: cross-feature 境界判断根拠または状態機械/検査 pipeline 設計に重大な指摘が見つかった場合、design-review-notes.md に指摘内容を記録し P02 へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publish-pipeline.context.json` (`sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41`)
- Phase responsibility: P02 の設計が現行 context を漏れなく、矛盾なく満たすか独立レビューする。
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

This section is normative for P03 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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
- Detailed authoritative source: docs/backend-spec.md §5.1, §6.1
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P02
