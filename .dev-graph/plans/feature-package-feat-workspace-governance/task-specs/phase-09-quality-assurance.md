# System task overlay: 品質保証 — ASVS L2アクセス制御/ログ到達目標・T-1/T-1b/T-1c/T-6・deny-by-default認可の横断確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "quality", "quality-assurance"]
- related_nodes: ["feat-workspace-governance", "arch-harness-hub-security"]
- parent_feature: feat-workspace-governance
- phase_ref: P09
- classification: confidence=0.83, reason="ASVS L2アクセス制御/ログの到達目標充足、T-1/T-1b/T-1c/T-6適合、deny-by-default認可の継続維持を横断的に品質保証するP09タスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06/P07/P08 で確認済みの実装・受入・migration に対し、goal-spec quality_constraints の `asvs-l2-access-control-logging-acceptance-target` (ASVS L2 の Access Control & Logging 到達目標) と `deny-by-default-authz-already-active-only-admin-screens-deferred` (deny-by-default 認可の継続維持) を横断的に品質保証として最終確認する。

## 背景

品質保証は個別テスト実行 (P06) や受入判定 (P07) とは別に、feature 全体を通した横断的な品質特性を確認する。具体的には (1) ASVS L2 の Access Control (V4) と Logging (V7 系) に該当する到達目標が、新規追加した publish.reject エンドポイント・governance.policy_change action・RBAC 権限マトリクス UI・承認キュー UI・監査ログ UI の全てに一貫して適用されていることを確認する。(2) deny-by-default 認可はP0から既に有効であり、本 feature は S05/S06/RBAC 拡張 UI という admin 系画面についてのみ既存の認可判定を利用する立場であるため、認可ミドルウェア自体に回帰がないことを確認する。(3) T-1/T-1b/T-1c/T-6 の既存確定テスト契約への適合が P06 のテスト実行結果で一貫して pass していることを再確認する。品質保証は新たなテストを設計・実行するものではなく、P02〜P08 の既存成果物を横断的にレビューし、goal-spec の quality_constraints 6 件全件が一貫して満たされていることを quality-assurance-report.md に記録する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance, arch-harness-hub-security
- Entry gate: P08 (refactoring-migration-note.md) が完了し、governance_policies migration と audit_events action 拡張 migration が既存基盤と非互換にならないことが確認された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は横断品質レビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は横断品質レビューのみで backend 実装物を変更しない
- API: N/A: 本 task は横断品質レビューのみ
- Data: N/A: 本 task は横断品質レビューのみ
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + verify: ASVS L2 Access Control/Logging 到達目標、deny-by-default 認可の継続維持、T-1/T-1b/T-1c/T-6 適合の一貫性を横断確認する
- Quality: applicable + change: goal-spec quality_constraints 6 件全件の横断的な最終品質確認結果を quality-assurance-report.md に記録する
- Documentation: applicable + change: docs/features/feat-workspace-governance/quality-assurance-report.md を新規作成する
- Operations: N/A: 運用品質の確認は P13 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security (ASVS L2 到達目標・deny-by-default 認可の参照元)
- Deploy unit/environment: cloudflare-workers/hub (本 task は横断品質レビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実コード・実 migration への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/quality-assurance-report.md (quality_constraints 6 件全件の横断確認結果を含む)
- Consumed artifacts: docs/features/feat-workspace-governance/test-run-results.md, docs/features/feat-workspace-governance/acceptance-record.md, docs/features/feat-workspace-governance/refactoring-migration-note.md, docs/security-spec.md
- Write scope/touches: docs/features/feat-workspace-governance/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p09) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p09 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P08] のため P08 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/quality-assurance-report.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規テストケースの設計・実行 (P04/P06 の既存成果物の横断レビューのみ)
- 実装コード・migration の修正 (品質不備が判明した場合は該当 phase へ差し戻す)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-workspace-governance`
- Required evidence: quality-assurance-report.md に goal-spec quality_constraints 6 件全件 (governance-goal-g4-not-g2-numbering-discrepancy, approval-queue-stage2-activation-contract, granular-rbac-baseline-and-extension-boundary, audit-log-view-baseline-append-only-hash-chain, deny-by-default-authz-already-active-only-admin-screens-deferred, asvs-l2-access-control-logging-acceptance-target) の横断確認結果(pass)が記載されていること

## Rollout and rollback

- Rollout: quality-assurance-report.md を作成し、quality_constraints 6 件全件が pass であることを確認してから P10 へ引き継ぐ
- Rollback trigger and steps: quality_constraints のいずれかに不備が判明した場合、quality-assurance-report.md に理由を記録し該当する phase (P05 実装 または P08 migration) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md
- Detailed authoritative source: docs/security-spec.md (§8.1 ASVS到達目標, §3 deny-by-default)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P08 (リファクタリング/マイグレーション)
