# タスク: dev-graph:run-dev-graph-init fresh live-trial r2

scenario `C01-OUT1-positive-idempotence-r17` を、独立 fixture
`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-init-r2`
だけで検証する。途中で質問せず自走し、skill の手順を省略しない。

## goal-seek 証拠の絶対パス契約

Skill 実行前に fixture の `eval-log/` へ次の完全なファイル名で 3 点を作る。

- `run-dev-graph-init-goal-spec.json`
- `run-dev-graph-init-progress.json`
- `run-dev-graph-init-intermediate.jsonl`

intermediate の名前を `init-intermediate.jsonl` などへ短縮してはならない。必ず
`run-dev-graph-init-intermediate.jsonl` とする。1 行目を Skill 実行前に作り、検証後の
2 行目だけを append する。2 行を後からまとめて書かず、各行は original_goal/hash と
必須 6 key を持つ。

## 1 回目

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-init-r2 --hook-source plugin"})

## between-pass と 2 回目

1. scaffold された canonical template 1 件を Edit し、識別文字列と SHA-256 を記録する。
2. C02 `upsert-node.py` の正規 writer で substantive body を持つ node 1 件を登録する。
3. 同じ outer session から次を再度呼ぶ。存在確認で代替しない。

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-init-r2 --hook-source plugin"})

required observations を同数・同順で実測し、evidence path を残す。

1. the first pass creates the six content roots, the routing policy and the graph store
2. the second pass re-invokes the skill and reports zero planned changes
3. the template edited between the passes still holds its edited bytes after the second pass, proving non-overwrite by running init rather than by inspecting the file alone
4. the plugin hook source is resolved and its receipt or rejection diagnosis is recorded
5. config stores no absolute path and no token or node id
6. C11 passes against a graph that contains at least one node

HarnessHub 本体を変更せず、`out/` には最後の status 1 件だけを書く。全工程後、
`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-init/live-trial/20260802T034300Z-wt32-init-r2/out/status.json`
へ `{"status":"PASS|FAIL|ERROR","scenario":"C01-OUT1-positive-idempotence-r17"}` を Write し、
`DONE: <status>` と 1 行だけ報告する。
