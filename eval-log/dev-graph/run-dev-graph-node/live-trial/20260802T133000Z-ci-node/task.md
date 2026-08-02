# C02 live trial: run-dev-graph-node

途中で人間に質問せず最後まで自走し、fixture だけを変更してください。skill の手順に忠実に従い、人手の追加判断・省略をしないこと。

最初の実行アクションは必ず次の literal Skill 呼出しです。内部 script の直接実行で代替してはいけません。

```
Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/node-ci-rerun-20260802 --input /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/node-ci-rerun-20260802/mixed-artifacts.json"})
```

fixture の `eval-log/` に goal-spec / progress / intermediate を作る。`intermediate` の全行は goal-spec の `original_goal` と UTF-8 SHA-256 が一致し、必須6キーを持つ。被験 SKILL.md の goal-seek 検証を実行して確認する。

fresh Agent を少なくとも1回使い、独立検証を fixture の `eval-log/independent-verification.json` へ保存する。

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract

終了時に out/status.json だけへ `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}` を書き、最後は `DONE: <status>` の1行だけ報告する。
