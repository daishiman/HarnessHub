# タスク: dev-graph:run-dev-graph-schedule ready-set 正経路実走

隔離 fixture repo `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-184418-wt-2/eval-log/dev-graph/live-trial-fixtures/sync` だけを対象に、ready task と conflict-free batch を算出してください。

## 必須の開始操作

あなたの**最初の workflow tool call**は、ロード済み `Skill` tool の次の対象 Skill 呼び出しでなければなりません。SKILL.md の手作業再現は代替になりません。

`Skill({skill: "dev-graph:run-dev-graph-schedule", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-184418-wt-2/eval-log/dev-graph/live-trial-fixtures/sync --max-parallel 4"})`

transcript にこの Skill 呼び出しが残らない場合は FAIL としてください。

## 必須の実走と証跡

- C24 `resolve-repo-context.py --mode read` receipt を fixture の `eval-log/run-dev-graph-schedule-repo-context.json` に保存し、realpath と git common-dir 正本の lease path を固定する。
- skill 契約どおり goal-spec / progress / intermediate.jsonl を fixture の eval-log に作り、hash 検査を行う。
- R3-schedule は必ず `Agent` fork に分離する。R3 Agent が `schedule-graph.py` を canonical graph、`--ready-source self`、canonical `.git/dev-graph/leases.json`、`--max-parallel 4`、`--eval-log <fixture>/eval-log/run-dev-graph-schedule-execution-r7.json` で実行する。
- actual execution receipt は `read_only=true`、`ready_set.tasks=["LT-TASK-001"]`、task batch は同 task 1件、conflict_pairs/conflicts は0件でなければならない。
- LT-TASK-001 は tracker_binding=github のため Beads receipt は不要。confirmed/pass/readiness complete、depends_on空、active leaseなしを graph と lease ledger から確認する。
- `suggested_branch=devgraph/LT-TASK-001` と public claim command が一意であることを確認する。
- graph / tracker / lease の実行前後 digest は不変でなければならない。
- R3 Agent と別の fresh C17 `Agent` verifier に C24 receipt、actual execution receipt、graph、canonical lease ledger を**実際に読ませて** ready/batch/lease authority と全条件を再計算させる。結果を fixture の `eval-log/run-dev-graph-schedule-independent-verifier-r7.json` に保存し、`verified=true` でなければ FAIL とする。

scenario ID は `schedule-positive-ready-set`。

処理が終了（成功・失敗・中断のいずれでも）したら、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-184418-wt-2/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260722T043419/out/status.json` だけを out/ に Write し、`{"status":"PASS|FAIL|ERROR","scenario":"schedule-positive-ready-set"}` とする。最後は `DONE: <status>` と1行だけ報告する。

途中で人間に質問せず最後まで自走し、skill の手順に忠実に従って人手の追加判断・省略をしないこと。Skill call、R3 Agent、C17 verifier、actual receipt を省略しないこと。
