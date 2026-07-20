# System task overlay: テスト実行 — 挙動同値性テスト・Device Flow単体テスト・macOS/Windows実機E2Eタイムボックス計測の実行

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "quality", "test-run"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P06
- classification: confidence=0.83, reason="P04 で設計し P05 で実装対象を揃えたテストケースを実行し結果を記録する P06 テスト実行タスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p06.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P04 で設計し P05 で実装対象を揃えたテストケースを実行し、結果を test-run-results.md に記録する。

## 背景

apps/publisher/src/__tests__/ の全テストケース (Python 資産との挙動同値性テスト・Hub 検査との判定同値性テスト・Device Flow 単体テスト・OS 資格情報域保存検証テスト) を実行する。加えて macOS/Windows 両実機での初回 publish E2E (package 収集 → manifest 補完 → ローカル pre-check → Device Flow 認証 → Hub 公開 → target=web_app の場合は wrangler 実行・URL 登録) を実行し、開始から完了までの所要時間を計測して 15 分以内 (O4/H8) を満たすかを記録する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: apps/publisher/ の実装 (P05) が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 task はテスト実行のみで新規実装を伴わない
- API: N/A: API 契約自体の変更は伴わない
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない
- Infrastructure: applicable + change: macOS/Windows 実機環境でのテスト実行環境を確認する
- Security: N/A: セキュリティ観点の詳細検証は P09 で扱う
- Quality: applicable + change: 全テストケースの実行結果と実機 E2E タイムボックス計測結果を test-run-results.md に記録する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/test-run-results.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security (P02 の architecture decision の正本参照)
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実装・migration を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/test-run-results.md
- Consumed artifacts: apps/publisher/src/__tests__/, docs/features/feat-publisher-plugin/test-design.md, docs/features/feat-publisher-plugin/implementation-notes.md
- Write scope/touches: docs/features/feat-publisher-plugin/test-run-results.md, apps/publisher/src/__tests__/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p06) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p06 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P05']。resource_scope (docs/features/feat-publisher-plugin/test-run-results.md, apps/publisher/src/__tests__/) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- Hub 側検査 pipeline のテスト実行 (owner=feat-publish-pipeline)
- 共有 CI パイプライン本体の変更 (共有 CI は不可侵。本 task は feature 固有テストの実行のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-publisher-plugin`
- Required evidence: test-run-results.md に全テストケースの pass/fail・macOS/Windows 実機 E2E の所要時間実測値・15 分以内達成可否が記載されていること

## Rollout and rollback

- Rollout: test-run-results.md で全テスト pass と 15 分以内達成を確認してから P07 (受入) へ引き継ぐ
- Rollback trigger and steps: テスト失敗または 15 分超過が判明した場合、該当箇所を P05 へ差し戻し修正した上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md qa-013 (O4/H8), system-spec/spec-state.json qa_log (qa-010, qa-020, qa-041, qa-043)
- Detailed authoritative source: docs/features/feat-publisher-plugin/test-design.md, docs/features/feat-publisher-plugin/implementation-notes.md
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P05
