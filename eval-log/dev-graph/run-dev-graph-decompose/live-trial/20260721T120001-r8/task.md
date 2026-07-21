# タスク: dev-graph:run-dev-graph-decompose の Skill 正経路・macro dry-run 実走

隔離 fixture repo `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-decompose` だけを対象にしてください。

## 必須の開始操作

あなたの**最初の workflow tool call**は、ロード済みの `Skill` tool による次の対象 Skill 呼び出しでなければなりません。SKILL.md を検索して手作業で再現することは代替になりません。

`Skill({skill: "dev-graph:run-dev-graph-decompose", args: "認証付きTODO APIをarchitecture、認証feature、TODO featureへマクロ分解する。TODOは認証に依存。全nodeはtracker_binding=none。 --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-decompose --dry-run"})`

transcript にこの Skill 呼び出しが残らない場合は FAIL としてください。

## 必須の実走と証跡

- C24 `resolve-repo-context.py --mode write` receipt と goal-spec / progress / intermediate.jsonl を fixture の eval-log に保存し、hash 検査を実行する。
- architecture 1件 + feature 2件を生成し、全 node に schema 必須の `created_at` / `updated_at` を含める。TODO feature は認証 feature に依存する。task 粒度は混入させない。
- R2-plan は `Agent` macro auditor に分離し、DAG循環0・task粒度混入0・draft publication 0を独立監査する。
- 3 node の actual preview graph を fixture の `eval-log/preview-graph-r8.json` に保存し、`validate-graph-schema.py` の完全な JSON receipt を `eval-log/run-dev-graph-decompose-schema-validation-r8.json` に保存する。schema_violation / missing_required_key は0でなければならない。
- macro preview は `eval-log/run-dev-graph-decompose-macro-preview-r8.json`、publication preview は `eval-log/run-dev-graph-decompose-publication-preview-r8.json` に保存する。validation 3項目を実測 PASS とし、publication preview は全 target / operation / input_digest / output_digest / local・Beads・GitHub・Projects write_count=0 を含める。
- `input_digest.macro_preview` は一時 graph digest ではなく、**保存済み macro preview ファイルそのもの**の実 SHA-256 を記録する。書込み後に `shasum -a 256` 相当で一致を再確認する。
- R2-plan Agent と別の fresh `Agent` receipt-reader に、actual schema-validation receipt、macro preview、publication preview、canonical graph の前後 digestを**実際に読ませて**独立監査させる。結果を fixture の `eval-log/run-dev-graph-decompose-independent-verifier-r8.json` に保存し、`verified=true` でなければ FAIL とする。
- canonical `.dev-graph/state/graph.json` は不変、feature の C02 add 直登録0、tracker publication 0を維持する。

scenario ID は `decompose-macro-positive-r3`。

処理が終了（成功・失敗・中断のいずれでも）したら、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260721T120001-r8/out/status.json` だけを out/ に Write し、`{"status":"PASS|FAIL|ERROR","scenario":"decompose-macro-positive"}` とする。最後は `DONE: <status>` と1行だけ報告する。

人間への質問は禁止。上記の Skill call、Agent forks、actual receipt 読み取りを省略しないこと。
