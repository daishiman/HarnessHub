# タスク: dev-graph:run-dev-graph-schedule の実走 (schedule-positive-ready-set)

対象 repository は dev-graph 初期化済みの隔離 fixture です。依存関係・resource_scope・lease が意図的に配置してあり、ready-set と並列 batch の判定が観測できる形になっています。

**最重要の制約: schedule の実行は必ず下記の `Skill(...)` リテラル呼び出しで行うこと。個別 script を Bash で直接叩いて代替してはならない (検証のための読み取り実行は可)。**

Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T230933-schedule --max-parallel 4"})

skill が返した schedule receipt について、次の 5 点を確認してください。**skill の出力を鵜呑みにせず、あなた自身が fixture の `.dev-graph/state/graph.json` を読んで ready-set を独立に再計算し、突き合わせること。**

1. ready-set が「未解決の依存を持たない active task」の集合と厳密に一致すること (過不足を具体的に記録)。
2. 依存が未解決の task が ready-set に含まれていないこと。
3. resource_scope が重複する task が同一の並列 batch に同居していないこと。
4. `--max-parallel 4` が batch サイズの上限として実際に効いていること。
5. 実行前後で graph / tracker / lease の digest が不変であること (read-only)。

ゲートや手順が失敗したら、回避せずその事実をそのまま結果に記録すること。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260721T230933-r6/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "schedule-positive-ready-set", "checks": {"ready_set_exact": true|false, "no_unmet_dependency": true|false, "no_resource_conflict_in_batch": true|false, "max_parallel_enforced": true|false, "digests_unchanged": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略・代替実行をしないこと。
- out/ には status.json 以外を書かないこと。
- 対象 fixture repository 以外のファイルを変更しないこと。
