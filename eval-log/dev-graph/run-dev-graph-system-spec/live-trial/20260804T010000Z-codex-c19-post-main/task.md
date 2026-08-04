# タスク: dev-graph:run-dev-graph-system-spec の実走 (scenario C19-OUT1-positive-system-spec-lineage)

この run は scenario `C19-OUT1-positive-system-spec-lineage` の充足を確認するものです。被験 skill の実行は必ず次の Skill ツール呼出しで開始してください。

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-22/eval-log/dev-graph/live-trial-fixtures/20260804T010000Z-codex-c19-post-main"})

<!-- live-trial-premise:begin scenario=C19-OUT1-positive-system-spec-lineage contract-digest=caa908bc0d2d7f14 -->

## この scenario の入力前提 (fixture 正本から生成。手で書き換えないこと)

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-22/eval-log/dev-graph/live-trial-fixtures/20260804T010000Z-codex-c19-post-main` にある dev-graph 初期化済みの独立 Git repository です。

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

For R0, record the written brief before confirmation through the normal `chunk` route: add exactly one one-topic entry for each U1 through U9 using canonical ids `qa-foundation-u1` through `qa-foundation-u9`, `source.kind="written-requirements"`, fixture-relative `path` and section, original source text in `answer`, and `source.sha256` equal to SHA-256 of that answer. Do not fabricate a provenance entry, bypass the writer, or use an AI summary as a primary source.

If an independent audit returns FAIL, correct the cited fixture state through the declared canonical flow and request a fresh independent audit; do not write a green completeness report around a failed audit. After R3-import, verify that both imported nodes preserve `source_lineage` and `confirmation_evidence`, that every imported body is derived from its matching caller-repository source artifact rather than product prose embedded in an import contract, and that registration uses C02 `upsert-node.py` only.

Process all stages autonomously. Obey the skill's declared procedure and do not substitute hand-written elicit, compile, evaluator, or C02 operations for its Skill flow.

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-22/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260804T010000Z-codex-c19-post-main/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status":"PASS|FAIL|ERROR"}`
2. `DONE: <status>` と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
