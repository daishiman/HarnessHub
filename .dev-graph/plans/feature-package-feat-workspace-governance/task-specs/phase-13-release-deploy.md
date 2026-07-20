# System task overlay: リリース/デプロイ — governance_policiesマイグレーション適用順序・wranglerロールアウト・rollback手順

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "operations", "release-deploy"]
- related_nodes: ["feat-workspace-governance", "arch-harness-hub-infrastructure"]
- parent_feature: feat-workspace-governance
- phase_ref: P13
- classification: confidence=0.83, reason="P08で確認したgovernance_policies/audit_events migrationの適用順序を確定し、wranglerによるCloudflare Workersロールアウトとrollback手順を確立するP13リリースタスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P08 で確認した governance_policies テーブル新設 migration と audit_events action 語彙拡張 migration の適用順序を確定し、Cloudflare Workers (apps/hub) への wrangler ロールアウト手順とデプロイ後 smoke test、および rollback 手順を確立してリリースする。

## 背景

リリースは既存 feat-hub-foundation が確立した Cloudflare Workers デプロイ単位 (apps/hub) を利用する。migration 適用順序は (1) governance_policies テーブル新設 (新規 additive テーブルのため既存データへの影響なし)、(2) audit_events への governance.policy_change action 語彙追加 (既存 hash chain 計算式を変更しない non-destructive 追加) の順に適用し、その後に apps/hub の新規コード (publish/:id/reject エンドポイント、RBAC 権限マトリクス UI、承認キュー UI、監査ログ UI、統制ポリシー設定 UI) を wrangler でデプロイする。デプロイ後は smoke test として (a) 承認キュー画面が Approval Pending 件数を表示できること、(b) 監査ログ画面がテナントスコープで検索できること、(c) 統制ポリシー設定トグルの変更が governance.policy_change event として記録されることを確認する。rollback は wrangler の前バージョンへのロールバックと、governance_policies テーブルの drop (新規 additive のため既存データへの影響なし) の2段階で構成する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance, arch-harness-hub-infrastructure
- Entry gate: P12 (operations-runbook.md) が完了し、workspace-admin 向け運用手順書が整備された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はデプロイ手順の確立のみで frontend 実装物を変更しない
- Backend: N/A: 本 task はデプロイ手順の確立のみで backend 実装物を変更しない
- API: N/A: 本 task はデプロイ手順の確立のみ
- Data: applicable + verify: governance_policies/audit_events migration の適用順序を確定・検証する
- Infrastructure: applicable + change: apps/hub の wrangler ロールアウト手順と rollback 手順を release-deploy-plan.md に記載する
- Security: applicable + verify: デプロイ後 smoke test で統制ポリシー設定変更が監査 event として記録されることを確認する
- Quality: applicable + verify: デプロイ後 smoke test 3 件 (承認キュー表示・監査ログテナントスコープ検索・統制ポリシー変更の監査記録) の結果を記録する
- Documentation: applicable + change: docs/features/feat-workspace-governance/release-deploy-plan.md を新規作成する
- Operations: applicable + change: migration 適用順序・wrangler デプロイ・rollback 手順を確立する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (Cloudflare Workers デプロイ単位の参照元)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub を wrangler でデプロイする)
- Compatibility/migration/backfill: governance_policies 新設 migration→audit_events action 語彙拡張 migration→apps/hub コードデプロイの順序で適用し、rollback 時は逆順で復元する

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/release-deploy-plan.md (migration 適用順序、wrangler ロールアウト手順、smoke test 結果、rollback 手順を含む)
- Consumed artifacts: docs/features/feat-workspace-governance/refactoring-migration-note.md, docs/features/feat-workspace-governance/operations-runbook.md, docs/infrastructure-spec.md
- Write scope/touches: docs/features/feat-workspace-governance/release-deploy-plan.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p13 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P12] のため P12 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/release-deploy-plan.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- feat-hub-foundation が確立した Cloudflare Workers デプロイ単位自体の変更
- 実装コード・テストの追加・修正 (本 task はデプロイ手順の確立と smoke test 記録のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-workspace-governance`
- Required evidence: release-deploy-plan.md に migration 適用順序、wrangler デプロイ手順、デプロイ後 smoke test 3 件の結果 (pass)、rollback 手順が記載されていること

## Rollout and rollback

- Rollout: migration 適用順序 (governance_policies→audit_events action 拡張)→apps/hub wrangler デプロイ→smoke test 3 件確認の順で実施し、release-deploy-plan.md に記録する
- Rollback trigger and steps: smoke test のいずれかが fail した場合、wrangler の前バージョンへロールバックし、governance_policies テーブルを drop (新規 additive のため既存データへの影響なし) して release-deploy-plan.md に原因を記録する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/infrastructure.md
- Detailed authoritative source: docs/infrastructure-spec.md
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P12 (ドキュメント/運用)
