# タスク: dev-graph:run-dev-graph-node fresh live-trial r2

scenario `C02-OUT1-positive-mixed-artifacts` を独立 fixture
`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-node-r2`
だけで検証する。途中で質問せず自走し、skill の手順を省略しない。

## goal-seek 証拠の絶対ファイル名

Skill 実行前に fixture の `eval-log/` へ次の完全な名前で 3 点を作る。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

generic な `goal-spec.json` / `progress.json` / `intermediate.jsonl` に短縮してはならない。
intermediate 初回行を Skill 実行前に作り、各周回は append だけで増やす。original_goal/hash と
必須 6 key を全行に持たせる。progress は V1〜V4 を pending で始める。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-node-r2 --input /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-node-r2/mixed-artifacts.json"})

## 検証順序

1. V1: 5 artifact の登録・正規配置を実測し、V1 だけ completed へ Edit する。
2. V2: 入力 JSON から読んだ original body の byte 保持と API 文字列を実測し、V2 だけ completed へ Edit する。
3. V3: issue と architecture の update JSON に `graph_node_id`、`patch`、完全な `body` を持たせ、Read 後に Skill へ渡して連続更新する。V3 だけ completed へ Edit する。
4. V4: C14 macro contract 由来でない feature 登録を試し、revision と file 数を変えず fail-closed になることを確認する。V4 completed、final_status PASS とする。

複数 V を同じ Edit でまとめない。本文を shell command、`python3 -c`、heredoc へ埋め込まず、
更新時に body の暗黙保持へ頼らない。未達 responsibility は少なくとも 1 回 Agent tool で
分離 context に fork して検証する。

required observations を同数・同順で実測し、evidence path を残す。

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract

HarnessHub 本体を変更せず、`out/` には最後の status 1 件だけを書く。全工程後、
`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T035000Z-wt32-node-r2/out/status.json`
へ `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}` を Write し、
`DONE: <status>` と 1 行だけ報告する。
