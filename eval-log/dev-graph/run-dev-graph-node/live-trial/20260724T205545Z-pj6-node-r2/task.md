# タスク: dev-graph:run-dev-graph-node の実走 (C02-OUT1-positive-mixed-artifacts)

## 最初のアクションに関する必須契約

このtaskを読んだ直後の**最初のtool call**は、必ず次のSkill呼出しにしてください。これより前にRead、Glob、Grep、Bash、Write、Task、Agentなどを1回でも使った場合は、結果が正しくても自動FAILです。まず次を呼び出してください。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/live-trial-fixtures/node-wt10-pj6-r2 --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/live-trial-fixtures/node-wt10-pj6-r2/mixed-artifacts.json"})

Skillがロードされた後は、そのSKILL.mdに従って最後まで自走してください。被験skillをBashからscript直叩きで代替してはいけません。

## goal-seek証跡

Skillロード後、fixtureへ最初の変更を加える前にoriginal goalとhashを確定し、fixtureの`eval-log/`へgoal-specとintermediateの1行目を書いてください。処理・検証後にintermediateの2行目だけをappendし、progressを完成させてください。必要な3ファイルは次です。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

## 成功条件

- issue、task、specification、architecture、documentの5種類が正規pathへ登録される。
- 5件の追加後、同じgraph_node_idを持つ既存artifact 1件へ内容差分を加えて通常C02経路で再更新し、receiptが`operation=updated`、node ID・artifact kind・正規保存pathが更新前後で不変であることを実測する。5件を1回ずつ追加しただけではFAIL。
- C14契約外のfeatureを作らない。
- goal-seek 3点セットが時系列どおり作られる。

終了時は、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/run-dev-graph-node/live-trial/20260724T205545Z-pj6-node-r2/out/status.json`だけをout/へWriteしてください。内容は`{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}`です。その後「DONE: <status>」と1行だけ報告してください。

- 人間へ質問せず最後まで自走すること。
- skillの手順を省略・置換しないこと。
- out/にはstatus.json以外を書かないこと。
