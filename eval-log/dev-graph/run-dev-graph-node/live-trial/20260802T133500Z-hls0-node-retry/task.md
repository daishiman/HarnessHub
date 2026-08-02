# タスク: dev-graph:run-dev-graph-node の再実走 (scenario C02-OUT1-positive-mixed-artifacts)

この run は、先行実走で欠けた goal-seek hash 検証を含めて scenario
`C02-OUT1-positive-mixed-artifacts` の充足を確認する再試験です。途中で人間へ質問せず、
fixture だけを変更して完了してください。

被験 fixture は独立 Git repository
`/Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/node-hls0-retry-20260802`
です。管理対象 graph/config/content root を手で直接編集してはいけません。

最初の実行アクションは必ず次です。内部 script の直接実行で代替しないでください。

```
Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/node-hls0-retry-20260802 --input /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/node-hls0-retry-20260802/mixed-artifacts.json"})
```

## 検証順序と進捗更新の厳格契約

最初に progress の V1〜V4 を全て pending で作る。以後は次の順序を守る。

1. V1 の登録・配置だけを検証する。
2. **V2 の検証コマンドを一つも実行する前に** progress を更新し、V1 だけを completed にする。V2〜V4 は pending のまま読み戻して確認する。
3. V2 の本文保持と API 文字列だけを検証する。
4. **更新 JSON の作成や V3 の処理を始める前に** progress を更新し、V2 だけを completed にする。V3〜V4 は pending のまま読み戻して確認する。
5. V3 の連続更新を検証し、直後に V3 だけを completed にする。
6. V4 の feature 拒否を検証し、直後に V4 を completed、`final_status` を PASS にする。

複数 step を同じ Edit 呼び出しでまとめて completed にしてはならない。transcript 上で各検証と直後の単独 progress 更新が確認できなければ FAIL とする。

## 必須検証

- V1: `mixed-artifacts.json` の5種類（issue / task / specification / architecture / document）を一括登録し、各 node の正規 path と graph revision を実測する。
- V2: 入力 JSON の原文本文が保存 Markdown に連続文字列として残ること、および API 原文を確認する。
- V3: artifact_kind が異なる issue と architecture を input body を明示した JSON で連続更新し、両方の `operation=updated`、`body_source=from_input`、revision 増加、kind/path 整合を実測する。
- V4: C14 macro contract 由来でない feature 直接登録を試し、fail-closed で拒否され、拒否前後で revision と `features/` のファイル数が増えないことを実測する。

## goal-seek 証跡（必須）

被験 SKILL.md の `original_goal` を使い、fixture の `eval-log/` に次の3点を作る。

- `run-dev-graph-node-goal-spec.json`
- `run-dev-graph-node-progress.json`
- `run-dev-graph-node-intermediate.jsonl`

Skill 実行前に、`sha256(goal-spec の original_goal を UTF-8 encode した値)` と完全に一致する
`original_goal_hash` を持つ intermediate 1行目を作り、各周回後は新しい行だけ append する。
各行は必須6キー（`original_goal`、`original_goal_hash`、`current_goal_snapshot`、
`delta_from_original`、`merged_directive_for_next`、`drift_signal`）を満たす。完了前に被験
SKILL.md 171–182行の検証を実行し、hash と `original_goal` の一致を確認する。前回はこの検証
の省略で DEGRADED だったため、実行せず PASS を報告してはならない。

`goal_seek.fork: subagent` の契約どおり、少なくとも1回は `Agent` ツールで分離 context に
fork して独立検証し、結果を fixture の `eval-log/independent-verification.json` へ保存する。

完了時は pending step が0件、全 evidence result が PASS、`final_status` が PASS であることを
読み戻す。

処理終了時（成功 / 失敗 / 中断を問わず）、次の status を1ファイルだけ書く。

`/Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/run-dev-graph-node/live-trial/20260802T133500Z-hls0-node-retry/out/status.json`

```json
{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}
```

最後に `DONE: <status>` と1行だけ報告する。out/ には status.json 以外を書かないこと。

## required_observations

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract
