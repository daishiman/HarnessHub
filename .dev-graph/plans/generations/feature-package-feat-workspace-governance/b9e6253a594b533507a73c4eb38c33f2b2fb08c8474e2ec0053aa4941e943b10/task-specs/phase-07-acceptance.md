# System task overlay: 受入 — 承認フローpolicy遮断・監査ログテナントスコープ検索・RBAC変更監査記録の3件受入判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "quality", "acceptance"]
- related_nodes: ["feat-workspace-governance"]
- parent_feature: feat-workspace-governance
- phase_ref: P07
- classification: confidence=0.85, reason="goal-spec.json acceptance 3項目(承認フローを経ないpublishのpolicy遮断・監査ログのTenantスコープ検索・RBAC変更の監査event記録)を確認するP07受入タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 のテスト実行結果に基づき、goal-spec の acceptance 3 件 (承認フローを経ない publish が policy で遮断される、監査ログが Tenant スコープで検索できる、RBAC 変更が監査 event に記録される) が満たされていることを最終判定する。

## 背景

acceptance 判定は P06 の test-run-results.md に記録された実測結果を根拠とする。(1) 「承認フローを経ない publish が policy で遮断される」は governance_policies.require_publish_approval=true のテナントで Ready→Approved の自動遷移が発生せず Approval Pending へ遷移することの実測ログで確認する。(2) 「監査ログが Tenant スコープで検索できる」は GET /api/v1/audit-events を用いた自テナント検索結果に他テナントの event が混入しないことの実測ログで確認する。(3) 「RBAC 変更が監査 event に記録される」は users.role_change 実行後に対応する監査 event が hash chain の連続性を保った状態で記録されることの実測ログで確認する。3 件のいずれかが不充足の場合は理由を記録し、原因に応じて P05 (実装) または P02 (設計) へ差し戻す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance
- Entry gate: P06 (test-run-results.md) が完了し、quality_constraints 6 件全ての pass 結果が記録された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は受入判定文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は受入判定文書化のみで backend 実装物を変更しない
- API: N/A: 本 task は受入判定文書化のみ
- Data: N/A: 本 task は受入判定文書化のみ
- Infrastructure: N/A: 本feature は追加インフラを新設しない
- Security: applicable + verify: RBAC 変更の監査 event 記録、監査ログのテナントスコープ検索の受入判定を行う
- Quality: applicable + change: goal-spec acceptance 3 件の pass/fail 最終判定を acceptance-record.md に記録する
- Documentation: applicable + change: docs/features/feat-workspace-governance/acceptance-record.md を新規作成する
- Operations: N/A: 運用受入は P09/P13 で行う

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は既存 architecture decision の受入確認のみで新規決定を行わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は受入判定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は受入判定のみで実コード・実 migration への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/acceptance-record.md (goal-spec acceptance 3 件全ての確認結果(pass)と証跡を含む)
- Consumed artifacts: docs/features/feat-workspace-governance/test-run-results.md, goal-spec.json
- Write scope/touches: docs/features/feat-workspace-governance/acceptance-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p07 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P06] のため P06 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/acceptance-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストの再実行 (fail が判明した場合は差し戻し先の task で対応し、本 task では再実行しない)
- 実装コードの修正 (本 task は受入判定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: acceptance-record.md に goal-spec acceptance 3 件全ての確認結果(pass)と証跡(policy 遮断テストログ・監査ログテナントスコープ検索テストログ・RBAC 変更監査記録テストログ)が記載されていること. Normative evidence: tenant-scoped export、PII/secret redaction、hash-chain、policy block/approval route、共通state-machine consumer wiring、RBAC/audit testsをP04/P06/P07/P12/P13まで追跡する。

## Rollout and rollback

- Rollout: acceptance-record.md を作成し、3 件全て pass であることを確認してから P08 へ引き継ぐ
- Rollback trigger and steps: acceptance 3 件のいずれかが不充足の場合、acceptance-record.md に理由を記録し P05 (実装) または P02 (設計) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-workspace-governance.context.json` (`sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1`)
- Phase responsibility: 現行 context の acceptance 全件を P06 の実行証跡から判定する。
- Purpose: 顧客管理者が統制と安全性 (G2) を自律運用できるよう、承認キュー・RBAC 拡張・監査ログ閲覧を提供する
- Goal: workspace-admin が承認/差し戻し/監査を Hub Web で完結でき、統制作業の提供者依存が解消された状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- approval queue (Approval Pending 状態の有効化)
- RBAC の細分化と管理 UI
- 監査 event の閲覧・検索 UI
- 統制ポリシー設定
- Scope out:
- 課金
- Stage 3 以降の拡張
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 承認フローを経ない publish が policy で遮断される
- 監査ログが Tenant スコープで検索できる
- RBAC 変更が監査 event に記録される
- Architecture/source refs:
- architecture/harness-hub-security.md
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P07 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-workspace-governance.context.json; docs/backend-spec.md audit/publish contracts; workspace-governance goal quality constraints
- Effective phase contract: P02で監査exportをGET /api/v1/audit-events/export（workspace-admin、自tenant、filter共通、streaming CSV、salary/secret/token値禁止、hash-chain検証結果付き）として設計し、P05でroute/schema/UI export actionを実装する。governance policyは共通PublishRequest engineの注入可能なpolicy evaluator seamを通じてReady→Approval Pending/Approvedを決定し、feat-publish-pipeline本体を複製せず実consumer wiringを同feature write scopeに含める。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/audit-events/export/`
- `packages/schemas/governance/audit-export.ts`
- `apps/hub/src/app/(dashboard)/audit-log/`
- `apps/hub/src/lib/publish/policy-adapters/governance.ts`
- Mandatory evidence: tenant-scoped export、PII/secret redaction、hash-chain、policy block/approval route、共通state-machine consumer wiring、RBAC/audit testsをP04/P06/P07/P12/P13まで追跡する。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md U9 (I8)
- Detailed authoritative source: goal-spec.json (acceptance フィールド)
- Architecture: N/A: 本 task は既存 architecture decision の受入確認のみ
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P06 (テスト実行)
