# System task overlay: 最終独立レビュー — quality_constraints の充足判定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "final-review"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P10
- classification: confidence=0.85, reason="P01-P09 の成果物を根拠に、seed の冪等性・ローカル以外 DB URL 拒否・route×状態対応表の未カバー0件という 3 つの constraint の充足を独立した視点で最終判定する P10 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p10.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01〜P09 の全成果物を根拠に、本 feature を貫く 3 つの constraint (seed の冪等性、ローカル以外 DB URL の拒否、route×状態対応表の未カバー 0 件) が、実装担当や品質保証担当とは独立した視点で最終的に充足していると判定する。この task 完了時点で、P11 のエビデンス収集・P12 の runbook 化・P13 の close-out に進める状態が確定する。

## 背景

P03 は設計段階の独立レビュー、P09 は実行結果の品質ゲート確認を担うが、いずれも各担当 (設計者・実装者) の直後のレビューであり、feature 全体を俯瞰した最終確認ではない。本 task は P01〜P09 のすべての成果物 (requirements-baseline.md, architecture-decision-record.md, design-review-notes.md, test-design.md, route-state-matrix.md, test-run-report.md, acceptance-report.md, refactoring-migration-note.md, quality-assurance-report.md) を横断し、3 つの constraint が矛盾なく充足していることを最終確認する。これは feature-execution-package-contract.md が P10 に割り当てる「最終独立レビュー」責務に対応する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/quality-assurance-report.md (P09 成果物) が 4 種の品質ゲート全件充足であること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P10 は P09 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は最終レビューのみで frontend 実装物を変更しない
- Backend: N/A: 本 task は最終レビューのみで backend 実装物を変更しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: applicable + 内容: route×状態対応表の未カバー 0 件が P01〜P09 全体を通して矛盾なく維持されているかを最終確認する
- Infrastructure: N/A: 追加インフラを新設しない
- Security: applicable + 内容: ローカル以外 DB URL 拒否が P02 設計〜P09 品質ゲートまで一貫して維持されているかを最終確認する
- Quality: applicable + 内容: seed の冪等性が P04 設計〜P09 品質ゲートまで一貫して維持されているかを最終確認する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/final-review-notes.md を新規作成する
- Operations: N/A: 本 task は最終レビューのみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (本 task はレビューのみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: P08 で migration 不要と確定済み

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/final-review-notes.md (3 constraint それぞれの最終充足判定を含む)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/requirements-baseline.md, architecture-decision-record.md, design-review-notes.md, test-design.md, route-state-matrix.md, test-run-report.md, acceptance-report.md, refactoring-migration-note.md, quality-assurance-report.md
- Write scope/touches: docs/features/feat-demo-coverage-dataset/final-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p10) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p10 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p10) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P09] のため P09 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (未充足があれば原因 task へ差し戻す。本 task はレビューのみ)
- 本番・staging データベースへの投入
- エビデンス収集そのもの (P11 の scope)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task は新規テストを実行せず P04〜P09 の既存記録を横断確認するのみ。4 レベルすべて N/A: 本 task はレビュー業務でありテスト実行自体は行わない (P06 で実行済みの結果を根拠として参照する)
- カバレッジ目標: N/A: 本 task はコード成果物を持たないためカバレッジ計測対象がない。P09 の実測値 (既定 80%) をそのまま参照する
- 層別方針: Backend/Data 層 = API 契約 (seed CLI の入出力契約) と DB 結合 (seed 実行後の DB 状態確認) の検証方針が P02 設計から P09 品質ゲートまで一貫しているかを最終確認する。Data/Security/Quality 層 = P01〜P09 の該当成果物を横断し、3 constraint の一貫性をチェックリストで確認する。Documentation 層 = final-review-notes.md 自体のレビュー
- 保守性制約: レビューは各成果物の記述内容 (データ内容ベースの証跡) に基づいて行い、pixel 位置依存・DOM 構造依存の観点は含まない

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: final-review-notes.md に、seed 冪等性・ローカル以外 DB URL 拒否・route×状態対応表未カバー0件の 3 constraint それぞれの充足判定と根拠成果物への参照が記載されていること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: final-review-notes.md に 3 constraint すべての最終充足判定が確定している状態
- Generic execution prompt: P01〜P09 の全成果物を独立した視点で読み、3 constraint (冪等性・ローカル専用ガード・対応表網羅性) がすべての成果物を通じて矛盾なく維持されているかを判定せよ。矛盾があれば該当 task を具体的に指摘すること
- Rubric: (1) 3 constraint すべてに最終判定が付与されている (2) 各判定に根拠成果物への参照がある (3) 矛盾が発見された場合は原因 task が具体的に指摘されている (4) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: レビュー → 判定 → 未充足があれば原因 task へ差し戻し → 再レビュー → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: final-review-notes.md に最終充足判定を記録し、P11 へ引き継ぐ
- Rollback trigger and steps: いずれかが未充足の場合、final-review-notes.md に未充足理由を記録し、該当する原因 task (P02/P05/P08 等) を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236), system-spec/database.md
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p09
