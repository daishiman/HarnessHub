# タスク: dev-graph:run-dev-graph-status の実走 (C18-OUT1 positive read-only)

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-status", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/r13-status --id LT-TASK-002"})

skill が返した検索結果について、次の 4 点を確認してください:

1. `status` / `closed_at` / `depends_on` が fixture の graph 実値 (`.dev-graph/state/graph.json` の LT-TASK-002) と一致すること。
2. C11 (validate-graph-schema.py) が exit 0 であること。
3. 実行前後で graph と config と content の authority digest が不変であること (read-only)。
4. GitHub / Beads への write が 0 件であること。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-status/live-trial/20260721T102834-r13/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "status-positive-read-only", "checks": {"values_match": true|false, "c11_exit0": true|false, "digest_unchanged": true|false, "no_tracker_write": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- fixture ディレクトリ以外のファイルを変更しないこと。
