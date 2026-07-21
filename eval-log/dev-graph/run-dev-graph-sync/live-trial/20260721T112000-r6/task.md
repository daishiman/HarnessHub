# タスク: dev-graph:run-dev-graph-sync 二回収束の正経路再実走

隔離 fixture repo `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r6-sync` は準備・schema 検証済みです。`.dev-graph/remote.json` を remote adapter として使う最初の dry-run は import 1件（title）・export 1件（Status）・write_count 0 を返すことが確認済みです。外部 GitHub や Beads へ接続せず、以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-sync", args: "sync --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r6-sync --binding github --adapter-fixture /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r6-sync/.dev-graph/remote.json --repeat 2"})

R3-sync responsibility は Agent fork に分離し、省略しないでください。実体の `plugins/dev-graph/scripts/sync-graph.py` を `--remote-state .dev-graph/remote.json --no-eval-log` 付きで、(1) apply、(2) 同じ入力の dry-run の順に実行し、初回 import/export が適用され、2回目の changes/imports/exports/pending_retry がすべて0、stable issue/project/item IDs 不変、last_synced_snapshot が現行 remote と一致することを確認してください。別の Agent fork に最終 graph・remote・両 receipt を読ませ、goal 適合を独立検証してください。scenario ID は `C03-OUT1-positive-second-sync-zero` です。

処理が終了（成功・失敗・中断のいずれでも）したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260721T112000-r6/out/status.json` に完了マーカーを1ファイルだけ Write する。内容は `{"status":"PASS|FAIL|ERROR","scenario":"sync-positive-two-pass-convergence"}` とする。
2. `DONE: <status>` と1行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。中間生成物は fixture repo の eval-log に置くこと。
