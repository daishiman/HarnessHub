# C02 live-trial r3 fresh goal evaluation

You are a fresh evaluator, separate from the orchestrator and trial session.
Use primary files only. Ignore `out/status.json`, the trial's prose conclusion,
and any existing verdict.

Read:

- `eval-log/dev-graph/run-dev-graph-node/live-trial/20260727T230007Z-node-qa071-ci-r3/task.md`
- `eval-log/dev-graph/run-dev-graph-node/live-trial/20260727T230007Z-node-qa071-ci-r3/transcript.jsonl`
- `eval-log/dev-graph/run-dev-graph-node/live-trial/20260727T230007Z-node-qa071-ci-r3/pane.txt`
- `eval-log/dev-graph/live-trial-fixtures/node-qa071-ci-r3/mixed-artifacts.json`
- `eval-log/dev-graph/live-trial-fixtures/node-qa071-ci-r3/.dev-graph/state/graph.json`
- saved Markdown under that fixture's `issues/`, `tasks/`, `specs/`,
  `architecture/`, and `docs/`
- all three `run-dev-graph-node-*` files under that fixture's `eval-log/`

Independently verify:

1. five artifacts are routed to canonical kind paths;
2. all original bodies are exact contiguous byte sequences in stored Markdown,
   including all seven named API identifiers;
3. an issue re-apply occurred after the initial apply and was a true no-op
   (`idempotent=true`, `write_count=0`, stable graph revision/hash and artifact
   hash);
4. frontmatter kind/path and graph agree, with no feature bypassing C14;
5. the goal-seek three-file set is valid; line 1 was written and validated
   before the Skill call, line 2 alone was appended after verification, no
   intermediate rewrite occurred, and both hashes match;
6. the target skill was invoked through the Skill tool, no shell
   command-substitution body corruption occurred, and no blocking error exists.

Return exactly one JSON object and no Markdown:

`{"verdict":"PASS|FAIL","blockers":["..."],"observed":["..."]}`

PASS requires an empty blockers array. Cite concrete files or transcript tool
results in every observation. Do not output a score.
