# タスク: dev-graph:run-dev-graph-render の feature 進捗レンダリング (scenario C05-OUT1-positive-feature-progress)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/render` にある dev-graph 初期化済みの独立 Git repository です。feature `LT-FEATURE-001` が exact-13 (P01..P13) の子 task を持ち、うち一部だけが done/closed の**部分完了**状態です。registration receipt が `system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json` にあり applied_count/expected_count を持ちます。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/render --graph /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/render/.dev-graph/state/graph.json --registration-receipt /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/live-trial-fixtures/render/system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json。SKILL.md の手順どおり render-graph-html.py で外部依存ゼロの単一 HTML を生成する"})

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-render` は `goal_seek` を宣言します。SKILL.md の ## ゴールシーク実行 に従い `$DEV_GRAPH_ROOT/eval-log/`（= `eval-log/dev-graph/live-trial-fixtures/render/eval-log/`）へ **3 点セット** (`run-dev-graph-render-goal-spec.json` / `run-dev-graph-render-progress.json` / `run-dev-graph-render-intermediate.jsonl`、intermediate は 6 キー) を全て書き出すこと。

## 成功条件 (すべて実測値で示すこと)

- 生成 HTML/CSS が外部 script/link 参照ゼロ (ゼロ依存) で SVG グラフを表示する。
- 進捗の分母 Y が registration receipt の applied_count / expected_count と一致する。
- 進捗の分子 X が status=done/closed の子 task 数と一致する (graph store から独立に再計算した値。receipt から読み戻さない)。X と Y は部分完了のため一致しない。
- 表示対象が receipt の source_digest に対応する。
- goal-seek 3 点セットが全て書き出されている。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-wt-7r2/eval-log/dev-graph/run-dev-graph-render/live-trial/20260722T095731-r19/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "C05-OUT1-positive-feature-progress"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
