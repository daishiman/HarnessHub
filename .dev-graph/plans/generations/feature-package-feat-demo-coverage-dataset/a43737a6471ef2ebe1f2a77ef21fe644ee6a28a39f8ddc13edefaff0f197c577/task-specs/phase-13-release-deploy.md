# System task overlay: リリース/デプロイ — ローカル専用ツールの close-out (実デプロイなし)

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "release"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P13
- classification: confidence=0.84, reason="本 feature はローカル専用 seed ツールであり本番・staging への配布物を持たないため (scope_out: 本番・staging データベースへの投入)、P12 の runbook を踏まえて close-out receipt を N/A 判定として記録する P13 タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

本 feature (feat-demo-coverage-dataset) が本番・staging への配布物を持たないローカル専用ツールであることを最終確認し、close-out receipt として release-notes.md に記録する。あわせて、P01〜P12 の実行結果・改善点を system spec (system-spec/testing-qa.md) と architecture (architecture/harness-hub-testing-qa.md) へ writeback し、後続 feature `feat-ui-integrity-audit-harness` が本 feature の完了を前提として着手できる状態を確定する。

## 背景

goal-spec の scope_out は「本番・staging データベースへの投入 (ローカル専用ガードを緩めない)」を明記しており、本 feature は Cloudflare Workers 上の Hub 本体 (feat-hub-foundation) のような実デプロイパイプラインを持たない。したがって P13 の「リリース/デプロイ」責務は、実際のデプロイ作業ではなく、この事実を明示的に判定・記録し、本 feature が close-out 済みであることを後続 feature が参照できるようにする作業となる。あわせて feature-execution-package-contract.md は P13 に spec/architecture writeback を必須責務として割り当てており、本 task はこの writeback を担う唯一の task である (P01〜P12 は writeback を行わない)。

writeback の内容は、qa-236 が要求する「28 route × 5 状態 × enum 全値の確認用データ」が実際に整備され、`packages/db/scripts/seed-coverage.ts` と `verify-demo-coverage-matrix.ts` によって機械検査可能になったという実行結果を、system-spec/testing-qa.md の qa-236 節と architecture/harness-hub-testing-qa.md へ反映することを指す。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/runbook.md (P12 成果物) が 3 項目 (seed 実行手順・28 route×5状態到達手順・ローカル以外 URL 拒否確認手順) 全件記載済みであること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P13 は P12 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は close-out 判定と writeback のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は close-out 判定と writeback のみで backend 実装物を変更しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: N/A: データ実装自体の変更は行わない (P05 で実装済み)
- Infrastructure: applicable + 内容: 本 feature が cloudflare-workers/hub の既存デプロイパイプラインを利用せず、実デプロイ物を追加しないことを確認し記録する
- Security: applicable + 内容: ローカル専用ガードが緩和されずに close-out されることを最終確認する
- Quality: applicable + 内容: P01〜P12 の全成果物が揃っていることを close-out の前提条件として確認する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/release-notes.md を新規作成し、system-spec/testing-qa.md と architecture/harness-hub-testing-qa.md へ writeback する
- Operations: applicable + 内容: 後続 feature feat-ui-integrity-audit-harness が本 feature の runbook.md を前提データ利用手順として参照可能になったことを確認する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (本 feature はローカル専用ツールであり、Hub Worker の実デプロイ物には含まれない。既存デプロイパイプラインへの変更は行わない)
- Compatibility/migration/backfill: N/A: P08 で migration 不要と確定済み。実デプロイを伴わないため互換性への影響もない

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/release-notes.md (close-out receipt。本番・staging への配布物を持たない旨の判定根拠を含む)、system-spec/testing-qa.md への qa-236 実行結果の writeback、architecture/harness-hub-testing-qa.md への実行結果 writeback
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/runbook.md, final-review-notes.md, evidence/index.md
- Write scope/touches: docs/features/feat-demo-coverage-dataset/release-notes.md, system-spec/testing-qa.md, architecture/harness-hub-testing-qa.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p13) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P12] のため P12 完了後に着手する。resource_scope (system-spec/testing-qa.md, architecture/harness-hub-testing-qa.md) が他 feature の writeback task と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実際のデプロイ作業 (本 feature には実デプロイ物が存在しないため)
- 本番・staging データベースへの投入
- 後続 feature feat-ui-integrity-audit-harness の実装着手そのもの

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task は close-out 判定と writeback 文書化のみでコード成果物を持たないため 4 レベルすべて N/A: 本 task はテスト対象コードを持たず、writeback 内容は P01〜P12 で既に検証済みの実行結果をそのまま反映する
- カバレッジ目標: N/A: 本 task はコード成果物を持たないためカバレッジ計測対象がない。P09 の実測値 (既定 80%) を writeback 内容の一部として参照する
- 層別方針: Infrastructure 層 = 本 feature が IaC (cloudflare-workers/hub の既存 Infrastructure as Code 定義) を一切変更しないことを静的検証し、既存デプロイ物への smoke 確認 (デプロイ後の疎通確認) が不要である根拠を記録する。Infrastructure/Security/Quality 層 = close-out 前提条件 (P01〜P12 全件完了) のチェックリスト確認。Documentation/Operations 層 = release-notes.md と writeback 内容の整合性確認
- 保守性制約: writeback は既存文書のフォーマットに沿った追記とし、pixel 位置依存・DOM 構造依存の記述は含まない。system-spec/architecture 文書の既存記述を上書き削除せず、実行結果の追記に限定する

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: release-notes.md に、本 feature が本番・staging への配布物を持たない旨の判定根拠と、feat-ui-integrity-audit-harness が本成果物を前提データとして参照可能になったことの確認記録があること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: release-notes.md に close-out receipt が記録され、system-spec/testing-qa.md と architecture/harness-hub-testing-qa.md への writeback が完了している状態
- Generic execution prompt: P01〜P12 の全成果物 (特に runbook.md と final-review-notes.md) を読み、本 feature が本番・staging への配布物を持たないことを確認したうえで release-notes.md を作成し、qa-236 の実行結果を system-spec/testing-qa.md と architecture/harness-hub-testing-qa.md へ追記せよ。既存記述の削除は行わないこと
- Rubric: (1) release-notes.md に close-out 判定根拠が記載されている (2) system-spec/testing-qa.md への writeback が完了している (3) architecture/harness-hub-testing-qa.md への writeback が完了している (4) 既存記述が削除されていない (5) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: writeback → 整合性確認 → 矛盾があれば修正し再実行 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: required: 本 task が execution results, decisions, and improvement findings を system-spec/testing-qa.md と architecture/harness-hub-testing-qa.md へ反映する

## Rollout and rollback

- Rollout: release-notes.md と writeback を完了し、feature 全体の close-out を確定する
- Rollback trigger and steps: 本 feature が実際には本番・staging への配布物を持つと判明した場合、release-notes.md に判定誤りを記録し、feat-hub-foundation の既存デプロイパイプラインのロールバック手順に従って原因 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236)
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p12
