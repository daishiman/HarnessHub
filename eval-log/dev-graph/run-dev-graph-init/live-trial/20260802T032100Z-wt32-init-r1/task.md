# タスク: dev-graph:run-dev-graph-init fresh live-trial

scenario `C01-OUT1-positive-idempotence-r17` を、次の独立 fixture だけで検証する。

`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-init-r1`

途中で人間に質問せず最後まで自走し、skill の手順に忠実に従い、人手の追加判断・省略をしない。

## 1 回目

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-init-r1 --hook-source plugin"})

## 1 回目と 2 回目の間

1. scaffold された canonical template 1 件の本文を Edit し、識別文字列を追加して SHA-256 を記録する。
2. C02 `upsert-node.py` の正規 writer で substantive body を持つ node 1 件を登録する。
3. graph が node 1 件以上を持つことを確認する。

## 2 回目

手書きの存在確認で代替せず、同じ outer session から skill 自体を再度呼ぶ。

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-init-r1 --hook-source plugin"})

## goal-seek と証拠

fixture の `eval-log/` に goal-spec、progress、intermediate JSONL を作る。intermediate は
original_goal と hash を持つ初回行を Skill 実行前に作り、検証後の行だけを append する。
2 行を後からまとめて書かず、必須 6 key を満たす。

次の required observations を同数・同順で実測し、各結果と evidence path を残す。

1. the first pass creates the six content roots, the routing policy and the graph store
2. the second pass re-invokes the skill and reports zero planned changes
3. the template edited between the passes still holds its edited bytes after the second pass, proving non-overwrite by running init rather than by inspecting the file alone
4. the plugin hook source is resolved and its receipt or rejection diagnosis is recorded
5. config stores no absolute path and no token or node id
6. C11 passes against a graph that contains at least one node

HarnessHub 本体を変更せず、fixture の外へ成果物を書かない。`out/` に書くのは最後の
`status.json` 1 件だけとする。全工程後、次へ PASS/FAIL/ERROR を Write する。

`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-init/live-trial/20260802T032100Z-wt32-init-r1/out/status.json`

内容: `{"status":"PASS|FAIL|ERROR","scenario":"C01-OUT1-positive-idempotence-r17"}`

最後に `DONE: <status>` と 1 行だけ報告する。
