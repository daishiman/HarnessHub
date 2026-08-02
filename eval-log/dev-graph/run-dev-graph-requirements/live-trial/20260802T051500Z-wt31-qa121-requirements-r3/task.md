# タスク: dev-graph:run-dev-graph-requirements の最終再実走 (scenario C04-OUT1-positive-ready-handoff)

この run は scenario C04-OUT1-positive-ready-handoff の充足を確認するものです。
fixture は正本 builder の修正版から生成済みで、promotion receipt と feature 別 current pointer を
実走開始前から持つ。fixture の入力前提を作成・修復せず、そのまま consumer として検証すること。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-31/eval-log/dev-graph/live-trial-fixtures/wt31-qa121-requirements-r3 --feature-id F-LIVE-001 (package は fixture 内 system-plan/F-LIVE-001/ を skill が解決する)"})

必ずこの Skill ツール呼出しで実行し、内部 script の直実行で代替しないでください。

## 必須 gate

1. C11 は正規 validator で検証する。
2. source digest の `--registered` は、選択 feature `F-LIVE-001`、その `architecture_refs` の `LT-ARCH-001`、同じ `feature_package_id` の task 13 件を重複除去・ID 昇順にした **15 node 全件**を渡す。task 13 件だけなら FAIL とし、handoff を生成しない。
3. system plan は次の promotion 後 command で検証する。引数なしや `--staging` へ読み替えない。fixture の current pointer は入力であり、実走中に作成・更新しない。

```bash
python3 "$SYSTEM_DEV_PLANNER/scripts/validate-system-plan.py" \
  --repo-root "/Users/dm/orca/workspaces/HarnessHub/wt-31/eval-log/dev-graph/live-trial-fixtures/wt31-qa121-requirements-r3" \
  --feature-package "feature-package/F-LIVE-001"
```

## goal-seek 証跡

fixture の `eval-log/` に goal-spec、progress、intermediate.jsonl を作る。Skill 実行前に
original_goal と正しい SHA-256 を持つ intermediate 1行目を作り、検証後は結果を持つ行だけを
append する。既存行を上書きしない。

## 成功条件

- a capability-build task-graph handoff is emitted for the exact-13 package
- the handoff remains bound to the feature and source digest
- the requirements skill generates no implementation source file
- full 15-node lineage closure の digest gate が exit 0 である
- current pointer は baseline input のまま byte 不変である

処理が終了したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-31/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260802T051500Z-wt31-qa121-requirements-r3/out/status.json` に `{"status":"PASS|FAIL|ERROR","scenario":"C04-OUT1-positive-ready-handoff"}` を Write する。
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。

## required_observations（scenario 正本の逐語転記）

1. a capability-build task-graph handoff is emitted for the exact-13 package
2. the handoff remains bound to the feature and source digest
3. the requirements skill generates no implementation source file
