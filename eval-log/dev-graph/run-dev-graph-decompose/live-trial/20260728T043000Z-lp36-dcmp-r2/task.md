# タスク: dev-graph:run-dev-graph-decompose の実走再試験

scenario `C14-OUT1-positive-macro-decomposition-r2` を、新規の独立 fixture
`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-merged-r2`
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
python3 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py snapshot \
  --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-merged-r2 \
  --output /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-merged-r2/eval-log/pre-state.json
```

## 被験 Skill

以下を必ず Skill ツール呼出しで実行してください。

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-merged-r2 --binding none --dry-run"})

Skill が入力 want から生成した feature / architecture / depends_on だけを preview の
母集団にしてください。別の graph、期待 node、新しい node を手書きしてはいけません。

保存前に、Skill が実際に生成した feature のうちちょうど 1 件だけを、preview 内で次の
schema-valid lifecycle へ進めてください。他の produced feature は draft/pending/incomplete
のまま残します。これは managed graph への登録ではなく、produced node に対する publication
gate の正負両経路を測るための隔離 preview probe です。

- `confirmation_status`: `confirmed`
- `evaluation_status`: `pass`
- `implementation_readiness`: `status=complete`、`missing_sections=[]`、`checked_at` は実時刻
- `confirmation_evidence.evaluator`: `live-trial-lifecycle-probe`
- `confirmation_evidence.evidence_ref`: `eval-log/macro-preview.json`
- `confirmation_evidence.evaluated_digest`: lifecycle 変更前の produced node を canonical JSON
  にした UTF-8 bytes の SHA-256

選択した node の `graph_node_id`、title、purpose、scope、acceptance、depends_on、その他の
内容は変更しないでください。lifecycle 変更後の preview graph を一度だけ次へ保存します。
`updated_at` も「その他の内容」に含まれます。元の produced node の値を一字も変えず保持し、
現在時刻へ更新してはいけません。変更してよいキーは上で列挙した lifecycle 項目だけです。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-merged-r2/eval-log/macro-preview.json`

保存後、監査コードを作成・編集せず、次を実行してください。

```bash
python3 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py audit \
  --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-merged-r2 \
  --preview /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-merged-r2/eval-log/macro-preview.json \
  --scenario /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json \
  --pre-state /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-merged-r2/eval-log/pre-state.json \
  --plugin-dir /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/dev-graph \
  --output /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-merged-r2/eval-log/decompose-audit.json
```

`pass` と `audit_implementation.provenance_valid` が true の場合だけ成功にしてください。
write count は共通監査が前後状態と実 bd/gh dry-run receipt から導出します。固定値を
自己申告してはいけません。

## goal-seek の終了

監査後に同じ `original_goal` と hash を持つ 2 行目だけを intermediate へ append します。
完了マーカーより前に progress の全 checklist を更新してください。

- 実測項目は `status: "pass"` とし、`decompose-audit.json` の具体的な field を evidence にする
- dry-run のため発火しない exact-13/commit/projection 項目は `status: "not_applicable"`
  とし、draft feature の候補0件、lifecycle probe feature の候補1件、全 write count 0件を
  示す field を evidence にする
- `pending` と `evidence: null` を一つも残さない

goal-spec、progress、intermediate の 3 点を fixture の `eval-log/` に揃え、正本 Goal/hash
の検査が通ることを確認してください。

## 完了

成功・失敗・中断のいずれでも、次に完了マーカーを 1 ファイルだけ Write してください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260728T043000Z-lp36-dcmp-r2/out/status.json`

内容:

`{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition-r2"}`

最後は「DONE: <status>」と 1 行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
