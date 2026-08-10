# C14 macro decomposition: fresh live trial

Execute scenario `C14-OUT1-positive-macro-decomposition-r9` completely in this turn. The authoritative detailed procedure is `eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260807T000000Z-ci-c14/task.md`; read it in full before acting, follow every required observation and constraint, and substitute only the two fixture paths and final status path below. Do not modify HarnessHub outside these fixtures and this trial's `out/status.json`.

Fixtures (both already built; do not rebuild, copy, or relocate):

- Beads run: `eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260804T064000Z-ci-c14-r2/fixture-beads`
- None run: `eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260804T064000Z-ci-c14-r2/fixture-none`

Use the exact Japanese want from the canonical task for both literal `Skill(dev-graph:run-dev-graph-decompose)` calls. Make exactly two literal Skill calls: first for the Beads fixture and then for the None fixture. Both are real local fixture writes, not dry runs. Record state before and after; retain an actual draft feature and promote a different actual produced feature in each fixture, so each fixture has exactly one confirmed/pass/complete publication candidate.

For each promotion use the canonical C02 writer in the literal form `upsert-node.py --input` with `--body-file`. The patch must include `confirmation_status`, `evaluation_status`, `implementation_readiness`, and `confirmation_evidence`. Recompute each `confirmation_evidence.evaluated_digest` only from the final persisted node excluding `confirmation_evidence`, using `sort_keys=True` and `separators=(',', ':')`. Do not use the forbidden lifecycle operation stated in the canonical task.

Run all seven scenario observations, including stdin preview validation, persisted tracker-binding route differentiation, external write-count differencing, GitHub macro-only schema explanation, negative controls, and goal-seek output in the Beads fixture. Only then write:

`eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260804T064000Z-ci-c14-r2/out/status.json`

with exactly `{"status":"PASS|FAIL|ERROR","scenario":"C14-OUT1-positive-macro-decomposition-r9"}`, then report `DONE: <status>`.
