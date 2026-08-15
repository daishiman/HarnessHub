# System task overlay: エビデンス収集 — 再現可能な検証証跡の集約

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "evidence"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P11
- classification: confidence=0.83, reason="P06/P07/P09/P10 の検証結果を再現可能な証跡として索引化する P11 タスク", candidates=[{artifact_kind: task, confidence: 0.83, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (テスト実行)・P07 (受入)・P09 (品質保証)・P10 (最終レビュー) が生成した検証結果を、再現可能なエビデンスとして 1 か所に索引化する。この task 完了時点で、後続 P12 の runbook と P13 の close-out が、どの成果物を参照すればよいかを迷わず辿れる状態になる。

## 背景

本 feature は後続 feature `feat-ui-integrity-audit-harness` の前提データを担うため、検証結果が散逸していると、後続 feature の担当者が本 feature の保証内容を再確認する際に手戻りが発生する。本 task は、P06〜P10 で生成された各成果物へのリンクと、それぞれを再実行するためのコマンドを 1 つの索引文書 (evidence/index.md) にまとめ、再現性を担保する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/final-review-notes.md (P10 成果物) が 3 constraint 全件充足であること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P11 は P10 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はエビデンス索引化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task はエビデンス索引化のみで backend 実装物を変更しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: N/A: データ実装自体の変更は行わない (P06〜P10 の成果物を索引化するのみ)
- Infrastructure: N/A: 追加インフラを新設しない
- Security: N/A: 本 task は索引化のみでセキュリティ制御の変更を伴わない
- Quality: applicable + 内容: P06/P07/P09/P10 の各成果物への参照と再実行コマンドを索引化し、参照切れ 0 件を確認する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/evidence/ 配下に索引文書を新規作成する
- Operations: N/A: runbook 化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (本 task は索引化のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: P08 で migration 不要と確定済み

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/evidence/index.md (P06/P07/P09/P10 各成果物へのリンクと再実行コマンドを含む)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/test-run-report.md, acceptance-report.md, quality-assurance-report.md, final-review-notes.md
- Write scope/touches: docs/features/feat-demo-coverage-dataset/evidence/

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p11 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P10] のため P10 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 新規テストの実行 (既存結果の索引化のみ)
- 実装コードの修正
- 本番・staging データベースへの投入

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task は既存の単体/結合/境界値/回帰テストの結果を索引化するのみで新規実行は行わない。4 レベルすべて N/A: 本 task は索引作成業務でありテスト実行対象コードを持たない
- カバレッジ目標: N/A: 本 task はコード成果物を持たないためカバレッジ計測対象がない。P09 の実測値をそのまま参照リンクとして残す。P09 の実測値 (既定 80% 目標に対する実績) をそのまま参照リンクとして残す
- 層別方針: Quality 層 = 索引先リンクの到達可能性 (参照切れ 0 件) を確認する。Documentation 層 = evidence/index.md 自体のレビュー
- 保守性制約: 索引はファイルパスと再実行コマンドの列挙にとどめ、pixel 位置依存・DOM 構造依存の記述は含まない

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: evidence/index.md から P06/P07/P09/P10 の各成果物へのリンクと、それぞれの再実行コマンドが辿れること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: evidence/index.md から P06/P07/P09/P10 の全成果物が参照切れなく辿れる状態
- Generic execution prompt: P06/P07/P09/P10 の成果物パスと、それぞれの Verification and evidence セクションの Automated commands を索引化し、evidence/index.md を作成せよ。参照先ファイルは実際に存在することを確認すること
- Rubric: (1) 4 成果物すべてへのリンクが存在する (2) 各リンクに対応する再実行コマンドが記載されている (3) 参照切れが 0 件である (4) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: 索引作成 → リンク到達性確認 → 参照切れがあれば修正し再確認 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: evidence/index.md を作成し、P12 へ引き継ぐ
- Rollback trigger and steps: 参照先成果物が未整合 (欠落・矛盾) の場合、evidence/index.md に不整合箇所を記録し、該当する原因 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p10
