# タスク: dev-graph:run-dev-graph-init の実走 (scenario C01-OUT1-positive-idempotence-r17)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-060142-wt-12/eval-log/dev-graph/live-trial-fixtures/init` にある、まだ dev-graph 初期化されていない独立 Git repository です。

この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。1回目の Skill 呼び出しが戻っても親・利用者へ制御を返したり、途中報告で停止したりしてはいけません。outer session が続けて工程2・3・4を実行します。

## 工程1: 1回目の実走

```
Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-060142-wt-12/eval-log/dev-graph/live-trial-fixtures/init --hook-source plugin"})
```

## 工程2: outer session が行う between-pass 変更

1. 1回目が scaffold した canonical template を1件だけ Editし、識別文字列を本文へ加える。編集直後のbytesをSHA-256で記録する。
2. C02 `upsert-node.py` の正規writer経由でnodeを1件だけ登録し、C11が空graphに対して真空合格できない状態にする。

## 工程3: 2回目の実走

同じouter sessionが、工程2の直後に同じSkillをもう一度呼び出すこと。手書きの存在確認で代替しない。

```
Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-060142-wt-12/eval-log/dev-graph/live-trial-fixtures/init --hook-source plugin"})
```

## 工程4: 検証と完了マーカー

- 1回目が6 content root、routing policy、graph storeを作ったこと
- 2回目がskill自体を再起動し、planned changes 0を報告したこと
- 工程2で編集したtemplateのbytesが2回目後も同じSHA-256であること
- plugin hook sourceが解決され、receiptまたはrejection診断が記録されたこと
- config内の絶対path、token、GitHub node IDが0件であること
- C11がnode 1件以上のgraphに対してPASSしたこと

`run-dev-graph-init` は `goal_seek` を宣言します。`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-060142-wt-12/eval-log/dev-graph/live-trial-fixtures/init/eval-log/` に次の3点を出力してください。

- `run-dev-graph-init-goal-spec.json`
- `run-dev-graph-init-progress.json`
- `run-dev-graph-init-intermediate.jsonl`

intermediateは必須6キーを持ち、1行目をSkill実行前に作成し、検証後の2行目だけをappendしてください。2行を後からまとめて書くこと、既存行の上書き、hash不一致の書換えは禁止です。

全検証後、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-060142-wt-12/eval-log/dev-graph/run-dev-graph-init/live-trial/20260727T235346Z-7tn1-init-postmerge/out/status.json` に完了マーカーを1ファイルだけWriteしてください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C01-OUT1-positive-idempotence-r17"}
```

その後、「DONE: <status>」と1行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skillの手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/にはstatus.json以外を書かないこと。
- 被験repositoryはfixtureだけ。HarnessHub本体のファイルを変更しないこと。
