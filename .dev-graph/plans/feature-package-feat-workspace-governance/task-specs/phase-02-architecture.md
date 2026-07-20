# System task overlay: アーキテクチャ設計 — governance_policies拡張ポイント・publish/:id/reject契約・RBAC権限マトリクスUI・監査ログUI・追加監査actionの決定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "backend", "architecture-decision"]
- related_nodes: ["feat-workspace-governance", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-workspace-governance
- phase_ref: P02
- classification: confidence=0.85, reason="P01が据え置いたgovernance_policies設計・publish/:id/reject契約・RBAC権限マトリクスUI・監査ログUI・統制ポリシー設定UI・追加監査actionの6系統を確定するP02アーキテクチャ設計タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 の requirements-baseline.md が据え置いた 4 つの必須解消事項 (publish/:id/reject 契約、RBAC 管理 UI 境界、監査ログ UI 仕様、統制ポリシーデータモデル) を確定し、以降の P03 (設計レビュー) 以降の全 task が同一の architecture decision を参照できる状態にする。この task 完了時点で、governance_policies テーブル設計、publish/:id/reject エンドポイント契約、RBAC 権限マトリクス UI、監査ログ閲覧・検索 UI、統制ポリシー設定 UI、追加監査 action の 6 系統すべての architecture decision が machine-verifiable な文書として固定される。

## 背景

本 feature は既存確定基盤 (PublishRequest 状態機械、base 4-role 許可表、audit_events append-only hash chain) の上に Stage 2 統制機能を積む拡張であり、既存基盤の再設計は行わない。architecture decision は以下の 6 系統で構成する。(1) governance_policies テーブル (tenant_id 単位スコープ、require_publish_approval boolean を含む) を新設し、既存 PublishRequest 状態機械 (feat-publish-pipeline 所有) の Ready→{Approval Pending, Approved} 分岐判定に対して「policy hook」(例: isApprovalRequired(tenant_id) 関数) を提供する形で接続する。本 feature は状態機械本体を所有・変更せず、判定関数の提供のみを担う。(2) 既存監査 action 語彙にはすでに publish.reject が存在するが (docs/backend-spec.md §3.4 系)、対応する REST エンドポイントが未収載であるため、POST /api/v1/publish/:id/reject (workspace-admin 専用、既存 POST /api/v1/publish/:id/approve と対になる Yellow 承認/差し戻しの片翼、監査 event 必須) を新規追加する。GET /api/v1/publish の status=approval_pending フィルタ自体の詳細設計 (パス・スキーマ・rate limit) は feat-publish-pipeline の P02 が所有する契約であり、本 feature は既存/確定予定の当該フィルタを消費するだけで再設計しない。(3) RBAC の細分化と管理 UI は、既存許可表の users.write/users.role_change (workspace-admin) を読み取り専用の権限マトリクス表示として可視化する UI コンポーネントとして設計し、screen-inventory.md の S04 (Workspace 設定・Release 履歴、owner=feat-dual-catalog-web、"+ governance が拡張" と明記) を拡張する形で配置する。feat-user-org-admin が所有する S17 (ユーザー管理) の画面自体は変更・拡張の対象にせず、feature 境界を尊重する。新規 workspace_memberships テーブルなど workspace 単位の権限分離は本 task のスコープ外とし、quality_constraints (granular-rbac-baseline-and-extension-boundary) が明示する R4-reopen 対象のまま据え置く。(4) 監査 event の閲覧・検索 UI は screen-inventory.md で本 feature が直接所有する S06 (監査ログ・export) として新規実装し、既存確定の GET /api/v1/audit-events (workspace-admin・自テナントのみ・action/entity/actor/期間+cursor フィルタ) を消費する。表示範囲の hash chain (seq/prev_hash/event_hash) 再計算による改竄検知結果を UI 上に警告表示する設計とする。formal export (CSV/JSON 等の具体形式) は本 task では設計せず、I8 レベルの確定に留める。(5) 統制ポリシー設定 UI は S04 拡張の一部として、require_publish_approval のトグル操作 UI を設計し、変更操作は新規追加監査 action で記録する。(6) 新規追加監査 action として governance.policy_change を、docs/security-spec.md §5.2 が既に採用している「本書で追加」パターンに倣って既存 append-only hash chain 機構 (SHA-256、seq/prev_hash/event_hash) にそのまま乗せる形で追加する。既存の publish.approve/publish.reject/user.role_change の記録契約には影響を与えない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance, arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: P01 (requirements-baseline.md) が完了し、4 つの必須解消事項 (publish/:id/reject 契約・RBAC 管理 UI 境界・監査ログ UI 仕様・統制ポリシーデータモデル) が明記された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S04 拡張 (RBAC 権限マトリクス読み取り専用表示、統制ポリシー設定トグル)、S05 承認キュー画面、S06 監査ログ閲覧・検索画面の UI 設計をarchitecture-decision-record.md に記載する
- Backend: applicable + change: POST /api/v1/publish/:id/reject エンドポイント契約、governance_policies を参照する policy hook 関数の設計を記載する
- API: applicable + change: publish/:id/reject のパス・権限・監査 event 契約、governance-policies API (GET/PATCH) のパス・zod スキーマ設計を記載する。GET /api/v1/publish 詳細設計は feat-publish-pipeline 所有として明示的にスコープ外にする
- Data: applicable + change: governance_policies テーブル (tenant_id, require_publish_approval, updated_by, updated_at) の DDL 設計を記載する
- Infrastructure: N/A: Cloudflare Workers デプロイ単位は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: 既存許可表 (users.write/users.role_change=workspace-admin) を破壊しない RBAC 権限マトリクス表示設計、既存 audit_events hash chain へ governance.policy_change を追加する非破壊設計を記載する
- Quality: applicable + change: 6 系統の architecture decision すべてに対する検証可能な受入基準を記載する
- Documentation: applicable + change: docs/features/feat-workspace-governance/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う。本 task は architecture decision の確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security (RBAC/監査 hash chain 拡張), arch-harness-hub-backend (publish/:id/reject・governance_policies API), arch-harness-hub-frontend (S04/S05/S06 UI 拡張)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされる。本 task は architecture decision の確定のみでデプロイは行わない)
- Compatibility/migration/backfill: governance_policies は新規 additive テーブルであり既存テーブルへの破壊的変更は伴わない。既存 audit_events テーブルへの governance.policy_change action 追加は既存 hash chain 計算式 (SHA-256、seq/prev_hash/event_hash) と非互換にならないことを本 task で設計確認し、実際の migration は P08 で扱う

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/architecture-decision-record.md (governance_policies テーブル設計、publish/:id/reject 契約、RBAC 権限マトリクス UI 設計、監査ログ UI 設計、統制ポリシー設定 UI 設計、追加監査 action governance.policy_change の 6 系統の architecture decision、および GET /api/v1/publish 詳細設計と PublishRequest 状態機械本体を feat-publish-pipeline 所有として扱う明示的スコープ境界を含む)
- Consumed artifacts: docs/features/feat-workspace-governance/requirements-baseline.md, docs/backend-spec.md, docs/security-spec.md, docs/frontend-spec.md, docs/screen-inventory.md
- Write scope/touches: docs/features/feat-workspace-governance/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P01] のため P01 完了後に着手する。resource_scope (docs/features/feat-workspace-governance/architecture-decision-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- GET /api/v1/publish の詳細設計 (パス・zod スキーマ・rate limit): feat-publish-pipeline の P02 所有契約であり、本 task では消費のみを前提として扱う
- PublishRequest 状態機械本体の設計・変更: feat-publish-pipeline 所有。本 feature は policy hook の提供のみに限定する
- feat-user-org-admin 所有 S17 (ユーザー管理) 画面自体の変更・拡張
- workspace 単位の権限分離 (workspace_memberships テーブル新設): quality_constraints (granular-rbac-baseline-and-extension-boundary) により R4-reopen 対象として据え置く
- 監査ログの formal export (CSV/JSON 等) の具体形式確定
- 実装コードの作成 (本 task は architecture decision の確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-workspace-governance`
- Required evidence: architecture-decision-record.md に 6 系統 (governance_policies テーブル・publish/:id/reject 契約・RBAC 権限マトリクス UI・監査ログ UI・統制ポリシー設定 UI・追加監査 action) すべての architecture decision と、GET /api/v1/publish・PublishRequest 状態機械本体・S17・workspace_memberships の明示的スコープ外記載が過不足なく含まれていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P01 の requirements-baseline.md の据置事項 4 点すべてに対応する決定が記載されていることを確認してから P03 へ引き継ぐ
- Rollback trigger and steps: governance_policies の policy hook 接続方式が feat-publish-pipeline 所有の PublishRequest 状態機械と非互換であることが判明した場合、architecture decision を re-open し P02 を再実行する。再実行まで P03 以降の着手を保留する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md U9 (I8), system-spec/security.md, system-spec/backend.md, system-spec/frontend.md
- Detailed authoritative source: docs/backend-spec.md (§4.6 POST /api/v1/publish/:id/approve, §4.12 GET /api/v1/audit-events, §5.1 PublishRequest 状態機械), docs/security-spec.md (§3 role モデル・許可表, §5 監査・hash chain, §8.1 ASVS, §8.3 T-1/T-1b/T-1c/T-6), docs/frontend-spec.md (S04/S05/S06), docs/screen-inventory.md (S04/S05/S06/S17 の担当 feature 表)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P01 (要件ベースライン確定)
