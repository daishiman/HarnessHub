# タスク: dev-graph:run-dev-graph-decompose の実走再試験 (scenario C14-OUT1-positive-macro-decomposition)

scenario `C14-OUT1-positive-macro-decomposition` を、新規の独立 fixture
`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/decompose-wt6`
だけで検証してください。管理対象 graph/config/content root を手で編集してはいけません。

入力 want は次です。

```text
ユーザー登録とログインができて、ログイン後にダッシュボードで自分の利用状況を見られる小規模 Web アプリを作りたい。登録完了時と重要な変更時には通知メールを送りたい。運営者向けには全ユーザーの利用状況を集計したレポート画面もほしい。
```

## 最重要 — Skill ツールの起動が本 trial の測定対象

被験 skill の実行は必ず **Skill ツール呼出し**で行ってください。`plugins/dev-graph/scripts/` 配下の script を Bash から直接実行して skill 本体を代替した場合、成果物が正しくても trial は launch=FAIL として破棄されます。

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
python3 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py snapshot \
  --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/decompose-wt6 \
  --output /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/decompose-wt6/eval-log/pre-state.json
```

## 被験 Skill (実書込みモード — `--dry-run` は付けないこと)

以下を必ず Skill ツール呼出しで実行してください。**`--dry-run` を付けてはいけません。**

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/decompose-wt6 --binding none"})

理由: OUT1 は「評価前 draft の Issue 起票は 0 件」「tracker 投影は confirmed/pass/readiness complete だけに限定する」という**制限条件**を含みます。`--dry-run` では起票・投影の経路そのものが無効化されるため、0 件という観測が「ゲートが効いた」ことの証拠になりません (検査対象が空集合)。実書込みで走らせ、起票経路が有効な状態で 0 件であることを実測してください。なお `--dry-run` の write 0 件は別条件 `criteria:OUT3` の担当であり、本 trial の判定対象ではありません。

Skill が入力 want から生成した feature / architecture / depends_on の preview graph を
一度だけ次へ保存してください。別の graph や期待 node は手書きしないでください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/decompose-wt6/eval-log/macro-preview.json`

## 実測 (共通監査ヘルパーの結果だけに依存しないこと)

保存後、監査コードを作成・編集せず、次を実行してください。

```bash
python3 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py audit \
  --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/decompose-wt6 \
  --preview /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/decompose-wt6/eval-log/macro-preview.json \
  --scenario /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json \
  --pre-state /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/decompose-wt6/eval-log/pre-state.json \
  --plugin-dir /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/plugins/dev-graph \
  --output /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/live-trial-fixtures/decompose-wt6/eval-log/decompose-audit.json
```

**注意: この共通監査ヘルパーには既知の欠陥があり、その `pass` フィールドだけを根拠に成否を決めてはいけません。** 監査結果は参考値として保存したうえで、次の 5 点を **`.dev-graph/state/graph.json` の実内容から自分で読み直して**実測し、値をそのまま報告してください。

1. **実登録の確認**: `graph_revision` が 0 より大きく、`nodes` が空でないこと。登録された全 node の `graph_node_id` と `artifact_kind` を列挙する。
2. **DAG 循環なし (判別力のある形で)**: `depends_on` の全辺を列挙し、辺の本数を数える。辺集合に対して自分で DFS または Kahn のアルゴリズムを実装して循環の有無を判定し、**辺の本数と判定結果の両方**を報告する。辺が 1 本以下の場合は「循環を構成しえないので検査に判別力がない」と明記すること。
3. **task 粒度混入なし**: 登録された node の `artifact_kind` の内訳を数える。`task` が 0 件であることと、`phase_ref` / `parent_feature` / `feature_package_id` が設定された node の件数を報告する。`P01`..`P13` 形式の ID を持つ node の件数も報告する。
4. **評価前 draft の Issue 起票 0 件**: 登録された各 feature node の `confirmation_status` / `evaluation_status` / `implementation_readiness.status` を列挙する。そのうえで fixture の `issues/` 配下のファイル一覧と `.beads/` の有無を実測し、起票が 0 件であることを示す。**起票源となる draft node が実際に graph へ登録された状態での 0 件**であることを明記すること。
5. **tracker 投影の限定**: 各 node の `tracker_binding` / `issue_linkage` / `beads_linkage` / `github_project_linkages` を列挙する。`--binding none` では tracker 投影経路が発火しないため、confirmed/pass/complete 側の肯定的観測は本 scenario では得られない。その事実を**開示事項として明記**すること (取り繕わない)。

write count は共通監査が前後状態と実 bd/gh receipt から導出しますが、その値が実際に作成されたファイル数と一致するかを、fixture の git 差分 (`git -C <fixture> status --short`) からも確認してください。固定値を自己申告してはいけません。

## goal-seek の終了

監査後に同じ `original_goal` と hash を持つ 2 行目だけを intermediate へ append します。
完了マーカーより前に progress の全 checklist を更新してください。

- 実測項目は `status: "pass"` とし、上記 1..5 の具体的な実測値を evidence にする
- 本 scenario で発火しない項目 (exact-13 / commit / tracker projection) は
  `status: "not_applicable"` とし、**なぜ発火しないのか (draft gate か binding=none か) を区別して** evidence に書く
- `pending` と `evidence: null` を一つも残さない

goal-spec、progress、intermediate の 3 点を fixture の `eval-log/` に揃え、正本 Goal/hash
の検査が通ることを確認してください。

## 完了

成功・失敗・中断のいずれでも、次に完了マーカーを 1 ファイルだけ Write してください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-002450-wt-6/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260725T205644Z-dcmp2-wt6/out/status.json`

内容:

`{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition"}`

最後は「DONE: <status>」と 1 行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
