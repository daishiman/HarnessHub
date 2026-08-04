# タスク: dev-graph:run-dev-graph-init の実走 (scenario C01-OUT1-positive-idempotence-r17)

この run は scenario `C01-OUT1-positive-idempotence-r17` の充足を確認します。

- fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260806T011000Z-f84o-postmain-c01-r2/fixture-repo`
- C02 seed: `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260806T011000Z-f84o-postmain-c01-r2/seed-node.json`

fixture は git 初期化済み・dev-graph 未初期化です。作り直さないでください。seed は C02 の決定論入力であり、graph の代替ではありません。

この task.md を読んだ outer session 自身が、以下を**1つの assistant turn のまま**最後まで実行します。
Claude Code の `Skill` は現在の turn へ手順を読み込む tool call です。各 Skill の作業後も final text を返さず、必ず次工程へ復帰してください。2回目の Skill summary は task 完了ではありません。`out/status.json` を Write するまで turn を終えてはいけません。

## required_observations（scenario 正本の逐語転記）

1. the first pass creates the six content roots, the routing policy and the graph store
2. the second pass re-invokes the skill and reports zero planned changes
3. the template edited between the passes still holds its edited bytes after the second pass, proving non-overwrite by running init rather than by inspecting the file alone
4. the plugin hook source is resolved and its receipt or rejection diagnosis is recorded
5. config stores no absolute path and no token or node id
6. C11 passes against a graph that contains at least one node

## 工程1: goal_seek 開始記録

Skill 前に fixture の `eval-log/` へ次の3ファイルを作成してください。

`run-dev-graph-init-goal-spec.json` は次の完全な JSON とします。

```json
{"goal_id":"C01-OUT1-positive-idempotence-r17","original_goal":"Verify positive idempotence of dev-graph init: first pass creates 6 content roots, routing policy, and graph store; second pass reports zero planned changes; user template edits are preserved; plugin hook source is resolved; config contains no absolute paths or tokens; C11 validates against a non-empty graph.","original_goal_hash":"e3e5558ca45a2922c9e635ef5d789a765f7c12d9ed51d3cd031f67041778dde4","skill":"run-dev-graph-init","scenario":"C01-OUT1-positive-idempotence-r17"}
```

`run-dev-graph-init-progress.json` は scenario、status=`running`、current_step=`pass-1` を持たせます。

`run-dev-graph-init-intermediate.jsonl` の1行目は次の完全な JSON とします。

```json
{"original_goal":"Verify positive idempotence of dev-graph init: first pass creates 6 content roots, routing policy, and graph store; second pass reports zero planned changes; user template edits are preserved; plugin hook source is resolved; config contains no absolute paths or tokens; C11 validates against a non-empty graph.","original_goal_hash":"e3e5558ca45a2922c9e635ef5d789a765f7c12d9ed51d3cd031f67041778dde4","current_goal_snapshot":"Pre-execution: about to invoke first pass of run-dev-graph-init on fixture repo","delta_from_original":"none","merged_directive_for_next":"Execute first pass, then between-pass mutations, then second pass, then verify all 6 required observations","drift_signal":"none"}
```

## 工程2: 1回目の実走

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260806T011000Z-f84o-postmain-c01-r2/fixture-repo --hook-source plugin"})

## 工程3: between-pass 変更

1. scaffold 済み canonical template を1件だけ Editし、識別文字列を加え、直後の SHA-256 を記録します。
2. seed-node.json を fixture の `.dev-graph/tmp/node-input.json` へコピーし、C02 `upsert-node.py --input <そのpath>` の正規 writer で node を1件登録します。graph JSON の手書きは禁止です。

## 工程4: 2回目の実走

内部 script の手動再現で代替せず、次を literal tool call として実行します。

**ここは run 全体の終点ではありません。Claude Code の Skill tool_result が返った同じ
assistant turn の中で、直ちに工程5へ進んでください。あなた自身が outer session であり、
「outer session へ戻る」と報告して prompt へ戻る相手は存在しません。Skill の summary を
final answer にして `❯` へ戻った時点で、成果が正しくても本 trial は FAIL です。**

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260806T011000Z-f84o-postmain-c01-r2/fixture-repo --hook-source plugin"})

## 工程5: 検証と完了

2回目の Skill の tool_result が返った直後、最初の次アクションとして Bash/Read を使って
planned changes 0、template SHA 不変、plugin hook source、config の絶対 path/token/GitHub node ID 0、node count 1以上、C11 exit 0を実測します。途中 summary や完了報告を挟んではいけません。

progress を complete へ更新し、intermediate へ同じ `original_goal` と `original_goal_hash`、必須6キーを持つ2行目だけを appendします。次の validator を実行して exit 0を確認してください。

```bash
python3 /Users/dm/orca/workspaces/HarnessHub/wt-29-2/plugins/harness-creator/skills/run-skill-live-trial/scripts/validate-goal-seek-evidence.py --skill-dir /Users/dm/orca/workspaces/HarnessHub/wt-29-2/plugins/dev-graph/skills/run-dev-graph-init --eval-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260806T011000Z-f84o-postmain-c01-r2/fixture-repo/eval-log
```

全検証後、次の絶対 path へ完了マーカーを1ファイルだけ Writeします。

`/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260806T011000Z-f84o-postmain-c01-r2/out/status.json`

```json
{"status":"PASS|FAIL|ERROR","scenario":"C01-OUT1-positive-idempotence-r17"}
```

marker の後だけ「DONE: <status>」と1行で報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は fixture だけ。HarnessHub 本体のファイルを変更しないこと。
