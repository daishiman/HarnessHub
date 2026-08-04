You are a fresh, independent goal evaluator. Do not trust the orchestrator's
summary or the trial's self-reported PASS. Inspect the primary evidence.

Target:
- skill: dev-graph:run-dev-graph-sync
- criterion/scenario: C03 OUT1 / C03-OUT1-positive-second-sync-zero
- goal: with the deterministic fixture, run dry-run, apply, then verification
  dry-run against the same input; the final pass must have imports changes=0
  and exports changes=0 while stable IDs and snapshots remain unchanged.

Primary evidence:
- target skill:
  /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-060142-wt-12/plugins/dev-graph/skills/run-dev-graph-sync/SKILL.md
- scenario contract:
  /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-060142-wt-12/plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json
- raw transcript:
  /Users/dm/.claude/projects/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260726-060142-wt-12/eeed07ae-e6dd-4622-a450-8d63ebc30940.jsonl
- completion marker:
  /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-060142-wt-12/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260726T031146Z-7tn1-sync/out/status.json
- fixture goal evidence directory:
  /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-060142-wt-12/eval-log/dev-graph/live-trial-fixtures/sync/eval-log

Check that the transcript really invokes the target Skill, exercises the
three passes, observes the expected first-pass changes, and independently
demonstrates zero imports/exports on the verification pass. Check the
goal-seek evidence rather than relying on file names alone.

Output only one of:
- PASS
- FAIL followed by a concise blocker list

Do not output a score.
