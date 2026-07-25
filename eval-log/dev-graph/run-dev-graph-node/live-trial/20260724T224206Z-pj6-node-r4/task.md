# タスク: dev-graph:run-dev-graph-node の実走 (C02-OUT1-positive-mixed-artifacts)

## 最初のアクションに関する必須契約

この task を読んだ直後の最初の tool call は、必ず次の Skill 呼出しにしてください。
これより前に Read、Glob、Grep、Bash、Write、Task、Agent などを1回でも使った場合は、
結果が正しくても FAIL です。

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/live-trial-fixtures/node-wt10-pj6-r4 --input /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/live-trial-fixtures/node-wt10-pj6-r4/mixed-artifacts.json"})

Skill がロードされた後は、その SKILL.md に忠実に従って最後まで自走してください。
被験 skill を Bash から script 直叩きする別手順へ置き換えてはいけません。

## goal-seek 証拠を最初に記録する契約

fixture の `inputs/` と `eval-log/` は初期 commit に含まれる状態で既に存在します。
Skill ロード後、fixture の tracked/untracked file に最初の変更を加える前に original goal と
その SHA-256 を確定し、次の順で goal evidence を記録してください。

1. `eval-log/run-dev-graph-node-goal-spec.json` を Write する。
2. `eval-log/run-dev-graph-node-intermediate.jsonl` の1行目を Write する。
3. その後にだけ `inputs/` へ C02 用入力を Write し、成果物登録を始める。

処理・検証後、intermediate の2行目だけを append し、次の progress を完成させてください。
intermediate の2行を後からまとめて作成したり、既存行を書き換えたりしてはいけません。

- `eval-log/run-dev-graph-node-goal-spec.json`
- `eval-log/run-dev-graph-node-progress.json`
- `eval-log/run-dev-graph-node-intermediate.jsonl`

## 入力データ保全の必須契約

`mixed-artifacts.json` から C02 の単一 node 入力を作る際は、必ず Write tool で既存の
`inputs/` へ書いてください。`.dev-graph/` へ直接 Write してはいけません。本文を shell
文字列、Python `-c`、heredoc、コマンド置換へ埋め込んではいけません。

登録後の specification 本文には、元入力の次の5リテラルがすべてそのまま存在しなければ
FAIL です。

- `GET /api/v1/users`
- `line_items`
- `Authorization: Bearer`
- `DELETE /api/v2/sessions/bulk`
- `GET /api/v1/users/search`

## 成功条件

- issue、task、specification、architecture、document の5種類を正規 path へ登録する。
- 5件追加後、同じ graph_node_id の既存 artifact 1件を内容差分付きで通常 C02 経路から
  再更新する。
- 更新 receipt が `operation=updated` で、node ID・artifact kind・正規保存 path が更新前後で
  不変であることを実測する。
- C14 macro-feature 契約外の feature を作らない。
- specification 本文の上記5リテラルを保全する。
- graph schema と goal-seek evidence の機械検査を PASS する。

処理が終了（成功・失敗・中断のいずれでも）したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-140326-wt-10/eval-log/dev-graph/run-dev-graph-node/live-trial/20260724T224206Z-pj6-node-r4/out/status.json`
   に完了マーカーを1ファイルだけ Write する。内容は
   `{"status":"PASS|FAIL|ERROR","scenario":"C02-OUT1-positive-mixed-artifacts"}`。
2. 「DONE: <status>」と1行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には `status.json` 以外を書かないこと。
