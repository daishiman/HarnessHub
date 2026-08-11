<!-- live-trial-premise:begin scenario=C19-OUT1-positive-system-spec-lineage-r3-bounded contract-digest=4e8b6d0bd0022630 -->

## この scenario の入力前提 (fixture 正本から生成。手で書き換えないこと)

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-5/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260811T123120-wt5-c19v/fixture-repo` にある dev-graph 初期化済みの独立 Git repository です。

fixture が最初から置く業務入力は次の 7 ファイルだけです:

- `system-spec/index.md`
- `system-spec/00-requirements-definition.md`
- `system-spec/completeness-report.json`
- `system-spec/spec-state.json`
- `system-spec/fetched-references.json`
- `eval-log/system-spec-harness/audit-fork-ledger.jsonl`
- `system-spec/resume-receipt.json`

R0-context / R1-preflight で宣言済みの system-spec-harness と次の entry point の実在を確認してください。fixture の digest-bound PASS receipt は current なため、これら upstream entry point は呼び出さず、`validate-system-spec-resume.py` の `reuse-confirmed` 検証だけを実行します。

1. `system-spec-harness:run-system-spec-elicit`
2. `system-spec-harness:run-system-spec-doc-fetch`
3. `system-spec-harness:run-system-spec-compile`
4. `system-spec-harness:assign-system-spec-completeness-evaluator`

本 scenario の必須観測 (scenario 正本 required_observations):

- the declared system-spec-harness contract and digest-bound PASS receipt validate in reuse-confirmed mode without upstream regeneration
- the imported specification and architecture retain source lineage and evaluator evidence
- registration occurs only through C02 and no duplicate elicitation or compile logic appears in dev-graph

本 scenario の必須 task contract (次の文言を省略しないこと):

- upsert-node.py
- validate-system-spec-resume.py
- reuse-confirmed
- --resume

<!-- live-trial-premise:end -->
