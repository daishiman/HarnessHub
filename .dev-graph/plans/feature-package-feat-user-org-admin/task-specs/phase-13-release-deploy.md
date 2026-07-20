# System task overlay: リリース/デプロイ — S17/S18のCloudflare Workers本番反映とロールアウト確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "release-deploy"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P13
- classification: confidence=0.9, reason="P12のrunbookに従いS17/S18を既存Workerへ本番反映しロールアウト後スモークチェックを行うP13タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P12 の runbook に従い、feat-hub-foundation が確立した既存 Worker (apps/hub) へ S17/S18 とその API・スキーマを本番反映し、salary 非露出のロールアウト後スモークチェックを実施する。

## 背景

本 feature は新規 Worker を作らず、既存の共有デプロイパイプライン (wrangler CLI / GitHub Actions、feat-hub-foundation が確立) 上で本番反映される。デプロイ実行そのものは共有パイプラインの機構を利用し、本 task は本 feature 固有のリリースノート作成とロールアウト後確認を担う。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p12
- Entry gate: docs/features/feat-user-org-admin/runbook.md が P12 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S17/S18 が本番 URL で到達可能であることを確認する
- Backend: applicable + change: 本番環境で salary が admin 以外のロールに露出しないことをスモークチェックする
- API: N/A: API契約自体の変更はP05で完了済み
- Data: N/A: migration適用はP08で完了済み
- Infrastructure: applicable + change: 既存共有デプロイパイプライン (wrangler CLI / GitHub Actions) を用いて本番反映する。パイプライン設定自体 (.github/workflows/ci.yml, wrangler.jsonc) は feat-hub-foundation の write_scope であり本 task では変更しない
- Security: applicable + change: 本番反映直後に salary 非露出スモークチェックと監査ログ記録動作確認を実施する (SEC4/SEC6)
- Quality: applicable + change: 本番反映後の axe a11y ・bundle 予算への影響がないことを確認する
- Documentation: applicable + change: docs/features/feat-user-org-admin/release-notes.md を新規作成する
- Operations: applicable + change: runbook.md 記載のロールアウト後監視・ロールバック手順に従い初回反映を確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (wrangler CLI 経由。既存 Worker への機能追加デプロイ)
- Compatibility/migration/backfill: P08 で適用済みの migration が本番環境にも反映されていることを確認する。既存 User 行・既存機能への回帰がないことを本番反映後にスモークチェックする

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/release-notes.md (デプロイ日時・Workerバージョン・S17/S18本番URL・salary非露出スモークチェック結果)
- Consumed artifacts: docs/features/feat-user-org-admin/runbook.md, docs/features/feat-user-org-admin/evidence/
- Write scope/touches: docs/features/feat-user-org-admin/release-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p13 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p12] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 共有デプロイパイプライン設定 (.github/workflows/ci.yml, wrangler.jsonc) の変更 (feat-hub-foundation の write_scope)
- 新規 Worker・新規デプロイ単位の作成 (既存 apps/hub Worker への機能追加のみ)

## Verification and evidence

- Automated commands: `wrangler deploy 相当のコマンド (runbook.md 記載、feat-hub-foundation の既存パイプライン経由)`, `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-user-org-admin/release-notes.md にデプロイ日時・Workerバージョン・S17/S18本番URL・salary非露出スモークチェック結果が記録されている

## Rollout and rollback

- Rollout: release-notes.md を作成し、feature 全体の完了 (P01..P13 全 done) を dev-graph へ報告する
- Rollback trigger and steps: 本番反映後に salary 露出または監査記録の異常が確認された場合、runbook.md 記載のロールバック手順 (直前バージョンへの wrangler rollback) を実行し、実行結果を release-notes.md に記録する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC4/SEC6), system-spec/00-requirements-definition.md (D6)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p12
