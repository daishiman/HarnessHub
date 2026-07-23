# タスク: dev-graph:run-dev-graph-status の read-only 状態表示 (scenario C18-OUT1-positive-read-only-status)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/status` にある dev-graph 初期化済みの独立 Git repository です。task が 2 件あり、LT-TASK-002 が LT-TASK-001 に依存しています (前方依存 1 本)。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-status", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/status。skill の手順どおり検索・状態表示を行う。read-only skill なので graph/config/content を変更しない"})

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-status` は frontmatter で `goal_seek` を宣言する skill です。SKILL.md の ## ゴールシーク実行 が定める実行契約に従い、`$DEV_GRAPH_ROOT/eval-log/`（= `eval-log/dev-graph/live-trial-fixtures/status/eval-log/`）へ **3 点セットを必ず全て書き出す**こと。1 つでも欠けると受け入れは機械 gate で DEGRADED に降格される:

- `run-dev-graph-status-goal-spec.json` (original_goal と checklist)
- `run-dev-graph-status-progress.json` (各 checklist の status/evidence)
- `run-dev-graph-status-intermediate.jsonl` (各周回末に original_goal / original_goal_hash / current_goal_snapshot / delta_from_original / merged_directive_for_next / drift_signal の 6 キーを append)

前回はこの 3 点セットを 1 つも書き出さなかったため DEGRADED になった。今回は必ず全て書く。

## 成功条件 (すべて実測値で示すこと)

- 表示された status / closed_at / 依存関係が graph store の実値と field 単位で一致する (集計件数の一致だけでは不可)。
- 依存先を持つ LT-TASK-002 が blocked、LT-TASK-001 が ready として報告される。
- 実行後に graph / config / content / GitHub 状態が一切変わっていない。
- goal-seek 3 点セット (goal-spec / progress / intermediate) が全て書き出されている。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/run-dev-graph-status/live-trial/20260722T093029-r20/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "C18-OUT1-positive-read-only-status"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
