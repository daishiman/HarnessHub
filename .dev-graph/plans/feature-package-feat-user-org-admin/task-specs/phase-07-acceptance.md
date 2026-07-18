# System task overlay: 受入 — goal-spec acceptance 3項目の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "acceptance"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P07
- classification: confidence=0.88, reason="P06 のテスト実行結果を goal-spec acceptance と突合し feature 受入可否を判定する P07 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 のテスト実行結果を goal-spec acceptance 3 件と突合し、feature 受入可否を判定する。

## 背景

goal-spec acceptance は『salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)』『係数変更が監査 event に記録される (SEC6)』『S17/S18 が axe 違反 0 で動作する』の 3 件であり、本 task はこれらの合否を最終判定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p06
- Entry gate: P06 のテスト実行結果 (CI run ログ、テストレポート) が揃っていること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は P06 結果の突合判定のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は P06 結果の突合判定のみで backend 実装物を変更しない
- API: N/A: 本 task は判定のみで API 契約を変更しない
- Data: N/A: 本 task は判定のみでスキーマを変更しない
- Infrastructure: N/A: 本 feature はデプロイ単位を新設しない
- Security: applicable + change: salary 非露出 (SEC4) と係数変更監査記録 (SEC6) の合否を最終判定する
- Quality: applicable + change: goal-spec acceptance 3 件それぞれの合否と根拠を判定し記録する
- Documentation: applicable + change: docs/features/feat-user-org-admin/acceptance-report.md を新規作成する
- Operations: N/A: 運用readinessの判定はP09で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-frontend
- Deploy unit/environment: cloudflare-workers/hub (受入判定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は判定のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/acceptance-report.md (goal-spec acceptance 3件それぞれの合否と根拠)
- Consumed artifacts: docs/features/feat-user-org-admin/test-design.md, apps/hub/src/features/user-org-admin/__tests__/
- Write scope/touches: docs/features/feat-user-org-admin/acceptance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p07 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p06] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 不合格項目の実装修正そのもの (該当 task を再実行対象として差し戻す)
- 認証方式・role 体系の再判定 (goal-spec scope_out として本 feature の対象外に確定済み)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-user-org-admin/acceptance-report.md に goal-spec acceptance 3 件それぞれの合否と根拠が明記されている

## Rollout and rollback

- Rollout: acceptance-report.md で全件合格と判定された場合、P08 (refactoring-migration) へ引き継ぐ
- Rollback trigger and steps: 1 件でも不合格の場合、不合格項目の根本原因が P05 か P06 のどちらにあるかを記録し、該当 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC4/SEC6)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p06
