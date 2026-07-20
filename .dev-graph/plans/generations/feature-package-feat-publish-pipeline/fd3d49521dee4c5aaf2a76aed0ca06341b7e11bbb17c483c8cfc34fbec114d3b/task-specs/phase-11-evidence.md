# System task overlay: 再現可能な証跡 — P06/P07/P09/P10 の証跡集約と再現手順の確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "quality", "evidence"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P11
- classification: confidence=0.84, reason="P06/P07/P09/P10 で得られた証跡を集約し、第三者が再現可能な形で保存する P11 証跡タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P10 完了後、P06 (テスト実行結果)・P07 (受入記録)・P09 (品質保証報告)・P10 (最終レビュー記録) に散在する証跡を evidence-summary.md として集約し、第三者が同一のコマンド列を実行することで同一の結果を再現できる手順を確立する。

## 背景

exact-13 契約の完了条件は P11 の再現可能な証跡の存在を要求する。本 task は新規の検証行為を行わず、既存の P06/P07/P09/P10 の各文書から (1) 実行したコマンド、(2) 得られた結果、(3) 対応する quality_constraint/acceptance ID の 3 点を抽出し一覧化する。これにより、将来の監査や引き継ぎの際に、個別の phase 文書を辿らなくても evidence-summary.md 単体で feature 全体の受入根拠を把握できる。R2 content-addressed storage の冪等性、TargetChannel 直列化の 409 応答、監査 hash chain の整合性、状態機械 property test の全遷移網羅性の 4 点は quality_constraints の中でも自動テストで機械的に再現可能なものであり、evidence-summary.md にはこれらを再実行するための正確なコマンド列を明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P10 の docs/features/feat-publish-pipeline/final-review-record.md が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: N/A: 本 task は証跡集約文書化のみで実装物を変更しない
- API: N/A: 本 task は証跡集約文書化のみ
- Data: N/A: 本 task は証跡集約文書化のみ
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: 監査 hash chain 整合性の再現手順を明記する
- Quality: applicable + change: quality_constraints 8 件それぞれの再現手順を集約する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/evidence-summary.md を新規作成する
- Operations: N/A: 運用証跡 (デプロイ実績) は P13 で扱う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は証跡集約文書化のみ

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/evidence-summary.md (P06/P07/P09/P10 の証跡集約、quality_constraints 8 件それぞれの再現コマンド列を含む)
- Consumed artifacts: docs/features/feat-publish-pipeline/test-run-results.md, acceptance-record.md, quality-assurance-report.md, final-review-record.md (全て docs/features/feat-publish-pipeline/ 配下)
- Write scope/touches: docs/features/feat-publish-pipeline/evidence-summary.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p11) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p11 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P10]。resource_scope (docs/features/feat-publish-pipeline/evidence-summary.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 新規の検証行為の実施 (本 task は既存証跡の集約のみで新規テストは実行しない)
- feat-domain-model-db/feat-auth-tenancy 側の証跡集約 (それぞれの owner feature が担う)
- 本番環境での証跡取得 (owner=P13)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-publish-pipeline/evidence-summary.md に quality_constraints 8 件それぞれの再現コマンド列と対応する結果が記載されていること. Normative evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。

## Rollout and rollback

- Rollout: evidence-summary.md の集約を完了してから P12 (文書化・運用) へ引き継ぐ
- Rollback trigger and steps: 集約対象の証跡に欠落・矛盾が見つかった場合、該当する P06/P07/P09/P10 へ差し戻し再取得を依頼する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publish-pipeline.context.json` (`sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41`)
- Phase responsibility: P06・P07・P09・P10 の証跡を source digest 付きで集約する。
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

This section is normative for P11 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publish-pipeline.context.json; docs/backend-spec.md §4.6; system-spec/backend.md qa-059; docs/security-spec.md §6.3/§7.3
- Effective phase contract: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/publish/`
- `apps/hub/src/lib/publish/auth-principal.ts`
- `packages/schemas/publish-pipeline/`
- Mandatory evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I2, I3), system-spec/spec-state.json qa_log (qa-009, qa-010, qa-037)
- Detailed authoritative source: docs/backend-spec.md §5.1, §6.1
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P10
