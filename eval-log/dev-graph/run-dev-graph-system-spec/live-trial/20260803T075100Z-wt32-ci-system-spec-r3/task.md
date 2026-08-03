# C19 current-behavior live trial

この task を読んだ直後の最初の tool call は、必ず次の Skill 呼び出しにしてください。Skill より前に Read、Grep、Glob、Bash、Write、Edit、Agent を呼ばず、script の直接実行で代替してはいけません。

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260803-wt32-ci-system-spec-r3"})

この run は scenario C19-OUT1-positive-system-spec-lineage の充足を確認するものです。

## required_observations（scenario 正本の逐語転記）

1. the declared system-spec-harness plugin is loaded and its canonical flow completes
2. the imported specification and architecture retain source lineage and evaluator evidence
3. registration occurs only through C02 and no duplicate elicitation or compile logic appears in dev-graph

fixture の `system-spec/requirements-brief.md` を業務入力として正規 flow を最後まで実行する。system-spec-harness の elicit、doc-fetch、compile、completeness evaluator は必ず Skill で呼び、実装 script の直接呼び出しで代替しない。goal-seek 3成果物を fixture の `eval-log/` に canonical filename で記録する。confirmed output のみ C02 `dev-graph:run-dev-graph-node` と `upsert-node.py` で specification / architecture node に登録し、source lineage、evaluator evidence、source digest を正規 validator で検証する。fresh Agent で独立検証し、FAIL なら PASS marker を書かない。

## Scenario task-contract mirror

必須観測 2 の登録済み specification / architecture node は、機械可読な
`source_lineage` と `confirmation_evidence` を保持する。これらは evaluator evidence と
source digest に結び付き、C02 `upsert-node.py` による正規登録後に validator で検証する。

委譲する `run-system-spec-elicit`、`run-system-spec-doc-fetch`、`run-system-spec-compile`、`assign-system-spec-completeness-evaluator` の各 entry point は、いずれも `Skill` ツールで呼ぶ。

成功・失敗・中断のいずれでも最後に `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260803T075100Z-wt32-ci-system-spec-r3/out/status.json` だけへ `{"status":"PASS|FAIL|ERROR","scenario":"C19-OUT1-positive-system-spec-lineage"}` を Write し、`DONE: <status>` と 1 行で終了してください。途中で質問せず最後まで自走し、skill の手順に忠実に従い、人手の追加判断・省略をしないこと。out/ には status.json 以外を書かないこと。
