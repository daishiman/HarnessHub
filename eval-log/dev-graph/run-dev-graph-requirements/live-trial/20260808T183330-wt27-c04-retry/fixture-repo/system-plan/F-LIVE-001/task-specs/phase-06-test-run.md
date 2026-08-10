# SYS-LIVE-001-P06 テスト実行

## Machine-readable registration fields

- task_id: SYS-LIVE-001-P06
- phase_ref: P06
- parent_feature: F-LIVE-001
- feature_package_id: feature-package/F-LIVE-001
- graph_node_file_path: tasks/F-LIVE-001/sys-live-001-p06.md
- depends_on: SYS-LIVE-001-P05

## 目的

テスト実行を完了し、後続 phase が着手できる状態にする。

## 背景

live-trial fixture の feature F-LIVE-001 を exact-13 package へ分解した 1 phase である。実装内容ではなく、requirements handoff の readiness 判定に足る形を固定する。

## 前提条件

- 先行 phase SYS-LIVE-001-P05 の完了を前提とする
- 引用元の確定仕様: system-spec/00-requirements-definition.md

## Workstream applicability

テスト実行に対応する単一 workstream として実行する。

## Architecture and deploy unit

- architecture 参照: architecture/lt-arch-001.md
- deploy unit: live-trial-fixture-service

## 成果物

- テスト実行の結果を記録した phase 成果物

## Tracker publication and completion

- tracker_binding_intent: none (fixture は外部 tracker へ投影しない)
- 完了条件: linked_pr_merged_all

## Branch and worktree execution

- 1 task 1 branch とし、worktree lease を必須にする
- branch 割当は dev-graph scheduler が所有する

## スコープ外

- 他 feature の task への直接参照
- 実 repository への書き込み

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の4レベルを適用する
- カバレッジ目標: 既定 80% を維持する
- 層別方針: N/A: fixture の検証用仕様であり実装層を変更しない
- 保守性制約: pixel 位置依存と DOM 構造依存のテストを禁止する

## Verification and evidence

- 検証: テスト実行の完了を phase 成果物で確認する
- 証跡: 本 package 相対 path に閉じた成果物のみを参照する

## Inner goal-seek execution loop

- Methodology contract: system-task-goal-seek/v1
- Goal: 本 phase の Phase acceptance と Verification and evidence をすべて満たす
- Generic execution prompt: 目的・背景・前提条件・write scope・成果物・受入条件を入力に最小の安全な変更を行う
- Rubric: acceptance 全件・必須証跡・write scope・依存整合がすべて PASS
- Feedback loop: 実装→独立評価→finding 反映→再実行 を rubric verdict=PASS まで反復し、上限到達時は fail-closed
- P13 spec/architecture writeback: N/A (P13 owns writeback)

## Rollout and rollback

- rollout: 前方 phase 順に段階適用する
- rollback: 当該 phase の成果物を直前世代へ戻す

## Handoff

本 spec は capability-build / task-graph build が消費する実行単位であり、dev-graph 側は登録と進捗投影だけを担う。

## 参照情報

- system-spec/index.md
- system-spec/00-requirements-definition.md
- feature-package.json (feature-package/F-LIVE-001)

生成元: live-trial fixture shape (2026-07-21T00:00:00Z 固定)。
