# タスク: dev-graph:run-dev-graph-init の実走 (scenario C01-OUT1-positive-idempotence-r17)

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/live-trial-fixtures/wt28-init-final6` にある未初期化の独立 Git repository です。

## Skill 前の append-only 証跡

最初に fixture の `eval-log/` へ goal-spec と intermediate の 1 行目を Write します。original_goal は SKILL.md と完全一致させます。1 行目は作成時から `original_goal` / `original_goal_hash` / `current_goal_snapshot` / `delta_from_original` / `merged_directive_for_next` / `drift_signal` の 6 キーを持たせます。誤形式を後から書き直してはいけません。結果の 2 行目だけを最後に `>>` で append します。

## 被験 Skill の起動

次を Skill ツールとして呼び出します。この Skill 呼び出しの完了条件は pass 1 だけではなく、引数に記載した 2 pass 全体です。

```
Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/live-trial-fixtures/wt28-init-final6 --hook-source plugin。C01-OUT1-positive-idempotence-r17 の2-pass全体をこのSkill呼び出しの責務として完了する。pass 1で6 content root・routing policy・graph store・plugin hook receiptを作成して検証した後もturnを終了しない。canonical templateを1件EditしてSHA-256を記録し、substantiveなissue本文と必須frontmatterを持つnodeをC02 upsert-node.pyで1件登録する。続けて同じouter sessionから Skill({skill: 'dev-graph:run-dev-graph-init', args: '--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/live-trial-fixtures/wt28-init-final6 --hook-source plugin。pass 2としてplanned changes 0と非上書きを検証し、goal-seek 2行目だけをappendしてprogressを完成し、/Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/run-dev-graph-init/live-trial/20260729T090420Z-wt28-c11-init-final6/out/status.json をWriteしてDONE: PASSと報告する') をツール呼出しし、scriptの手書き再実行で代替しない。pass 2後にtemplate bytes不変、configの絶対path/token/node id 0、C11がnode 1件以上でPASSを検証する。intermediate 1行目のEdit/Update/全体上書きは禁止。"})
```

1 回目の Skill が pass 1 だけの報告を返しても終了せず、同じ turn の中で上記引数の残りを続行します。

## 完了マーカー

全検証後にだけ `/Users/dm/orca/workspaces/HarnessHub/wt-28/eval-log/dev-graph/run-dev-graph-init/live-trial/20260729T090420Z-wt28-c11-init-final6/out/status.json` を Write します。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C01-OUT1-positive-idempotence-r17"}
```

その後、「DONE: <status>」と 1 行だけ報告します。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- HarnessHub 本体を変更せず、fixture 内だけを書き換えること。
- intermediate の 1 行目を後から書き直した場合は PASS にせず FAIL とすること。

## required_observations（scenario 正本の逐語転記）

1. the first pass creates the six content roots, the routing policy and the graph store
2. the second pass re-invokes the skill and reports zero planned changes
3. the template edited between the passes still holds its edited bytes after the second pass, proving non-overwrite by running init rather than by inspecting the file alone
4. the plugin hook source is resolved and its receipt or rejection diagnosis is recorded
5. config stores no absolute path and no token or node id
6. C11 passes against a graph that contains at least one node
