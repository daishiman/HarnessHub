# System task overlay: リファクタリング/マイグレーション — 既存 schema 変更要否の確認 (N/A 判定)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "migration"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P08
- classification: confidence=0.84, reason="本 feature は既存 schema (packages/db/schema/**) への列追加・変更を伴わず fixture データ投入のみを行うため、migration 不要と判定し根拠を記録する P08 タスク (feature-execution-package-contract.md により P08 は N/A 判定時も常設される)", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p08.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P05 実装が既存 schema (packages/db/schema/**) を変更していないことを確認し、本 feature がスキーマ移行 (migration) を必要としない理由を machine-verifiable な根拠として記録する。この task 完了時点で、リファクタリング/マイグレーション責務が N/A である判定が確定した refactoring-migration-note.md が存在する状態になる。

## 背景

feature-execution-package-contract.md の phase 責務表は P08 を「リファクタリング/マイグレーション」に固定割り当てしており、内容が不要な場合でも task を省略せず N/A 判定として記録することを要求する。本 feature (feat-demo-coverage-dataset) は goal-spec scope_in/scope_out に「既存ドメインの enum 値やカラムを使った fixture データの投入」のみを含み、新規テーブルやカラムの追加は含まれない。P02 の設計 (architecture-decision-record.md) と P05 の実装 (packages/db/scripts/seed-coverage.ts) はいずれも既存 schema をそのまま利用する前提であり、本 task はその前提が実装として守られたことを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/acceptance-report.md (P07 成果物) が 7 項目全件 pass であること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P08 は P07 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task はスキーマ変更要否の確認のみで frontend 実装物を変更しない
- Backend: N/A: 本 task はスキーマ変更要否の確認のみで backend 実装物を変更しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: applicable + 内容: P05 の write_scope (packages/db/scripts/seed-coverage.ts, verify-demo-coverage-matrix.ts) が packages/db/schema/** 配下のファイルを一切含まないことを確認し、migration 不要の根拠として記録する
- Infrastructure: N/A: 追加インフラを新設しない
- Security: N/A: 本 task はスキーマ変更確認のみでセキュリティ制御の変更を伴わない
- Quality: applicable + 内容: migration 不要判定の根拠 (write_scope 差分の確認結果) を記録する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/refactoring-migration-note.md を新規作成する
- Operations: N/A: 本 task は判定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (本 task は判定のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 feature は既存 schema への変更を伴わないため migration/backfill は不要である旨を本 task の成果物として確定させる

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/refactoring-migration-note.md (migration 不要判定と根拠を含む)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/acceptance-report.md, packages/db/scripts/seed-coverage.ts, packages/db/scripts/verify-demo-coverage-matrix.ts, packages/db/schema/core/catalog.ts, packages/db/schema/core/publish.ts
- Write scope/touches: docs/features/feat-demo-coverage-dataset/refactoring-migration-note.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p08) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p08 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p08) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P07] のため P07 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実際の schema 変更 (本 feature の scope に含まれないため実施しない)
- migration ファイルの生成
- 本番・staging データベースへの投入

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task はスキーマ変更要否の確認文書化のみでコード成果物を持たないため 4 レベルすべて N/A: 本 task は write_scope 差分確認という静的な確認作業であり、実行可能なテスト対象コードを生成しない
- カバレッジ目標: N/A: 本 task はコード成果物を持たないためカバレッジ計測対象がない。既定 80% の適用対象コードは P05 の write_scope から変化しない
- 層別方針: Backend/Data 層 = API 契約 (seed CLI の入出力契約) と DB 結合 (seed 実行後の DB 状態) がスキーマ非変更のまま維持されることを確認する。Data/Quality 層 = P05 の write_scope とリポジトリの実際の変更差分 (git diff 相当) を突き合わせ、packages/db/schema/** への変更が 0 件であることを確認する
- 保守性制約: 本 task は静的差分確認のみであり、pixel 位置依存・DOM 構造依存のテストは対象外。将来 migration が必要になった場合も、テストは schema 定義とマイグレーション適用結果のデータ内容ベースの assertion に限定する方針を維持する

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: refactoring-migration-note.md に、P05 実装が既存 schema (packages/db/schema/**) を変更していないことの確認結果と、migration 不要の判定根拠が記録されていること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: refactoring-migration-note.md に migration 不要判定と、その根拠となる write_scope 差分確認結果が確定している状態
- Generic execution prompt: P05 の write_scope (packages/db/scripts/seed-coverage.ts, verify-demo-coverage-matrix.ts, docs/features/feat-demo-coverage-dataset/route-state-matrix.md) が packages/db/schema/** を含まないことを確認し、migration 不要の判定を記録せよ。含まれていた場合は N/A 判定を撤回し、実際の migration 要否を評価すること
- Rubric: (1) P05 の write_scope が実際の diff と一致することを確認している (2) packages/db/schema/** への変更が 0 件であることが根拠として明記されている (3) 万一変更が含まれていた場合の差し戻し手順が明記されている (4) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: 確認 → N/A 判定記録 → もし schema 変更が発見されれば P05 へ差し戻し → 再確認 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: refactoring-migration-note.md に N/A 判定を記録し、P09 へ引き継ぐ
- Rollback trigger and steps: P05 実装が実際には schema 変更を含んでいたと判明した場合、refactoring-migration-note.md に判定誤りを記録し、sys-demo-coverage-dataset-p05 を write_scope 逸脱として再実行対象へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/database.md
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p07
