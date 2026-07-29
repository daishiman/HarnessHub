# タスク: dev-graph:run-dev-graph-decompose の実走 (scenario C14-OUT1-positive-macro-decomposition-r6, binding=beads)

この run は scenario `C14-OUT1-positive-macro-decomposition-r6` の充足を確認するものです。

## required_observations (scenario 正本の逐語転記 — 要約・言い換え・取捨選択は禁止)

1. the produced feature and architecture nodes form an acyclic DAG whose inter-feature depends_on stays within declared_granularity_threshold.max_value measured by declared_granularity_threshold.metric
2. in a run that writes for real, pre-evaluation draft features publish zero issues, and every zero carries the reason it is zero, so suppression by the draft gate is never reported interchangeably with a binding route the configuration disables or with the absence of a live candidate
3. at least one actual produced draft feature remains excluded while one actual produced feature advanced to confirmed, evaluation-pass and readiness-complete becomes the sole publication candidate, so the exclusion is a decision of the implementation publication gate and not a side effect of a run that wrote nothing anywhere
4. the beads and none bindings are exercised as two separate runs whose recorded publication routes differ, while the github binding is recorded as unreachable for a macro-only run together with the schema rule that makes it unreachable, and every binding's figure is derived from the tracker binding actually persisted in the run's graph rather than from an argument supplied to the audit, so no binding's measurement is one value restated from the audit's own input
5. the local, Beads, GitHub and Projects write counts are derived by differencing repository state captured before and after the run rather than restated from the skill's own report, and the preview graph is validated through the stdin path so no temporary file is created inside the managed repository

observation 1 が参照する `declared_granularity_threshold` は次です。

```json
{
  "metric": "max_inter_feature_depends_on_per_feature",
  "max_value": 3,
  "rationale": "macro 分解の粒度は「1 feature が兄弟 feature へ何本依存するか」で測る。observation 1 の文面 (inter-feature depends_on) に直接対応し、preview graph の node 単位で機械測定できるため、総数や比率のようにグラフ全体へ均されて個別異常が埋もれることがない。値 3 の根拠: macro 分解が生む feature は通常 2-6 件で、ある feature が 4 件以上の兄弟へ依存する状態は「兄弟のほぼ全部に依存している」ことを意味し、feature 境界の切り方が task 粒度まで細かくなった兆候。現行 fixture の正常系は feature 1 件あたり最大 1 本 (dashboard / notification / admin-report がそれぞれ feat-user-auth-001 へ 1 本ずつ張るだけで、兄弟同士の依存は無い) なので 3 なら正常系が余裕で収まり、かつ過剰分解は確実に超える。緩めると閾値が有名無実になり、2 以下にすると正当な macro 分解まで落ちる。"
}
```

## 検証対象の fixture

`/Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads`

この contained fixture だけで検証してください。ワークツリー本体の管理対象 graph / config /
content root を手で編集してはいけません。fixture は dev-graph 初期化済みで、feature /
architecture / task node をひとつも持たない状態から始まります。生成された node が skill 由来で
あることを帰属させるためです。

入力 want は次です (fixture の `want.md` にも同じ文があります)。

```text
ユーザー登録とログインができて、ログイン後にダッシュボードで自分の利用状況を見られる小規模 Web アプリを作りたい。登録完了時と重要な変更時には通知メールを送りたい。運営者向けには全ユーザーの利用状況を集計したレポート画面もほしい。
```

## この run の binding は `beads` — node 宣言で決まる (設定では決まらない)

macro 登録経路は repository の `execution_tracker` 設定を参照しません。したがって run の
binding は「登録した node が `tracker_binding` に何を宣言し、それが graph に何として残ったか」
が正本です。2 つの系列 (`beads` / `none`) の fixture は設定まで同一で、違うのは
この宣言だけです。

**本 run で C02 へ登録する全ての node の `tracker_binding` を `"beads"` にしてください。**
schema の対応規則も併せて満たす必要があります。

- `tracker_binding: "beads"` → `github_publication.mode` は `"local_only"`
- `tracker_binding: "none"` → `beads_linkage` は `null` かつ `github_publication.mode` は `"local_only"`

`tracker_binding: "github"` は本 trial では宣言できません。未起票の macro 段階の node は
`github_publication.mode` が `"local_only"` であるのに対し、schema の github 規則は
`"issue"` または `"issue_and_projects"` を要求するためです。**この到達不能性は隠さず、
progress の該当項目へ「schema 規則により宣言不能」として記録してください** (取り繕わない)。

## 最重要 — Skill ツールの起動が本 trial の測定対象

