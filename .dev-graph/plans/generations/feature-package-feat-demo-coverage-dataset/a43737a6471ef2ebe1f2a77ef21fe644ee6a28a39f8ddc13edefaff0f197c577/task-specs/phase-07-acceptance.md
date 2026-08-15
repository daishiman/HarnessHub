# System task overlay: 受入 — goal-spec acceptance 7 項目の確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "acceptance"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P07
- classification: confidence=0.86, reason="P06 のテスト結果を goal-spec の acceptance 7 項目に照らして受入判定する P07 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p07.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 のテスト実行結果を、goal-spec の acceptance 7 項目それぞれに照らして受入判定する。この task 完了時点で、7 項目全件の pass/fail が確定した acceptance-report.md が存在する状態になる。

## 背景

goal-spec の acceptance は (1) 28 route 全件で 5 状態へ到達する手順が存在し実行できる (2) 各ドメイン enum ステータスが全値・最低 1 件ずつ含まれる (未使用値 0 件の機械検査) (3) 大量パターンが 50 件以上でページング境界を跨ぐ (4) 長文パターンが日本語の折返しを実際に発生させる長さを持つ (5) 同じ seed を連続 2 回実行し投入後の状態が一致する (6) ローカル以外の DB URL 指定時に非 0 終了で拒否される (7) route×状態対応表に未カバーの組が 0 件であることを機械検査する、の 7 項目からなる。P06 の test-run-report.md はテストカテゴリ単位の実行結果であり、本 task はそれを goal-spec の acceptance 文言単位で再整理し、1 対 1 で判定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/test-run-report.md (P06 成果物) が存在し 6 テストカテゴリ全件の結果が記録されていること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P07 は P06 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は判定文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は判定文書化のみで backend 実装物を変更しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: N/A: データ実装自体の変更は行わない (P06 の実行結果を再整理するのみ)
- Infrastructure: N/A: 追加インフラを新設しない
- Security: applicable + 内容: acceptance (6) ローカル以外 URL 拒否について、P06 の実測結果 (非 0 終了コード) を acceptance 判定として記録する
- Quality: applicable + 内容: acceptance 7 項目全件の pass/fail を判定し、fail があれば原因と差し戻し先を記録する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/acceptance-report.md を新規作成する
- Operations: N/A: 本 task は判定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (本 task は判定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は判定のみで実スキーマへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/acceptance-report.md (acceptance 7 項目それぞれの pass/fail 判定を含む)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/test-run-report.md, docs/features/feat-demo-coverage-dataset/route-state-matrix.md, goal-spec.json
- Write scope/touches: docs/features/feat-demo-coverage-dataset/acceptance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p07) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p07 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p07) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P06] のため P06 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (fail が発生した場合は原因 task へ差し戻す。本 task は判定のみ)
- 本番・staging データベースへの投入
- 品質保証ゲートの実行 (P09 の scope)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task は判定文書化のみで新規テストを実行しないため 4 レベルすべて N/A: 本 task は P06 で実行済みの単体/結合/境界値/回帰テストの結果を再利用して判定するのみで、新規のテスト実行は行わない
- カバレッジ目標: N/A: 本 task は新規コード成果物を持たないためカバレッジ計測対象がない。P06 の実測値をそのまま参照する。P06 の実測値 (既定 80% 目標に対する実績) をそのまま参照する
- 層別方針: Security/Quality 層 = P06 の実行結果を acceptance 文言単位で再整理し判定する。Documentation 層 = acceptance-report.md 自体のレビュー
- 保守性制約: 判定は P06 の実行結果 (データ内容ベースの証跡) のみを根拠とし、pixel 位置依存・DOM 構造依存の観点は含まない

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: acceptance-report.md に acceptance 7 項目それぞれの pass/fail 判定と test-run-report.md への参照が記載されていること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: acceptance-report.md に goal-spec acceptance 7 項目全件の pass/fail 判定が確定している状態
- Generic execution prompt: goal-spec.json の acceptance 7 項目と test-run-report.md / route-state-matrix.md を突き合わせ、各項目の pass/fail を判定せよ。判定根拠は test-run-report.md 内の具体的な記述箇所への参照を伴うこと
- Rubric: (1) acceptance 7 項目全件に判定が付与されている (2) fail がある場合は原因 task への差し戻し記録がある (3) pass の場合は根拠となる P06 記録への参照がある (4) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: 判定 → fail があれば原因 task (P05/P02 等) へ差し戻し → 再判定 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: acceptance-report.md を作成し、7 項目全件 pass を確認してから P08 へ引き継ぐ
- Rollback trigger and steps: acceptance いずれかが未達の場合、acceptance-report.md に未達理由を記録し、原因が実装にある場合は sys-demo-coverage-dataset-p05 を、設計にある場合は sys-demo-coverage-dataset-p02 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p06
