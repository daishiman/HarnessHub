# System task overlay: 文書化・runbook・引き継ぎ — 業務データ保管/取得/削除手順・R2使用量監視runbook・鍵ローテーションrunbook拡張の文書化

## Machine-readable registration fields

- feature_package_id: feature-package/feat-tenant-data-retention (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-tenant-data-retention", "macro-feature", "documentation", "runbook"]
- related_nodes: ["feat-tenant-data-retention"]
- parent_feature: feat-tenant-data-retention
- phase_ref: P12
- classification: confidence=0.82, reason="利用者/管理者向け業務データupload/取得/削除操作手順、R2使用量監視アラート対応runbook、encryption_keysローテーション手順のtenant_data purpose拡張分の文書化を確立するP12文書化タスク", candidates=[{artifact_kind: task, confidence: 0.82, candidate_path: tasks/feat-tenant-data-retention/sys-tenant-data-retention-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P11 の証跡集約完了後、利用者/管理者向けの業務データ upload/取得/削除操作手順、R2 使用量監視アラート対応 runbook、encryption_keys ローテーション手順の tenant_data purpose 拡張分の文書化を確立する。この task 完了時点で、P13 のリリース判定と運用引き継ぎに必要な runbook が揃う。

## 背景

本 feature は既存 Turso 使用量監視 cron の閾値運用 (70% で admin 通知・90% で R4-reopen 起票を促す) を R2 使用量へ拡張しており、運用担当者はこの拡張後の通知経路と対応手順を理解する必要がある。また encryption_keys のローテーション手順 (KEK は年 1 回、DEK は年 1 回または侵害疑い時) は既存 salary/idp_secret purpose に加えて tenant_data purpose にも同様に適用されるため、本 task ではこの拡張分の手順を runbook に追記する。業務データの upload/取得/削除操作手順は、認可ミドルウェア通過後にのみ復号する契約と即時完全削除の挙動を利用者/管理者が正しく理解できるよう記述する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-tenant-data-retention
- Entry gate: P11 (docs/features/feat-tenant-data-retention/evidence-summary.md) が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は host UI を持たず frontend 文書化対象がない
- Backend: N/A: 本 task は文書化のみで backend 実装物を変更しない
- API: N/A: 本 task は文書化のみで API 契約を変更しない
- Data: N/A: 本 task は文書化のみでデータ移行を伴わない
- Infrastructure: applicable + IaC/deploy: R2 使用量監視アラート対応手順を runbook へ記述する
- Security: applicable + control: encryption_keys ローテーション手順の tenant_data purpose 拡張分を runbook へ記述する
- Quality: N/A: 本 task は文書化のみで新たなテストゲートを追加しない
- Documentation: applicable + change: docs/features/feat-tenant-data-retention/runbook.md を新規作成する
- Operations: applicable + runbook/monitoring: 業務データ upload/取得/削除操作手順、R2 使用量監視アラート対応手順を確立する

## Architecture and deploy unit

- Architecture decisions: N/A: 本 task は文書化のみで新たな architecture decision を伴わない
- Deploy unit/environment: cloudflare-workers/hub (本 task は文書化のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は文書化のみで互換性移行を伴わない

## 成果物

- Produced artifacts: docs/features/feat-tenant-data-retention/runbook.md (業務データ操作手順、R2使用量監視アラート対応手順、encryption_keysローテーション手順のtenant_data拡張分)
- Consumed artifacts: docs/features/feat-tenant-data-retention/evidence-summary.md, docs/infrastructure-spec.md, docs/security-spec.md (§4.1.2)
- Write scope/touches: docs/features/feat-tenant-data-retention/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-tenant-data-retention-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-tenant-data-retention-p12 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-tenant-data-retention-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-TENANT-DATA-RETENTION-P11] であり P11 完了後に着手する。resource_scope (docs/features/feat-tenant-data-retention/runbook.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 既存 salary/idp_secret purpose のローテーション手順そのものの改訂 (owner=feat-auth-tenancy / feat-domain-model-db。本 task は tenant_data 拡張分のみ追記する)
- 実装コードの作成・修正 (owner=P05)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-tenant-data-retention`
- Required evidence: runbook.md に業務データupload/取得/削除操作手順・R2使用量監視アラート対応手順・encryption_keysローテーション手順のtenant_data拡張分の3項目全てが記載されていること

## Rollout and rollback

- Rollout: runbook.md を作成し、3 項目全てが記載されていることを確認してから P13 (リリース/デプロイ) へ引き継ぐ
- Rollback trigger and steps: runbook.md の手順が実装と矛盾することが判明した場合、該当箇所を修正し本taskを再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/spec-state.json qa_log (qa-045)
- Detailed authoritative source: docs/infrastructure-spec.md (§3, §4), docs/security-spec.md (§4.1.2)
- Architecture: N/A: 本 task は文書化のみで architecture 参照を新たに追加しない
- Feature: feat-tenant-data-retention
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-TENANT-DATA-RETENTION-P11
