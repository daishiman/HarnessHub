# タスク: dev-graph:run-dev-graph-schedule の ready-set 算出 (scenario C15-OUT1-positive-ready-set-r16)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/schedule` にある dev-graph 初期化済みの独立 Git repository です。task が 6 件あり、ready 集合が --max-parallel を超え、scope 重複ペア (LT-SCHED-001/002)、active lease (004)、stale lease (006)、未充足依存で blocked な task (005) を含みます。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/schedule --max-parallel 2。SKILL.md の手順どおり ready-set を算出し、resource_scope 重複を別バッチへ分離し、active lease を抑止・stale lease を回収し、ready task ごとに一意な suggested_branch と worktree claim command を返す"})

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-schedule` は `goal_seek` を宣言します。SKILL.md の ## ゴールシーク実行 に従い `$DEV_GRAPH_ROOT/eval-log/`（= `eval-log/dev-graph/live-trial-fixtures/schedule/eval-log/`）へ **3 点セット** (`run-dev-graph-schedule-goal-spec.json` / `-progress.json` / `-intermediate.jsonl`、intermediate は 6 キー) を全て書き出すこと。

## 成功条件 (すべて実測値で示すこと)

- 推薦タスクが全依存充足済み (ready) で、blocked な LT-SCHED-005 は ready から外れ理由が報告される。
- 並列バッチ内で resource_scope 重複ペア (001/002) が同一バッチに置かれていない (conflict-free)。
- active lease (004) が該当 task を抑止し、stale lease (006) が回収される。
- バッチが --max-parallel を尊重し、suggested_branch と worktree claim command が一意である。
- goal-seek 3 点セットが全て書き出されている。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260722T095731-r19/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "C15-OUT1-positive-ready-set-r16"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
