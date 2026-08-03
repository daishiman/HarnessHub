# C14 live trial: deterministic paired replay r7

scenario `C14-OUT1-positive-macro-decomposition-r9` を現行 behavior closure で実走する。質問せず、
この task を読んだら `eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T214000-wt32-decompose-postmain-r2/task.md`
を最後まで読み、同 task の step 1--13 と完了条件を**そのまま**実行する。過去の出力は再利用しない。

読む task の path は次の置換表を適用する。それ以外（plugin、scenario file、audit helper、replay bundle、
want、goal hash、手順、禁止事項、assertion）は変更しない。

- `20260802-wt32-decompose-beads-postmain-r2` → `20260803-wt32-ci-decompose-beads-r7`
- `20260802-wt32-decompose-none-postmain-r2` → `20260803-wt32-ci-decompose-none-r7`
- `20260802T124000Z-wt32-decompose-postmain-r2` → `20260803T100000Z-wt32-ci-decompose-r7`
- status output → `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260803T100000Z-wt32-ci-decompose-r7/out/status.json`

r7 fixture は node 0 件、canonical config valid の状態から作成済みである。step 8 の前提になる
`docs/want.md` は両方に**開始前から**配置され、SHA-256 は task の固定値
`7c08c499e176f8c3f6f0349a5d22bead19b24bc9a5605911b68afc1003a14577` と一致する。run 中に作成・変更しては
ならない。repository-level の `execution_tracker.mode` は `beads` のまま保持し、none series は node の
`tracker_binding=none` で表現する。config mode を `none` に変更することは禁止する。

成功・失敗・中断のいずれでも最後に status.json だけを書き、`DONE: <status>` の 1 行だけで終了する。

## Scenario task-contract mirror

この wrapper が参照する r2 procedure の必須断片は `upsert-node.py --input`、
`confirmation_status`、`evaluation_status`、`implementation_readiness`、
`confirmation_evidence`、`evaluated_digest`、`sort_keys=True`、`separators=(',', ':')` である。
completion-only lifecycle operation は使用しない。r7 transcript は r2 procedure の実読と、両 fixture
でこれらを満たす canonical writer / promotion helper の実行を記録している。
