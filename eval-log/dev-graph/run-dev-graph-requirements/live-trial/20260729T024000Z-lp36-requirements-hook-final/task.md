# タスク: dev-graph:run-dev-graph-requirements の共有 hook 更新後実走

scenario は `C04-OUT1-positive-ready-handoff` です。次の正本 fixture を書き換えずに使います。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/requirements-lp36-hook-final`

次を必ず Skill ツールから起動し、内部 script の直実行で代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/requirements-lp36-hook-final --feature-id F-LIVE-001 (package は fixture 内 system-plan/F-LIVE-001/ を skill が解決する)"})

必須観測:

- exact-13 package に対する capability-build task-graph handoff が出力される。
- handoff が feature ID と source digest に束縛される。
- requirements skill が実装 source file を生成しない。

SKILL.md の original_goal を使い、fixture の `eval-log/` に goal-spec、progress、
intermediate.jsonl の 3 点を作ってください。intermediate の 1 行目は Skill 実行前、
2 行目は検証後に Python `json.dumps` と file mode `a` で追記し、既存行を置換しないで
ください。各行は必須 6 キーと正しい original_goal_hash を持ち、progress に
pending / evidence null を残さないでください。

成功・失敗・中断のいずれでも最後に次の 1 ファイルだけを書きます。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260729T024000Z-lp36-requirements-hook-final/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C04-OUT1-positive-ready-handoff"}`。
最後は `DONE: <status>` の 1 行だけを報告し、fixture 以外を変更しないでください。
