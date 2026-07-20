# System task overlay: 独立最終レビュー — quality_constraints 8件・acceptance 3件の最終確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publisher-plugin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publisher-plugin", "macro-feature", "quality", "final-review"]
- related_nodes: ["feat-publisher-plugin", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publisher-plugin
- phase_ref: P10
- classification: confidence=0.84, reason="P01-P09 の全成果物を対象に quality_constraints 8 件・acceptance 3 件の充足を独立確認する P10 最終レビュータスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-publisher-plugin/sys-publisher-plugin-p10.md}]
- tracker_binding_intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01-P09 の全成果物を対象に、goal-spec.json の quality_constraints 8 件・acceptance 3 件が全て満たされていることを、実装者から独立した最終レビューとして確認する。

## 背景

feature-execution-package-contract.md が定める P10 (独立最終レビュー) として、requirements-baseline.md/architecture-decision-record.md/design-review-notes.md/test-design.md/implementation-notes.md/test-run-results.md/acceptance-record.md/refactoring-migration-note.md/quality-assurance-report.md の 9 成果物を通読し、quality_constraints 8 件 (id 単位) と acceptance 3 件それぞれについて充足根拠を突き合わせる。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publisher-plugin, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: docs/features/feat-publisher-plugin/quality-assurance-report.md が P09 完了時点で存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 feature は frontend 実装物を持たない
- Backend: N/A: 本 task は突き合わせ確認のみで新規実装を伴わない
- API: N/A: API 契約自体の変更は伴わない
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない
- Infrastructure: N/A: インフラ観点の確認は P09 で完了済み
- Security: applicable + change: quality_constraints のうちセキュリティ関連制約の最終充足確認を行う
- Quality: applicable + change: quality_constraints 8 件・acceptance 3 件の最終確認結果を final-review-record.md に記録する
- Documentation: applicable + change: docs/features/feat-publisher-plugin/final-review-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security (P02 の architecture decision の正本参照)
- Deploy unit/environment: author-local-session/harness-hub-publisher-plugin (作者ローカル session で稼働する Publisher CLI/plugin の配布・実行単位)
- Compatibility/migration/backfill: N/A: 本 task は突き合わせ確認のみで実装・migration を伴わない

## 成果物

- Produced artifacts: docs/features/feat-publisher-plugin/final-review-record.md
- Consumed artifacts: docs/features/feat-publisher-plugin/requirements-baseline.md, architecture-decision-record.md, design-review-notes.md, test-design.md, implementation-notes.md, test-run-results.md, acceptance-record.md, refactoring-migration-note.md, quality-assurance-report.md
- Write scope/touches: docs/features/feat-publisher-plugin/final-review-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publisher-plugin-p10) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publisher-plugin-p10 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publisher-plugin-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=['SYS-PUBLISHER-PLUGIN-P09']。resource_scope (docs/features/feat-publisher-plugin/final-review-record.md) は他 task の active lease と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- 各 P01-P09 成果物自体の再作成 (本 task は突き合わせ確認のみ)
- 実装修正 (逸脱が発見された場合は該当 phase へ差し戻す)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging/feature-package-feat-publisher-plugin`
- Required evidence: final-review-record.md に quality_constraints 8 件 (id 単位)・acceptance 3 件それぞれの最終充足確認結果と参照した成果物一覧が記載されていること

## Rollout and rollback

- Rollout: final-review-record.md で全件充足を確認してから P11 (再現可能な証跡) へ引き継ぐ
- Rollback trigger and steps: 未充足項目が発見された場合、該当 phase (P01-P09 のいずれか) へ差し戻し修正後に本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: .dev-graph/staging/feature-package-feat-publisher-plugin/goal-spec.json quality_constraints (8件)/acceptance (3件)
- Detailed authoritative source: docs/features/feat-publisher-plugin/ 配下の P01-P09 全成果物
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publisher-plugin
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISHER-PLUGIN-P09
