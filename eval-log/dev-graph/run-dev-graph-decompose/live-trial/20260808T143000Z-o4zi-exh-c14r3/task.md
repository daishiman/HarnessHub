# C14 exhaustive live trial retry: canonical audit path

Scenario: `C14-OUT1-positive-macro-decomposition-r9`.

Run root: `/private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260808T143000Z-o4zi-exh-c14r3`

- `FIXTURE_BEADS=<run-root>/fixture-beads`
- `FIXTURE_NONE=<run-root>/fixture-none`
- plugin root: `/private/tmp/harnesshub-o4zi.Gv5hFK/plugins/dev-graph`
- canonical scenario: `<run-root>/scenario.json`
- transcript: `/Users/dm/.claude/projects/-private-tmp-harnesshub-o4zi-Gv5hFK/4fe644ef-a986-4127-8480-23f58fc2d4ce.jsonl`

Both fixtures are fresh, empty decompose fixtures. Do not rebuild them and do not inspect or copy any prior live-trial run.

## Non-delegation and completion contract

The outer session that reads this task must execute every operation itself in this one turn. Do not call `Task`, `Agent`, or any subagent. In this trial, that explicit outer-session evidence contract takes precedence over the generic goal-seek fork suggestion. Do not return after either Skill call. Continue until the audit files, goal-seek files, and `out/status.json` exist, then print exactly `DONE: PASS` or `DONE: FAIL`.

There must be exactly two literal `Skill(dev-graph:run-dev-graph-decompose)` tool calls: first for beads, then for none. Direct scripts may implement the loaded skill after each call, but must not replace either Skill call.

## Shared want

Use this exact one-line want in both calls:

`社内向けの業務ポータルを作りたい。利用者は自分のアカウントでログインでき、ログイン後のダッシュボードで自分に割り当てられた作業と期限を一覧できる。期限が近い作業は通知として届き、管理者は全社の進捗を集計したレポートを閲覧できる。`

## 0. Before-state and goal-seek start

Before writing either fixture, run the tracked canonical helper twice:

```bash
python3 plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py snapshot --repo-root "$FIXTURE_BEADS" --output "$RUN_ROOT/pre-beads.json"
python3 plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py snapshot --repo-root "$FIXTURE_NONE" --output "$RUN_ROOT/pre-none.json"
```

Write the goal spec and the first append-only intermediate row under `FIXTURE_BEADS/eval-log/`. The original goal is the shared want exactly; its hash is its UTF-8 SHA-256. Every intermediate row must contain `original_goal`, `original_goal_hash`, `current_goal_snapshot`, `delta_from_original`, `merged_directive_for_next`, and `drift_signal`.

## 1. Beads run

Invoke exactly:

`Skill({skill: "dev-graph:run-dev-graph-decompose", args: "<shared want> --repo-root <FIXTURE_BEADS>"})`

After it returns, implement the loaded skill inline. Produce from the want, not from a prior run:

- at least two feature nodes and one architecture node;
- no task node;
- an acyclic feature DAG with max one sibling-feature dependency per feature;
- all nodes initially draft/pending/incomplete;
- every persisted node `tracker_binding=beads`;
- feature source lineage uses `origin_kind=generated`, a nonempty `source_plugin`, and a contained source file whose SHA-256 equals `source_digest`;
- substantive body headings are derived from the current template contract.

Register every node only through C02 normal upsert:

`python3 plugins/dev-graph/scripts/upsert-node.py --input <input.json> --repo-root "$FIXTURE_BEADS" --body-file <body.md>`

Do not write graph.json directly. Immediately after initial draft registration and before promotion, copy the canonical graph document to `$RUN_ROOT/preview-beads.json` as the preview evidence.

## 2. None run

Invoke exactly the same want and argument shape against the second fixture:

`Skill({skill: "dev-graph:run-dev-graph-decompose", args: "<shared want> --repo-root <FIXTURE_NONE>"})`

