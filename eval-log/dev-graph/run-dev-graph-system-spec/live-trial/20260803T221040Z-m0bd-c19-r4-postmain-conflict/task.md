# C19 live trial: run-dev-graph-system-spec

この run は scenario C19-OUT1-positive-system-spec-lineage-r2 の充足を確認するものです。

この task は質問せず最後まで自走し、指定 fixture だけを変更する。task.md 読込後の最初の実行アクションは次の literal Skill 呼出しであり、script の直接実行で代替してはいけない。

```
Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-21/eval-log/dev-graph/live-trial-fixtures/m0bd-c19-r4-postmain-conflict-20260803"})
```

<!-- live-trial-premise:begin scenario=C19-OUT1-positive-system-spec-lineage-r2 contract-digest=48c6dd33bb9eb9b5 -->

## この scenario の入力前提 (fixture 正本から生成。手で書き換えないこと)

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-21/eval-log/dev-graph/live-trial-fixtures/m0bd-c19-r4-postmain-conflict-20260803` にある dev-graph 初期化済みの独立 Git repository です。

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

## r2 task 契約の必須手順

- doc-fetch は公式ページを実取得して現行 version を記録する。既知の古い値を固定せず、取得できない場合は正規 skill の失敗・再開契約に従い、独自の citation や結果を作らないこと。
- boot で渡された `SYSTEM_SPEC_AUDIT_FORK_LEDGER` の fixture 内パスを変更しない。監査台帳は PostToolUse hook にだけ書かせ、Write / Edit / Bash redirect で作成・改変しないこと。
- 4 entry point の canonical flow が PASS になり evaluator の fresh 3 監査と canonical report gate が exit 0 になるまで、C02 import へ進まないこと。

fixture の `eval-log/` に `run-dev-graph-system-spec-goal-spec.json`、`run-dev-graph-system-spec-progress.json`、`run-dev-graph-system-spec-intermediate.jsonl` を正確な名前で作る。intermediate は skill の実作業前に正しい hash を持つ初回行を書き、実行・検証後に結果行だけを append する。progress は C02 登録 node、各 gate、各 evidence を記録する。

正規4 entry point の PASS と confirmed 成果物だけを C02 `dev-graph:run-dev-graph-node` と `upsert-node.py` 経由で specification node と architecture node へ登録する。各 node の `source_lineage` 6フィールド、`confirmation_evidence`、evaluator evidence、source digest を実測し、`validate-source-digest.py` と `validate-evidence-refs.py` の exit 0 を確認する。graph.json や node Markdown を直接書いて登録を代替しない。dev-graph 内に elicitation / compile の同等ロジックを複製しないことを、harness 側の陽性対照と同じ検索語で確認する。

fresh Agent を少なくとも1回 fork して3観測と goal-seek を独立検証する。Agent の PASS / FAIL、blocker、観測根拠を改変せず fixture の `eval-log/independent-verification.json` に保存し、FAIL ならこの run は FAIL とする。

完了時は `/Users/dm/orca/workspaces/HarnessHub/wt-21/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260803T221040Z-m0bd-c19-r4-postmain-conflict/out/status.json` だけへ `{"status":"PASS|FAIL|ERROR","scenario":"C19-OUT1-positive-system-spec-lineage-r2"}` を書く。最後は `DONE: <status>` の1行だけで報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
