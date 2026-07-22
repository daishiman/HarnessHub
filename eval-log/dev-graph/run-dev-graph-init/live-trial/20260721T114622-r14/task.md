# タスク: dev-graph:run-dev-graph-init の実走 (C01-OUT1 冪等初期化)

対象 repository (dev-graph 未初期化の git repository) に対して、以下を **2 回** 実行してください。

1 回目:

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/r14-init"})

1 回目の完了後、対象 repository の全ファイル一覧と各ファイルの sha256 を採取してください。

2 回目 (同じ引数で再実行):

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/r14-init"})

そのうえで次の 4 点を確認してください:

1. issues / tasks / specs / architecture / features / docs の 6 content root が生成されていること。
2. routing policy と graph store (`.dev-graph/config.json` と `.dev-graph/state/graph.json`) が生成され、C11 (validate-graph-schema.py) が exit 0 であること。
3. 2 回目の init 実行後、対象 repository の構造 (ファイル一覧) と各ファイルの sha256 が 1 回目完了時点と一致すること = 冪等であること。差分があればその内容を具体的に記録すること。
4. 対象 repository の外側にあるファイルを一切変更していないこと。

skill の正規手順を迂回して自前で mkdir や JSON 生成を行わないこと。ゲートが失敗したらその事実をそのまま結果に記録すること。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-init/live-trial/20260721T114622-r14/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "init-positive-idempotence", "checks": {"six_content_roots": true|false, "graph_store_created": true|false, "c11_exit0": true|false, "second_init_idempotent": true|false, "no_outside_write": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 対象 repository (r14-init) 以外のファイルを変更しないこと。
