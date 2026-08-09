# タスク: C19 CI live trial

<!-- live-trial-premise:begin scenario=C19-OUT1-positive-system-spec-lineage-r3-bounded contract-digest=4e8b6d0bd0022630 -->

## この scenario の入力前提 (fixture 正本から生成。手で書き換えないこと)

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-18-3/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260809T220241Z-wt18-c19-bounded-r3/fixture-repo` にある dev-graph 初期化済みの独立 Git repository です。

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

## 実行契約

task.md の Read を除く最初の実行アクションとして、必ず次を Skill ツールで呼び出してください。

```
Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-18-3/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260809T220241Z-wt18-c19-bounded-r3/fixture-repo --resume"})
```

この bounded scenario では、上記の被験 Skill 以外の Skill と Agent を呼び出してはいけません。
人間へ質問せず、この 1 ターンで最後まで自走してください。時間上限は 360 秒、transcript
token 上限は 2,000,000 です。上限を延長してはいけません。

Skill を読み込んだら、次の決定論 runner を 1 回だけ Bash で実行してください。

```
python3 /Users/dm/orca/workspaces/HarnessHub/wt-18-3/plugins/dev-graph/scripts/build-system-spec-resume-import.py --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-18-3/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260809T220241Z-wt18-c19-bounded-r3/fixture-repo
```

runner は `validate-system-spec-resume.py` の `reuse-confirmed` 検証、C02 の唯一の writer
`upsert-node.py` による architecture/specification 登録、source_lineage・
confirmation_evidence・schema・evidence ref・複製 0 の陽性対照つき検証をまとめて行います。
個別 script を再実行したり、成果物や receipt を手編集してはいけません。

runner の stdout が `status=PASS`、`network_calls=0`、`upstream_skill_invocations=0`、
登録 node が `arch-system-spec-overview` と `spec-system-spec-index` の 2 件で、全 step の
exit code が 0 なら、次の絶対パスへ Write ツールで `status.json` を 1 ファイルだけ保存します。

`/Users/dm/orca/workspaces/HarnessHub/wt-18-3/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260809T220241Z-wt18-c19-bounded-r3/out/status.json`

内容は JSON object とし、`status: PASS`、`mode: reuse-confirmed`、`network_calls: 0`、
`upstream_skill_invocations: 0`、`registered_nodes`、`runner_report`、上記 3 required_observations
それぞれへの短い evidence を含めてください。runner が失敗した場合は緑化せず `status: FAIL`
と blocker を記録します。最後の応答は `DONE: PASS` または `DONE: FAIL` の 1 行だけにします。
