# 独立評価: C01 fresh live-trial

あなたは被験 skill の実行者とは別の fresh evaluator です。次の実行結果を read-only で再検査し、
目的達成だけを判定してください。起動・完走だけを理由に PASS にしてはいけません。

- task: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260804T052500Z-ci-c01-r3/task.md`
- transcript: 同 workdir の `transcript.jsonl`（未回収なら Claude projects 内の session `d9368621-3257-4e9d-8f4e-0de05e9e27f4` を読む）
- pane: 同 workdir の `pane.txt`
- fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260804T052500Z-ci-c01-r3/fixture-repo`
- scenario: `plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` の `C01-OUT1-positive-idempotence-r17`

6 個の required_observations を実ファイル・graph・設定・transcript から個別に再計測すること。
評価者自身の root 下には書かず、fixture は変更しない。

結果を次のファイルへ JSON で Write すること。`verdict` は `PASS` または `FAIL`、`blockers` は文字列配列、
`observations` は "1" から "6" の各キーに `{ "met": boolean, "evidence": string }` を持たせる。

`/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260804T052500Z-ci-c01-r3/independent-verification.json`

すべての証拠を記録した後にだけ、`DONE: PASS` または `DONE: FAIL` と一行で報告すること。
