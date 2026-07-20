# System task overlay: 実装 — governance_policiesテーブル・publish/:id/reject API・RBAC権限マトリクスUI(S04拡張)・承認キューUI(S05)・監査ログUI(S06)の実装

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "backend", "implementation"]
- related_nodes: ["feat-workspace-governance", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-workspace-governance
- phase_ref: P05
- classification: confidence=0.86, reason="governance_policiesテーブル実装とPublishRequest状態機械へのpolicy hook配線、POST /api/v1/publish/:id/reject実装、S04拡張(RBAC権限マトリクスUI・統制ポリシー設定UI)、S05承認キューUI、S06監査ログUIを行うP05実装タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02/P03 で確定・レビュー済みの architecture decision と P04 で設計したテストケースに基づき、governance_policies テーブル・PublishRequest への policy hook 配線・POST /api/v1/publish/:id/reject エンドポイント・RBAC 権限マトリクス UI (S04 拡張)・承認キュー UI (S05)・監査ログ閲覧・検索 UI (S06)・統制ポリシー設定 UI (S04 拡張) を実装する。

## 背景

実装は P02 の architecture decision に厳密に従う。governance_policies テーブルは tenant_id 単位スコープの additive テーブルとして新設し、PublishRequest 状態機械 (feat-publish-pipeline 所有) の Ready→{Approval Pending, Approved} 分岐に対しては policy evaluator adapterを共通PublishRequest engineの公開seamへ登録し、Ready分岐で実際に呼ばれるconsumer wiringまで実装する（core algorithmの複製はしない）。POST /api/v1/publish/:id/reject は既存 POST /api/v1/publish/:id/approve と同一の権限モデル (session/workspace-admin) と監査 event 契約 (既存 publish.reject action) に従う。RBAC 権限マトリクス UI は既存許可表 (users.write/users.role_change=workspace-admin) を読み取り専用で可視化するコンポーネントとして S04 (feat-dual-catalog-web 所有、governance が拡張) に追加し、feat-user-org-admin 所有の S17 は一切変更しない。承認キュー UI (S05) は既存確定の GET /api/v1/publish の status=approval_pending フィルタ (feat-publish-pipeline P02 所有契約) を消費し、30 秒ポーリングによる簡易一覧・詳細表示として実装する (docs/frontend-spec.md S05 準拠)。監査ログ UI (S06) は既存確定の GET /api/v1/audit-events を消費し、action/entity/actor/期間+cursor によるフィルタ検索と、表示範囲の hash chain 再検証結果の警告表示を実装する。統制ポリシー設定 UI は S04 拡張の一部として require_publish_approval のトグル操作を実装し、変更操作は新規追加監査 action governance.policy_change で記録する。deny-by-default 認可・role 4 種・admin 出し分けは既存基盤のまま利用し、本 task では認可ミドルウェア自体の変更を行わない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance, arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: P04 (test-design.md) が完了し、acceptance 3 件・quality_constraints 6 件全てに対応するテストケースが設計された状態であること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S04 拡張 (RBAC 権限マトリクス読み取り専用表示、統制ポリシー設定トグル)、S05 承認キュー画面、S06 監査ログ閲覧・検索画面を apps/hub/src/app/(dashboard)/ 配下に実装する
- Backend: applicable + change: POST /api/v1/publish/:id/reject、governance_policies を参照する policy hook 関数を apps/hub/src/lib/governance/ に実装する
- API: applicable + change: apps/hub/src/app/api/v1/publish/[id]/reject/、apps/hub/src/app/api/v1/governance-policies/ を実装する
- Data: applicable + change: packages/db/src/schema/governance-policies.ts、packages/schemas/governance/ を実装する
- Infrastructure: N/A: Cloudflare Workers デプロイ単位は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: 既存 deny-by-default 認可ミドルウェア・許可表を変更せずに利用し、新規エンドポイント・画面へ既存の認可判定を適用する
- Quality: applicable + change: P04 の test-design.md に列挙された全テストケースに対応する実装対象を揃える
- Documentation: applicable + change: docs/features/feat-workspace-governance/implementation-notes.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend (P02 の architecture-decision-record.md に従う)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされる)
- Compatibility/migration/backfill: governance_policies は新規 additive テーブルであり既存テーブルへの破壊的変更は伴わない。実際の migration 適用は P08 で行う

