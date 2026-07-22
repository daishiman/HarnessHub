# タスク: dev-graph:run-dev-graph-node の Skill 正経路・mixed artifacts 実走

隔離 fixture repo `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260722T054732b-node` だけを対象にしてください。外部 GitHub / Beads へ接続しません。

fixture 直下の `mixed-artifacts.json` に、まだ分類も採番もされていない 5 件の成果物素材が入っています。`artifact_kind` は宣言されていません（本文だけから kind を決めるのが被験 skill の仕事です）。

## 必須の開始操作

あなたの**最初の workflow tool call** は、ロード済みの `Skill` tool による次の対象 Skill 呼び出しでなければなりません。SKILL.md を読んで手作業で再現することは代替になりません。

`Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260722T054732b-node --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260722T054732b-node/mixed-artifacts.json"})`

transcript にこの Skill 呼び出しが残らない場合は FAIL としてください。

## 必須の実走と証跡

- C24 `resolve-repo-context.py --mode write` receipt を fixture の `eval-log/run-dev-graph-node-repo-context.json` に保存し、realpath 一致を確認する。
- skill 契約どおり goal-spec / progress / intermediate.jsonl を fixture の `eval-log/` に作る。**intermediate.jsonl は各周回末に append すること。最後にまとめて 1 行書く retro-fit は FAIL とする。**
- **R4-apply-template を必ず実行する。** 5 件すべての本文が `plugins/dev-graph/templates/template-contract.json` の `artifacts.<kind>.required_sections` を満たさなければならない。1 件でも欠落があれば FAIL とし、欠落セクション名を具体的に記録すること。
- 分類の結果 `artifact_subtypes` を付与した artifact については、対応する `subtype_templates` / `conditional_templates` の overlay を本文へ実際に合成すること（例: specification が破壊的 API 変更を含むなら `api_changed` の api-contract overlay、architecture が backend/security を含むならその subtype template）。frontmatter で subtype を宣言しながら本文へ overlay していない状態は FAIL とする。
- 同じ入力で **2 回目** の `Skill({skill: "dev-graph:run-dev-graph-node", args: "update --repo-root <同じ repo> --input <同じ input>"})` を実行し、`graph_node_id` と格納 path が 1 回目と同一であること（ID 重複ゼロ）を確認する。
- C02 経由で feature が作られていないことを確認する。

## 必須の独立検証

上記とは別の fresh `Agent` verifier に、次を **実際に読ませて** 再計算させること。

1. 5 件の格納 path が kind ごとの正規 path（issues/ tasks/ specs/ architecture/ docs/）と一致するか
2. 各 artifact の本文が `template-contract.json` の required_sections を**すべて**満たすか（欠落があれば列挙）
3. frontmatter の `artifact_kind` / `artifact_subtypes` と本文の overlay 実体が一致するか
4. C11 `validate-graph-schema.py` が exit 0 か

**注意**: C11 の `missing_sections` は frontmatter / artifact 存在 / schema required だけを見ており、`template-contract` の `required_sections` は見ない。したがって「C11 が通ったから本文も整合」とは言えない。verifier は本文を直接読んで判定すること。

verifier の出力は fixture の `eval-log/run-dev-graph-node-independent-verifier-r7.json` に保存し、`verified=true` でなければ FAIL とする。

scenario ID は `C02-OUT1-positive-mixed-artifacts`。

処理が終了（成功・失敗・中断のいずれでも）したら、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-node/live-trial/20260722T054732b-r7/out/status.json` だけを out/ に Write し、`{"status":"PASS|FAIL|ERROR","scenario":"node-mixed-artifacts-positive"}` とする。最後は `DONE: <status>` と1行だけ報告する。

途中で人間に質問せず最後まで自走し、skill の手順に忠実に従って人手の追加判断・省略をしないこと。Skill call、R4-apply-template、独立 verifier を省略しないこと。out/ に中間成果物を書かないこと。
