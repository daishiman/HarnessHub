# System task overlay: 独立最終レビュー — quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断の独立確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "quality", "final-review"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P10
- classification: confidence=0.86, reason="P03 の設計レビューとは独立して、実装完了後の quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断を最終確認する P10 独立最終レビュータスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P09 完了後、実装・テスト・受入・リファクタリング・品質保証の全成果物を対象に、P03 (設計レビュー) とは独立した視点で quality_constraints 8 件・goal-spec acceptance 3 件・P02 で確立した 3 件の cross-feature 境界判断 (スキーマ owner=feat-domain-model-db、認可ミドルウェア owner=feat-auth-tenancy、検査 pipeline owner=feat-publish-pipeline) の最終的な妥当性を確認し、final-review-record.md を作成する。

## 背景

exact-13 契約における P10 は、P03 の設計時レビューと異なり実装完了後の成果物全体を対象とする独立最終レビューであり、feature acceptance の判定材料の一つとなる。本 task では P01-P09 の全成果物 (requirements-baseline.md, architecture-decision-record.md, design-review-notes.md, test-design.md, test-run-results.md, acceptance-record.md, refactoring-migration-note.md, quality-assurance-report.md) を横断的に参照し、goal-spec の quality_constraints 8 件それぞれについて「実装が存在するか」「テストが存在し pass しているか」「acceptance との対応が取れているか」を再確認する。特に cross-feature 境界判断については、P02 で示した 3 層の根拠 (文書的証跡・write_scope 構造的制約・責務分離原則) が実装完了後も崩れていないこと (例えば apps/hub 側のコードが packages/db/schema/ への直接アクセスを持たないこと) を P08 の CI ゲート確立実績を参照して再確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P09 の docs/features/feat-publish-pipeline/quality-assurance-report.md が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: N/A: 本 task はレビュー文書化のみで実装物を変更しない
- API: N/A: 本 task はレビュー文書化のみ
- Data: N/A: 本 task はレビュー文書化のみ
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: cross-feature 境界判断の独立最終確認を行う
- Quality: applicable + change: quality_constraints 8 件・acceptance 3 件の最終確認を行う
- Documentation: applicable + change: docs/features/feat-publish-pipeline/final-review-record.md を新規作成する
- Operations: N/A: 運用レビューは P12/P13 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はレビュー文書化のみ

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/final-review-record.md (quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断 3 件の最終確認結果を含む)
- Consumed artifacts: docs/features/feat-publish-pipeline/requirements-baseline.md, architecture-decision-record.md, design-review-notes.md, test-design.md, test-run-results.md, acceptance-record.md, refactoring-migration-note.md, quality-assurance-report.md (全て docs/features/feat-publish-pipeline/ 配下)
- Write scope/touches: docs/features/feat-publish-pipeline/final-review-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p10) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p10 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P09]。resource_scope (docs/features/feat-publish-pipeline/final-review-record.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (重大な指摘があれば該当 phase へ差し戻すのみで本 task では修正しない)
- feat-domain-model-db/feat-auth-tenancy 側成果物の独立レビュー (それぞれの owner feature が担う)
- 本番デプロイ判断 (owner=P13)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-publish-pipeline/final-review-record.md に quality_constraints 8 件・acceptance 3 件・cross-feature 境界判断 3 件全ての最終確認結果 (問題なし) が記載されていること. Normative evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。

## Rollout and rollback

- Rollout: final-review-record.md で重大な指摘がないことを確認してから P11 (再現可能な証跡) へ引き継ぐ
- Rollback trigger and steps: 重大な指摘がある場合、final-review-record.md に理由を記録し該当する P02/P05/P08/P09 のいずれかへ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publish-pipeline.context.json` (`sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41`)
- Phase responsibility: 全 acceptance、scope、品質制約の最終充足を独立にレビューする。
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

This section is normative for P10 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publish-pipeline.context.json; docs/backend-spec.md §4.6; system-spec/backend.md qa-059; docs/security-spec.md §6.3/§7.3
- Effective phase contract: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/publish/`
- `apps/hub/src/lib/publish/auth-principal.ts`
- `packages/schemas/publish-pipeline/`
- Mandatory evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I1, I2, I3, D4, G1, G4), system-spec/spec-state.json qa_log (qa-002, qa-004, qa-006, qa-009, qa-010, qa-011, qa-020, qa-033, qa-037)
- Detailed authoritative source: docs/backend-spec.md §4.6, §5.1, §6.1, §9
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P09
