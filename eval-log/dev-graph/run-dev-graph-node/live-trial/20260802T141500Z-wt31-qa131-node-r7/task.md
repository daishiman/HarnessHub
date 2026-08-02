# タスク: dev-graph:run-dev-graph-node の最終再実走 r7 (scenario C02-OUT1-positive-mixed-artifacts)

この run は scenario C02-OUT1-positive-mixed-artifacts の充足を確認するものです。

## required_observations（scenario 正本の逐語転記）

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-31/eval-log/dev-graph/live-trial-fixtures/wt31-qa131-node-r7 --input /Users/dm/orca/workspaces/HarnessHub/wt-31/eval-log/dev-graph/live-trial-fixtures/wt31-qa131-node-r7/mixed-artifacts.json"})

被験 SKILL.md の goal-seek 契約と上記 required_observations に忠実に従って検証し、
実測した evidence を fixture の goal-spec / progress / intermediate.jsonl に記録してください。

SKILL.md の `goal_seek.fork: subagent` は必須契約です。未達 responsibility の
`prompts/<R-id>.md` を Read した後、その responsibility を `Agent` で分離 context に
少なくとも1回 fork し、返却結果を main context で検証してください。すべての責務を
main context だけで処理してはなりません。

決定論的 upsert 契約も必須です。各 node 入力と連続更新 patch のそれぞれについて、
`upsert-node.py --dry-run` が `write_count=0` で成功した後、**dry-run した同一ファイルを
一切編集せず** apply してください。入力を編集した場合は、その変更後のファイルで
dry-run をやり直してから apply します。dry-run 直後と apply 直前の SHA-256 を記録し、
一致を assert してください。5件の初回登録と revision 5→6 の更新すべてが対象です。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-31/eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T141500Z-wt31-qa131-node-r7/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
