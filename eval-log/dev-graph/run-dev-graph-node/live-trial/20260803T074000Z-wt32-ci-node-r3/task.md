# タスク: dev-graph:run-dev-graph-node の fresh live trial

この run は `C02-OUT1-positive-mixed-artifacts` の実走受入です。fixture 以外の repository を
変更せず、途中で質問せず最後まで自走してください。skill の手順に忠実に従い、人手の追加判断・
省略をしないでください。

この task を読んだ直後の最初の tool call は次の Skill 呼び出しにしてください。Skill より前に
Read、Task、Agent、Bash などで調査せず、内部 script の直実行で代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260803-wt32-ci-node-r3 --input /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260803-wt32-ci-node-r3/mixed-artifacts.json"})

Skill の後、fixture だけを対象に以下を実測し、SKILL.md の goal-seek 契約（goal spec、progress、
intermediate JSONL、分離 Agent による少なくとも一回の独立確認を含む）を満たしてください。

- 5 種類の artifact が canonical path に登録され、frontmatter の kind と stored path が一致する。
- issue と architecture の連続 update で original body が保存され、revision と updated_at が前進する。
- C14 macro contract 外の feature 直接登録が fail-closed で拒否され、graph / feature file は増えない。

`out/` に書く完了マーカーは `status.json` だけにし、完了時に次を書いてください。

```json
{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}
```

最後の報告は `DONE: <status>` の 1 行だけにしてください。

## required_observations（scenario 正本の逐語転記）

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract
