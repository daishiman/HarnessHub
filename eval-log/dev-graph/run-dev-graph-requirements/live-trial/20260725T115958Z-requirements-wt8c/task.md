# タスク: dev-graph:run-dev-graph-requirements の実走

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-203623-wt-8/eval-log/dev-graph/live-trial-fixtures/20260725-codex-requirements --feature-id F-LIVE-001"})

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-203623-wt-8/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260725T115958Z-requirements-wt8c/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario_id": "C04-OUT1-positive-ready-handoff"}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ — out/ に中間 Write させると poll が DONE 偽陽性を起こす)。
