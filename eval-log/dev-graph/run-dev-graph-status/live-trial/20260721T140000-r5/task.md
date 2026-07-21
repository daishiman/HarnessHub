# R5: status current-closure read-only proof

fixture repo `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r5-status` に dev-graph の canonical graph/config を C02 契約に従って準備してください (graph.json への書込みは upsert-node.py 経由のみ。直接編集は禁止)。

次に `Skill({skill:"dev-graph:run-dev-graph-status", args:"--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r5-status"})` を実行してください。

canonical graph/config の bytes を実行前後で snapshot し、実際の status summary を出力したうえで、**hash が完全一致すること (read-only であること)** を証明してください。C11 は exit 0 であること。

実際に成功した場合のみ `{"status":"PASS","scenario":"status-current-closure-read-only"}` を、それ以外は `{"status":"FAIL",...}` を `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/run-dev-graph-status/live-trial/20260721T140000-r5/out/status.json` に Write してください。最後に `DONE: <status>` と1行だけ報告してください。

途中で人間に質問せず最後まで自走し、skill の手順を省略しないこと。out/ に中間成果物を書かないこと。
