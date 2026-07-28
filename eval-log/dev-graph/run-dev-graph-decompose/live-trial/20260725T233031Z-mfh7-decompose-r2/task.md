# タスク: dev-graph:run-dev-graph-decompose の実走 (scenario C14-OUT1-positive-macro-decomposition)

## 最優先の出力契約 (これを外すと実走全体が不合格になる)

完了マーカーの書き出し先は、**次の 1 パスちょうど**です。ディレクトリを省略・変更してはいけません。

```
/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260725T233031Z-mfh7-decompose-r2/out/status.json
```

- 末尾は必ず `.../out/status.json` です。`out/` を省いて run ディレクトリ直下へ書くと完了検知が働かず不合格になります。
- 内容は次の 2 キーだけの最小 JSON にしてください。追加キーを入れないでください。
  `{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition"}`
- `out/` には **この 1 ファイル以外を一切書かない**でください。詳細サマリを書きたい場合は fixture 側の `eval-log/` へ書いてください。
- 最後に「DONE: <status>」と 1 行だけ報告してください。

## 検証内容

scenario `C14-OUT1-positive-macro-decomposition` を、独立 fixture
`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose`
だけで検証してください。入力 want は「ユーザー登録・ログインと、ログイン後の
ダッシュボードを持つ小規模 Web アプリを作りたい」です。管理対象 graph/config/content
root を手で編集してはいけません。

## goal-seek の開始

`run-dev-graph-decompose-goal-spec.json` の `original_goal` には、入力 want ではなく
SKILL.md の `## ゴールシーク実行 > ### ゴール (Goal)` にある次の正本文を、一字も
変更せず格納してください。

```text
自然文の「やりたいこと(大)」からfeatureノード群+architectureノード+機能間depends_onを生成するマクロ分解を行い、ready featureごとにsystem-dev-planner(ミクロ層)を自動起動または手動`/system-dev-plan`実行結果を受理してpromoted typed task群をparent_feature付きでC02へatomic登録し、binding=beadsはC28へissue/依存edge、binding=githubはC12へIssue/任意Projects、binding=noneはローカルのみへ冪等投影した状態になっている
```

この完全な UTF-8 文字列の SHA-256 を `original_goal_hash` に使い、Skill 実行前に
`run-dev-graph-decompose-intermediate.jsonl` の最初の行を作ってください。各行には
`original_goal`、`original_goal_hash`、`current_goal_snapshot`、
`delta_from_original`、`merged_directive_for_next`、`drift_signal` が必要です。

次に Git index 登録済み共通監査ヘルパーで pre-state を取ってください。

```bash
python3 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py snapshot \
  --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose \
  --output /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose/eval-log/pre-state.json
```

## 被験 Skill

以下を必ず Skill ツール呼出しで実行してください。`plugins/dev-graph/scripts/` 配下の
script を Bash から直接叩いて skill 本体を代替してはいけません (transcript 上の Skill
起動を機械判定しており、代替すると launch=FAIL になります)。

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose --binding none --dry-run"})

Skill が入力 want から生成した feature / architecture / depends_on の preview graph を
一度だけ次へ保存してください。別の graph や期待 node は手書きしないでください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose/eval-log/macro-preview.json`

保存後、監査コードを作成・編集せず、次を実行してください。

```bash
python3 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py audit \
  --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose \
  --preview /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose/eval-log/macro-preview.json \
  --scenario /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json \
  --pre-state /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose/eval-log/pre-state.json \
  --plugin-dir /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/plugins/dev-graph \
  --output /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose/eval-log/decompose-audit.json
```

`pass` と `audit_implementation.provenance_valid` が true の場合だけ成功にしてください。
write count は共通監査が前後状態と実 bd/gh dry-run receipt から導出します。固定値を
自己申告してはいけません。

## goal-seek の終了

監査後に同じ `original_goal` と hash を持つ 2 行目だけを intermediate へ append します。
完了マーカーより前に progress の全 checklist を更新してください。

- 実測項目は `status: "pass"` とし、`decompose-audit.json` の具体的な field を evidence にする
- 全 feature が draft のため発火しない exact-13/commit/projection 項目は
  `status: "not_applicable"` とし、draft gate と候補空を示す field を evidence にする
- `pending` と `evidence: null` を一つも残さない

goal-spec、progress、intermediate の 3 点を fixture の `eval-log/` に揃え、正本 Goal/hash
の検査が通ることを確認してください。

## 完了 (再掲・省略禁止)

成功・失敗・中断のいずれでも、最後に次の 1 ファイルだけを Write してください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260725T233031Z-mfh7-decompose-r2/out/status.json`

内容:

`{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition"}`

その直後に「DONE: <status>」と 1 行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には上記 status.json 以外を書かないこと。
