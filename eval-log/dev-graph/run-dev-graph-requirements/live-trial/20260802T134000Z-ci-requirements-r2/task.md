# C04 live trial: run-dev-graph-requirements

途中で人間に質問せず最後まで自走し、fixture だけを変更してください。skill の手順に忠実に従い、人手の追加判断・省略をしないこと。

最初の実行アクションは必ず次の literal Skill 呼出しです。内部 script の直接実行で代替してはいけません。

```
Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/requirements-ci-rerun-r2-20260802 --feature-id F-LIVE-001"})
```

被験 skill の goal-seek 成果物、capability-build handoff、検証を fixture の `eval-log/` に保存する。

1. a capability-build task-graph handoff is emitted for the exact-13 package
2. the handoff remains bound to the feature and source digest
3. the requirements skill generates no implementation source file

被験 skill と別の fresh Agent を少なくとも1回 fork して独立検証を行い、親セッション自身の自己評価では代替しないこと。Agent の PASS / FAIL、blocker、3 観測の根拠を一字も改変せず fixture の `eval-log/independent-verification-report.json` に保存する。Agent が FAIL ならこの run は FAIL とする。

終了時に out/status.json だけへ `{"status":"PASS|FAIL|ERROR","scenario":"C04-OUT1-positive-ready-handoff"}` を書き、最後は `DONE: <status>` の1行だけ報告する。
