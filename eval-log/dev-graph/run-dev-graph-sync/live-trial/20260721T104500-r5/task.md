# タスク: dev-graph:run-dev-graph-sync 二回収束の正経路実走

この作業ツリー内の `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-sync` に、tracker_binding=github の confirmed/pass/readiness-complete task と、1件の import・1件の export、安定した timestamps/IDs/aliases/snapshots を持つ決定論的な `github-adapter.json` を含む隔離 fixture repo を準備してください。外部 write は常に fixture adapter 内へ閉じ、同じ状態で以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-sync", args: "sync --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-sync --binding github --adapter-fixture /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-sync/github-adapter.json --repeat 2"})

1回目が期待する import/export を適用し、2回目の imports/exports changes がともに0、stable IDs/snapshots 不変、3-way base 保持であることを検証してください。remote fixture 以外の GitHub へ接続しないでください。scenario ID は `C03-OUT1-positive-second-sync-zero` です。

処理が終了（成功・失敗・中断のいずれでも）したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260721T104500-r5/out/status.json` に完了マーカーを1ファイルだけ Write する。内容は `{"status":"PASS|FAIL|ERROR","scenario":"sync-positive-two-pass-convergence"}` とする。
2. `DONE: <status>` と1行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。中間生成物は fixture repo に置くこと。
