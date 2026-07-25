# タスク: dev-graph:run-dev-graph-system-spec の実走 (scenario C19-OUT1-positive-system-spec-lineage)

タスクファイルを読み終えた直後、唯一許可された最初のツール呼び出しは次のSkillです。Explore / Agent / Read / Bash / Writeを先に呼んではいけません。

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-203623-wt-8/eval-log/dev-graph/live-trial-fixtures/system-spec-pr72-r5"})

重要: 入れ子Skillの完了を、この親タスクの完了と取り違えないでください。各入れ子Skillが完了しても同じassistant turnで親ワークフローへ戻り、特に2つ目の`dev-graph:run-dev-graph-node`完了後は、止まらず直ちに親progress更新、整合性検証、lock削除、親intermediate追記、status.json作成まで続けてください。`out/status.json`を書いて`DONE: PASS|FAIL|ERROR`を報告する前にturnを終了してはいけません。

被験fixtureは上記パスにあるdev-graph初期化済みの独立Git repositoryです。`plugins/dev-graph/scripts/`配下のscriptをBashから直接実行して被験Skillを代替してはいけません。

## goal-seek配線

被験Skillの`## ゴールシーク実行`に従い、fixtureの`eval-log/`へ次の3点を作成してください。

- `run-dev-graph-system-spec-goal-spec.json`
- `run-dev-graph-system-spec-progress.json`
- `run-dev-graph-system-spec-intermediate.jsonl`

`original_goal`はSKILL.mdの文字列をそのまま使い、そのUTF-8 SHA-256を使用してください。intermediateの最初の行はSkill実行前に作り、検証後の2行目は末尾追加だけで記録してください。既存行の編集・上書きは禁止です。

## system-spec-harness canonical flow

elicit → doc-fetch → compile → completeness-evaluatorを必ず各Skillとして実行してください。fixtureの`requirements-brief.md`を非対話入力として使います。

入力スキーマ上の注意:

- foundationの`objectives`は`id` / `text` / `measure`を持つobject配列です。
- decisionは`question`、2〜3件のoptions、recommendation、user_decisionを持ち、各optionの`cost_model`は`category` / `amount` / `currency` / `billing_period` / `tco`を持つobjectです。
- 正本spec-stateは`apply-spec-transition.py`の単一writer経路だけで更新してください。
- 公式資料のバージョンは記憶で確定せず、doc-freshness auditorの公式再照合結果を正本としてください。

matrix / hearing / doc-freshnessの各auditorは対象Skillが定めるAgent/Task経路で実際にforkしてください。FAILが返った場合は成果物を直し、同じauditorを再forkして実PASSを得るまでcompletenessをPASSにしないでください。

fork台帳はPostToolUse hookが実際に追記した次の正本だけを使い、作成・上書き・コピーしないでください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-203623-wt-8/eval-log/system-spec-harness/audit-fork-ledger.jsonl`

completeness gateは`aggregate-completeness.py`に上記`--fork-ledger`と`--session a005a527-765b-4b38-891f-50933dfac921`を明示して実行してください。reportのaudit_delegationsは最後に実行した各auditorの実verdictと一致させてください。

## C02登録 — Skill呼び出し必須

canonicalな`specs/*.md`と`architecture/*.md`をWriteで先に作ってはいけません。node inputとbodyをfixtureの`eval-log/c02-inputs/`に置いた後、specificationとarchitectureの各登録対象について次のSkillを実際に呼び出してください。

Skill({skill: "dev-graph:run-dev-graph-node", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-203623-wt-8/eval-log/dev-graph/live-trial-fixtures/system-spec-pr72-r5 --input <node-input-json> --body-file <body-markdown>"})

Explore/AgentでC02 Skillを読むだけでは呼び出しになりません。C02 Skill呼び出しより前に`upsert-node.py`をBashから直接実行してdry-runや登録をしてはいけません。node inputの`tracker_binding`はfixture configの実値`beads`を使ってください。

2つ目のC02 Skillが完了した直後、同じturnで次をすべて実行してください。

1. 親`run-dev-graph-system-spec-progress.json`を更新する。
2. `validate-source-digest.py`と`validate-evidence-refs.py`を実行しexit 0を確認する。
3. すべてのC02 process終了を確認し、fixture内の`.dev-graph/state/.graph.json.register.lock`だけを`rm -f`で除去する。
4. `find`または`test ! -e`で同lock不存在を再確認する。
5. 親intermediateの2行目を末尾追加し、goal-seek検証を通す。
6. 下記status.jsonを書いて`DONE`を報告する。

## 成功条件

- system-spec-harnessのcanonical flowが完走する
- imported specification / architectureがsource lineageとevaluator evidenceを保持する
- 登録が2回の`dev-graph:run-dev-graph-node` Skill経由で行われる
- coverage / source-citation / aggregate-completeness / source-digest / evidence-ref / goal-seekがPASSする
- `.graph.json.register.lock`が残っていない

処理が終了したら、完了マーカーを次の1ファイルだけにWriteしてください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260724-203623-wt-8/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260725T201500Z-system-spec-pr72-r5/out/status.json`

内容は`{"status":"PASS|FAIL|ERROR","scenario":"C19-OUT1-positive-system-spec-lineage"}`とし、最後に「DONE: <status>」と1行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- Skillの手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/`には`status.json`以外を書かないこと。
