# System task overlay: ドキュメント/運用 — workspace-admin向け承認/監査/RBAC設定 運用手順書の整備

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "documentation", "documentation-operations"]
- related_nodes: ["feat-workspace-governance"]
- parent_feature: feat-workspace-governance
- phase_ref: P12
- classification: confidence=0.82, reason="workspace-adminが承認キュー・監査ログ・RBAC設定・統制ポリシー設定を自律運用するための運用手順書を整備するP12タスク", candidates=[{artifact_kind: task, confidence: 0.82, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

goal-spec の goal (「workspace-admin が承認/差し戻し/監査を Hub Web で完結でき、統制作業の提供者依存が解消された状態」) を運用面で実現するため、workspace-admin 向けの運用手順書 (承認キューでの承認/差し戻し操作、監査ログの検索・export 操作、RBAC 権限マトリクスの参照操作、統制ポリシー設定の変更操作) を整備する。

## 背景

本 feature の goal は「統制作業の提供者依存の解消」であり、これを実現するには実装だけでなく workspace-admin が自律的に操作できる運用手順書が不可欠である。手順書には (1) 承認キュー (S05) での Approval Pending 案件の承認/差し戻し操作、(2) 監査ログ (S06) での action/entity/actor/期間によるフィルタ検索と export 操作、(3) RBAC 権限マトリクス (S04 拡張、読み取り専用) の参照方法、(4) 統制ポリシー設定 (S04 拡張、require_publish_approval トグル) の変更操作とその影響範囲 (変更後は governance.policy_change として監査 event に記録される) を記載する。運用手順書は customer-facing の operator 向け文書であり、内部実装の詳細ではなく操作手順とその意味を平易に説明する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance
- Entry gate: P11 (evidence-package.md) が完了し、証跡パッケージが集約された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は運用手順書の作成のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は運用手順書の作成のみで backend 実装物を変更しない
- API: N/A: 本 task は運用手順書の作成のみ
- Data: N/A: 本 task は運用手順書の作成のみ
- Infrastructure: N/A: 本feature は追加インフラを新設しない
- Security: applicable + verify: 統制ポリシー設定変更が監査 event として記録される旨を運用手順書に明記し、運用者が影響範囲を理解できることを確認する
- Quality: applicable + change: 運用手順書がgoal-spec goal (統制作業の提供者依存解消) を実現する内容になっているか確認する
- Documentation: applicable + change: docs/features/feat-workspace-governance/operations-runbook.md を新規作成する
- Operations: applicable + change: workspace-admin 向け承認/監査/RBAC 設定操作の運用手順を整備する

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は運用手順書の作成のみで新規 architecture decision を行わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は文書化のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は文書化のみで実コード・実 migration への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/operations-runbook.md (承認キュー操作・監査ログ検索/export操作・RBAC参照操作・統制ポリシー設定変更操作の手順を含む)
- Consumed artifacts: docs/features/feat-workspace-governance/evidence-package.md, docs/frontend-spec.md, goal-spec.json
- Write scope/touches: docs/features/feat-workspace-governance/operations-runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P11] のため P11 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/operations-runbook.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの追加・変更 (本 task は文書化のみ)
- feat-user-org-admin 所有 S17 のユーザー管理手順 (本 feature の対象外)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: operations-runbook.md に承認キュー操作・監査ログ検索/export操作・RBAC参照操作・統制ポリシー設定変更操作の4手順が具体的なUI操作手順として記載されていること

## Rollout and rollback

- Rollout: operations-runbook.md を作成し、goal-spec goal (統制作業の提供者依存解消) を実現する内容であることを確認してから P13 へ引き継ぐ
- Rollback trigger and steps: 運用手順書の内容が実装 (P05) と不整合であることが判明した場合、operations-runbook.md を修正するか P05 の実装確認へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-workspace-governance.context.json` (`sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1`)
- Phase responsibility: 検証済み実装の運用・runbook・handover を文書化し、先行 phase の前提にしない。
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

This section is normative for P12 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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

- System specification: system-spec/frontend.md
- Detailed authoritative source: docs/frontend-spec.md (S04/S05/S06)
- Architecture: N/A: 本 task は運用手順書の作成のみ
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P11 (エビデンス集約)
