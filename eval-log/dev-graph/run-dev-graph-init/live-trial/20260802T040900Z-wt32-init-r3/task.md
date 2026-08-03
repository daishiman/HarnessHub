# タスク: dev-graph:run-dev-graph-init fresh live-trial r3

scenario `C01-OUT1-positive-idempotence-r17` を独立 fixture
`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-init-r3`
だけで検証する。途中で質問せず最後まで自走する。

## 絶対完了条件

transcript に `dev-graph:run-dev-graph-init` の **Skill tool_use が正確に 2 回**必要である。
2 回目を `build-repo-config.py` / `build-graph-store.py` などの direct Bash 呼出しで代替しては
ならない。2 回目の Skill 呼出しが無ければ、結果が no-op でも FAIL とする。

fixture の `eval-log/` には次の exact filename 3 点だけを goal-seek 正本名として使う。

- `run-dev-graph-init-goal-spec.json`
- `run-dev-graph-init-progress.json`
- `run-dev-graph-init-intermediate.jsonl`

短縮名は禁止。intermediate 1 行目を最初の Skill より前に作り、検証後の 2 行目だけ append
する。全行が original_goal/hash と必須 6 key を持つ。

## 工程 1: 1 回目の Skill tool_use

次のリテラルを Skill tool として呼ぶ。

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-init-r3 --hook-source plugin"})

1 回目が戻った後、canonical template 1 件を Edit して marker と SHA-256 を記録し、C02
`upsert-node.py` の正規 writer で substantive body を持つ node 1 件を登録する。

## 工程 2: 2 回目の Skill tool_use

between-pass 変更の直後に、同じ outer session から次のリテラルを **必ずもう一度 Skill tool
として呼ぶ**。direct scripts や存在確認で代替しない。

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-init-r3 --hook-source plugin"})

2 回目が戻った後でだけ検証コマンドを実行し、transcript に Skill tool_use が 2 回あることも
自分で確認する。required observations を同数・同順で証拠化する。

1. the first pass creates the six content roots, the routing policy and the graph store
2. the second pass re-invokes the skill and reports zero planned changes
3. the template edited between the passes still holds its edited bytes after the second pass, proving non-overwrite by running init rather than by inspecting the file alone
4. the plugin hook source is resolved and its receipt or rejection diagnosis is recorded
5. config stores no absolute path and no token or node id
6. C11 passes against a graph that contains at least one node

HarnessHub 本体を変更せず、`out/` には最後の status 1 件だけを書く。全条件後、
`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-init/live-trial/20260802T040900Z-wt32-init-r3/out/status.json`
へ `{"status":"PASS|FAIL|ERROR","scenario":"C01-OUT1-positive-idempotence-r17"}` を Write し、
`DONE: <status>` と 1 行だけ報告する。
