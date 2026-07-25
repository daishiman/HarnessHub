# タスク: dev-graph:run-dev-graph-node の実走 (C02-OUT1-positive-mixed-artifacts)

## 最初のアクション

このtaskを読んだ直後の最初のtool callは、必ず次のSkill呼出しです。これより前にRead以外のtoolを使うとFAILです。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/live-trial-fixtures/node-wt10-pj6-r3 --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/live-trial-fixtures/node-wt10-pj6-r3/mixed-artifacts.json"})

Skillロード後はSKILL.mdへ忠実に従い、最後まで自走してください。被験skillを別手順へ置き換えてはいけません。

## 入力データ保全の必須契約

`mixed-artifacts.json`からC02入力JSONを作る際は、必ずWrite toolでfixture直下の`inputs/`へ書いてください。`.dev-graph/`へ直接Writeしてはいけません。本文をshell文字列、Python `-c`、heredoc、コマンド置換へ埋め込んではいけません。バッククォートを含む本文がshell展開されるためです。

登録後の仕様書には、元入力の次の5リテラルがすべてそのまま存在しなければFAILです。

- `GET /api/v1/users`
- `line_items`
- `Authorization: Bearer`
- `DELETE /api/v2/sessions/bulk`
- `GET /api/v1/users/search`

## goal-seek証跡

Skillロード後、fixtureへ最初の変更を加える前にoriginal goalとhashを確定し、fixtureの`eval-log/`へgoal-specとintermediate 1行目を書いてください。処理後に2行目だけをappendし、progressを完成させます。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

## 成功条件

- 5種類（issue/task/specification/architecture/document）を正規pathへ登録する。
- 5件追加後に同じgraph_node_idの1件を内容差分付きで再更新し、`operation=updated`、ID・kind・path不変を実測する。
- featureを作らない。
- 仕様本文の上記5リテラルを保全する。
- graph schemaとgoal-seek機械検査がPASSする。

終了時は`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/run-dev-graph-node/live-trial/20260724T211014Z-pj6-node-r3/out/status.json`だけをout/へWriteしてください。内容は`{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}`です。その後「DONE: <status>」と1行だけ報告してください。

- 人間へ質問しないこと。
- skill手順を省略しないこと。
- out/へstatus.json以外を書かないこと。
