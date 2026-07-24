# タスク: dev-graph:run-dev-graph-init の実走 (scenario C01-OUT1-positive-idempotence-r17)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/init-wt1` にある dev-graph 初期化済みの独立 Git repository です。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/init-wt1 --hook-source plugin"})

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-init` は `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/init-wt1/eval-log/` へ 3 点セット (`run-dev-graph-init-goal-spec.json` / `run-dev-graph-init-progress.json` / `run-dev-graph-init-intermediate.jsonl`、intermediate は必須 6 キー) をすべて書き出してください。

`intermediate.jsonl` は実行途中の証拠です。次を厳守してください:

1. skill 実行前に SKILL.md の original_goal を goal-spec へ書き、その同じ文字列から UTF-8 SHA-256 を計算する。
2. skill 実行前に、計算済みの正しい hash を持つ最初の intermediate 行を新規作成する。
3. skill 実行と検証後に、結果を持つ2行目だけを append（末尾追加）する。
4. 2行を後からまとめて書かない。既存行の Edit / Update / 全体上書きはしない。hash 検証に失敗した場合は書き換えず FAIL とする。

## 成功条件 (すべて実測値で示すこと)

- the first pass creates the six content roots, the routing policy and the graph store
- the second pass re-invokes the skill and reports zero planned changes
- the template edited between the passes still holds its edited bytes after the second pass, proving non-overwrite by running init rather than by inspecting the file alone
- the plugin hook source is resolved and its receipt or rejection diagnosis is recorded
- config stores no absolute path and no token or node id
- C11 passes against a graph that contains at least one node
- goal-seek 3 点セットがすべて書き出され、intermediate は実行時系列どおりの append-only である。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/run-dev-graph-init/live-trial/20260724T063927Z-init-wt1/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C01-OUT1-positive-idempotence-r17"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ)。
