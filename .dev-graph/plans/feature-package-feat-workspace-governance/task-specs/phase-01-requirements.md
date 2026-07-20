# System task overlay: 要件ベースライン確定 — 承認キュー・RBAC細分化・監査ログ閲覧・統制ポリシー設定の要件確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-workspace-governance (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-workspace-governance", "macro-feature", "documentation", "requirements-baseline"]
- related_nodes: ["feat-workspace-governance", "arch-harness-hub-security", "arch-harness-hub-frontend", "arch-harness-hub-backend"]
- parent_feature: feat-workspace-governance
- phase_ref: P01
- classification: confidence=0.87, reason="goal-spec (.dev-graph/staging/feature-package-feat-workspace-governance/goal-spec.json) の purpose/goal/scope_in 4件/scope_out 2件/acceptance 3件/quality_constraints 6件(id単位)を要件ベースラインへ確定転記するP01タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-workspace-governance/sys-workspace-governance-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-workspace-governance の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (承認キューの Approval Pending 有効化、RBAC の細分化と管理 UI、監査 event の閲覧・検索 UI、統制ポリシー設定) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 4 件/scope_out 2 件/acceptance 3 件/quality_constraints 6 件が machine-verifiable な baseline 文書として固定される。

## 背景

system-spec/00-requirements-definition.md の U9 I8 (Stage 2 Governance: 管理者 approval queue・granular RBAC・formal audit log・export) は確定ゴール表 (U3) の G4 (「Workspace 管理者が承認・監査・公開停止を行え、shadow IT 化せず統制点が一元化される」) に資する。goal-spec の purpose フィールドには verbatim で「統制と安全性 (G2)」という括弧書きのラベルが含まれているが、これは system-spec/spec-state.json qa-012 (R0-foundation ヒアリング初期段階) の暫定ラベルであり、後続の確定章 (system-spec/security.md・backend.md・frontend.md の frontmatter serves_goals) はいずれも「統制」を G4 として一貫して確定している。G2 は「公開された業務ツールを owner 以外の同僚が見つけて追加・利用し、業務での再利用が成立する (North Star)」という別のゴールであり、本 task 以降のすべての task spec は統制ゴールの正しい参照として G4 を用いる (goal-spec の quality_constraints id: governance-goal-g4-not-g2-numbering-discrepancy)。

本 feature が有効化する承認キュー・RBAC 拡張・監査ログ閲覧・統制ポリシー設定は、いずれも既存確定基盤の Stage 2 拡張であり、認可制御そのものの新設ではない。deny-by-default 認可・role 4 種 (provider-admin/workspace-admin/owner/member)・admin 出し分けは P0 から全画面に効いている既存確定事項であり (goal-spec quality_constraints id: deny-by-default-authz-already-active-only-admin-screens-deferred)、本 feature が新設するのは後回しにされてきた S05 (承認キュー)・S06 (監査ログ)・RBAC 管理拡張という管理画面そのものである。承認キューは PublishRequest 状態機械の Approval Pending 状態を有効化する Stage 2 拡張であり (goal-spec quality_constraints id: approval-queue-stage2-activation-contract)、新規の別状態機械を作るものではない。RBAC の細分化は既存 base 4-role + 単調な許可表を破壊せず拡張するものであり、workspace 単位の権限分離 (workspace_memberships テーブル新設を伴う設計) は将来拡張・R4-reopen 対象として明示的に据え置く (goal-spec quality_constraints id: granular-rbac-baseline-and-extension-boundary)。監査ログ閲覧は既存確定の GET /api/v1/audit-events (append-only・tenant 単位 hash chain) を Stage 2 として有効化・UI 実装するものであり (goal-spec quality_constraints id: audit-log-view-baseline-append-only-hash-chain)、formal export の具体形式は未確定のまま P02 へ引き継ぐ。ASVS 到達目標 (アクセス制御・ログと監査=L2 相当、理由=G4 統制点の一元化) は既存確定の T-1/T-1b/T-1c/T-6 テスト契約への適合を求めるものであり、新規テスト方針を別途定義するものではない (goal-spec quality_constraints id: asvs-l2-access-control-logging-acceptance-target)。

