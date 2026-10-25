# C04 OUT1 fresh independent evaluation

You are a fresh independent evaluator. You did not orchestrate or execute the target trial.
Do not invoke the target skill, do not edit the fixture repository, and do not modify any
HarnessHub behavior file, content-review artifact, criteria receipt, or existing trial evidence.
You may run read-only validators and inspect files. Do not output a score; return only PASS or FAIL
with concrete blockers.

Target skill: `dev-graph:run-dev-graph-requirements`
Scenario: `C04-OUT1-positive-ready-handoff`
Target session id: `1ca02257-f207-4f29-bd2f-32a2f6db8bc8`
Evaluator session id: `fdd2a547-0f66-45c3-a2d5-3f43af177a92`
Trial root: `/Users/dm/orca/workspaces/HarnessHub/改善要望を記録する/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260817T092817Z-c04-out1-fresh-r2`
Fixture repository: `/Users/dm/orca/workspaces/HarnessHub/改善要望を記録する/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260817T092817Z-c04-out1-fresh-r2/fixture-repo`
Target transcript SHA-256: `06055476c8e2a35cb8bb5f7d13557a7c29b873da6518f43dd760530a5183768d`

Inspect the canonical scenario, target `task.md`, `transcript.jsonl`, `pane.txt`,
`poll-state.json`, `out/status.json`, fixture baseline receipt, graph/package inputs,
and every output under `fixture-repo/docs/requirements/F-LIVE-001/` and
`fixture-repo/eval-log/run-dev-graph-requirements-*`.

Independently verify all of the following from real bytes and read-only command output:

1. The target transcript invokes `dev-graph:run-dev-graph-requirements` exactly once, the target
   reached `DONE: PASS` without nudge or gate response, and the collected transcript digest equals
   the declared target transcript SHA-256.
2. The five input gates are evidenced and current:
   C11 `validate-graph-schema.py`; C02 stored confirmed/pass/complete state for the feature,
   architecture ref, and P01..P13 tasks; `validate-source-digest.py` over the full sorted 15-node
   closure; `validate-system-plan.py --feature-package feature-package/F-LIVE-001`; and
   `validate-requirements-system-spec-snapshot.py` with exit 0. Re-run these validators read-only
   where useful; never repair a failure.
3. The capability-build/task-graph handoff is a newly emitted C04 output and contains the exact
   task set `SYS-LIVE-001-P01` through `SYS-LIVE-001-P13`, bound to feature `F-LIVE-001`, package
   `feature-package/F-LIVE-001`, and current package/source/graph digests.
4. The handoff's `resume_receipt_sha256`, `completeness_report_sha256`, and
   `artifact_snapshot_sha256` exactly match a fresh read-only result from
   `validate-requirements-system-spec-snapshot.py`. Verify the same three values are propagated
   consistently across the emitted C04 artifacts.
5. Negative controls pass: `.git/dev-graph/live-trial-baseline.json` proves the C04 outputs were
   absent before the run; baseline `system-build-handoff.json` and `task-graph.json` are not
   misclassified as C04 output; tracked input files remain unmodified; all newly added files are
   limited to C04 documentation/digest artifacts plus the three goal-seek evidence files; and new
   implementation source files are exactly zero.
6. Goal-seek evidence has all three required files, every intermediate row has the six required
   keys, every `original_goal_hash` matches the actual UTF-8 SHA-256, and progress/checklist evidence
   truthfully reflects the completed outputs.

First write a detailed machine-readable report to:

`/Users/dm/orca/workspaces/HarnessHub/改善要望を記録する/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260817T092817Z-c04-out1-fresh-r2/independent-observations.json`

It must contain `verdict`, `blockers`, numbered `observations` 1..6, the five gate results,
the exact three C19 digest values, exact task ids, changed/new file lists, implementation-source
count, goal-seek result, and commands/paths used as evidence. Use FAIL and concrete blockers if any
claim is not established.

Only after the detailed report is complete, write the completion marker used by the finalizer to:

`/Users/dm/orca/workspaces/HarnessHub/改善要望を記録する/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260817T092817Z-c04-out1-fresh-r2/independent-verification.json`

This second file must contain exactly these five top-level keys and no others:

```json
{
  "result": "PASS|FAIL",
  "blockers": [],
  "evaluator": {
    "mode": "fresh-independent-context",
    "id": "fdd2a547-0f66-45c3-a2d5-3f43af177a92"
  },
  "transcript_sha256": "06055476c8e2a35cb8bb5f7d13557a7c29b873da6518f43dd760530a5183768d",
  "evidence_refs": [
    "independent-observations.json",
    "transcript.jsonl",
    "pane.txt",
    "poll-state.json",
    "out/status.json"
  ]
}
```

The `result` and `blockers` in both files must agree. Finish with `DONE: PASS` or `DONE: FAIL`.
