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

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-user-org-admin/quality-assurance-report.md に axe/bundle予算/Tenant分離テスト/検査pipeline同値テストへの適合確認結果とPIIガード運用readinessが記録されている

## Rollout and rollback

- Rollout: quality-assurance-report.md を作成し、P10 (final-review) へ引き継ぐ
- Rollback trigger and steps: 品質ゲート不適合が見つかった場合、不適合箇所を quality-assurance-report.md に記録し、原因が本 feature 側にあれば該当 task (P05/P08) を、共有ゲート側にあれば feat-hub-foundation を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: docs/shared-layers.md §3, system-spec/security.md (qa-025 SEC2/SEC4)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p08
