# タスク: dev-graph:run-dev-graph-requirements の ready handoff (scenario C04-OUT1-positive-ready-handoff)

被験 fixture は /private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-041945-wt-4/de1ca9e4-7ac6-43b6-ae03-3033bff4f758/scratchpad/ltfix3/requirements` にある dev-graph 初期化済みの独立 Git repository です。feature `F-LIVE-001` が confirmed / evaluation=pass / readiness=complete で、`system-plan/F-LIVE-001/` に P01..P13 exact-13 DAG の package (source digest と parent feature 一致) を持ちます。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-041945-wt-4/de1ca9e4-7ac6-43b6-ae03-3033bff4f758/scratchpad/ltfix3/requirements --feature-id F-LIVE-001。SKILL.md の手順どおり C11 照合・validate-source-digest.py (--registered に scope 内 node 全件)・validate-system-plan.py の四 gate を経て、全 PASS 時だけ capability-build/task-graph handoff を emit する。実装コードは生成しない"})

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-requirements` は frontmatter で `goal_seek` を宣言します。SKILL.md の ## ゴールシーク実行 に従い `$DEV_GRAPH_ROOT/eval-log/`（= `eval-log/dev-graph/live-trial-fixtures/requirements/eval-log/`）へ **3 点セットを全て書き出す**こと。1 つでも欠けると機械 gate で DEGRADED に降格される:

- `run-dev-graph-requirements-goal-spec.json`
- `run-dev-graph-requirements-progress.json`
- `run-dev-graph-requirements-intermediate.jsonl` (6 キー)

## 成功条件 (すべて実測値で示すこと)

- exact-13 package に対して capability-build task-graph handoff が emit された。
- handoff が feature と source digest に束縛されたままである。
- 本 skill が実装 source file を 1 件も生成していない。
- goal-seek 3 点セットが全て書き出されている。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-163434-wt-8/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260723T101037-x4osk/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "C04-OUT1-positive-ready-handoff"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
