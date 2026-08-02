# タスク: dev-graph:run-dev-graph-sync の実走 (scenario C03-OUT1-positive-second-sync-zero)

この run は scenario C03-OUT1-positive-second-sync-zero の充足を確認するものです。

required_observations:

1. the first sync applies the expected import and export
2. the second sync reports imports changes=0 and exports changes=0
3. stable IDs and snapshots are unchanged on the second run

この task.md を読んだ直後の最初の tool call は、必ず次の Skill 呼び出しにしてください。
Skill より前に Read、Task、Agent、Bash などで調査してはいけません。内部 script の直接実行で
Skill 本体を代替してはいけません。

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-33/eval-log/dev-graph/live-trial-fixtures/dc7-sync-20260802 と続けて --dry-run / --apply / 確認 --dry-run の 3 パスを同じ入力で回す (決定論 remote は fixture 内 .dev-graph/remote.json)"})

## 前回 blocker を解消する goal-seek 実行契約

Skill 起動後、`goal_seek.engine=inline` / `fork=subagent` を省略してはいけません。
未達 responsibility に対応する `plugins/dev-graph/skills/run-dev-graph-sync/prompts/R2-plan.md`
と `prompts/R3-sync.md` を読み、Agent ツールで分離 context の subagent を少なくとも 1 回
fork してください。subagent には fixture の sync 結果と既存の該当 pytest を独立検証させ、
返却結果を progress の evidence に取り込んでください。

分離 Agent は調査を広げず、fixture の final graph / remote / sync-snapshot と既存 sync
回帰テストの該当箇所だけを最大 8 tool use で読み取ってください。pytest 自体は親 context
で実行します。Agent には 12 行以内で `PASS` または `FAIL`、初回 import/export 件数、
二回目 changes、3 digest の不変性、参照した test 名を必ず本文として返させてください。
Task 結果の `content` が空、またはこの本文が不足する場合は progress を PASS にせず
status=FAIL で終了してください。progress の goal-seek evidence には Agent 返答の要点を
具体的に転記してください。

完了前に、SKILL.md の完了チェックリスト 7 項目をすべて `PASS` にしてください。
さらに `feedback_contract.criteria` の `IN1` と `OUT1`〜`OUT9` をすべて progress に列挙し、
各項目を `PASS` として具体的な test / script / live-trial evidence へ結び付けてください。
fixture で直接発火しない OUT2〜OUT9 は `N/A` にせず、SKILL.md が参照する既存回帰テストを
実行または独立レビューして PASS evidence を記録してください。`pending`、`N/A`、
`not_applicable`、`evidence: null` が 1 件でも残る場合は status=FAIL として終了してください。

`run-dev-graph-sync` の goal-seek 契約に従い、fixture の `eval-log/` へ
`run-dev-graph-sync-goal-spec.json`、
`run-dev-graph-sync-progress.json`、
`run-dev-graph-sync-intermediate.jsonl` を作成してください。

intermediate は次の順序を守ってください:

1. skill 実行前に SKILL.md の original_goal を goal-spec へ書き、同じ文字列から UTF-8 SHA-256 を計算する。
2. skill 実行前に、正しい hash を持つ最初の intermediate 行を新規作成する。
3. skill 実行と検証後に、結果を持つ 2 行目だけを append する。
4. 2 行を後からまとめて書かず、既存行を上書きしない。

成功条件:

- 1 回目の sync が期待どおりの import と export を apply する。
- 2 回目の sync が imports changes=0 / exports changes=0 を報告する。
- 2 回目で stable ID、graph、remote、snapshot が変化しない。
- goal-seek 3 点セットが有効である。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/orca/workspaces/HarnessHub/wt-33/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260802T034100Z-dc7-sync/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- fixture 以外の repository を変更しないこと。
- out/ には status.json 以外を書かないこと。
