# タスク: dev-graph:run-dev-graph-requirements の Skill 正経路・ready handoff 実走

隔離 fixture repo `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260722T061413c-requirements` だけを対象にしてください。外部 GitHub / Beads へ接続しません。

feature `F-LIVE-001` が confirmed / evaluation-pass / readiness-complete で登録済みで、その exact-13 package (P01..P13) が `system-plan/F-LIVE-001/package.json` にあります。

## 成果物の定義（最重要・前回の失敗要因）

**この fixture に最初から在るファイルは、すべて被験 skill の *入力* です。** 実走成果物として引用してはいけません。

baseline の正本は git common dir の `dev-graph/live-trial-baseline.json` にあります（content root の外なので skill の観測対象ではありません）。**最初にこれを読み**、`inputs` に載っている 42 path と `observation_rule` を把握してください。

とくに `system-plan/F-LIVE-001/system-build-handoff.json` と `task-graph.json` は名前が C04 の出力語彙と衝突しますが、**所有者は system-dev-planner** で、C04 が gate 3 で走らせる `validate-system-plan.py` の必須入力です。これらを「handoff を生成した証拠」として引用したら FAIL としてください。

**実走後に `git status` と `git ls-files --others --exclude-standard` が返す差分だけが C04 の出力です。**

## 必須の開始操作

あなたの**最初の workflow tool call** は、ロード済みの `Skill` tool による次の対象 Skill 呼び出しでなければなりません。SKILL.md を読んで手作業で再現することは代替になりません。

`Skill({skill: "dev-graph:run-dev-graph-requirements", args: "handoff --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260722T061413c-requirements --feature-id F-LIVE-001 --package /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260722T061413c-requirements/system-plan/F-LIVE-001/package.json"})`

transcript にこの Skill 呼び出しが残らない場合は FAIL としてください。

## 必須の実走と証跡

- C24 `resolve-repo-context.py --mode write` receipt を fixture の `eval-log/run-dev-graph-requirements-repo-context.json` に保存し realpath 一致を確認する。
- skill 契約どおり goal-spec / progress / intermediate.jsonl を fixture の `eval-log/` に作る。**intermediate.jsonl は各周回末に append すること。最後に 1 行だけ書く retro-fit は FAIL とする。**
- SKILL.md の Output Contract が約束する 3 点（要件定義書 / 参照ノードごとの implementation_readiness・missing_sections 一覧 / capability-build・task-graph build 向け handoff 参照 + グラフスナップショット）を**実際に生成する**。
- 生成した handoff が feature `F-LIVE-001` と package の source digest に束縛されていることを確認する（digest は自分で package を読んで計算し照合する）。
- **requirements skill が実装ソースファイルを 1 つも生成していないこと**を確認する（責務境界）。

## 必須の独立検証

上記とは別の fresh `Agent` verifier に、次を **実際に読ませて** 判定させること。

1. `git status` / `git ls-files --others --exclude-standard` の差分を採取し、**実走で新規に出現した path だけ**を列挙する
2. その中に SKILL.md の Output Contract 3 点に対応する成果物が実在するか
3. baseline receipt の `inputs` に載る path を成果物として数えていないか
4. handoff が feature / source digest に束縛されているか（verifier 自身が digest を再計算する）
5. C11 `validate-graph-schema.py` が CLI として `--repo-root` 付きで exit 0 か

verifier の出力は fixture の `eval-log/run-dev-graph-requirements-independent-verifier-20260722T142830-r7.json` に保存し、`verified=true` でなければ FAIL とする。**True をハードコードせず実データから再計算すること。**

scenario ID は `C04-OUT1-positive-ready-handoff`。

処理が終了（成功・失敗・中断のいずれでも）したら、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-231540-wt-1/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260722T142830-r7/out/status.json` だけを out/ に Write し、`{"status":"PASS|FAIL|ERROR","scenario":"requirements-ready-handoff-positive"}` とする。最後は `DONE: <status>` と1行だけ報告する。

途中で人間に質問せず最後まで自走し、skill の手順に忠実に従って人手の追加判断・省略をしないこと。Skill call、独立 verifier を省略しないこと。out/ に中間成果物を書かないこと。
