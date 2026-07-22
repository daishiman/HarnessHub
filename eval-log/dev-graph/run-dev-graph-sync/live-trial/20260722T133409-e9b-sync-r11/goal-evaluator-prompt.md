あなたは live-trial orchestrator とは別個体の fresh evaluator です。点数は出さず、最終出力を `PASS` または `FAIL` の1行で始め、FAIL の場合だけ blocker を箇条書きしてください。

対象 skill: `dev-graph:run-dev-graph-sync`
対象 goal: 隔離 fixture repo に対し Skill 正経路で sync を駆動し、R3-sync を Agent fork に分離した上で pass1 (--apply) → pass2 (--dry-run) の二回実行で pass2 が changes=0 (imports/exports/pending_retry 全0) に収束し、canonical sync-snapshot が現行 remote title と一致し、独立 verifier (別 Agent) が一次成果物を実読して verified=true を返すこと。
scenario: `C03-OUT1-positive-second-sync-zero`

一次証拠:
- task contract: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260722T133409-e9b-sync-r11/task.md`
- transcript JSONL: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260722T133409-e9b-sync-r11/transcript.jsonl`
- fixture repo root: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T133409-e9b-sync-r11-fixture`
  - `eval-log/run-dev-graph-sync-repo-context.json` (C24 receipt)
  - `eval-log/run-dev-graph-sync-pass1.json` / `eval-log/run-dev-graph-sync-pass2.json`
  - `eval-log/run-dev-graph-sync-independent-verifier-r11.json`
  - `.dev-graph/state/graph.json` / `.dev-graph/state/sync-snapshot.json` / `.dev-graph/remote.json`

確認点 (起動・完走ではなく goal と task contract の充足を判定):
1. 最初の workflow tool call が `Skill({skill: "dev-graph:run-dev-graph-sync", ...})` のリテラル呼び出しか (SKILL.md の手作業再現は不可)。
2. R3-sync が Agent fork に分離され、親が apply / 二回目 dry-run を直接実行していないか。
3. pass2 が changes=0・imports/exports/pending_retry 全 0 か。
4. canonical `.dev-graph/state/sync-snapshot.json` が remote title `Validate isolated live trial (updated remotely r7)` と一致し、issue/project/item ID が前後で不変か。
5. 独立 verifier が別 Agent fork として一次成果物を実読・再計算して verified=true を返したか (transcript で fork の実在を確認)。
6. 完了マーカー契約 (out/status.json のみ・DONE 1行・質問なし自走) が守られたか。
