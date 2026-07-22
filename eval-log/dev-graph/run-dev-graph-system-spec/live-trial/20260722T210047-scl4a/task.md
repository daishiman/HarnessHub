# タスク: dev-graph:run-dev-graph-system-spec の spec lineage 取込 (scenario C19-OUT1-positive-system-spec-lineage)

被験 fixture は `/private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-093537-wt-11/09591889-1101-451c-9ba7-70a87942c6cf/scratchpad/ltfix-scl` にある dev-graph 初期化済みの独立 Git repository です。`system-spec/requirements-brief.md` を持ち、宣言された system-spec-harness plugin が required 4 entry point・confirmed output・citations・evaluator PASS を提供します。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-093537-wt-11/09591889-1101-451c-9ba7-70a87942c6cf/scratchpad/ltfix-scl。SKILL.md の手順どおり system-spec-harness の version/entry point を preflight し、正規フロー (elicit/doc-fetch/compile/completeness-evaluator) を起動して確定成果物を得て、source lineage を保ったまま C02 経由で specification/architecture ノードへ取り込む。dev-graph 内に同等のヒアリング/compile ロジックを複製しない"})

## 自走の徹底 (前回ここで止まった)

この skill は system-spec-harness の 4 skill を入れ子起動する長時間タスクです。**R2 delegation (elicit/doc-fetch/compile/evaluator) が完了したら、そのまま連続して R3 (C02 経由の import) へ進むこと。** 各フェーズ境界で「次は R3 import に進む」等のテキストを書いただけで手を止めてはならない。宣言したら即座に実行に移し、out/status.json を書くまで一度も人間の入力を待たずに走り切ること。

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-system-spec` は `goal_seek` を宣言します。SKILL.md の ## ゴールシーク実行 に従い `$DEV_GRAPH_ROOT/eval-log/`（= `/private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-093537-wt-11/09591889-1101-451c-9ba7-70a87942c6cf/scratchpad/ltfix-scl/eval-log/`）へ **3 点セット** (`run-dev-graph-system-spec-goal-spec.json` / `-progress.json` / `-intermediate.jsonl`、intermediate は 6 キー) を全て書き出すこと。

## 成功条件 (すべて実測値で示すこと)

- 宣言された system-spec-harness plugin がロードされ、その正規フローが完了する。
- 取り込んだ specification と architecture が source lineage と evaluator evidence を保持する。
- 登録が C02 経由のみで行われ、dev-graph 内に elicitation/compile ロジックの複製が現れない。
- goal-seek 3 点セットが全て書き出されている。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-093537-wt-11/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260722T210047-scl4a/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "C19-OUT1-positive-system-spec-lineage"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。フェーズ境界でも手を止めず、宣言したら即実行する。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
