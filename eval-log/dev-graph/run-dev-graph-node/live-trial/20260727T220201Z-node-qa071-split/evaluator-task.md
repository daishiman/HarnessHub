# C02 live-trial fresh goal evaluation

You are a fresh evaluator, separate from the orchestrator and the session that
ran the trial. Evaluate the trial using primary files only. Do not use
`out/status.json`, the trial session's prose conclusion, or an existing verdict
as evidence.

Read these files and the referenced fixture artifacts:

- `eval-log/dev-graph/run-dev-graph-node/live-trial/20260727T220201Z-node-qa071-split/task.md`
- `eval-log/dev-graph/run-dev-graph-node/live-trial/20260727T220201Z-node-qa071-split/transcript.jsonl`
- `eval-log/dev-graph/run-dev-graph-node/live-trial/20260727T220201Z-node-qa071-split/pane.txt`
- `eval-log/dev-graph/live-trial-fixtures/node-qa071-split/mixed-artifacts.json`
- `eval-log/dev-graph/live-trial-fixtures/node-qa071-split/.dev-graph/state/graph.json`
- saved Markdown under the fixture's `issues/`, `tasks/`, `specs/`,
  `architecture/`, and `docs/`
- the three `run-dev-graph-node-*` goal-seek files under the fixture's
  `eval-log/`

Independently determine whether every required outcome is supported:

1. all five artifacts were routed to canonical kind paths;
2. every original body is preserved as an exact contiguous byte sequence in
   its saved Markdown body, including all seven named API identifiers;
3. a consecutive update preserved frontmatter/path agreement and was a true
   idempotent no-op;
4. no invalid feature bypassed the C14 macro-feature contract;
5. the goal-seek three-file set exists, its two intermediate rows are
   append-ordered, and their goal hash matches;
6. the target skill was invoked through the Skill tool, the known shell
   command-substitution corruption did not recur, and the observed errors do
   not contain a blocking failure.

Return exactly one JSON object and no Markdown:

`{"verdict":"PASS|FAIL","blockers":["..."],"observed":["..."]}`

Do not output a score. PASS requires an empty blockers array. Each observation
must cite a concrete file or transcript/tool result.
