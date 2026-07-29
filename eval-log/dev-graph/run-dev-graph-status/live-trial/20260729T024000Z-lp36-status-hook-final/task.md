# タスク: dev-graph:run-dev-graph-status の共有 hook 更新後実走

scenario は `C18-OUT1-positive-read-only-status` です。被験 fixture は次の独立 Git
repository です。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/status-lp36-hook-final`

次を必ず Skill ツールから起動し、SKILL.md の手動再現、内部 script の直実行、別 Agent
への委譲で代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-status", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/status-lp36-hook-final"})

必須観測:

- report の status、closed_at、dependency edges が graph store と field-by-field で一致。
- dependent task は predecessor により blocked、predecessor は ready と報告。
- graph、config、content、GitHub state は前後で不変。

SKILL.md の original_goal を使い、fixture の `eval-log/` に goal-spec、progress、
intermediate.jsonl の 3 点を作ってください。intermediate の 1 行目は Skill 実行前、
2 行目は検証後に Python `json.dumps` と file mode `a` で追記し、既存行を置換しないで
ください。各行は必須 6 キーと正しい original_goal_hash を持ち、progress に
pending / evidence null を残さないでください。

成功・失敗・中断のいずれでも最後に次の 1 ファイルだけを書きます。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-status/live-trial/20260729T024000Z-lp36-status-hook-final/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C18-OUT1-positive-read-only-status"}`。
最後は `DONE: <status>` の 1 行だけを報告し、fixture 以外を変更しないでください。