被験 skill の実行は必ず **Skill ツール呼出し**で行ってください。`plugins/dev-graph/scripts/`
配下の script を Bash から直接実行して skill 本体を代替した場合、成果物が正しくても trial は
launch=FAIL として破棄されます。

## goal-seek の開始

`run-dev-graph-decompose-goal-spec.json` の `original_goal` には、入力 want ではなく
SKILL.md の `## ゴールシーク実行 > ### ゴール (Goal)` にある次の正本文を、一字も変更せず
格納してください。

```text
自然文の「やりたいこと(大)」からfeatureノード群+architectureノード+機能間depends_onを生成するマクロ分解を行い、ready featureごとにsystem-dev-planner(ミクロ層)を自動起動または手動`/system-dev-plan`実行結果を受理してpromoted typed task群をparent_feature付きでC02へatomic登録し、binding=beadsはC28へissue/依存edge、binding=githubはC12へIssue/任意Projects、binding=noneはローカルのみへ冪等投影した状態になっている
```

この完全な UTF-8 文字列の SHA-256 を `original_goal_hash` に使い、Skill 実行前に
`run-dev-graph-decompose-intermediate.jsonl` の最初の行を作ってください。各行には
`original_goal`、`original_goal_hash`、`current_goal_snapshot`、`delta_from_original`、
`merged_directive_for_next`、`drift_signal` が必要です。

次に Git index 登録済み共通監査ヘルパーで pre-state を取ってください。

```bash
python3 /Users/dm/orca/workspaces/HarnessHub/wt-19/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py snapshot \
  --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads \
  --output /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads/eval-log/pre-state.json
```

observation 5 は write count を「run の前後で捕えた repository state の差分」から導けと要求します。
この pre-state を取らずに skill を起動したら、その時点で observation 5 は回収不能です。

## 被験 Skill (実書込みモード — `--dry-run` は付けないこと)

以下を必ず Skill ツール呼出しで実行してください。**`--dry-run` を付けてはいけません。**

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "ユーザー登録とログインができて、ログイン後にダッシュボードで自分の利用状況を見られる小規模 Web アプリを作りたい。登録完了時と重要な変更時には通知メールを送りたい。運営者向けには全ユーザーの利用状況を集計したレポート画面もほしい。 --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads"})

理由: observation 2 は「実書込みの run で、評価前 draft feature の起票が 0 件」であることを
要求します。`--dry-run` では起票経路そのものが無効化されるため、0 件という観測が「draft gate が
効いた」ことの証拠になりません (検査対象が空集合)。`--dry-run` の write 0 件は別条件
`criteria:OUT3` の担当であり、本 trial の判定対象ではありません。

Skill が入力 want から生成した feature / architecture / depends_on の preview graph を一度だけ
次へ保存してください。別の graph や期待 node を手書きしてはいけません。

`/Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads/eval-log/macro-preview.json`

preview graph を C11 検証するときは、管理対象 repo へ一時ファイルを書かず **stdin 経路**を
使ってください (observation 5 の後半)。

```bash
python3 /Users/dm/orca/workspaces/HarnessHub/wt-19/plugins/dev-graph/scripts/validate-graph-schema.py --graph - --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads < /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads/eval-log/macro-preview.json
```

## lifecycle 昇格 (observation 3 — draft gate と candidate gate を同じ run で分離する)

skill が生成した feature のうち **1 件だけ**を、`confirmed` / `evaluation-pass` /
`implementation-readiness-complete` へ進めてください。残りの feature には触らず、少なくとも
1 件を評価前 draft のまま残してください。

- 昇格は C02 の通常 node 更新経路 (`upsert-node.py --input <feature-patch>`) で行ってください。
  `<feature-patch>` は `graph_node_id` と `patch` を持ち、patch 内に
  `confirmation_status` / `evaluation_status` / `confirmation_evidence` /
  `implementation_readiness` をまとめます。task 完了専用 operation は使いません。
  `.dev-graph/state/graph.json` を Write / Edit / redirect で直接書き換えては
  いけません (C10 guard の遮断対象であり、昇格が skill 側の gate を通った証拠にもなりません)。
- 昇格の対象は **skill が生成した node** に限ります。fixture へ node を播いてはいけません。
  播くと「生成された node は skill 由来」という帰属が壊れます。
- 昇格後、publication 経路を通すために被験 skill を同じ args でもう一度 Skill ツールで実行して
  ください。冪等性が要求されているので、二度目の実行で node が重複してはいけません。

これで「draft のまま除外された feature」と「昇格して唯一の publication candidate になった
feature」が同じ run に同時に存在します。observation 3 が要求しているのはこの状態です。

## 実測 (共通監査ヘルパーの結果だけに依存しないこと)

