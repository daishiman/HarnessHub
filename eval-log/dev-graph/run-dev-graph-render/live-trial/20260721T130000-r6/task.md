# タスク: dev-graph:run-dev-graph-render 正経路の実走

fixture repo のcanonical graphへ、confirmed/pass/readiness-complete feature 1件と done task 1件・active task 1件を C02/C11 契約に従って準備し、登録receipt の expected_count/applied_count/source_digest を保持してください。次に以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r6-render --output /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r6-render/.dev-graph/render/index.html"})

生成HTMLに外部script/linkが0、inline SVGにfeature/task/edgeが表示され、feature進捗が1/2、表示対象digestがreceipt source_digestに対応し、追加runtime依存がないことを検証してください。

## 登録経路に関する厳守制約 (C02 単一writer不変条件)

- `.dev-graph/state/graph.json` を python・エディタ・sed 等で直接編集する C02 迂回は禁止。graph.json への書込みは upsert-node.py 経由のみ。

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T130000-r6/out/status.json` だけに `{"status":"PASS|FAIL|ERROR","scenario":"render-feature-progress-positive"}` をWriteする。
2. `DONE: <status>` と1行だけ報告する。

途中で人間に質問せず最後まで自走し、skillの手順を省略しないこと。out/に中間成果物を書かないこと。