本 task は上記の確定要件を再解釈や欠落なく baseline 化するとともに、P02 (feature architecture 設計) より前には確定していない以下 4 点の未解決事項を明記し、P02 の必須解消事項として引き継ぐ。(1) 承認キューの Approval Pending → Approved 遷移を workspace-admin が Hub Web で完結させるための POST /api/v1/publish/:id/reject エンドポイントは既存 §3.4 監査 action 語彙 (publish.reject) には存在するが REST エンドポイントとしては backend-spec の確定エンドポイント表に未収載であり、その契約 (パス・権限・監査 event) は P02 で確定する。(2) RBAC の細分化と管理 UI の具体的な画面配置・権限マトリクス表示範囲・feat-user-org-admin 所有 S17 との境界は P02 で確定する。(3) 監査 event の閲覧・検索 UI (S06) の具体的な検索条件・hash chain 再検証表示の UI 仕様は P02 で確定する。(4) 統制ポリシー設定 (require_publish_approval 等の tenant 単位ポリシー) の具体的なデータモデルと Ready→Approval Pending 遷移への配線方式は P02 で確定する。本 task はこれら 4 点を「未確定・P02 で確定」の据置事項として明記するに留め、最終的な確定値を先取りして書かない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-workspace-governance, arch-harness-hub-security, arch-harness-hub-frontend, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/feature-package-feat-workspace-governance/goal-spec.json の feature_context_digest が sha256:66ebc79498bfe05d63e1f9203250e575b87934b5d7a4bc6e5ad4fbd0d3ee72a1 に一致し、features/feat-workspace-governance.md の frontmatter と goal-spec の purpose/goal/scope_in/scope_out/acceptance が逐語一致すること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物を変更しない (S04/S05/S06 の画面詳細設計は P02 で確定する)
- Backend: N/A: 本 task は要件文書化のみで backend 実装物を変更しない (publish/:id/reject エンドポイント詳細設計は P02 で確定する)
- API: N/A: publish/:id/reject・governance-policies API のパス・スキーマ・権限の詳細は P02 で定義する。本 task は要件記述のみ
- Data: N/A: governance_policies テーブルの DDL 詳細確定は P02 で行う。本 task は要件記述のみ
- Infrastructure: N/A: Cloudflare Workers デプロイ単位は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: governance-goal-g4-not-g2-numbering-discrepancy・approval-queue-stage2-activation-contract・granular-rbac-baseline-and-extension-boundary・audit-log-view-baseline-append-only-hash-chain・deny-by-default-authz-already-active-only-admin-screens-deferred・asvs-l2-access-control-logging-acceptance-target の 6 件の quality_constraints を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 6 件を machine-verifiable な受入基準として requirements-baseline.md に固定する。P02 で確定すべき 4 つの据置事項 (publish/:id/reject 契約・RBAC 管理 UI 境界・監査ログ UI 仕様・統制ポリシーデータモデル) を必須解消事項として明記する
- Documentation: applicable + change: docs/features/feat-workspace-governance/requirements-baseline.md を新規作成する
- Operations: N/A: 承認/監査/RBAC 運用手順の具体化は P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-frontend, arch-harness-hub-backend (features/feat-workspace-governance.context.json architecture_refs の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (apps/hub は Hub Worker にバンドルされる。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで実コードへの変更を伴わない (実変更は P05、既存 audit_events への互換移行は P08 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-workspace-governance/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 4 件/scope_out 2 件/acceptance 3 件/quality_constraints 6 件の確定転記、G4 統制ゴール参照の明記、および P02 必須解消事項 4 点の明記を含む)
- Consumed artifacts: .dev-graph/staging/feature-package-feat-workspace-governance/goal-spec.json, features/feat-workspace-governance.md, features/feat-workspace-governance.context.json, architecture/harness-hub-security.md, architecture/harness-hub-frontend.md, architecture/harness-hub-backend.md
- Write scope/touches: docs/features/feat-workspace-governance/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-workspace-governance-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-workspace-governance-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-workspace-governance-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-workspace-governance/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 課金 (goal-spec scope_out)
- Stage 3 以降の拡張 (goal-spec scope_out)
- feature 間依存の解決 (feat-dual-catalog-web の S04 本体・feat-auth-tenancy の認証基盤は dev-graph 正本の feature 間依存として扱い、本 task では要件記述内で触れるのみで実装・変更を行わない)
- 実装コードの作成 (本 task は要件確定のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-workspace-governance`
- Required evidence: docs/features/feat-workspace-governance/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 6 件 (governance-goal-g4-not-g2-numbering-discrepancy, approval-queue-stage2-activation-contract, granular-rbac-baseline-and-extension-boundary, audit-log-view-baseline-append-only-hash-chain, deny-by-default-authz-already-active-only-admin-screens-deferred, asvs-l2-access-control-logging-acceptance-target) が過不足なく転記され、P02 必須解消事項 4 点が明記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-workspace-governance.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md U3/U9 (I8), system-spec/spec-state.json qa-012 (初期暫定ラベル), system-spec/security.md, system-spec/backend.md, system-spec/frontend.md
- Detailed authoritative source: docs/security-spec.md (§3, §5, §8.1, §8.3), docs/backend-spec.md (§4.6, §4.12, §5.1), docs/frontend-spec.md (S04/S05/S06), docs/screen-inventory.md
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md)
- Feature: feat-workspace-governance
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
