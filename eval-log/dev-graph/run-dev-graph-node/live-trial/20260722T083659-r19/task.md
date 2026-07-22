# タスク: dev-graph:run-dev-graph-node の 5 種 artifact 一括登録 (scenario C02-OUT1-positive-mixed-artifacts)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/node` にある dev-graph 初期化済みの独立 Git repository です。`mixed-artifacts.json` に issue / task / specification / architecture / document の 5 種 artifact が 1 バッチで入っています。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/node --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/node/mixed-artifacts.json。skill の手順どおり分類・routing・保存を行い、登録後に 1 件を選んで consecutive update を行う。goal_seek を宣言する skill なら goal-spec / progress / intermediate も書き出す"})

## 成功条件 (すべて実測値で示すこと)

- 5 種 artifact すべてが canonical kind path (issues/ tasks/ specs/ architecture/ docs/) に routing された。
- 登録後に 1 件を consecutive update したとき、frontmatter の kind と保存 path が一致したままである。
- C14 macro-feature contract を経由しない feature が 1 件も作られていない。
- graph.json は C02 の atomic writer 経由でのみ更新され、直接書込みが無い (hook が遮断する)。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260722T083659-r19/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "C02-OUT1-positive-mixed-artifacts"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
