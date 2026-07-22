# タスク: dev-graph:run-dev-graph-decompose のマクロ分解 dry-run (scenario C14-OUT1-positive-macro-decomposition)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/decompose` にある dev-graph 初期化済みの独立 Git repository です。graph は空で、期待結果 (feature/architecture) は意図的に置いていません。生成される node はすべて skill の出力に帰属します。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "ユーザー通知基盤を作りたい。メール通知・アプリ内通知・通知設定管理の 3 つの機能を含み、通知設定は通知送信の前提になる --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/decompose --binding none --dry-run。SKILL.md の手順どおり want を feature 候補 + architecture context + 機能間 depends_on へマクロ分解し、循環と実装粒度 task 混入を独立 auditor で拒否する。1 機能=13 タスクへの細分解は system-dev-planner の責務なのでここでは行わない"})

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-decompose` は `goal_seek` を宣言します。SKILL.md の ## ゴールシーク実行 に従い `$DEV_GRAPH_ROOT/eval-log/`（= `eval-log/dev-graph/live-trial-fixtures/decompose/eval-log/`）へ **3 点セット** (`run-dev-graph-decompose-goal-spec.json` / `-progress.json` / `-intermediate.jsonl`、intermediate は 6 キー) を全て書き出すこと。

## 成功条件 (すべて実測値で示すこと)

- 生成された feature/architecture node が非循環 DAG で、機能間 depends_on が宣言粒度閾値内である。
- 評価前 draft feature はどの binding でも Issue 起票 0 件である。
- confirmed / evaluation-pass / readiness-complete へ昇格した feature だけが起票候補になる。
- dry-run が local / Beads / GitHub / Projects の write count 0 を報告し、preview graph は stdin 経路 (`--graph -`) で検証され管理対象 repo へ一時ファイルを作らない。
- goal-seek 3 点セットが全て書き出されている。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260722T171937-r24/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
