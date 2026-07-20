# System task overlay: 独立設計レビュー — governance_policies拡張点・reject契約・RBAC/監査UI・feature境界遵守の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "quality", "design-review"]
- related_nodes: ["feat-workspace-governance", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-workspace-governance
- phase_ref: P03
- classification: confidence=0.83, reason="P02で確定したgovernance_policies拡張・publish/:id/reject契約・RBAC権限マトリクスUI・監査ログUI・追加監査actionの6系統architecture decisionを、実装着手前に独立観点で妥当性確認するP03設計レビュータスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 で確定した 6 系統の architecture decision (governance_policies テーブル・publish/:id/reject 契約・RBAC 権限マトリクス UI・監査ログ UI・統制ポリシー設定 UI・追加監査 action) を、実装着手 (P05) より前に独立観点でレビューし、妥当性を確認する。特に feature 間の所有境界 (feat-publish-pipeline の PublishRequest 状態機械/GET /api/v1/publish 詳細設計、feat-user-org-admin の S17、feat-dual-catalog-web の S04 本体) を越境していないことを重点的に確認する。

## 背景

本 feature は既存確定基盤の Stage 2 拡張という性質上、P02 の architecture decision が既存契約 (PublishRequest 状態機械、base 4-role 許可表、audit_events hash chain) を破壊せず積み増しできているかどうかが最大のリスクである。特に (1) governance_policies の policy hook が PublishRequest 状態機械の遷移判定にどう接続されるか (状態機械本体への変更を伴わないか)、(2) POST /api/v1/publish/:id/reject が既存 POST /api/v1/publish/:id/approve の権限モデル・監査 event 契約と整合しているか、(3) RBAC 権限マトリクス UI が feat-user-org-admin 所有の S17 を変更・拡張の対象にしていないか、(4) 統制ポリシー設定 UI が feat-dual-catalog-web 所有の S04 本体 (IdP/Cloudflare 接続・token 失効・rollback) を破壊せず拡張できているか、(5) 追加監査 action governance.policy_change が既存 hash chain 計算式 (SHA-256、seq/prev_hash/event_hash) と非互換にならないか、の 5 点を design-review-notes.md に明記して確認する。goal-spec の quality_constraints (granular-rbac-baseline-and-extension-boundary) が明示する workspace_memberships 新設の R4-reopen 据置きが P02 で守られているかも合わせて確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: P02 (architecture-decision-record.md) が完了し、6 系統すべての architecture decision が記載された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + review: S04/S05/S06 UI 設計が feat-dual-catalog-web (S04 本体)・feat-user-org-admin (S17) の所有領域を侵していないかをレビューする
- Backend: applicable + review: publish/:id/reject 契約と governance_policies policy hook 接続方式が PublishRequest 状態機械 (feat-publish-pipeline 所有) を破壊しないかをレビューする
- API: applicable + review: publish/:id/reject・governance-policies API の契約が既存 API 規約 (認証方式・rate limit・エラー形式) と整合しているかをレビューする
- Data: applicable + review: governance_policies テーブルの additive 設計が既存スキーマと非破壊であることをレビューする
- Infrastructure: N/A: 本 feature は追加インフラを新設しない
- Security: applicable + review: RBAC 権限マトリクス UI が既存許可表の単調性 (member, owner, workspace-admin, provider-admin の順で権限が単調増加する序列) を破壊しないか、追加監査 action が既存 hash chain と非互換にならないかをレビューする
- Quality: applicable + review: 6 系統の architecture decision それぞれについて妥当性確認結果 (問題なし、または是正指示) を記録する
- Documentation: applicable + change: docs/features/feat-workspace-governance/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順のレビューは P12 以降で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend (P02 の architecture-decision-record.md に対するレビュー対象)
- Deploy unit/environment: cloudflare-workers/hub (本 task はレビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実コード・実 migration への変更を伴わない (migration の実適用は P08)

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/design-review-notes.md (P02 の 6 系統 architecture decision それぞれについての妥当性確認結果、feature 境界遵守確認結果を含む)
- Consumed artifacts: docs/features/feat-workspace-governance/architecture-decision-record.md, docs/features/feat-workspace-governance/requirements-baseline.md
- Write scope/touches: docs/features/feat-workspace-governance/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p03) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p03 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P02] のため P02 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/design-review-notes.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- architecture decision の再設計そのもの (問題が見つかった場合は P02 への差し戻しに留め、本 task では代替案を実装しない)
- feat-publish-pipeline/feat-dual-catalog-web/feat-user-org-admin 所有領域の実コードレビュー (それらは各 feature 自身の package が担う)
- 実装コードの作成 (本 task はレビューのみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-workspace-governance`
- Required evidence: design-review-notes.md に P02 の 6 系統 architecture decision それぞれについての妥当性確認結果と、feat-publish-pipeline/feat-dual-catalog-web/feat-user-org-admin 所有領域への越境がないことの確認結果が記載されていること

## Rollout and rollback

- Rollout: design-review-notes.md を作成し、6 系統すべてに問題なしの判定が記載されていることを確認してから P04 へ引き継ぐ
- Rollback trigger and steps: governance_policies 拡張・reject 契約・RBAC/監査 UI 設計のいずれか、または feature 境界遵守に重大な指摘が見つかった場合、design-review-notes.md に指摘内容を記録し P02 へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md U9 (I8), system-spec/security.md, system-spec/backend.md
- Detailed authoritative source: docs/security-spec.md (§3, §5), docs/backend-spec.md (§4.6, §5.1), docs/frontend-spec.md (S04/S05/S06), docs/screen-inventory.md
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P02 (アーキテクチャ設計)
