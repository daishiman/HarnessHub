# タスク: dev-graph:run-dev-graph-requirements の実走 (scenario C04-OUT1-positive-ready-handoff)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/requirements-wt1` にある dev-graph 初期化済みの独立 Git repository です。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/requirements-wt1 --feature-id F-LIVE-001 (package は fixture 内 system-plan/F-LIVE-001/ を skill が解決する)"})

**被験 skill の実行は必ず上記 Skill ツール呼出しで行うこと (最初の実行アクションにする)。** `plugins/dev-graph/scripts/` 配下の script (run-dev-graph-requirements が内部で使う `*-graph.py` 等) を Bash から直接実行して skill 本体を代替してはならない。受け入れ検証は transcript 上の Skill 起動を機械判定しており、script 直叩きは成果物が出ても launch=FAIL となる。goal-seek 配線 (下記) の書き出しに限り Write/Bash を使ってよいが、skill 本体の処理は Skill 呼出しに委ねること。

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-requirements` は `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/live-trial-fixtures/requirements-wt1/eval-log/` へ 3 点セット (`run-dev-graph-requirements-goal-spec.json` / `run-dev-graph-requirements-progress.json` / `run-dev-graph-requirements-intermediate.jsonl`、intermediate は必須 6 キー) をすべて書き出してください。

`intermediate.jsonl` は実行途中の証拠です。次を厳守してください:

1. skill 実行前に SKILL.md の original_goal を goal-spec へ書き、その同じ文字列から UTF-8 SHA-256 を計算する。
2. skill 実行前に、計算済みの正しい hash を持つ最初の intermediate 行を新規作成する。
3. skill 実行と検証後に、結果を持つ2行目だけを append（末尾追加）する。
4. 2行を後からまとめて書かない。既存行の Edit / Update / 全体上書きはしない。hash 検証に失敗した場合は書き換えず FAIL とする。

## 成功条件 (すべて実測値で示すこと)

- a capability-build task-graph handoff is emitted for the exact-13 package
- the handoff remains bound to the feature and source digest
- the requirements skill generates no implementation source file
- goal-seek 3 点セットがすべて書き出され、intermediate は実行時系列どおりの append-only である。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260723-130657-wt-1/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260724T093756Z-requirements-wt1r3/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C04-OUT1-positive-ready-handoff"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ)。
