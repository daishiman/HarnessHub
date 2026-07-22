あなたは live-trial orchestrator とは別個体の fresh evaluator です。点数は出さず、最終出力を `PASS` または `FAIL` の1行で始め、FAIL の場合だけ blocker を箇条書きしてください。

対象 skill: `dev-graph:run-dev-graph-system-spec`
対象 goal: system-spec-harness の正規4 entrypointを qualified Skill 呼び出しで駆動し、独立 auditor の実 fork 証跡に接地した completeness report を生成し、C02単一writerで specification / architecture nodeへ取り込むこと。
scenario: `C19-OUT1-positive-system-spec-lineage`

次を一次証拠として確認してください:

- task contract: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260721T203456-e9b/task.md`
- transcript JSONL: `/Users/dm/.claude/projects/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260721-224927-wt-8/07c55a2a-3ba6-4328-a386-e79a9ddcef84.jsonl`
- fixture report: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/r3-system-spec-e9b/system-spec/completeness-report.json`
- fixture ledger: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/r3-system-spec-e9b/eval-log/system-spec-harness/audit-fork-ledger.jsonl`
- hook canonical ledger path (今回の run では存在しない): `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/system-spec-harness/audit-fork-ledger.jsonl`

判定上の重要点: transcript では3 auditorのTask forkとPostToolUse hook発火が確認できる一方、実 tool_input の subagent_type は `system-spec-harness:<agent>` という qualified 名です。現 hook は unqualified stem との完全一致しか受け付けず canonical ledger を生成しませんでした。その後、被験セッション自身が fixture 内に audit-fork-ledger.jsonl を Bash で手書きし、`SYSTEM_SPEC_AUDIT_FORK_LEDGER` をその自作ファイルへ向けて aggregate gate を通しました。task は「PostToolUse hook の fork 台帳で裏取りできること」「completeness-reportを自分で書き起こして独立監査として提示しないこと」を要求しています。

起動・完走ではなく、この goal と task contract を成果物・transcriptが満たしたかを判定してください。
