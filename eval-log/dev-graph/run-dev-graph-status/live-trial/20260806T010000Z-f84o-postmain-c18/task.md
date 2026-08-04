# タスク: dev-graph:run-dev-graph-status の実走 (scenario C18-OUT1-positive-read-only-status)

この run は scenario `C18-OUT1-positive-read-only-status` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-status/live-trial/20260806T010000Z-f84o-postmain-c18/fixture-repo`

FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind status`
が生成した正本形状。task 2 件が同一 lifecycle state で 1 本の forward dependency を持つ)。
作り直さず、`.dev-graph/config.json` や `.dev-graph/state/graph.json` も書き換えないでください。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## required_observations (scenario 正本の逐語転記)

1. the reported status, closed_at and dependency edges equal the values stored in the graph store, compared field by field rather than by summary count
2. the dependent task is reported as blocked by its predecessor and the predecessor as ready
3. the run leaves graph, config, content and GitHub state unchanged

## 工程 1: 実走前の状態記録

skill を呼ぶ前に、`.dev-graph/state/graph.json` と `.dev-graph/config.json` の SHA-256、
および content root 配下のファイル一覧を記録してください (observation 3 の前後比較に使います)。

## 工程 2: 実走

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-status", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-status/live-trial/20260806T010000Z-f84o-postmain-c18/fixture-repo"})

## 工程 3: 検証

1. skill が報告した各ノードの `status` / `closed_at` / 依存辺 (`depends_on` と `dependents`) を、
   graph store に格納された値と **フィールド単位で** 突き合わせてください。件数の一致だけで済ませないこと。
2. 後続タスク (`LT-TASK-002`) が先行タスク (`LT-TASK-001`) によって blocked であり、
   先行タスクが ready であることを、報告された依存辺と各ノードの `status` から導出して確認してください。
3. 工程 1 で記録した SHA-256 とファイル一覧が実走後も変わっていないこと、
   GitHub 状態への書込みが 0 件であることを確認してください。

## 工程 4: goal_seek 配線 (必須)

`run-dev-graph-status` は `goal_seek` を宣言します。SKILL.md の該当節に従い、
FIXTURE の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-status-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-status-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-status-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は正本文の UTF-8 SHA-256 実値にしてください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-status/live-trial/20260806T010000Z-f84o-postmain-c18/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C18-OUT1-positive-read-only-status"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- この scenario は read-only の受け入れである。FIXTURE の graph / config / content を書き換えないこと。
