# タスク: dev-graph:run-dev-graph-sync の fresh live trial

この run は `C03-OUT1-positive-second-sync-zero` の実走受入です。fixture 以外の repository を
変更せず、途中で質問せず最後まで自走してください。skill の手順に忠実に従い、人手の追加判断・
省略をしないでください。

この task を読んだ直後の最初の tool call は次の Skill 呼び出しにしてください。Skill より前に
Read、Task、Agent、Bash などで調査せず、内部 script の直実行で代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-30/eval-log/dev-graph/live-trial-fixtures/cvli-merge-sync-20260802 と続けて --dry-run / --apply / 確認 --dry-run の 3 パスを同じ入力で回す (決定論 remote は fixture 内 .dev-graph/remote.json)"})

Skill の後、fixture だけを対象に以下を実測し、SKILL.md の goal-seek 契約（goal spec、progress、
intermediate JSONL、分離 Agent による少なくとも一回の独立確認を含む）を満たしてください。

- first sync の import / export が期待どおり apply される。
- second sync が imports changes=0 と exports changes=0 を返す。
- second sync 後も stable ID、graph、remote、snapshot が変わらない。

`out/` に書く完了マーカーは `status.json` だけにし、完了時に次を書いてください。

```json
{"status":"PASS|FAIL|ERROR","scenario":"C03-OUT1-positive-second-sync-zero"}
```

最後の報告は `DONE: <status>` の 1 行だけにしてください。

## required_observations（scenario 正本の逐語転記）

1. the first sync applies the expected import and export
2. the second sync reports imports changes=0 and exports changes=0
3. stable IDs and snapshots are unchanged on the second run
