# C03 live trial: run-dev-graph-sync

途中で人間に質問せず最後まで自走し、fixture だけを変更してください。Skill の正規手順に忠実に従い、内部 script の直接実行で代替してはいけません。

最初の実行アクションは必ず次の literal Skill 呼出しです。

```
Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/sync-ci-rerun-20260802 --dry-run"})
```

同じ fixture 内の決定論 remote を使い、同じ入力で dry-run、apply、確認 dry-run の3パスを順に行う。被験 skill の goal-seek 成果物を fixture の `eval-log/` に作る。

1. the first sync applies the expected import and export
2. the second sync reports imports changes=0 and exports changes=0
3. stable IDs and snapshots are unchanged on the second run

fresh Agent を少なくとも1回 fork して独立検証を行い、親セッション自身の自己評価では代替しないこと。Agent の PASS / FAIL、blocker、3観測の根拠を一字も改変せず fixture の `eval-log/independent-verification.json` に保存する。Agent が FAIL ならこの run は FAIL とする。

終了時に out/status.json だけへ `{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}` を書き、最後は `DONE: <status>` の1行だけ報告する。
