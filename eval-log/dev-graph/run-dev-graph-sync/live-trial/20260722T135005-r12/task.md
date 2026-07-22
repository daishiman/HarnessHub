# タスク: dev-graph:run-dev-graph-sync の Skill 正経路・二回収束実走

隔離 fixture repo `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-231540-wt-1/eval-log/dev-graph/live-trial-fixtures/sync` だけを対象にしてください。外部 GitHub / Beads へ接続しません。

## 必須の開始操作

あなたの**最初の workflow tool call**は、ロード済みの `Skill` tool による次の対象 Skill 呼び出しでなければなりません。SKILL.md を検索して手作業で再現することは代替になりません。

`Skill({skill: "dev-graph:run-dev-graph-sync", args: "sync --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-231540-wt-1/eval-log/dev-graph/live-trial-fixtures/sync --binding github --adapter-fixture /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-231540-wt-1/eval-log/dev-graph/live-trial-fixtures/sync/.dev-graph/remote.json --repeat 2"})`

transcript にこの Skill 呼び出しが残らない場合は FAIL としてください。

## 必須の実走と証跡

- C24 `resolve-repo-context.py --mode write` receipt を fixture の `eval-log/run-dev-graph-sync-repo-context.json` に保存し、realpath 一致を確認する。
- skill 契約どおり goal-spec / progress / intermediate.jsonl を fixture の eval-log に作る。
- R3-sync は必ず `Agent` fork に分離する。親が apply と二回目 dry-run を直接実行してはならない。
- R3-sync Agent は `plugins/dev-graph/scripts/sync-graph.py` を同じ `--repo-root`、`--remote-state <fixture>/.dev-graph/remote.json`、`--no-eval-log` で、(1) `--apply`、(2) `--dry-run` の順に実行し、完全な JSON をそれぞれ fixture の `eval-log/run-dev-graph-sync-pass1.json` と `eval-log/run-dev-graph-sync-pass2.json` に保存する。
- 二回目は `changes=0`、imports/exports/pending_retry が全0でなければならない。
- snapshot の正本は `.dev-graph/state/sync-snapshot.json` である。top-level graph の legacy `last_synced_snapshot` ではなく、この正本が現行 remote title `Validate isolated live trial (updated remotely r7)` と一致することを確認する。
- issue/project/item ID が前後で不変であることを確認する。
- R3-sync と別の fresh `Agent` verifier に、上記 C24 receipt、pass1、pass2、最終 graph、remote、canonical sync-snapshot を**実際に読ませて**再計算させる。verifier の出力は fixture の `eval-log/run-dev-graph-sync-independent-verifier-20260722T135005-r12.json` に保存し、`verified=true` でなければ FAIL とする。
- goal/progress/intermediate の hash 検査も実行する。

scenario ID は `C03-OUT1-positive-second-sync-zero`。

処理が終了（成功・失敗・中断のいずれでも）したら、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-231540-wt-1/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260722T135005-r12/out/status.json` だけを out/ に Write し、`{"status":"PASS|FAIL|ERROR","scenario":"sync-positive-two-pass-convergence"}` とする。最後は `DONE: <status>` と1行だけ報告する。

途中で人間に質問せず最後まで自走し、skill の手順に忠実に従って人手の追加判断・省略をしないこと。上記の Skill call、Agent fork、実 receipt、独立 verifier を省略しないこと。
