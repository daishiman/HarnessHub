# C19 system-spec lineage: fresh live trial

Complete `C19-OUT1-positive-system-spec-lineage` in a single turn. Read the full canonical procedure at `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260806T020000Z-wt20-c19-citation-fix/task.md` before acting, then follow every requirement exactly with all old fixture and out paths replaced only by the paths below.

Fixture: `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260804T073000Z-ci-c19-r2/fixture-repo`
Final marker: `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260804T073000Z-ci-c19-r2/out/status.json`

The first execution action after reading this task must be the literal target `Skill(dev-graph:run-dev-graph-system-spec)` invocation against that fixture. Use the declared `system-spec-harness` skills for all four canonical entry points; do not reproduce them with scripts. The fixture brief is the only elicitation input: do not ask a user. `doc-fetch` must fetch the official pages and record their current versions. `SYSTEM_SPEC_AUDIT_FORK_LEDGER` is fixed by the harness hook and must never be hand-written.

Do not import until the canonical evaluator and aggregate gate have PASSed. Register confirmed specification and architecture nodes only through C02, retain source lineage/evaluator evidence, validate the source/evidence gates, and perform the positive-control checks proving that dev-graph does not duplicate elicitation or compiler logic.

Keep all work confined to the fixture and the one final marker. Write exactly `{"status":"PASS|FAIL|ERROR","scenario":"C19-OUT1-positive-system-spec-lineage"}` to the final marker only after every required observation is measured, then report `DONE: <status>`.