保存後、監査コードを作成・編集せず、次を実行してください。

```bash
python3 /Users/dm/orca/workspaces/HarnessHub/wt-19/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py audit \
  --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads \
  --preview /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads/eval-log/macro-preview.json \
  --scenario /Users/dm/orca/workspaces/HarnessHub/wt-19/plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json \
  --pre-state /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads/eval-log/pre-state.json \
  --plugin-dir /Users/dm/orca/workspaces/HarnessHub/wt-19/plugins/dev-graph \
  --run-mode apply \
  --run-binding beads \
  --output /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads/eval-log/decompose-audit.json
```

`--run-binding` は観測ではなく申告です。監査は graph に永続した `tracker_binding` を実測し、
申告と食い違えば `run_binding_attested: false` で落とします。宣言を `beads` にし忘れたまま
申告だけ合わせても緑にはなりません。

監査結果の `pass` だけを根拠に成否を決めてはいけません。次の 5 点を
`.dev-graph/state/graph.json` の実内容から自分で読み直して実測し、値をそのまま報告してください。

1. **実登録の確認**: `graph_revision` が 0 より大きく、`nodes` が空でないこと。登録された全 node
   の `graph_node_id` と `artifact_kind` を列挙する。
2. **DAG と粒度 (observation 1)**: `depends_on` の全辺を列挙して本数を数え、自分で DFS または
   Kahn のアルゴリズムを実装して循環の有無を判定する。**辺の本数と判定結果の両方**を報告する。
   辺が 1 本以下なら「循環を構成しえないので検査に判別力がない」と明記する。あわせて feature
   1 件あたりの inter-feature `depends_on` の最大本数を数え、`declared_granularity_threshold`
   の `max_value` と比較した実値を報告する。
3. **task 粒度混入なし**: 登録 node の `artifact_kind` 内訳を数える。`task` が 0 件であることと、
   `phase_ref` / `parent_feature` / `feature_package_id` が設定された node の件数、`P01`..`P13`
   形式 ID を持つ node の件数を報告する。
4. **draft gate と candidate gate の分離 (observation 2, 3)**: 各 feature node の
   `confirmation_status` / `evaluation_status` / `implementation_readiness.status` を列挙する。
   draft のまま残った feature と昇格した feature の両方を名指しし、起票 0 件が
   **draft gate による抑止**なのか、**その binding に投影経路が無い**のか、**その binding が
   schema 規則で宣言不能**なのか、**live candidate の不在**なのかを区別して書く。この 4 つを
   言い換えで済ませてはいけません。
5. **binding 次元 (observation 4)**: 各 node の `tracker_binding` / `issue_linkage` /
   `beads_linkage` / `github_project_linkages` を graph から列挙し、本 run に永続した binding の
   集合を報告する。監査出力の `persisted_bindings` / `run_binding_attested` と、各 binding の
   `route_declarable` / `exercised_by_run` / `zero_attribution` を、`declaration_probes` が返した
   schema 違反文と併せて報告してください。**引数 `--run-binding` を観測値として書き写しては
   いけません。** github が宣言不能である根拠は、監査が実装 schema から取得した違反文
   (`github_publication.mode` に関するもの) をそのまま引用してください。

write count は共通監査が前後状態の差分から導きますが、その値が実際に作成されたファイル数と
一致するかを fixture の git 差分 (`git -C /Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/live-trial-fixtures/dcmp-r8-beads status --short`) からも確認してください。
skill 自身の報告値を書き写してはいけません (observation 5)。固定値の自己申告も禁止です。

## goal-seek の終了

監査後に同じ `original_goal` と hash を持つ 2 行目だけを intermediate へ append します。
完了マーカーより前に progress の全 checklist を更新してください。

- 実測項目は `status: "pass"` とし、上記 1..5 の具体的な実測値を evidence にする
- 本 scenario で発火しない項目は `status: "not_applicable"` とし、**なぜ発火しないのか
  (draft gate か / 投影経路が無いか / schema 規則で宣言不能か / live candidate 不在か) を
  区別して** evidence に書く
- `pending` と `evidence: null` を一つも残さない

goal-spec、progress、intermediate の 3 点を fixture の `eval-log/` に揃え、正本 Goal / hash の
検査が通ることを確認してください。

## 完了

成功・失敗・中断のいずれでも、次に完了マーカーを 1 ファイルだけ Write してください。

`/Users/dm/orca/workspaces/HarnessHub/wt-19/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260728T222100Z-dcmp-r8-beads/out/status.json`

内容:

`{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition-r6", "binding": "beads"}`

最後は「DONE: <status>」と 1 行だけ報告してください。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
