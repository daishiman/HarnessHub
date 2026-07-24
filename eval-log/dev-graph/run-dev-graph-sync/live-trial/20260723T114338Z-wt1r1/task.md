# タスク: dev-graph:run-dev-graph-sync の 3-way 収束 (scenario C03-OUT1-positive-second-sync-zero-r12)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/sync-wt1-r1` にある dev-graph 初期化済みの独立 Git repository です。決定論 remote state が `.dev-graph/remote.json` にあり、外部 GitHub API へ一切接続せず 3-way 同期を再現します。import 1 件・export 1 件を持ちます。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/sync-wt1-r1。SKILL.md の手順どおり dry-run → apply → 確認 dry-run の 3 パスを同じ graph・snapshot・remote 入力で回す。決定論試験なので remote は fixture 内 .dev-graph/remote.json を使い、gh-bridge / bd-bridge の外部通信はしない"})

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-sync` は frontmatter で `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い `$DEV_GRAPH_ROOT/eval-log/`（= `eval-log/dev-graph/live-trial-fixtures/sync-wt1-r1/eval-log/`）へ **3 点セットを全て書き出す**こと。1 つでも欠けると機械 gate で DEGRADED に降格される:

- `run-dev-graph-sync-goal-spec.json`
- `run-dev-graph-sync-progress.json`
- `run-dev-graph-sync-intermediate.jsonl` (6 キー: original_goal / original_goal_hash / current_goal_snapshot / delta_from_original / merged_directive_for_next / drift_signal)

## 成功条件 (すべて実測値で示すこと)

- 初回 (apply) が期待どおりの import 1 件と export 1 件を適用した。
- 2 回目 (確認 dry-run) が imports changes=0 / exports changes=0 を報告した。
- 2 回目実行後も ID と snapshot digest が不変である。
- dry-run パスで local/Beads/GitHub/Projects の write count が 0 だった。
- goal-seek 3 点セットが全て書き出されている。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260723T114338Z-wt1r1/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C03-OUT1-positive-second-sync-zero-r12"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
