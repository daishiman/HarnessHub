# タスク: dev-graph:run-dev-graph-node の実走 (C02-OUT1 positive mixed-artifacts)

対象 repository は dev-graph 初期化済みの隔離 fixture です。その直下の `mixed-artifacts.json` に、まだ分類も採番もされていない 5 件の成果物素材 (issue / task / specification / architecture / document 相当) が 1 バッチで入っています。

**最重要の制約: 投入は必ず下記の `Skill(...)` リテラル呼び出しで行うこと。`upsert-node.py` などの個別 script を Bash で直接叩いて代替してはならない (検証のための読み取り実行は可)。2 回目も必ず `Skill(...)` を呼ぶこと。**

1 回目 (新規投入):

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T230243-node --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T230243-node/mixed-artifacts.json"})

1 回目の完了後、生成された各 node の `graph_node_id` / `artifact_kind` / 格納 path / frontmatter を採取してください。

2 回目 (同じ 5 件のタイトルとタグを変更して更新。**再び Skill リテラル呼び出し**):

Skill({skill: "dev-graph:run-dev-graph-node", args: "update --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T230243-node --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T230243-node/mixed-artifacts.json"})

そのうえで次の 5 点を確認してください:

1. 5 件すべてが kind ごとの正規 path (issues/ tasks/ specs/ architecture/ docs/) へ振り分けられていること。
2. 2 回目の更新後も、同じ 5 件の `graph_node_id` と格納 path が 1 回目と同一であること (ID 重複ゼロ)。
3. frontmatter の `artifact_kind` と実際の格納 path が一致していること。
4. feature が C14 のマクロ feature 契約の外で作られていないこと (C02 経由で feature が生成されていないこと)。
5. C11 (validate-graph-schema.py) が exit 0 であること。

ゲートや手順が失敗したら、回避せずその事実をそのまま結果に記録すること。fixture の外側にあるファイルを一切変更しないこと。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-node/live-trial/20260721T230243-r5/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "node-mixed-artifacts-positive", "checks": {"five_canonical_paths": true|false, "stable_ids_on_update": true|false, "kind_path_agree": true|false, "no_feature_outside_c14": true|false, "c11_exit0": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略・代替実行をしないこと。
- out/ には status.json 以外を書かないこと。
- 対象 fixture repository 以外のファイルを変更しないこと。
