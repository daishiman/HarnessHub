# C19 current-behavior live trial

この task を読んだ直後の最初の tool call は、必ず次の Skill 呼び出しにしてください。Skill より前に
Read、Grep、Glob、Bash、Write、Edit、Agent を呼ばず、script の直接実行で代替してはいけません。

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-22/eval-log/dev-graph/live-trial-fixtures/20260803T130000Z-codex-final-c19"})

<!-- live-trial-premise:begin scenario=C19-OUT1-positive-system-spec-lineage contract-digest=caa908bc0d2d7f14 -->

## この scenario の入力前提 (fixture 正本から生成。手で書き換えないこと)

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-22/eval-log/dev-graph/live-trial-fixtures/20260803T130000Z-codex-final-c19` にある dev-graph 初期化済みの独立 Git repository です。

fixture が最初から置く業務入力は次の 1 ファイルだけです:

- `system-spec/requirements-brief.md`

次の成果物は fixture が先回りして作っていません。これらを生成するところからが本 scenario の測定対象です:

- `system-spec/spec-state.json`
- `system-spec/fetched-references.json`
- `system-spec/completeness-report.json`
- `system-spec/index.md`

R0-context / R1-preflight を省略せず、その後に宣言済みの system-spec-harness を次の正規 entry point で委譲実行し、正規フローを最後まで完走させてください。各 entry point は必ず `Skill` ツールで呼び出してください (script を Bash から直接叩いて代替してはいけません)。

1. `system-spec-harness:run-system-spec-elicit`
2. `system-spec-harness:run-system-spec-doc-fetch`
3. `system-spec-harness:run-system-spec-compile`
4. `system-spec-harness:assign-system-spec-completeness-evaluator`

本 scenario の必須観測 (scenario 正本 required_observations):

- the declared system-spec-harness plugin is loaded and its canonical flow completes
- the imported specification and architecture retain source lineage and evaluator evidence
- registration occurs only through C02 and no duplicate elicitation or compile logic appears in dev-graph

<!-- live-trial-premise:end -->

confirmed output のみ C02 `dev-graph:run-dev-graph-node` と `upsert-node.py` で
specification / architecture node に登録する。`source_lineage`、`confirmation_evidence`、
source digest を正規 validator で検証し、dev-graph 内に同等の elicitation / compile logic を
複製しない。fresh `Agent` で独立検証し、FAIL なら PASS marker を書かない。

`run-dev-graph-system-spec` は goal_seek を宣言する。SKILL.md の「ゴールシーク実行」に従い、
fixture の `eval-log/` に canonical filename の
`run-dev-graph-system-spec-goal-spec.json`、`run-dev-graph-system-spec-progress.json`、
`run-dev-graph-system-spec-intermediate.jsonl` を記録する。intermediate は必須 6 キーと
original goal hash を保持する。

成功・失敗・中断のいずれでも最後に
`/Users/dm/orca/workspaces/HarnessHub/wt-22/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260803T130000Z-codex-final-c19/out/status.json`
だけへ `{"status":"PASS|FAIL|ERROR","scenario":"C19-OUT1-positive-system-spec-lineage"}` を Write し、
`DONE: <status>` と 1 行で終了してください。途中で質問せず最後まで自走し、skill の手順に忠実に従い、
人手の追加判断・省略をしないこと。out/ には status.json 以外を書かないこと。
