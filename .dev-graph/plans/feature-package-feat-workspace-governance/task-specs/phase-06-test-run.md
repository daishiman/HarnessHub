# System task overlay: テスト実行 — policy遮断・監査テナントスコープ検索・RBAC変更監査記録・T-1/T-1b/T-1c/T-6テストの実行

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "quality", "test-run"]
- related_nodes: ["feat-workspace-governance", "arch-harness-hub-security"]
- parent_feature: feat-workspace-governance
- phase_ref: P06
- classification: confidence=0.84, reason="P04で設計したpolicy遮断テスト・監査ログテナントスコープ検索テスト・RBAC変更監査記録テスト・T-1/T-1b/T-1c/T-6適合確認テストを実行し結果を記録するP06テスト実行タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装した governance_policies・publish/:id/reject・RBAC 権限マトリクス UI・承認キュー UI・監査ログ UI に対し、P04 で設計したテストケースを実行し、acceptance 3 件と quality_constraints 6 件全ての pass 結果を記録する。

## 背景

テスト実行は P04 の test-design.md に列挙された全テストケースを対象とする。具体的には (1) governance_policies.require_publish_approval=true のテナントで Ready 状態の PublishRequest が Approval Pending へ遷移し Approved へ自動遷移しないことを確認する policy 遮断テスト、(2) workspace-admin が自テナントの監査ログを action/entity/actor/期間で検索でき他テナントの監査ログが返らないことを確認するテナントスコープ検索テスト、(3) users.role_change 実行時に対応する監査 event が記録され hash chain の連続性 (seq/prev_hash/event_hash) が保たれることを確認する RBAC 変更監査記録テスト、(4) T-1 (publish.reject・governance.policy_change を含む拡張 action 網羅)・T-1b (許可表単調性回帰)・T-1c (越境監査強制)・T-6 (監査 chain 改竄検出) への適合確認テストを実行する。いずれかのテストが fail した場合は原因を記録し P05 (実装) へ差し戻す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance, arch-harness-hub-security
- Entry gate: P05 (implementation-notes.md) が完了し、governance_policies・publish/:id/reject・RBAC 権限マトリクス UI・承認キュー UI・監査ログ UI が実装された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + verify: S04/S05/S06 UI のテスト実行結果を記録する
- Backend: applicable + verify: policy hook・publish/:id/reject のテスト実行結果を記録する
- API: applicable + verify: publish/:id/reject・governance-policies API のテスト実行結果を記録する
- Data: applicable + verify: governance_policies テーブルのスキーマ検証テスト実行結果を記録する
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + verify: T-1/T-1b/T-1c/T-6 適合確認テストの実行結果を記録する
- Quality: applicable + change: acceptance 3 件・quality_constraints 6 件全ての pass/fail 結果を test-run-results.md に記録する
- Documentation: applicable + change: docs/features/feat-workspace-governance/test-run-results.md を新規作成する
- Operations: N/A: 運用テストの実行は P09 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security (T-1/T-1b/T-1c/T-6 テスト契約の参照元)
- Deploy unit/environment: cloudflare-workers/hub (本 task はテスト実行のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実 migration への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/test-run-results.md (quality_constraints 6 件全ての pass 結果、実測ログを含む)
- Consumed artifacts: docs/features/feat-workspace-governance/test-design.md, packages/db/src/__tests__/workspace-governance/, docs/features/feat-workspace-governance/implementation-notes.md
- Write scope/touches: docs/features/feat-workspace-governance/test-run-results.md, packages/db/src/__tests__/workspace-governance/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p06 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P05] のため P05 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/test-run-results.md, packages/db/src/__tests__/workspace-governance/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストケースの新規設計・変更 (設計は P04 で完了済み、本 task は実行のみ)
- 実装コードの修正 (fail が判明した場合は P05 へ差し戻し、本 task では修正しない)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-workspace-governance`
- Required evidence: test-run-results.md に quality_constraints 6 件全ての pass 結果(policy 遮断・監査テナントスコープ検索・RBAC 変更監査記録・T-1/T-1b/T-1c/T-6 の実測結果を含む)が記録されていること(fail が残る場合は差し戻し理由が明記されていること)

## Rollout and rollback

- Rollout: test-run-results.md を作成し、全テストの pass 結果が記録されていることを確認してから P07 へ引き継ぐ
- Rollback trigger and steps: いずれかのテスト(policy 未遮断・監査 event 欠落・許可表単調性違反を含む)が fail した場合、test-run-results.md に原因を記録し P05 (実装) へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md
- Detailed authoritative source: docs/security-spec.md (§8.1, §8.3)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P05 (実装)
