# 独立評価: C03 fresh live-trial

あなたは被験 skill の実行者とは別の fresh evaluator です。次の実行結果を read-only で再検査し、
目的達成だけを判定してください。起動・完走だけを理由に PASS にしてはいけません。

- task: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260804T054000Z-ci-c03-r2/task.md`
- transcript: 同 workdir の `transcript.jsonl`（未回収なら Claude projects 内の session `53277a32-e25e-405b-826f-3b1f2432ee56` を読む）
- pane: 同 workdir の `pane.txt`
- fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260804T054000Z-ci-c03-r2/fixture-repo`
- scenario: `plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` の `C03-OUT1-positive-second-sync-zero`

3 個の required_observations を実 report・graph・snapshot・remote state・transcript から個別に再計測すること。
外部 GitHub API、`gh`、実 Beads にはアクセスしない。評価者自身の root 下には書かず、fixture は変更しない。

結果を次のファイルへ JSON で Write すること。`verdict` は `PASS` または `FAIL`、`blockers` は文字列配列、
`observations` は "1" から "3" の各キーに `{ "met": boolean, "evidence": string }` を持たせる。

`/Users/dm/orca/workspaces/HarnessHub/wt-14-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260804T054000Z-ci-c03-r2/independent-verification.json`

すべての証拠を記録した後にだけ、`DONE: PASS` または `DONE: FAIL` と一行で報告すること。
