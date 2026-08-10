# C14 independent evaluation

You are an independent evaluator. Do not rerun the target skill and do not modify either fixture. Inspect the canonical scenario, task, `pane.txt`, status, both fixture repositories, and trial artifacts.

Target skill: `dev-graph:run-dev-graph-decompose`
Scenario: `C14-OUT1-positive-macro-decomposition-r9`
Target session: `45437145-1727-4ef3-9613-85ce59ab00f0`
Trial root: `eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260804T064000Z-ci-c14-r2`

Independently establish all seven canonical observations: (1) acyclic macro DAG and threshold, (2) reasoned pre-evaluation zero publications, (3) real retained draft plus sole promoted candidate, (4) distinct persisted beads/none routes and Github macro rule, (5) state-difference-based write counts and stdin preview, (6) recalculated evaluated digests, and (7) rejected in-memory negative controls. Also confirm two literal target Skill invocations and confinement to fixtures.

Write `independent-verification.json` in the trial root with this semantic shape:
`{"verdict":"PASS|FAIL","blockers":[],"observations":{"1":{"met":true,"evidence":"..."},"2":{"met":true,"evidence":"..."},"3":{"met":true,"evidence":"..."},"4":{"met":true,"evidence":"..."},"5":{"met":true,"evidence":"..."},"6":{"met":true,"evidence":"..."},"7":{"met":true,"evidence":"..."}}}`.
Give concrete blockers and verdict FAIL if anything is not reproducible. Report the path and verdict when complete.
