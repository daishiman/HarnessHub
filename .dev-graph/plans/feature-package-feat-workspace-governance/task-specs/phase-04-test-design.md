# System task overlay: テストファースト設計 — policy遮断・監査テナントスコープ検索・RBAC変更監査記録・T-1/T-1b/T-1c/T-6適用のテスト設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "quality", "test-design"]
- related_nodes: ["feat-workspace-governance", "arch-harness-hub-security"]
- parent_feature: feat-workspace-governance
- phase_ref: P04
- classification: confidence=0.84, reason="acceptance 3件(policy遮断・監査テナントスコープ検索・RBAC変更監査記録)とquality_constraints 6件に対応するテストケースを設計するP04タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p04.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02/P03 で確定・レビュー済みの architecture decision に基づき、goal-spec の acceptance 3 件 (承認フローを経ない publish の policy 遮断、監査ログの Tenant スコープ検索、RBAC 変更の監査 event 記録) と quality_constraints 6 件を検証するテストケースを実装着手 (P05) より前に設計する。既存確定契約である T-1/T-1b/T-1c/T-6 への適合確認テストも本 task で設計する。

## 背景

本 feature が対象とする既存確定テスト契約は docs/security-spec.md §8.3 に定義されている。T-1 (全 action × 全 role × 自テナント/他テナント/owner/非 owner の組合せ網羅) は publish.reject・governance.policy_change という新規 action/エンドポイントに対しても網羅対象を拡張する必要がある。T-1b (許可表の単調性検査) は RBAC 権限マトリクス UI が表示専用であり許可表自体を変更しないことを確認する回帰テストとして適用する。T-1c (越境の監査強制) は provider-admin の越境操作が workspace-admin から監査ログ UI (S06) 経由で確認できることを確認する。T-6 (監査 chain 改竄検出テスト) は governance.policy_change 追加後も既存 hash chain 検証ロジックが正しく機能することを確認する。これら 4 テスト契約自体は本 feature が新規に定義するものではなく、既存契約への適合を確認する位置づけである (goal-spec quality_constraints id: asvs-l2-access-control-logging-acceptance-target)。

acceptance 固有のテストとして、(1) governance_policies.require_publish_approval=true のテナントで Ready 状態の PublishRequest を Approved へ自動遷移させようとした場合に policy hook が遮断し Approval Pending へ遷移することを確認するテスト、(2) workspace-admin が自テナントの監査ログを action/entity/actor/期間 で検索でき、他テナントの監査ログが返らないことを確認するテスト、(3) workspace-admin が users.role_change を実行した際に対応する監査 event (RBAC 変更) が記録され、hash chain の連続性が保たれることを確認するテストを設計する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance, arch-harness-hub-security
- Entry gate: P03 (design-review-notes.md) が完了し、6 系統の architecture decision すべてに問題なしの判定が記載された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はテスト設計のみで frontend 実装物を変更しない (UI テストシナリオは test-design.md に記述する)
- Backend: applicable + change: policy hook 遮断テスト・publish/:id/reject 監査 event テストのテストケースを設計する
- API: applicable + change: publish/:id/reject・governance-policies API のリクエスト/レスポンス検証テストケースを設計する
- Data: applicable + change: governance_policies テーブルのスキーマ検証テストケースを設計する
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + change: T-1(拡張 action 網羅)・T-1b(許可表単調性回帰)・T-1c(越境監査)・T-6(hash chain 改竄検出)への適合確認テストケースを設計する
- Quality: applicable + change: acceptance 3 件と quality_constraints 6 件全てに対応するテストケースの対応表を作成する
- Documentation: applicable + change: docs/features/feat-workspace-governance/test-design.md を新規作成する
- Operations: N/A: 運用テストの具体化は P09/P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security (T-1/T-1b/T-1c/T-6 テスト契約の参照元)
- Deploy unit/environment: cloudflare-workers/hub (本 task はテスト設計のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はテスト設計のみで実コード・実 migration への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/test-design.md (acceptance 3 件・quality_constraints 6 件全てに対応するテストケース、T-1/T-1b/T-1c/T-6 適合確認テストを含む), packages/db/src/__tests__/workspace-governance/ (テストスタブ)
- Consumed artifacts: docs/features/feat-workspace-governance/architecture-decision-record.md, docs/features/feat-workspace-governance/design-review-notes.md, docs/security-spec.md
- Write scope/touches: docs/features/feat-workspace-governance/test-design.md, packages/db/src/__tests__/workspace-governance/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p04) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p04 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p04) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P03] のため P03 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/test-design.md, packages/db/src/__tests__/workspace-governance/) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- テストの実行そのもの (実行は P06 で行う)
- T-1/T-1b/T-1c/T-6 テスト契約自体の新規定義・変更 (既存確定契約への適合確認テストの設計のみ)
- 実装コードの作成 (本 task はテスト設計のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-workspace-governance`
- Required evidence: test-design.md に acceptance 3 件と quality_constraints 6 件全てに対応するテストケース(既存 T-1/T-1b/T-1c/T-6 適合確認を含む)が記載され、packages/db/src/__tests__/workspace-governance/ にスタブが作成されていること

## Rollout and rollback

- Rollout: test-design.md とテストスタブを作成し、acceptance/quality_constraints との対応漏れがないことを確認してから P05 へ引き継ぐ
- Rollback trigger and steps: acceptance/quality_constraints とテストケースの対応漏れが判明した場合、test-design.md の対応表を修正し不足カテゴリを追加する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md, system-spec/00-requirements-definition.md U9 (I8)
- Detailed authoritative source: docs/security-spec.md (§8.1 ASVS到達目標, §8.3 T-1/T-1b/T-1c/T-6)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P03 (独立設計レビュー)
