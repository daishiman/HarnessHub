# System task overlay: 品質保証 — 網羅性/冪等性/ローカル専用ガードの品質ゲート確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-demo-coverage-dataset (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-demo-coverage-dataset", "macro-feature", "testing-qa", "seed", "coverage", "quality-assurance"]
- related_nodes: ["feat-demo-coverage-dataset", "arch-harness-hub-data", "arch-harness-hub-testing-qa"]
- parent_feature: feat-demo-coverage-dataset
- phase_ref: P09
- classification: confidence=0.85, reason="P06 テスト結果と P08 migration 不要判定を踏まえ、品質ゲート (route×状態網羅性0未カバー・enum全値網羅・冪等性・ローカル専用ガード) の充足を確認する P09 タスク", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-demo-coverage-dataset/sys-demo-coverage-dataset-p09.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 のテスト結果と P08 の migration 不要判定を踏まえ、本 feature の品質ゲート (route×状態対応表の未カバー 0 件・enum 全値網羅・冪等性・ローカル専用ガード拒否) が fail-closed で確認されている状態を確定する。この task 完了時点で、`pnpm --filter @harness-hub/db lint` と `pnpm --filter @harness-hub/db test -- --coverage` がいずれも成功し、その結果が quality-assurance-report.md に記録されている状態になる。

## 背景

goal-spec の acceptance は、enum 未使用値 0 件・route×状態対応表未カバー 0 件をいずれも「機械検査する」ことを要求しており、目視確認では不十分である。P06/P07 は個別テストカテゴリと acceptance 項目の実行結果を扱うが、本 task は lint (静的検査) とカバレッジ計測を含めた品質ゲート全体を、fail-closed (いずれか 1 件でも未達なら非 0 終了する運用) で最終確認する責務を持つ。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-demo-coverage-dataset, arch-harness-hub-data, arch-harness-hub-testing-qa
- Entry gate: docs/features/feat-demo-coverage-dataset/refactoring-migration-note.md (P08 成果物) が N/A 判定で確定していること
- P01 upstream entry gate: N/A: intra-feature depends_on gate (P09 は P08 完了を depends_on として直接要求する)
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は品質ゲート確認のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は品質ゲート確認のみで backend 実装物を変更しない
- API: N/A: 本 feature は API endpoint を持たない
- Data: applicable + 内容: verify-demo-coverage-matrix.ts の実行結果 (未カバー 0 件・enum 未使用値 0 件) を品質ゲートとして確認する
- Infrastructure: N/A: 追加インフラを新設しない
- Security: applicable + 内容: ローカル以外 URL 拒否テストが fail-closed (非 0 終了) で機能していることを品質ゲートとして確認する
- Quality: applicable + 内容: lint (`pnpm --filter @harness-hub/db lint`) とカバレッジ (80% 目標) の実測結果を確認する
- Documentation: applicable + 内容: docs/features/feat-demo-coverage-dataset/quality-assurance-report.md を新規作成する
- Operations: N/A: 本 task は品質ゲート確認のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-data, arch-harness-hub-testing-qa
- Deploy unit/environment: cloudflare-workers/hub (品質ゲート確認はローカル開発環境で行う)
- Compatibility/migration/backfill: N/A: P08 で migration 不要と確定済み

## 成果物

- Produced artifacts: docs/features/feat-demo-coverage-dataset/quality-assurance-report.md (4 種の品質ゲート確認結果を含む)
- Consumed artifacts: docs/features/feat-demo-coverage-dataset/test-run-report.md, docs/features/feat-demo-coverage-dataset/refactoring-migration-note.md, packages/db/scripts/verify-demo-coverage-matrix.ts
- Write scope/touches: docs/features/feat-demo-coverage-dataset/quality-assurance-report.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-demo-coverage-dataset-p09) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-demo-coverage-dataset-p09 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-demo-coverage-dataset-p09) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-DEMO-COVERAGE-DATASET-P08] のため P08 完了後に着手する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 実装コードの修正 (未達があれば原因 task へ差し戻す。本 task は確認のみ)
- 本番・staging データベースへの投入
- 最終独立レビュー (P10 の scope)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルのうち、本 task は新規テストを追加せず既存の単体/結合/境界値/回帰テスト (P04 設計・P05 実装・P06 実行) の結果を品質ゲートとして再確認するのみ。4 レベルすべて applicable であり、いずれも P06 の記録を根拠とする
- カバレッジ目標: 既定 80% を維持し、`pnpm --filter @harness-hub/db test -- --coverage` の実測値が 80% 未満の場合は fail として quality-assurance-report.md に記録する
- 層別方針: Backend/Data 層 = API 契約 (seed CLI の終了コード契約) テストと DB 結合テストの結果を品質ゲートとして fail-closed 判定する。Data 層 = verify-demo-coverage-matrix.ts の未カバー件数を fail-closed 判定する。Security 層 = ローカル以外 URL 拒否の非 0 終了を fail-closed 判定する。Quality 層 = lint とカバレッジ実測値を fail-closed 判定する
- 保守性制約: 品質ゲートの判定はすべて数値・終了コード・DB 状態といったデータ内容ベースであり、pixel 位置依存・DOM 構造依存の判定は含まない。実装詳細に密結合した過剰なテストを新規追加しない方針を維持する

## Verification and evidence

- Automated commands: `pnpm --filter @harness-hub/db lint`; `pnpm --filter @harness-hub/db test -- --coverage`; `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-demo-coverage-dataset`
- Required evidence: quality-assurance-report.md に route×状態未カバー0件検査・enum全値網羅検査・冪等性検査・ローカル専用ガード拒否検査の 4 種の確認結果が記録されていること

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: quality-assurance-report.md に 4 種の品質ゲートすべてが fail-closed で確認され、lint とカバレッジが基準を満たしている状態
- Generic execution prompt: pnpm --filter @harness-hub/db lint と pnpm --filter @harness-hub/db test -- --coverage を実行し、verify-demo-coverage-matrix.ts の出力とあわせて 4 種の品質ゲートを quality-assurance-report.md に記録せよ。いずれかが未達の場合は fail として明記し実装を修正しないこと (差し戻し判断は別途行う)
- Rubric: (1) 4 種の品質ゲートすべてに判定が記録されている (2) lint が成功している (3) カバレッジが 80% 以上である (4) 未達があれば原因 task への差し戻し記録がある (5) validate-system-plan.py が本 task に関する違反 0 件で完了する
- Feedback loop: 確認 → 記録 → 未達があれば原因 task (P05 等) へ差し戻し → 再確認 → rubric verdict=PASS まで反復。上限 (3 回) 到達時は fail-closed とし team-lead へ差し戻す
- P13 spec/architecture writeback: N/A: P13 owns writeback

## Rollout and rollback

- Rollout: quality-assurance-report.md を作成し、4 種の品質ゲート全件充足を確認してから P10 へ引き継ぐ
- Rollback trigger and steps: 未達の品質ゲートがある場合、quality-assurance-report.md に未達理由を記録し、原因が実装にある場合は sys-demo-coverage-dataset-p05 を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/testing-qa.md (qa-236, qa-211), system-spec/database.md
- Architecture: arch-harness-hub-data (architecture/harness-hub-data.md), arch-harness-hub-testing-qa (architecture/harness-hub-testing-qa.md)
- Feature: feat-demo-coverage-dataset
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-demo-coverage-dataset-p08
