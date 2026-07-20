# System task overlay: リファクタリング/マイグレーション — governance_policies新設テーブル・audit_events追加action(governance.policy_change)の既存基盤互換移行

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "data", "refactoring-migration"]
- related_nodes: ["feat-workspace-governance", "arch-harness-hub-security"]
- parent_feature: feat-workspace-governance
- phase_ref: P08
- classification: confidence=0.83, reason="governance_policiesテナントスコープテーブルの新規additive migrationと、既存audit_eventsテーブル(feat-domain-model-db/feat-auth-tenancy所有のhash chain基盤を共有するinfrastructure)へgovernance.policy_change actionを追加するnon-destructive migrationを既存publish.approve/publish.reject/user.role_change actionの記録契約を壊さずに適用するP08マイグレーションタスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P07 で受入判定済みの実装に対し、governance_policies テーブルの新規 additive migration と、既存 audit_events テーブル (feat-domain-model-db/feat-auth-tenancy 所有の hash chain 基盤を共有する infrastructure) への governance.policy_change action 追加を、既存の publish.approve/publish.reject/user.role_change action の記録契約を破壊せずに適用する。

## 背景

本 feature は新規実装だが、audit_events は既存共有テーブルであるため backward-compatible migration が必須責務となる。governance_policies (tenant_id, require_publish_approval, updated_by, updated_at) は完全に新規のテーブルであり既存スキーマへの影響はない。一方 audit_events への governance.policy_change action 追加は、既存の hash chain 計算式 (SHA-256、seq/prev_hash/event_hash) をそのまま利用する non-destructive な action 語彙拡張であり、テーブル構造 (DDL) 自体の変更は伴わない。既存の publish.approve/publish.reject/user.role_change の記録契約 (docs/backend-spec.md 記載の既存確定 action 一覧) と非互換にならないことを、本 task で migration 適用前後の hash chain 連続性検証によって確認する。audit_events テーブルの所有・運用は feat-domain-model-db/feat-auth-tenancy が確立した既存基盤であり、本 feature はその基盤の上に action 語彙を additive に積むのみで、テーブル所有権や hash chain アルゴリズム自体を変更・再設計しない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance, arch-harness-hub-security
- Entry gate: P07 (acceptance-record.md) が完了し、acceptance 3 件全てが pass 判定された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はマイグレーションのみで frontend 実装物を変更しない
- Backend: applicable + change: policy hook が governance_policies テーブルを参照するための migration 適用手順を確認する
- API: N/A: 本 task はマイグレーションのみで API 契約自体は変更しない
- Data: applicable + change: governance_policies テーブルの additive migration、audit_events への governance.policy_change action 追加 migration を適用する
- Infrastructure: N/A: Cloudflare Workers デプロイ単位は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + verify: audit_events hash chain (SHA-256、seq/prev_hash/event_hash) が governance.policy_change 追加後も既存 publish.approve/publish.reject/user.role_change の記録契約を破壊しないことを確認する
- Quality: applicable + change: migration 適用手順と既存基盤への非破壊確認結果を refactoring-migration-note.md に記載する
- Documentation: applicable + change: docs/features/feat-workspace-governance/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security (audit_events hash chain 拡張の参照元)
- Deploy unit/environment: cloudflare-workers/hub (packages/db/migrations/ は apps/hub のデプロイに先行して適用する)
- Compatibility/migration/backfill: governance_policies は新規 additive テーブルであり backfill 不要 (デフォルト値 require_publish_approval=false で全既存テナントに対して透過的)。audit_events への action 語彙追加は既存行に対する backfill を伴わない (新規 event からのみ governance.policy_change が記録される)

## 成果物

- Produced artifacts: packages/db/migrations/ (governance_policies 新設 migration、audit_events action 語彙拡張 migration), docs/features/feat-workspace-governance/refactoring-migration-note.md
- Consumed artifacts: docs/features/feat-workspace-governance/architecture-decision-record.md, docs/features/feat-workspace-governance/acceptance-record.md, docs/security-spec.md
- Write scope/touches: packages/db/migrations/, docs/features/feat-workspace-governance/refactoring-migration-note.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p08 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P07] のため P07 完了後に着手する。resource_scope (packages/db/migrations/) が feat-domain-model-db/feat-auth-tenancy 側の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- audit_events テーブルの所有権移管・DDL 全体の再設計 (feat-domain-model-db/feat-auth-tenancy 所有のまま維持する)
- hash chain アルゴリズム自体 (SHA-256、seq/prev_hash/event_hash 計算式) の変更
- 既存 publish.approve/publish.reject/user.role_change action の記録内容・権限の変更

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: refactoring-migration-note.md に governance_policies テーブルの additive migration 適用手順と、既存 audit_events hash chain(seq/prev_hash/event_hash)への governance.policy_change action 追加が既存 action 記録契約を破壊しないことの確認結果が記載されていること

## Rollout and rollback

- Rollout: migration を適用し、既存 audit_events hash chain の連続性検証結果を refactoring-migration-note.md に記録してから P09 へ引き継ぐ
- Rollback trigger and steps: migration 後に既存 audit_events hash chain または既存 publish.approve/publish.reject/user.role_change action の記録に悪影響が確認された場合、migration を rollback し refactoring-migration-note.md に原因を記録した上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-workspace-governance.context.json` (`sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1`)
- Phase responsibility: migration・互換性・refactor の適用要否を実行し、N/A でも根拠を残す。
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

## 参照情報

- System specification: system-spec/security.md
- Detailed authoritative source: docs/security-spec.md (§5.1 append-only, §5.2 監査対象 action, §5.4 hash chain 計算式)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md)
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P07 (受入)
