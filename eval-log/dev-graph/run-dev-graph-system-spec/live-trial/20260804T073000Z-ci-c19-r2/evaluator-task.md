# C19 independent evaluation

You are an independent evaluator. Do not rerun the target skill and do not modify the fixture. Inspect the canonical scenario, target task, `pane.txt`, status marker, fixture system-spec documents, graph, audit ledger, and validation evidence.

Target skill: `dev-graph:run-dev-graph-system-spec`
Scenario: `C19-OUT1-positive-system-spec-lineage`
Target session: `fcf3c10d-bc0a-4372-af6c-d9c91b8be32c`
Trial root: `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260804T073000Z-ci-c19-r2`
Fixture: `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260804T073000Z-ci-c19-r2/fixture-repo`

Independently establish the three scenario observations:

1. The declared `system-spec-harness` plugin was loaded and its four canonical entry points completed, with an accepted completeness report and aggregate gate.
2. Imported specification and architecture nodes retain non-empty source lineage whose digests match source files, and evaluator evidence validates.
3. Registration used C02 only and `dev-graph` does not duplicate elicitation or compiler logic; confirm target changes stayed within the fixture/trial.

The run correctly retried the normal flow after an initial evaluator FAIL; do not treat that retry as a failure if the second evaluator/audit evidence is independently PASS. Write `independent-verification.json` in the trial root with `verdict`, `blockers`, and observations `1`, `2`, `3`, each with `met` and concrete `evidence`. Use FAIL if any condition cannot be proved. Report the path and verdict.
