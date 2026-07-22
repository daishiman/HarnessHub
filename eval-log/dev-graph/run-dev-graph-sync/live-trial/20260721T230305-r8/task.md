# タスク: dev-graph:run-dev-graph-sync の実走 (C03-OUT1 positive second-sync-zero)

対象 repository は dev-graph 初期化済みの隔離 fixture です。その直下の `github-adapter.json` は、決定論的な GitHub adapter 再生入力 (import 1 件 / export 1 件、timestamp・ID・alias・snapshot が固定) です。

**最重要の制約: sync は必ず下記の `Skill(...)` リテラル呼び出しで行うこと。`sync-graph.py` や `gh-bridge.py` を Bash で直接叩いて代替してはならない (検証のための読み取り実行は可)。2 回目も必ず `Skill(...)` を呼ぶこと。実 GitHub API へは絶対に接続しないこと (adapter fixture によるオフライン再生のみ)。**

1 回目:

Skill({skill: "dev-graph:run-dev-graph-sync", args: "sync --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T230305-sync --binding github --adapter-fixture /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T230305-sync/github-adapter.json"})

1 回目の完了後、適用された import / export の件数と、対象 node の stable ID・snapshot を採取してください。

2 回目 (同じ引数で、**再び Skill リテラル呼び出し**):

Skill({skill: "dev-graph:run-dev-graph-sync", args: "sync --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T230305-sync --binding github --adapter-fixture /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T230305-sync/github-adapter.json"})

そのうえで次の 5 点を確認してください:

1. 1 回目で期待どおり import 1 件と export 1 件が適用されたこと。
2. **2 回目は imports changes=0 かつ exports changes=0 であること** (冪等)。
3. 2 回目の後も stable ID と snapshot が 1 回目完了時点と同一であること。
4. 実 GitHub API への接続が一度も発生していないこと (gh-bridge.py が起動していないこと)。
5. C11 (validate-graph-schema.py) が exit 0 であること。

ゲートや手順が失敗したら、回避せずその事実をそのまま結果に記録すること。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260721T230305-r8/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "sync-second-run-zero-changes", "checks": {"first_applies_import_export": true|false, "second_changes_zero": true|false, "stable_ids_snapshots_unchanged": true|false, "no_live_github_call": true|false, "c11_exit0": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略・代替実行をしないこと。
- out/ には status.json 以外を書かないこと。
- 対象 fixture repository 以外のファイルを変更しないこと。
