# C04 independent evaluation

You are an independent evaluator. Do not run the target skill and do not modify the fixture repository. Inspect only the evidence for this completed live trial and write a concise JSON evaluation to the exact path below.

Target skill: `dev-graph:run-dev-graph-requirements`
Scenario: `C04-OUT1-positive-ready-handoff`
Target session: `ed1499a8-2dbb-4d76-9c06-2f3f8f20c473`
Trial root: `eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260804T060000Z-ci-c04-r2`
Fixture repository: `eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260804T060000Z-ci-c04-r2/fixture-repo`

Read the scenario definition, the target task, `pane.txt` when it is available, `out/status.json`, and the fixture outputs. Independently verify these observations:

1. A `capability-build-handoff` for `F-LIVE-001` exists and has an executable task plan.
2. The handoff retains traceability to accepted requirements and has the stated implementation target.
3. The goal-seek evidence is valid and the trial changed only its fixture repository artifacts.

Write `independent-verification.json` in the trial root with this shape:
`{"verdict":"PASS|FAIL","blockers":[],"observations":{"1":{"met":true,"evidence":"..."},"2":{"met":true,"evidence":"..."},"3":{"met":true,"evidence":"..."}}}`.
Use FAIL plus concrete blockers if any observation cannot be established. Finish by reporting the written path and verdict.
