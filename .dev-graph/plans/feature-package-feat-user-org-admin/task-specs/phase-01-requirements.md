# System task overlay: ユーザー管理・アカウント設定 要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "requirements-baseline"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P01
- classification: confidence=0.92, reason="goal-spec (.dev-graph/staging/goal-spec.json) と features/feat-user-org-admin.md の purpose/goal/scope/acceptance を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.92, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-user-org-admin の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (S17/S18 のスコープ・受入基準・8 件の quality_constraints) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Studio mockup 反映 (I14) により、ユーザー管理 (S17) とアカウント設定 (S18) は role 管理 (qa-005 の 4 role: provider-admin/workspace-admin/owner/member と統合)・年収→時給換算の係数設定 (TenantCoefficient: annualHours・分/回・削減率、qa-024) ・通知設定 (D6 Resend Free、通知ディスパッチ共通層経由) を確立する feature として確定した (features/feat-user-org-admin.md, confirmation_status=confirmed)。backend 実装は qa-023 の B10 (ユーザー管理: role 4 種と統合し、係数設定・PII ガードを備える) として確定しており、salary は qa-025 の SEC4 (admin 限定表示・一般 API 非公開・export マスク・読取監査) の対象 PII 列である。認証方式 (D3: Auth.js + テナント別 OIDC) と role 体系 (qa-005 の 4 role) はいずれも本 feature の scope_out であり、feat-auth-tenancy が確立した基盤をそのまま利用する。本 task は、実装に入る前にこれらの確定要件を再解釈や欠落なく baseline 化し、後続タスクの手戻りを防ぐ。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:e67d33e37c98456225d7391c7f47a71c19e2efe043a76607487a50897adfa84f に一致し、features/feat-user-org-admin.md の confirmation_status が confirmed であること。evaluation_status は 本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を 経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物 (S17/S18 画面) を変更しない。frontend 要件の具体化は P02 設計・P05 実装で行う
- Backend: N/A: 本 task は要件文書化のみで backend 実装物 (API/PII ガード/通知ディスパッチ接続) を変更しない
- API: N/A: API 契約の置き場と形状の確定は P02 の workstream 設計で行う。本 task は要件記述のみ
- Data: N/A: TenantCoefficient/User 拡張のカラム定義詳細設計は P02 で行う (qa-024: カラム定義の詳細設計は各 feature の P02 で行う)。本 task は要件記述のみ
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: salary-pii-guard (SEC4)・audit-event-expansion (SEC6)・role-4-integration (SEC2) の 3 件のセキュリティ要件を要件ベースラインへ確定記述する
- Quality: applicable + change: goal-spec acceptance 3 件 (salary 非露出+監査 / 係数変更監査記録 / axe 違反ゼロ) を machine-verifiable な受入基準として requirements-baseline.md に固定する
- Documentation: applicable + change: docs/features/feat-user-org-admin/requirements-baseline.md を新規作成する
- Operations: N/A: 通知ディスパッチ・PII ガードの運用手順の具体化は P12 (documentation-operations) と P13 (release-deploy) で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend (D3/D6/qa-005/qa-023/qa-024/qa-025 の正本参照)
- Deploy unit/environment: cloudflare-workers/hub (Hub は単一 Worker。本 task は要件確定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで、User テーブル拡張列や TenantCoefficient テーブルへの実変更を伴わない (実変更は P05/P08 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in/scope_out/acceptance/quality_constraints の確定転記と qa-005/qa-023(B8/B10)/qa-024/qa-025(SEC2/SEC4/SEC6/SEC9)/D3/D6/I14 の紐付けを含む)
- Consumed artifacts: .dev-graph/staging/goal-spec.json, features/feat-user-org-admin.md, features/feat-user-org-admin.context.json, system-spec/auth.md, system-spec/backend.md, system-spec/database.md, system-spec/security.md, system-spec/00-requirements-definition.md, docs/shared-layers.md, docs/screen-inventory.md
- Write scope/touches: docs/features/feat-user-org-admin/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-user-org-admin/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 認証方式の変更 (D3 の IdP 委譲を維持する。goal-spec scope_out)
- role 体系の再設計 (qa-005 の 4 role を維持する。goal-spec scope_out)
- 実装コードの作成 (本 task は要件確定のみ)
- Tenant/Workspace/Project/TargetChannel/Release 等の既存中核エンティティの要件定義 (feat-domain-model-db の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-user-org-admin/requirements-baseline.md に goal-spec acceptance 3 件と quality_constraints 8 件 (role-4-integration, salary-pii-guard, audit-event-expansion, notification-dispatch-common-layer, backend-b10-user-management, coefficient-and-user-entities, auth-delegation-unchanged, axe-a11y-zero) が過不足なく転記されていること

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-user-org-admin.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/auth.md (qa-005), system-spec/backend.md (qa-023 B8/B10), system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC4/SEC6/SEC9), system-spec/00-requirements-definition.md (D3, D6, I14)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
