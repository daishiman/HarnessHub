# タスク: dev-graph:run-dev-graph-render の実走 (render-feature-progress-positive)

> **【最初に読むこと・完了条件】このタスクは、最後に `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T231517-r6/out/status.json` を Write し、`DONE: <status>` と 1 行報告するまで完了ではありません。検証結果を散文で報告して終わってはいけません。作業内容にかかわらず、必ず最後にこの 2 つを実行してください。詳細は末尾の「処理が終了したら」節にあります。**


対象 repository は dev-graph 初期化済みの隔離 fixture です。exact-13 package を持つ feature `LT-FEATURE-001` が登録済みで、配下 13 task のうち一部が完了しています。登録 receipt は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T231517-render/system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json` にあります。

**最重要の制約: 描画は必ず `Skill(...)` リテラル呼び出しで行うこと。`render-graph-html.py` を Bash で直接叩いて代替してはならない (検証のための読み取り実行は可)。**

Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T231517-render"})

skill が生成した出力について、次の 5 点を確認してください。**skill の出力を鵜呑みにせず、あなた自身が fixture の graph と receipt を読んで突き合わせること。**

1. feature `LT-FEATURE-001` の進捗が X/Y 形式で集約表示され、その X と Y が graph 上の実際の子 task (parent_feature 参照) の完了数 / 総数と一致すること。
2. 出力が browser でそのまま開ける自己完結した成果物であること (外部リソースへの依存が無いこと)。
3. registration receipt の `applied_count` / `expected_count` / `source_digest` が実 graph と一致していること。
4. 描画対象外の node が出力へ混入していないこと。
5. 入力 digest が安定しており、同じ入力で 2 回描画しても同じ結果になること。

ゲートや手順が失敗したら、回避せずその事実をそのまま結果に記録すること。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T231517-r6/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "render-feature-progress-positive", "checks": {"progress_xy_matches_graph": true|false, "self_contained_output": true|false, "receipt_matches_graph": true|false, "out_of_scope_excluded": true|false, "stable_input_digest": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略・代替実行をしないこと。
- out/ には status.json 以外を書かないこと。
- 対象 fixture repository 以外のファイルを変更しないこと。
