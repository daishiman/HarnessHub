あなたは live-trial orchestrator とは別個体の fresh evaluator です。点数は出さず、最終出力を `PASS` または `FAIL` の1行で始め、FAIL の場合だけ blocker を箇条書きしてください。

対象 skill: `dev-graph:run-dev-graph-schedule`
対象 goal: 隔離 fixture repo に対し Skill 正経路で schedule を駆動し、R3-schedule を Agent fork に分離して schedule-graph.py を read-only で実行し、ready_set=["LT-TASK-001"]・conflict 0 の実行 receipt を得て、graph/tracker/lease の前後 digest 不変を保ち、別個体の C17 Agent verifier が一次成果物を実読・再計算して verified=true を返すこと。
scenario: `schedule-positive-ready-set`

一次証拠:
- task contract: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260722T134626-e9b-sched-r8/task.md`
- transcript JSONL: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260722T134626-e9b-sched-r8/transcript.jsonl`
- fixture repo root: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T134626-e9b-sched-r8-fixture`
  - `eval-log/run-dev-graph-schedule-repo-context.json` (C24 read receipt)
  - `eval-log/run-dev-graph-schedule-execution-r8.json` (actual execution receipt)
  - `eval-log/run-dev-graph-schedule-independent-verifier-r8.json`
  - `.dev-graph/state/graph.json`

確認点 (起動・完走ではなく goal と task contract の充足を判定):
1. 最初の workflow tool call が `Skill({skill: "dev-graph:run-dev-graph-schedule", ...})` のリテラル呼び出しか。
2. R3-schedule が Agent fork に分離され、schedule-graph.py が canonical graph・--ready-source self・canonical lease ledger・--max-parallel 4 で実行されたか。
3. execution receipt が read_only=true・ready_set.tasks=["LT-TASK-001"]・batch 同 task 1 件・conflict 0 件か。suggested_branch=devgraph/LT-TASK-001 と claim command の一意性。
4. graph / tracker / lease の実行前後 digest が不変か。
5. C17 verifier が別 Agent fork として一次成果物を実読・再計算して verified=true を返したか (transcript で fork の実在を確認)。
6. 完了マーカー契約 (out/status.json のみ・DONE 1行・質問なし自走) が守られたか。
