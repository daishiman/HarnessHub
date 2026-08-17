# System task overlay: テスト実行 — 冪等性・網羅性・ローカル専用ガード拒否テストの実行と結果記録

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "test-run"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P06
- classification: confidence=0.86, reason="P04 のテストスタブ (網羅性・冪等性・ローカル専用ガード拒否・長文折返し・大量ページング境界) を P05 実装に対して実行し結果を記録する P06 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p06.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 で実装した seed-coverage.ts と verify-demo-coverage-matrix.ts に対して、P04 で設計した 6 テストカテゴリ (網羅性・enum全値・冪等性・ローカル専用ガード・長文折返し・大量ページング境界) を実行し、結果を証跡として記録する。この task 完了時点で、全テストカテゴリの pass/fail が machine-verifiable な記録として確定する。

## 背景

P05 は実装の完了 (テストスタブが green になること) を条件とするが、本 task はその実行結果を独立した証跡文書として固定し、後続 P07 の受入判定・P09 の品質保証・P10 の最終レビューが同じ実行結果を再利用できるようにする。特に冪等性テスト (同一 seed を連続 2 回実行し投入後の状態が一致することの確認) は、実装完了時の 1 回限りの実行では検証しきれないため、本 task で明示的に 2 回連続実行を行い結果を記録する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: packages/db/scripts/seed-coverage.ts と verify-demo-coverage-matrix.ts (P05 成果物) が存在し typecheck/test が成功していること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P06 は P05 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はテスト実行と結果記録のみで frontend 実装物を変更しない
- Backend: N/A: 本 task はテスト実行と結果記録のみで backend 実装物を変更しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: applicable + 内容: seed-coverage.ts を対象 DB (ローカル SQLite/Turso 開発用インスタンス) へ連続 2 回実行し、DB 状態の一致を確認する
- Infrastructure: N/A: 追加インフラを新設しない
- Security: applicable + 内容: ローカル以外の DB URL を指定した実行が非 0 終了で拒否されることを実測する
- Quality: applicable + 内容: 6 テストカテゴリ全件の pass/fail を記録する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/test-run-report.md を新規作成する
- Operations: N/A: 運用手順の文書化は P12 で行う

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (テスト実行はローカル開発環境で行い、本番・staging 環境には接続しない)
- Compatibility/migration/backfill: N/A: 本 task はテスト実行のみで実スキーマへの変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/test-run-report.md (6 テストカテゴリの pass/fail 結果、冪等性 2 回連続実行の記録を含む)
- Consumed artifacts: packages/db/scripts/seed-coverage.ts, packages/db/scripts/verify-demo-coverage-matrix.ts, packages/db/__tests__/seed-coverage/, docs/features/feat-demo-coverage-dataset/test-design.md
- Write scope/touches: docs/features/feat-demo-coverage-dataset/test-run-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p06) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p06 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p06) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P05] のため P05 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (fail が発生した場合は P05 へ差し戻す。本 task は実行と記録のみ)
- 本番・staging データベースへの投入
- acceptance 判定そのもの (P07 の scope)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルすべてを P04 で設計済みのテストスタブに従って実行する。単体 = fixture 生成関数、結合 = seed 実行から DB 状態確認、境界値 = ページング境界と長文折返し文字数、回帰 = 冪等性 (2 回連続実行の状態一致)。いずれも applicable
- カバレッジ目標: 既定 80% を packages/db/scripts/seed-coverage.ts と verify-demo-coverage-matrix.ts に適用し、`pnpm --filter @harness-hub/db test -- --coverage` の実測値を test-run-report.md に記録する
- 層別方針: Backend 層 = API 契約 (seed CLI の引数・終了コードの入出力契約) テストの実行結果を記録する。Data 層 = DB 結合テストの実行結果を中心に記録する。Security 層 = ローカル以外 URL 拒否テストの実行結果 (非 0 終了コードの実測値) を記録する。Quality 層 = verify-demo-coverage-matrix.ts の出力 (未カバー件数の実測値) を記録する
- 保守性制約: 記録する assertion 結果はすべて DB 状態・終了コード・カバレッジ数値といったデータベースであり、pixel 位置依存・DOM 構造依存の結果は含まない。テスト自体の修正は本 task の scope 外とし、実装詳細に密結合した過剰なテストを新規に追加しない

## Verification and evidence

- Automated commands: `pnpm install --frozen-lockfile`; `pnpm --filter @harness-hub/db test`; `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: test-run-report.md に P04 定義の 6 テストカテゴリ全件の pass/fail 結果と、同一 seed を連続 2 回実行した際の投入後状態が一致することの記録があること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: test-run-report.md に 6 テストカテゴリすべての実行結果 (pass/fail) と冪等性 2 回連続実行の記録が確定している状態
- Generic execution prompt: P05 実装物に対して P04 のテストスタブを実行し、結果を test-run-report.md に記録せよ。冪等性は seed-coverage.ts を連続 2 回実行し DB 状態を比較すること。fail が発生した場合は原因を記録し実装の修正は行わない (P05 へ差し戻す判断材料とする)
- Rubric: (1) 6 テストカテゴリ全件が実行され結果が記録されている (2) 冪等性の 2 回連続実行結果が記録されている (3) fail があれば原因が具体的に記述されている (4) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: 実行 → 記録 → fail があれば P05 を再実行対象として差し戻し → 再実行 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: test-run-report.md に実行結果を記録し、P07 へ引き継ぐ
- Rollback trigger and steps: fail が発生した場合、test-run-report.md に失敗詳細を記録し sys-demo-coverage-dataset-p05 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236, qa-211)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p05
