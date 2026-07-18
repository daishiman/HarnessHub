# System task overlay: ドキュメント/運用 — S17/S18運用手順・PIIガード運用・通知ディスパッチ運用のドキュメント化

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "documentation-operations"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P12
- classification: confidence=0.87, reason="P13の本番反映に先立ちS17/S18のPIIガード運用・通知ディスパッチ運用のrunbookを整備するP12タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P13 の本番反映に先立ち、S17/S18 の運用 runbook (salary PII ガード運用手順・監査ログ確認手順・通知ディスパッチ障害時対応・ロールバック手順) を整備する。

## 背景

salary は PII 列として運用上の注意点 (admin 限定表示・export マスク・読取監査ログの定期確認) が継続的に発生するため、実装完了後も参照可能な運用文書が必要になる (SEC4)。通知ディスパッチは D6 の日次 100 通制限により週次サマリがバッチ分割+失敗リトライで送られる運用のため、その監視・再送手順も文書化する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p11
- Entry gate: docs/features/feat-user-org-admin/evidence/ が P11 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は運用文書作成のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は運用文書作成のみで backend 実装物を変更しない
- API: N/A: 本 task は運用文書作成のみでAPI契約を変更しない
- Data: N/A: 本 task は運用文書作成のみでスキーマを変更しない
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation の共通機構をそのまま利用する
- Security: applicable + change: salary PII ガードの運用手順 (読取監査ログの定期確認・export マスク動作確認) を文書化する (SEC4)
- Quality: N/A: 品質ゲート確認はP09で完了済み
- Documentation: applicable + change: docs/features/feat-user-org-admin/runbook.md を新規作成する
- Operations: applicable + change: 通知ディスパッチの日次100通制限に伴うバッチ分割・失敗リトライの監視手順 (D6/qa-027) と障害対応・ロールバック手順を文書化する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (運用文書作成のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は運用文書作成のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/runbook.md (PIIガード運用・監査ログ確認・通知ディスパッチ監視・障害対応・ロールバックの5手順)
- Consumed artifacts: docs/features/feat-user-org-admin/evidence/, docs/features/feat-user-org-admin/architecture-decision-record.md, docs/shared-layers.md
- Write scope/touches: docs/features/feat-user-org-admin/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p11] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 共通層 (PIIガード/通知ディスパッチ) 自体の運用手順文書化 (feat-hub-foundation の write_scope。本 task は本 feature 固有の利用手順のみを扱う)
- 実際の本番デプロイ実施 (P13 で実施)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-user-org-admin/runbook.md に PIIガード運用・監査ログ確認・通知ディスパッチ監視・障害対応・ロールバックの 5 手順が記載されている

## Rollout and rollback

- Rollout: runbook.md を作成し、P13 (release-deploy) へ引き継ぐ
- Rollback trigger and steps: runbook.md の記載内容が P09 の readiness 確認結果と矛盾する場合、矛盾箇所を記録した上で sys-user-org-admin-p09 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC4/SEC9), system-spec/00-requirements-definition.md (D6)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p11