## 成果物

- Produced artifacts: packages/db/src/schema/governance-policies.ts, packages/schemas/governance/, apps/hub/src/app/api/v1/publish/[id]/reject/, apps/hub/src/app/api/v1/governance-policies/, apps/hub/src/lib/governance/, apps/hub/src/app/(dashboard)/workspace-settings/ (S04 拡張分), apps/hub/src/app/(dashboard)/approval-queue/ (S05), apps/hub/src/app/(dashboard)/audit-log/ (S06), docs/features/feat-workspace-governance/implementation-notes.md, apps/hub/src/app/api/v1/audit-events/export/, packages/schemas/governance/audit-export.ts, apps/hub/src/app/(dashboard)/audit-log/, apps/hub/src/lib/publish/policy-adapters/governance.ts (normative implementation artifacts)
- Consumed artifacts: docs/features/feat-workspace-governance/architecture-decision-record.md, docs/features/feat-workspace-governance/test-design.md, docs/backend-spec.md, docs/frontend-spec.md
- Write scope/touches: packages/db/src/schema/governance-policies.ts, packages/schemas/governance/, apps/hub/src/app/api/v1/publish/[id]/reject/, apps/hub/src/app/api/v1/governance-policies/, apps/hub/src/lib/governance/, apps/hub/src/app/(dashboard)/workspace-settings/, apps/hub/src/app/(dashboard)/approval-queue/, apps/hub/src/app/(dashboard)/audit-log/, docs/features/feat-workspace-governance/implementation-notes.md, apps/hub/src/app/api/v1/audit-events/export/, packages/schemas/governance/audit-export.ts, apps/hub/src/app/(dashboard)/audit-log/, apps/hub/src/lib/publish/policy-adapters/governance.ts

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue番号 + dev-graph graph_node_id (sys-workspace-governance-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-WORKSPACE-GOVERNANCE-P04] のため P04 完了後に着手する。resource_scope (write scope 全パス) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- GET /api/v1/publish の実装 (feat-publish-pipeline 所有)
- PublishRequest 状態機械本体の実装・変更 (feat-publish-pipeline 所有)
- feat-user-org-admin 所有 S17 の実装・変更
- feat-dual-catalog-web 所有 S04 本体 (IdP/Cloudflare 接続・token 失効・rollback) の実装・変更
- deny-by-default 認可ミドルウェア自体の新規実装・変更
- 実データ migration の適用 (P08 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: packages/db/src/schema/governance-policies.ts, packages/schemas/governance/, apps/hub/src/app/api/v1/publish/[id]/reject/, apps/hub/src/app/api/v1/governance-policies/, apps/hub/src/lib/governance/, apps/hub/src/app/(dashboard)/workspace-settings/, apps/hub/src/app/(dashboard)/approval-queue/, apps/hub/src/app/(dashboard)/audit-log/ が実装され、P04 の test-design.md に列挙された全テストケースに対応する実装対象が揃っていること. Normative evidence: tenant-scoped export、PII/secret redaction、hash-chain、policy block/approval route、共通state-machine consumer wiring、RBAC/audit testsをP04/P06/P07/P12/P13まで追跡する。

## Rollout and rollback

- Rollout: 実装を完了し、P02 の architecture decision との一致を implementation-notes.md で確認してから P06 へ引き継ぐ
- Rollback trigger and steps: 実装が P02 の architecture decision と矛盾する場合、該当コードを削除し P02 の設計に沿って再実装する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-workspace-governance.context.json` (`sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1`)
- Phase responsibility: P04 を先行条件として現行 scope_in を実装し、scope_out を混入させない。
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

This section is normative for P05 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

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

- System specification: system-spec/backend.md, system-spec/frontend.md, system-spec/security.md
- Detailed authoritative source: docs/backend-spec.md (§4.6, §5.1), docs/frontend-spec.md (S04/S05/S06), docs/security-spec.md (§3, §5)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-WORKSPACE-GOVERNANCE-P04 (テストファースト設計)
