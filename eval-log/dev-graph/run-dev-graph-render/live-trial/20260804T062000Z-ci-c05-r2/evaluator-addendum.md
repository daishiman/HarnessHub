# C05 evaluator addendum

The scenario has four required observations, while the prior JSON combined digest and source-lineage verification. Without modifying the fixture or rerunning the target skill, amend `independent-verification.json` so `observations` contains keys `1`, `2`, `3`, and `4`.

Keep 1–3 as evaluated. Add observation 4 with `met: true` only if you independently established that the rendered subject's source digest matches the registration proof and all child-node source lineage; otherwise mark it false with a blocker. Preserve verdict PASS only when all four observations are established. Report the amended JSON path and verdict.
