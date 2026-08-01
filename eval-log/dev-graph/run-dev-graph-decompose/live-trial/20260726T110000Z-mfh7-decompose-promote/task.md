# タスク: dev-graph:run-dev-graph-decompose の実走 (scenario C14-OUT1-positive-macro-decomposition)

## 最優先の出力契約 (これを外すと実走全体が不合格になる)

完了マーカーの書き出し先は、**次の 1 パスちょうど**です。ディレクトリを省略・変更してはいけません。

```
/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260726T110000Z-mfh7-decompose-promote/out/status.json
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

## 昇格ステップ (省略禁止・今回の主眼)

scenario の `fixture_contract` は、**評価前 draft が 0 件起票であること**だけでなく、
**「confirmed かつ evaluation pass だが readiness incomplete の feature は publication
候補から除外される」ことを実測すること**を要求しています。全 node が draft のままだと
候補集合が「そもそも全部 draft だから空」になり、readiness 条件が一度も試されません。
契約文はこれを明示的に不成立と定めています。

> a candidate set that is empty only because every node is draft leaves the readiness
> condition untested and does not satisfy the contract

そこで、**skill が生成した preview node に対してのみ**、次の昇格を run 中に行って
ください。fixture 側に期待 node を仕込んだり、新しい node を手書きしたりしては
いけません（昇格は「skill が作った node の status を進める」操作に限ります）。

保存した `macro-preview.json` の `features` に対し:

1. **1 件目の feature** を次の状態へ昇格させる。
   - `confirmation_status` を `"confirmed"` へ
   - `evaluation_status` を `"pass"` へ
   - `implementation_readiness.status` は **`"incomplete"` のまま**にする
   （これが「昇格したが readiness 未達なので候補にならない」検体です）
2. **他の feature のうち少なくとも 1 件は draft のまま**残す
   （これが「評価前 draft は 0 件起票」の検体です）
3. `graph_node_id`・`title`・`depends_on` など node の同一性に関わる field は
   一切変更しない。変更してよいのは上記 3 つの status field だけです。

昇格を反映した `macro-preview.json` を保存したら、昇格前後の差分が上記 3 field
だけであることを次で確認し、出力をそのまま記録してください。

```bash
python3 - <<'EOF'
import json
p = "/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/live-trial-fixtures/decompose/eval-log/macro-preview.json"
d = json.load(open(p, encoding="utf-8"))
for f in d["features"]:
    print(f["graph_node_id"],
          f.get("confirmation_status"),
          f.get("evaluation_status"),
          (f.get("implementation_readiness") or {}).get("status"))
EOF
```

出力に **`confirmed pass incomplete` の行が 1 件以上**と、**`draft` の行が 1 件以上**の
両方が現れていなければ昇格に失敗しています。その場合は先へ進まず修正してください。

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

監査結果のうち `publication.draft_candidates` は、**昇格させた node を含まないこと**を
確認してください。昇格 node は `confirmed` かつ `pass` ですが `readiness incomplete`
なので候補に入らないのが正しい挙動です。この「昇格したのに候補に入らない」という
対応関係こそが scenario の required_observations の 3 番目そのものなので、progress の
evidence には次の 2 つを **セットで** 記載してください。

- `macro-preview.json` 上で昇格させた node の `graph_node_id` と、その
  `confirmation_status` / `evaluation_status` / `implementation_readiness.status`
- `decompose-audit.json` の `publication.draft_candidates` に **その id が現れないこと**

なお `publication.readiness_probe` は監査側が自前で複製・代入した検体を判定する
field であり、skill の gate が働いた証拠にはなりません。**evidence として使わないで
ください。**

## goal-seek の終了

監査後に同じ `original_goal` と hash を持つ 2 行目だけを intermediate へ append します。
完了マーカーより前に progress の全 checklist を更新してください。

- 実測項目は `status: "pass"` とし、`decompose-audit.json` の具体的な field を evidence にする
- 「昇格したが readiness 未達の feature が候補から除外される」項目は
  `status: "pass"` とし、上記の 2 点セット (昇格 node の 3 status と
  `draft_candidates` にその id が無いこと) を evidence にする
- exact-13/commit/projection のように、候補が 0 件のため原理的に発火しない項目のみ
  `status: "not_applicable"` とし、候補が空である根拠 field を evidence にする。
  「まだ実装していないから」を理由に `not_applicable` にしてはいけない
- `pending` と `evidence: null` を一つも残さない

goal-spec、progress、intermediate の 3 点を fixture の `eval-log/` に揃え、正本 Goal/hash
の検査が通ることを確認してください。

## 完了 (再掲・省略禁止)

成功・失敗・中断のいずれでも、最後に次の 1 ファイルだけを Write してください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260726T110000Z-mfh7-decompose-promote/out/status.json`

内容:

`{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition"}`

その直後に「DONE: <status>」と 1 行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には上記 status.json 以外を書かないこと。

## 最後の 1 手 (書き忘れ防止のセルフチェック)

完了マーカーを Write した直後に、必ず次のコマンドを実行して結果を確認してください。

```bash
ls -1 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-011205-wt-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260726T110000Z-mfh7-decompose-promote/out/
```

出力が `status.json` の 1 行ちょうどでなければ、書き先が誤っています。誤って
`out/` の外 (run ディレクトリ直下など) へ書いてしまった場合は、そのファイルを削除し、
`out/status.json` へ書き直してから「DONE: <status>」を報告してください。
