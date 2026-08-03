# タスク: dev-graph:run-dev-graph-node fresh live-trial

scenario `C02-OUT1-positive-mixed-artifacts` を、次の独立 fixture だけで検証する。

`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-node-r1`

途中で人間に質問せず最後まで自走し、skill の手順に忠実に従い、人手の追加判断・省略をしない。
管理対象 graph/config/content root を手で直接編集せず、必ず Skill を呼ぶ。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-node-r1 --input /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-node-r1/mixed-artifacts.json"})

## 検証順序

1. progress に V1〜V4 を pending で作る。
2. V1: 5 artifact の登録・正規配置を実測し、V1 だけ completed へ Edit する。
3. V2: 入力 JSON から読んだ original body の byte 保持と API 文字列を実測し、V2 だけ completed へ Edit する。
4. V3: issue と architecture の update JSON を Write し、各 JSON に `graph_node_id`、`patch`、完全な `body` を持たせる。Read 後に Skill へ渡して連続更新し、V3 だけ completed へ Edit する。
5. V4: C14 macro contract 由来でない feature の直接登録を試し、revision と `features/` 件数を変えず fail-closed になることを確認する。V4 を completed、final_status を PASS にする。

V1/V2/V3/V4 を同じ Edit でまとめて completed にしない。本文を shell command、
`python3 -c`、heredoc へ埋め込まない。更新時に body の暗黙保持へ頼らない。

fixture の `eval-log/` に goal-spec、progress、intermediate JSONL を作る。intermediate は
Skill 実行前の初回行と各周回後の append 行を持ち、original_goal/hash と必須 6 key を満たす。
未達 responsibility は少なくとも 1 回 Agent tool で分離 context に fork して検証する。

required observations は次を同数・同順で実測し、workdir 内の evidence path を残す。

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract

HarnessHub 本体を変更せず、fixture の外へ成果物を書かない。`out/` に書くのは最後の
`status.json` 1 件だけとする。全工程後、次へ PASS/FAIL/ERROR を Write する。

`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T032100Z-wt32-node-r1/out/status.json`

内容: `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}`

最後に `DONE: <status>` と 1 行だけ報告する。
