# タスク: dev-graph:run-dev-graph-decompose の実走 (scenario C14-OUT1-positive-macro-decomposition)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-203623-wt-8/eval-log/dev-graph/live-trial-fixtures/20260725-codex-decompose` にある dev-graph 初期化済みの独立 Git repository です。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-203623-wt-8/eval-log/dev-graph/live-trial-fixtures/20260725-codex-decompose --binding none --dry-run"})

被験 skill の実行は必ず上記 Skill ツール呼出しで行うこと。script の直接実行だけで skill 本体を代替してはならない。

## goal-seek 配線の必須履行

SKILL.md の `## ゴールシーク実行` に従い、fixture の `eval-log/` へ goal-spec / progress / intermediate の 3 点セットを書き出す。intermediate は必須 6 キーを持ち、実行前の行を先に作り、検証後の行だけを append する。後から 2 行をまとめて作らない。

## 成功条件 (すべて実測値で示すこと)

- produced feature + architecture node の DAG が循環なし・task 粒度混入なしで、feature 単位の粒度基準内に収まる。
- pre-evaluation draft feature は全 binding で issue publication 0 件となる。
- confirmed + evaluation-pass + readiness-complete の feature だけが publication candidate になる。
- dry-run の local / Beads / GitHub / Projects write count がすべて 0 で、preview graph は stdin 経路で検証し、managed repository 内に一時ファイルを作らない。
- goal-seek 3 点セットを揃え、intermediate を時系列どおり append-only にする。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-203623-wt-8/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260725T121428Z-decompose-wt8c/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario_id": "C14-OUT1-positive-macro-decomposition"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
