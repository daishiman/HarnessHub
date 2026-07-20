# System task overlay: 品質保証 — CI品質ゲート(axe/bundle/Tenant分離/検査pipeline)適合確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "quality-assurance"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P09
- classification: confidence=0.88, reason="S17/S18と関連APIが既存の共有CI品質ゲートとTenant分離要件に適合していることを横断的に確認するP09タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

S17/S18 と関連 API が既存の共有 CI 品質ゲート (axe a11y ゼロ違反・bundle 予算・Tenant 分離テスト・検査 pipeline 同値テスト) に適合していることを横断的に確認する。

## 背景

docs/shared-layers.md §3 は CI 品質ゲート (axe/bundle予算/Tenant分離テスト/検査pipeline挙動同値テスト) を feat-hub-foundation が実装 owner の共通機構と定めており、本 feature はこのゲートに『適合すること』を確認する側であり、ゲート自体は変更しない。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p08
- Entry gate: docs/features/feat-user-org-admin/refactoring-migration-note.md で migration 適用と後方互換性確認が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S17/S18 の axe a11y 違反 0 件と Worker bundle 予算内であることを確認する
- Backend: N/A: backend 実装物自体の変更は行わない
- API: N/A: API 契約自体の変更は行わない
- Data: N/A: スキーマ自体の変更は行わない (P08 で適用済み)
- Infrastructure: N/A: 共有 CI パイプライン設定 (.github/workflows/ci.yml) は feat-hub-foundation の write_scope であり本 task では変更しない
- Security: applicable + change: Tenant 分離テスト (本 feature が追加した API に越境アクセスがないこと) を確認する (SEC2)
- Quality: applicable + change: 既存の共有品質ゲート (axe/bundle予算/Tenant分離/検査pipeline同値テスト) に本 feature の成果物が適合していることを確認する
- Documentation: applicable + change: docs/features/feat-user-org-admin/quality-assurance-report.md を新規作成する
- Operations: applicable + change: salary PII ガードの運用 readiness (読取監査ログの記録先確認) を確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (品質ゲート実行のみで追加デプロイはない)
- Compatibility/migration/backfill: N/A: 本 task は既存品質ゲートへの適合確認のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/quality-assurance-report.md (共有CI品質ゲート適合確認結果とPIIガード運用readiness)
- Consumed artifacts: apps/hub/src/features/user-org-admin/__tests__/, docs/features/feat-user-org-admin/acceptance-report.md, docs/shared-layers.md
- Write scope/touches: docs/features/feat-user-org-admin/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p09) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p09 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p08] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 共有 CI 品質ゲート自体の是正 (feat-hub-foundation の write_scope。不適合が見つかった場合は是正依頼として dev-graph へ差し戻す)
- 認可ミドルウェア・Tenant分離の基盤実装変更 (feat-auth-tenancy の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-user-org-admin/quality-assurance-report.md に axe/bundle予算/Tenant分離テスト/検査pipeline同値テストへの適合確認結果とPIIガード運用readinessが記録されている. Normative evidence: quality constraint 9 ID exact-set、current context digest、/legal role matrix、axe report、PII non-exposure、release smokeを必須とする。

## Rollout and rollback

- Rollout: quality-assurance-report.md を作成し、P10 (final-review) へ引き継ぐ
- Rollback trigger and steps: 品質ゲート不適合が見つかった場合、不適合箇所を quality-assurance-report.md に記録し、原因が本 feature 側にあれば該当 task (P05/P08) を、共有ゲート側にあれば feat-hub-foundation を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-user-org-admin.context.json` (`sha256:4271086e4eacd8a7327ab3fc9b9e080b2d024ac66858b2a4965d0afbda33a265`)
- Phase responsibility: 品質・security・operations・CI gate を現行正本に照らして保証する。
- Purpose: ユーザー管理 (S17) とアカウント設定 (S18) を提供し、role 管理 (qa-005 の 4 role と統合)・年収→時給換算の係数設定 (PII: admin 限定・API 非公開・export マスク = SEC4)・通知設定 (D6 Resend)・規約公開を確立する (I14)
- Goal: workspace-admin がユーザーの role・部門・年収係数を管理でき、salary が PII ガード (admin 限定表示・読取監査・export マスク) 下にあり、通知設定が通知ディスパッチ共通層と接続され、全利用者が規約・ポリシーを参照できる状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- S17 ユーザー管理 + 個別ダッシュボード
- S18 アカウント設定 (プロフィール/通知/表示)
- S18 配下の /legal 規約・ポリシー静的ページ (全利用者が閲覧可能)
- User 拡張 (department/salary) + TenantCoefficient エンティティ
- PII ガード共通層 (salary の admin 限定・監査・export マスク)
- 通知設定と D6 (Resend) 通知ディスパッチの接続
- Scope out:
- 認証方式の変更 (D3 の IdP 委譲を維持。パスワード/2FA 自前実装は不採用)
- role 体系の再設計 (qa-005 の 4 role を維持)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)
- 係数変更が監査 event に記録される (SEC6)
- S17/S18 と /legal が axe 違反 0 で動作し、/legal は全利用者が閲覧できる
- Architecture/source refs:
- architecture/harness-hub-security.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-frontend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Current phase closure

- Required responsibility: /legal accessibility、public/read policy、security header、PII非露出を品質gateに含める。
- Dependency rule: this phase consumes only earlier P01..P08 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P09 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-user-org-admin.context.json; docs/frontend-spec.md S17/S18//legal; docs/security-spec.md PII/a11y contracts
- Effective phase contract: 現行 quality_constraints は legal-static-page-all-users を含む9件である。P01で9 IDをexact-set転記し、P04/P06は/legalの全role access・非ログイン方針・静的内容・axe=0・salary/PII非露出を検証する。P07/P09/P10/P11は第3 acceptanceと第9制約を同じevidence IDで追跡し、P05で実装、P12で内容更新owner、P13でroute smokeを確認する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/legal/`
- `apps/hub/src/app/legal/__tests__/`
- Mandatory evidence: quality constraint 9 ID exact-set、current context digest、/legal role matrix、axe report、PII non-exposure、release smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: docs/shared-layers.md §3, system-spec/security.md (qa-025 SEC2/SEC4)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p08
