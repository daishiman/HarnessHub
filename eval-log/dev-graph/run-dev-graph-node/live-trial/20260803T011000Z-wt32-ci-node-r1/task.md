# タスク: dev-graph:run-dev-graph-node の CI 証跡再実走 (scenario C02-OUT1-positive-mixed-artifacts)

この task.md を Read した直後の**最初の tool call**は、下記の `Skill({skill: "dev-graph:run-dev-graph-node", ...})` でなければなりません。その前に Read / Grep / Glob / Bash / Write / Edit / Agent を呼ばないでください。Skill が `Successfully loaded skill` を返さなければ status=FAIL として終了してください。

この run は scenario C02-OUT1-positive-mixed-artifacts の充足を確認するものです。

## required_observations（scenario 正本の逐語転記）

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260803-wt32-ci-node-r1 --input /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260803-wt32-ci-node-r1/mixed-artifacts.json"})

被験 SKILL.md の goal-seek 契約と上記 required_observations に忠実に従って検証し、実測した evidence を fixture の goal-spec / progress / intermediate.jsonl に記録してください。`goal_seek.fork: subagent` を省略せず、未達 responsibility の prompt を読んで Agent で少なくとも 1 回分離検証してください。

決定論的 upsert 契約も必須です。各 node 入力と連続更新 patch のそれぞれについて、`upsert-node.py --dry-run` が `write_count=0` で成功した後、**dry-run した同一ファイルを一切編集せず** apply してください。入力を編集した場合は、その変更後のファイルで dry-run をやり直してから apply します。dry-run 直後と apply 直前の SHA-256 を記録し、一致を assert してください。5件の初回登録と revision 5→6 の更新すべてが対象です。

完了 marker の直前に、次の 3 点を transcript と goal-seek progress の evidence で再確認してください。実行した事実がない項目を推測で PASS にしてはいけません。

1. 5 件の初回登録と revision 5→6 patch の計 6 入力について、各々に `dry-run 完了後の SHA-256` と `apply 直前の SHA-256` が 2 回記録され、同値 assert が成功した。
2. C14 macro-feature 契約を満たさない feature node を canonical `upsert-node.py` に実際に 1 回投入し、非 0 で拒否された。拒否前後で graph revision、graph SHA、feature ファイル数がすべて不変である。
3. 上記 1 と 2 の実測 evidence を canonical `run-dev-graph-node-progress.json` に記録し、未実施・未証明の項目は PASS にしない。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-node/live-trial/20260803T011000Z-wt32-ci-node-r1/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容: `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
