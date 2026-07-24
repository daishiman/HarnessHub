# タスク: dev-graph:run-dev-graph-schedule の ready-set 算出 (scenario C15-OUT1-positive-ready-set-r16)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/schedule-wt1-r2` にある dev-graph 初期化済みの独立 Git repository です。task が 6 件あり、ready 集合が `--max-parallel` を超え、scope 重複ペア (LT-SCHED-001/002)、active lease (004)、stale lease (006)、未充足依存で blocked な task (005) を含みます。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/schedule-wt1-r2 --max-parallel 2。SKILL.md の手順どおり ready-set を算出し、resource_scope 重複を別バッチへ分離し、active lease を抑止・stale lease を回収し、ready task ごとに一意な suggested_branch と worktree claim command を返す"})

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-schedule` は `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い、`$DEV_GRAPH_ROOT/eval-log/` へ 3 点セット (`run-dev-graph-schedule-goal-spec.json` / `run-dev-graph-schedule-progress.json` / `run-dev-graph-schedule-intermediate.jsonl`、intermediate は必須 6 キー) をすべて書き出してください。

`intermediate.jsonl` は実行途中の証拠です。次を厳守してください:

1. schedule 実行前に SKILL.md の original_goal を goal-spec へ書き、その同じ文字列から UTF-8 SHA-256 を計算する。
2. schedule 実行前に、計算済みの正しい hash を持つ最初の intermediate 行を新規作成する。
3. schedule と C17 検証後に、結果を持つ2行目だけを append（末尾追加）する。
4. 2行を後からまとめて書かない。既存行の Edit / Update / 全体上書きはしない。hash 検証に失敗した場合は書き換えず FAIL とする。

## 成功条件 (すべて実測値で示すこと)

- 推薦タスクが全依存充足済み (ready) で、blocked な LT-SCHED-005 は ready から外れ理由が報告される。
- 並列バッチ内で resource_scope 重複ペア (001/002) が同一バッチに置かれていない (conflict-free)。
- active lease (004) が該当 task を抑止し、stale lease (006) が回収される。
- バッチが `--max-parallel 2` を尊重し、suggested_branch と worktree claim command が一意である。
- goal-seek 3 点セットがすべて書き出され、intermediate は実行時系列どおりの append-only である。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260723T115622Z-wt1r2/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C15-OUT1-positive-ready-set-r16"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
