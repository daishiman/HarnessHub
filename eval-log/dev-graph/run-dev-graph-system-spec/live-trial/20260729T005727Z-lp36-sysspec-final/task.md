# タスク: dev-graph:run-dev-graph-system-spec の実走

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/system-spec-lp36-final"})

<!-- live-trial-premise:begin scenario=C19-OUT1-positive-system-spec-lineage contract-digest=caa908bc0d2d7f14 -->

## この scenario の入力前提 (fixture 正本から生成。手で書き換えないこと)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/system-spec-lp36-final` にある dev-graph 初期化済みの独立 Git repository です。

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

必須観測の機械検査語彙として、取込みは C02 の `upsert-node.py` 経由だけとし、登録した
specification / architecture の `source_lineage` と `confirmation_evidence` を保持してください。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260729T005727Z-lp36-sysspec-final/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C19-OUT1-positive-system-spec-lineage"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には `status.json` 以外を書かないこと。
