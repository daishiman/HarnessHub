# System task overlay: リファクタリング/マイグレーション — 新規列・新規テーブルのmigration適用と後方互換性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "refactoring-migration"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P08
- classification: confidence=0.85, reason="User テーブルへの department/salary 列追加と TenantCoefficient 新規テーブルの migration 適用・後方互換性確認を行う P08 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

User テーブルへの department/salary 列追加と TenantCoefficient 新規テーブルの migration を本番相当の接続層に適用し、既存 User 行に対する後方互換性を確認する。

## 背景

User は feat-domain-model-db/feat-auth-tenancy 側で既に稼働している既存エンティティであり、本 feature が追加する department/salary 列は 既存行に対する ALTER 相当の変更になる (TenantCoefficient は新規テーブルのため移行対象データはない)。hub-foundation の precedent と異なり、本 feature は新規 scaffold ではなく既存データを持つエンティティへの列追加を伴うため、P08 を N/A 判定では終わらせず、実際に migration 適用と後方互換性確認を行う task として実行する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p07
- Entry gate: docs/features/feat-user-org-admin/acceptance-report.md で goal-spec acceptance 3 件が合格判定済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はデータ migration の適用のみで frontend 実装物を変更しない
- Backend: N/A: 本 task はデータ migration の適用のみで backend 実装物を変更しない (P05 で実装済みのハンドラは変更しない)
- API: N/A: API 契約は P05 で確定済みであり本 task では変更しない
- Data: applicable + change: User テーブルへの department/salary 列追加 (nullable もしくは既定値付き) と TenantCoefficient 新規テーブルの migration を packages/db/schema/user-org-admin/ 配下の migration ファイルとして適用し、既存 User 行が壊れないことを確認する
- Infrastructure: N/A: デプロイ単位自体の変更はない
- Security: applicable + change: salary 列が migration 適用直後から admin 限定読取・一般 API 非公開の対象になっていることを確認する (SEC4)
- Quality: applicable + change: migration 適用前後で既存 User 関連機能 (認証・role 認可) に回帰がないことを確認する
- Documentation: applicable + change: docs/features/feat-user-org-admin/refactoring-migration-note.md を新規作成する
- Operations: N/A: 運用中のロールバック手順の文書化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub + packages/db (同一 deploy unit。migration 適用先は Turso libSQL)
- Compatibility/migration/backfill: User テーブルへの列追加は既存行を破壊しない後方互換な変更として適用する。TenantCoefficient は新規テーブルであり既存データへの影響はない

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/refactoring-migration-note.md (migration 適用結果と後方互換性確認結果)
- Consumed artifacts: packages/db/schema/user-org-admin/, docs/features/feat-user-org-admin/architecture-decision-record.md, docs/features/feat-user-org-admin/acceptance-report.md
- Write scope/touches: packages/db/schema/user-org-admin/, docs/features/feat-user-org-admin/refactoring-migration-note.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p08 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p07] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Tenant/Workspace/Project/TargetChannel/Release 等の既存中核エンティティの migration (feat-domain-model-db の scope)
- User テーブルの基底スキーマ (department/salary 以外の既存列) の変更
- R2 export・restore drill 手順自体の変更 (feat-hub-foundation/feat-domain-model-db の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-user-org-admin/refactoring-migration-note.md に migration 適用ログと既存 User 行への影響確認結果 (回帰なし) が記録されている

## Rollout and rollback

- Rollout: refactoring-migration-note.md を作成し、P09 (quality-assurance) へ引き継ぐ
- Rollback trigger and steps: migration 適用後に既存 User 機能へ回帰が確認された場合、追加した列とテーブルを migration のロールバック手順で戻し、原因を refactoring-migration-note.md に記録した上で sys-user-org-admin-p02 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC4)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p07
