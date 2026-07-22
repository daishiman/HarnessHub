# タスク: dev-graph:run-dev-graph-init の実走 (C01-OUT1 冪等初期化)

対象 repository は dev-graph 未初期化の git repository です。

**最重要の制約: init の実行は必ず下記の `Skill(...)` リテラル呼び出しで行うこと。`resolve-repo-context.py` や `validate-graph-schema.py` などの個別 script を Bash で直接叩いて init を代替してはならない (検証のための読み取り実行は可)。2 回目も必ず `Skill(...)` を呼ぶこと。**

1 回目:

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T224254-init"})

1 回目の完了後、対象 repository の全ファイル一覧と各ファイルの sha256 を採取してください (.git は除外)。また skill が出力した init receipt の内容とパスを記録してください。

2 回目 (同じ引数で、**再び Skill リテラル呼び出し**):

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T224254-init"})

そのうえで次の 6 点を確認してください:

1. issues / tasks / specs / architecture / features / docs の 6 content root が生成されていること。
2. routing policy と graph store が生成され、C11 (validate-graph-schema.py) が exit 0 であること。
3. **init が生成した `.dev-graph/config.json` が `plugins/dev-graph/schemas/repo-config.schema.json` に適合すること** (自分で jsonschema をかけて確認する)。適合しない場合はその事実を FAIL として記録すること。
4. **2 回目も skill 経由で実行されたこと**。そのうえでファイル一覧と各 sha256 が 1 回目完了時点と一致すること (= 冪等)。差分があれば具体的に記録すること。
5. SKILL.md が要求する init receipt (repository_id / created / preserved / migration_preview / hook_source / schema_result) が実際に生成されていること。生成されない場合はその事実を FAIL として記録すること。
6. 対象 repository の外側にあるファイルを一切変更していないこと。

ゲートや手順が失敗したら、回避せずその事実をそのまま結果に記録すること。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-init/live-trial/20260721T224254-r17/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "init-positive-idempotence", "checks": {"six_content_roots": true|false, "graph_store_created": true|false, "c11_exit0": true|false, "config_schema_valid": true|false, "second_call_via_skill": true|false, "second_init_idempotent": true|false, "init_receipt_present": true|false, "no_outside_write": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略・代替実行をしないこと。
- out/ には status.json 以外を書かないこと。
- 対象 repository (20260721T224254-init) 以外のファイルを変更しないこと。
