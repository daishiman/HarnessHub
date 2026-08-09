# タスク: dev-graph:run-dev-graph-requirements の実走 (scenario C04-OUT1-positive-ready-handoff)

この run は scenario `C04-OUT1-positive-ready-handoff` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-27-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260808T123537-c04req/fixture-repo`

FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind requirements`
が生成した正本形状)。作り直さないでください。feature `F-LIVE-001` は
confirmed / evaluation-pass / readiness-complete で、published package は FIXTURE 内
`system-plan/F-LIVE-001/` にあり P01..P13 の exact-13 DAG です。package は skill が解決します。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## required_observations (scenario 正本の逐語転記)

1. a capability-build task-graph handoff is emitted for the exact-13 package
2. the handoff remains bound to the feature and source digest
3. the requirements skill generates no implementation source file

## 工程 1: skill の実走

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-27-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260808T123537-c04req/fixture-repo --feature-id F-LIVE-001"})

SKILL.md の手順どおり、C11 (`validate-graph-schema.py`)・C02 保存済み readiness/evaluation・
`validate-source-digest.py`（選択 feature + その `architecture_refs` + package task 13 件の
lineage closure を重複除去・昇順で `--registered` に全件渡す）・
`validate-system-plan.py --repo-root <FIXTURE> --feature-package <選択 feature node の feature_package_id>`
の四 gate を実行して照合してください。`--staging` や引数なし実行へ読み替えないこと。

四 gate が全て PASS した場合だけ、要件定義書 / readiness matrix / graph snapshot digest /
capability-build task-graph handoff を**実ファイルとして emit** してください。
gate が PASS した事実だけで完了申告することは契約違反です。

## 工程 2: 検証

1. capability-build / task-graph build 向けの handoff が、exact-13 package (P01..P13) に対して
   実ファイルとして emit されたことを確認する。emit 先の絶対パスと、handoff が参照する
   13 task の実値を示すこと。
2. その handoff が feature `F-LIVE-001` と source digest に束縛されていることを確認する。
   handoff 内の feature 参照 / `feature_package_id` / source digest の実値と、
   package 側 (`staging-manifest.json` の canonical digest 等) および graph node 側の
   `source_lineage.source_digest` の実値が一致することを突き合わせて示すこと。
3. 本 skill の実走によって実装 source file が 1 件も生成されていないことを確認する。
   FIXTURE 全体で本実行前後の差分を取り、追加されたファイルの一覧を示したうえで、
   その中に実装コード (アプリケーション source file) が 0 件であることを示すこと。
   「生成していないはず」ではなく、実際のファイル一覧を根拠にすること。

## 工程 3: goal_seek 配線 (必須)

`run-dev-graph-requirements` は `goal_seek` を宣言します。SKILL.md の「ゴールシーク配線」節に従い、
FIXTURE の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-requirements-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-requirements-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-requirements-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は `goal-spec.json` の `original_goal` 正本文の UTF-8 SHA-256 実値にしてください。
SKILL.md「ゴールシーク検証」節の検査スクリプトを実際に実行して通過を確認してください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-27-2/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260808T123537-c04req/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C04-OUT1-positive-ready-handoff"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先である FIXTURE 内へ)。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- 実 GitHub API / `gh` / 実 Beads へアクセスしないこと。
- fixture の graph store・package・registration receipt を手作業で書き換えないこと
  (skill の正規手順が行う更新のみ許容)。
- 実装コード (アプリケーション source file) を生成しないこと。実装は capability-build へ handoff する。
