# C18 status skill: fresh live trial

Run `dev-graph:run-dev-graph-status` against only this already-built contained fixture:

`eval-log/dev-graph/run-dev-graph-status/live-trial/20260804T071000Z-ci-c18-r2/fixture-repo`

Read the canonical scenario `C18-OUT1-positive-read-only-status` and the prior authoritative task `eval-log/dev-graph/run-dev-graph-status/live-trial/20260806T010000Z-f84o-postmain-c18/task.md`. Follow its full validation method with all paths replaced by this trial path. Execute the target skill rather than substituting scripts. Do not change graph, config, source/content, or GitHub state; any status output must be read-only.

Independently compare the output field-by-field with the graph store, prove the forward predecessor is ready and the dependent task is blocked, and demonstrate that the fixture stayed unchanged. Write only this completion marker when all three observations are established:

`eval-log/dev-graph/run-dev-graph-status/live-trial/20260804T071000Z-ci-c18-r2/out/status.json`

with `{"status":"PASS|FAIL|ERROR","scenario":"C18-OUT1-positive-read-only-status"}`, then report `DONE: <status>`.