Implement the same node set, same bodies, same dependency graph, same timestamps, and same source content inline. The only semantic difference between the two runs is that every persisted node has `tracker_binding=none`. Register only with `upsert-node.py --input`, then write `$RUN_ROOT/preview-none.json` before promotion.

## 3. Promote exactly one produced feature per fixture

Leave at least one actually produced feature draft. Promote exactly one other produced feature in each graph through a normal C02 patch plus its existing body file. The patch must explicitly set:

- `status=active`
- `confirmation_status=confirmed`
- `evaluation_status=pass`
- `implementation_readiness.status=complete`
- a fixed explicit `updated_at`
- `confirmation_evidence` with nonempty evaluator/evidence_ref and the final `evaluated_digest`

Compute `evaluated_digest` only after all final fields including explicit `updated_at` are fixed:

```python
payload = {k: v for k, v in node.items() if k != "confirmation_evidence"}
digest = hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
```

Then call `upsert-node.py --input <promotion-patch.json> --repo-root <fixture> --body-file <original-body.md>`. Do not use a completion-only lifecycle operation. Final graphs must each have candidate_count=1 and draft_excluded_count>=1.

## 4. Canonical deterministic audits

Run these tracked audits; do not replace them with ad-hoc Python:

```bash
python3 plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py audit --repo-root "$FIXTURE_BEADS" --preview "$RUN_ROOT/preview-beads.json" --scenario "$RUN_ROOT/scenario.json" --pre-state "$RUN_ROOT/pre-beads.json" --plugin-dir plugins/dev-graph --run-mode apply --run-binding beads --output "$RUN_ROOT/audit-beads.json"
python3 plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py audit --repo-root "$FIXTURE_NONE" --preview "$RUN_ROOT/preview-none.json" --scenario "$RUN_ROOT/scenario.json" --pre-state "$RUN_ROOT/pre-none.json" --plugin-dir plugins/dev-graph --run-mode apply --run-binding none --output "$RUN_ROOT/audit-none.json"
```

Both `pass` values must be true. These audits are authoritative for all seven required observations. In particular, they:

1. measure the acyclic DAG and the declared max-three threshold;
2. distinguish draft-gate zero, unreachable GitHub binding, and absent none route;
3. prove one promoted candidate and at least one excluded draft;
4. derive binding from each persisted graph;
5. derive before/after writes and execute the real `bd-bridge.py --op create --dry-run`, `gh-bridge.py --op issue-create --dry-run`, and `gh-bridge.py --op project-item-add --dry-run` projection paths;
6. recompute final confirmation digests; and
7. execute both canonical stdin-validator negative controls.

Write `$RUN_ROOT/independent-verification.json` with keys `1` through `7`, each `status=PASS` and references to the exact audit fields. Do not claim PASS if either audit says false.

## 5. Goal-seek completion

Append a second intermediate row. Write `FIXTURE_BEADS/eval-log/run-dev-graph-decompose-progress.json` with exactly six checklist items and every item status `PASS`:

- macro DAG / no phase task;
- draft publication zero;
- exact-13 gate protected (this macro-only scenario supplied no package and accepted zero malformed package or task; that protected boundary is PASS, not N/A);
- C02 all-or-none / no duplicate nodes;
- distinct beads/github/none projection authorities proven by the canonical audit dry-runs;
- dry-run adapter mutations suppressed and preview schema validation used stdin.

Set `overall_status=PASS`. Validate the stable original goal and both intermediate rows with the standard goal-seek hash check from SKILL.md.

Finally inspect the transcript and confirm exactly two literal target Skill calls and zero `Task`/`Agent` calls. Confirm both audit `pass=true`, both candidate counts are one, both draft excluded counts are at least one, and all six checklist statuses are PASS.

Only then write this sole out artifact:

```json
{"status":"PASS","scenario":"C14-OUT1-positive-macro-decomposition-r9"}
```

If any condition fails, write status FAIL instead. Never access real GitHub or real Beads; the canonical audit adapter calls are dry-run only.
