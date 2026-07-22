# タスク: dev-graph:run-dev-graph-requirements の実走 (C04-OUT1 positive ready-handoff)

> **【最初に読むこと・完了条件】このタスクは、最後に `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260722T143510-e9b-rq-r7/out/status.json` を Write し、`DONE: <status>` と 1 行報告するまで完了ではありません。検証結果を散文で報告して終わってはいけません。作業内容にかかわらず、必ず最後にこの 2 つを実行してください。詳細は末尾の「処理が終了したら」節にあります。**


対象 repository は dev-graph 初期化済みの隔離 fixture です。feature `F-LIVE-001` が confirmed / evaluation-pass / readiness-complete の状態で登録済みで、その exact-13 package (P01..P13 の DAG) が `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T143510-e9b-rq-r7-fixture/system-plan/F-LIVE-001/package.json` にあります。

**最重要の制約: handoff は必ず `Skill(...)` リテラル呼び出しで行うこと。個別 script を Bash で直接叩いて代替してはならない (検証のための読み取り実行は可)。**

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "handoff --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T143510-e9b-rq-r7-fixture --feature-id F-LIVE-001 --package /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T143510-e9b-rq-r7-fixture/system-plan/F-LIVE-001/package.json"})

skill が返した handoff について、次の 5 点を確認してください。**skill の出力を鵜呑みにせず、あなた自身が fixture の graph と package.json を読んで突き合わせること。**

1. exact-13 package に対する capability-build 向けの task-graph handoff が実際に出力されていること。
2. handoff が feature `F-LIVE-001` と package の source digest に束縛されていること (digest が package.json の実体と一致すること)。
3. package の 13 phase (P01..P13) が DAG として handoff に反映され、循環が無いこと。
4. **requirements skill が実装ソースファイルを 1 つも生成していないこと** (要件受け渡しの責務境界。生成物があれば FAIL)。
5. C11 (validate-graph-schema.py) が exit 0 であること。

ゲートや手順が失敗したら、回避せずその事実をそのまま結果に記録すること。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260722T143510-e9b-rq-r7/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "requirements-ready-handoff-positive", "checks": {"handoff_emitted": true|false, "bound_to_feature_and_digest": true|false, "exact13_dag_preserved": true|false, "no_implementation_source_generated": true|false, "c11_exit0": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略・代替実行をしないこと。
- out/ には status.json 以外を書かないこと。
- 対象 fixture repository 以外のファイルを変更しないこと。
