# System task overlay: リリース/デプロイ — encryption_keys DEK seed migration適用順序・wranglerロールアウト・rollback手順

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "operations", "release-deploy"]
- related_nodes: ["feat-tenant-data-retention"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P13
- classification: confidence=0.84, reason="encryption_keys DEK seed migrationの適用順序(API有効化前にmigration完了を確認)を含めてwranglerでCloudflare Workersへロールアウトし、rollback手順とpost-deploy smoke testを判定するP13リリースタスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P12 runbook.md までの成果物をもとに、encryption_keys.purpose=tenant_data 追加 DEK seed migration が API 有効化前に完了していることを確認したうえで、apps/hub の tenant_data 保管 API・R2 使用量監視 cron 拡張を wrangler を用いて Cloudflare Workers へ本番ロールアウトし、smoke test を実施し、rollback 手順を確立する。

## 背景

apps/hub は @opennextjs/cloudflare 経由で単一 Cloudflare Worker としてデプロイされる規約になっている (docs/infrastructure-spec.md)。本 feature は encryption_keys という既存共有テーブルへの追加 migration (P08 で実施) を前提としているため、リリース手順では migration の適用完了確認を API 有効化より先に行う順序を厳守する。デプロイ後の smoke test では、upload/取得/削除 API が正しく動作すること、R2 使用量監視 cron が起動すること、テナント分離 (異なるテナントの認証情報で他テナントのデータへアクセスできないこと) の縮小確認を含める。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention
- Entry gate: P12 (docs/features/feat-tenant-data-retention/runbook.md) が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend デプロイ対象がない
- Backend: N/A: 本 task はデプロイ・smoke testのみで backend 実装物を変更しない
- API: N/A: 本 task はデプロイ・smoke testのみで API 契約を変更しない
- Data: applicable + migration: encryption_keys.purpose=tenant_data 追加 DEK seed migration が API 有効化前に本番適用済みであることを確認する
- Infrastructure: applicable + IaC/deploy: wrangler により apps/hub を Cloudflare Workers へロールアウトする
- Security: applicable + control: テナント分離縮小確認 (異なるテナント認証情報での越境アクセス不可確認) を smoke test に含める
- Quality: applicable + tests/gates: smoke test (upload/取得/削除API・R2使用量監視cron起動・テナント分離縮小確認) を実行する
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/release-record.md を新規作成する
- Operations: applicable + runbook/monitoring: rollback 手順を確立し、デプロイ完了記録を残す

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task はデプロイのみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (wrangler CLI による本番デプロイ)
- Compatibility/migration/backfill: applicable + contract: encryption_keys.purpose=tenant_data 追加 DEK seed migration (P08 で実施済み) の本番適用完了を API 有効化前に確認する

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/release-record.md (本番デプロイ完了記録、smoke test結果、rollback手順)
- Consumed artifacts: docs/features/feat-tenant-data-retention/runbook.md, docs/features/feat-tenant-data-retention/refactoring-migration-note.md, docs/infrastructure-spec.md
- Write scope/touches: docs/features/feat-tenant-data-retention/release-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P12] であり P12 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/release-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- feat-hub-foundation・feat-domain-model-db・feat-auth-tenancy 側の個別デプロイ (それぞれの feature package が所有)
- encryption_keys DEK seed migration の実施そのもの (owner=P08。本 task は適用完了の確認のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-tenant-data-retention`
- Required evidence: release-record.md に本番デプロイ完了記録とsmoke test (upload/取得/削除API・R2使用量監視cron起動・テナント分離縮小確認を含む) 全項目のpass結果が記載されていること

## Rollout and rollback

- Rollout: encryption_keys DEK seed migration の本番適用完了を確認したうえで wrangler で本番へデプロイし、smoke test 全項目 pass を確認してから release-record.md へ記録する
- Rollback trigger and steps: smoke testのいずれかがfailした場合、本番デプロイを直前の安定版へロールバックし、release-record.mdに原因を記録した上で該当するP05/P08/P09へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-045)
- Detailed authoritative source: docs/infrastructure-spec.md
- Architecture: N/A: 本 task はデプロイのみで architecture 参照を新たに追加しない
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P12
