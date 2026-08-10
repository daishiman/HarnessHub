# C18 independent evaluation

You are an independent evaluator. Do not rerun the target skill and do not modify the fixture repository. Read the scenario, target task, `pane.txt`, status marker, output/goal-seek artifacts, and the fixture graph.

Target skill: `dev-graph:run-dev-graph-status`
Scenario: `C18-OUT1-positive-read-only-status`
Target session: `713d1a55-6f8a-4a6c-b5fb-07037e997eb0`
Trial root: `eval-log/dev-graph/run-dev-graph-status/live-trial/20260804T071000Z-ci-c18-r2`

Independently verify:

1. Reported status, closed_at, and dependency edges match stored graph values field-by-field.
2. The predecessor is ready and its dependent is blocked for the stated dependency reason.
3. Graph, config, content, and GitHub state remain unchanged; only permitted evaluation artifacts exist.

Write `independent-verification.json` in the trial root with `verdict`, `blockers`, and observations keys `1`, `2`, and `3` containing `met` and concrete `evidence`. Use FAIL if any observation is not established. Report the path and verdict.
