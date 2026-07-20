# System task overlay: 再現可能な証跡 — P06/P07/P09/P10の証跡集約と再現手順の確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "quality", "evidence"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P11
- classification: confidence=0.83, reason="P06/P07/P09/P10 の証跡を集約し第三者が再現できる手順として確立する P11 証跡タスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p11.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (テスト実行結果)・P07 (受入判定)・P09 (品質保証確認)・P10 (最終レビュー) の証跡を集約し、第三者が同一手順で再現できる形で evidence-summary.md に確立する。

## 背景

macOS/Windows 実機 E2E の再現には実機環境そのものが必要であるため、本 task では実行コマンド・前提条件・期待結果を明記した再現手順書として証跡を確立し、実機を持たない読者でも記録内容から結果を検証できるようにする。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/final-review-record.md が P10 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 task は証跡集約のみで新規実装を伴わない
- API: N/A: API 契約自体の変更は伴わない
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: 実機環境の確認は P06 で完了済み
- Security: N/A: セキュリティ観点の証跡は P09 の quality-assurance-report.md を参照する
- Quality: applicable + change: P06/P07/P09/P10 の証跡を集約し再現手順を確立する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/evidence-summary.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security (P02 の architecture decision の正本参照)
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task は証跡集約のみで実装・migration を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/evidence-summary.md
- Consumed artifacts: docs/features/feat-publisher-plugin/test-run-results.md, acceptance-record.md, quality-assurance-report.md, final-review-record.md
- Write scope/touches: docs/features/feat-publisher-plugin/evidence-summary.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p11) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p11 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P10']。resource_scope (docs/features/feat-publisher-plugin/evidence-summary.md) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 実機 E2E の再実行そのもの (本 task は証跡集約と再現手順の明記のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-publisher-plugin`
- Required evidence: evidence-summary.md に P06/P07/P09/P10 各証跡への参照・再現に必要なコマンドと前提条件・macOS/Windows 実機 E2E タイムボックス実測値が記載されていること

## Rollout and rollback

- Rollout: evidence-summary.md を作成し P12 (文書化・runbook・引き継ぎ) へ引き継ぐ
- Rollback trigger and steps: 証跡の再現手順に不備が発見された場合、該当証跡の生成元 phase (P06/P07/P09/P10) を確認し evidence-summary.md を修正した上で本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md qa-013 (O4/H8)
- Detailed authoritative source: docs/features/feat-publisher-plugin/test-run-results.md, acceptance-record.md, quality-assurance-report.md, final-review-record.md
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P10
