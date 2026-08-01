# タスク: dev-graph:run-dev-graph-requirements の再実走 (scenario C04-OUT1-positive-ready-handoff)

この run は scenario C04-OUT1-positive-ready-handoff の充足を確認するものです。

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/live-trial-fixtures/wt13-ci-requirements-r2-20260730` にある初期化済みの独立 Git repository です。正規 fixture の内容を書き換えてはいけません。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/live-trial-fixtures/wt13-ci-requirements-r2-20260730 --feature-id F-LIVE-001 (package は fixture 内 system-plan/F-LIVE-001/ を skill が解決する)"})

被験 skill は必ず上記 Skill ツール呼出しで起動し、内部 script の直実行で代替しないでください。

## source-digest gate の厳格契約

対象 feature `F-LIVE-001`、その `architecture_refs` が指す `LT-ARCH-001`、exact-13 の task 13 件を含む scope closure 全 15 node を `validate-source-digest.py --registered` へ一度に渡す。1 node でも mismatch、null、missing があれば handoff を出さず FAIL とする。失敗 node を除外して validator を再実行すること、検査対象を feature + task だけへ狭めることは禁止する。検証 report の `checked` は 15、`registered_mismatch` は空でなければならない。

## goal-seek 配線

fixture の `eval-log/` に `run-dev-graph-requirements-goal-spec.json`、`run-dev-graph-requirements-progress.json`、`run-dev-graph-requirements-intermediate.jsonl` を作る。skill 実行前に SKILL.md の original_goal とその SHA-256 を使った intermediate 1 行目を作り、実行・検証後に結果の 2 行目だけを append する。既存行の上書きは禁止です。

未達 responsibility の prompt を読み、`goal_seek.fork: subagent` 契約どおり `Agent` ツールで分離 context の独立検証を少なくとも 1 回実行する。トップレベルの自己検証で代替しない。

## 成功条件

- a capability-build task-graph handoff is emitted for the exact-13 package
- the handoff remains bound to the feature and source digest
- the requirements skill generates no implementation source file
- scope closure 全 15 node の source-digest gate が除外 0 件で PASS する
- goal-seek 3 点セットが揃い、intermediate が append-only、全 progress が PASS である

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-13/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260730T045000Z-wt13-ci-requirements-r2/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C04-OUT1-positive-ready-handoff"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。

## required_observations（scenario 正本の逐語転記）

1. a capability-build task-graph handoff is emitted for the exact-13 package
2. the handoff remains bound to the feature and source digest
3. the requirements skill generates no implementation source file
