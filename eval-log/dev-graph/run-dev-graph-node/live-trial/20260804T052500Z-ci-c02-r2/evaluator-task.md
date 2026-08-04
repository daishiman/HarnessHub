# 独立評価: C02 fresh live-trial

あなたは被験 skill の実行者とは別の fresh evaluator です。次の実行結果を read-only で再検査し、
目的達成だけを判定してください。起動・完走だけを理由に PASS にしてはいけません。

- task: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260804T052500Z-ci-c02-r2/task.md`
- transcript: 同 workdir の `transcript.jsonl`（未回収なら Claude projects 内の session `23ab2c11-eeca-4ab0-aceb-d11171db0bf0` を読む）
- pane: 同 workdir の `pane.txt`
- fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260804T052500Z-ci-c02-r2/fixture-repo`
- scenario: `plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` の `C02-OUT1-positive-mixed-artifacts`

3 個の required_observations を実ファイル・graph・frontmatter・transcript から個別に再計測すること。
評価者自身の root 下には書かず、fixture は変更しない。

結果を次のファイルへ JSON で Write すること。`verdict` は `PASS` または `FAIL`、`blockers` は文字列配列、
`observations` は "1" から "3" の各キーに `{ "met": boolean, "evidence": string }` を持たせる。

`/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260804T052500Z-ci-c02-r2/independent-verification.json`

すべての証拠を記録した後にだけ、`DONE: PASS` または `DONE: FAIL` と一行で報告すること。
