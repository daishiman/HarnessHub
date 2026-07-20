# Prompt: R3-import

> 確定system-spec章をC02経由で登録しsource_lineage(origin_kind/plugin/path/version/digest/imported_at)、confirmation=confirmed、evaluator evidenceを保持する

## Layer 1: 基本定義層

- `responsibility_id`: `R3-import`
- `skill`: `run-dev-graph-system-spec`
- 不変目的: 確定system-spec章をC02経由で登録しsource_lineage(origin_kind/plugin/path/version/digest/imported_at)、confirmation=confirmed、evaluator evidenceを保持する
- 成功条件は Layer 2 の受入条件と Layer 5 の二値 checklist の同時充足とする。

## Layer 2: ドメイン層

### 入力契約

- confirmed chapters、evaluator PASS、origin lineage、readiness。

### 出力契約

- C02 receiptとlineage/confirmation/evidence付きimport report。
- `confirmation_evidence.evidence_ref`は登録時点で対象repository内に実在するpath(正準: `system-spec/completeness-report.json`)を指す。dangling referenceを登録しない。
- `source_lineage.source_digest`は各nodeの`source_path`の実fileからsha256を計算して記録する。他fileのdigest流用0件。登録後に`source_path`の実sha256と再計算一致を検証する。
- 本runが登録・更新していない既存nodeにdangling evidence_refを検出した場合は、修正も無視もせずblockerとしてimport reportへ報告する(自己申告の「dangling 0件」は本runの登録・更新分に限る)。
- 元のゴールを`$DEV_GRAPH_ROOT/eval-log/run-dev-graph-system-spec-goal-spec.json`へ、checklistのstatus/evidenceを`$DEV_GRAPH_ROOT/eval-log/run-dev-graph-system-spec-progress.json`へ書き出す(SKILL.md eval-log契約)。

### 責務境界

- C02迂回で書かず内容をfeatureへ複製せず未確定章を登録しない。

### 受入条件

- 全node正規kind、lineage全field/evidence/readiness欠落0になる。
- 本runが登録・更新した全nodeの`evidence_ref`の指すfileが対象repository内に実在し、`source_digest`が各`source_path`の実sha256と一致し、progress.jsonが書き出されている。既存nodeのdangling検出は報告済みである。

## Layer 3: インフラ層

- 使用資産: Skill run-dev-graph-nodeとvalidate-graph-schemaとvalidate-evidence-refs。
- path は caller repository context または skill-relative reference から解決し、環境固有の絶対 path を成果物へ保存しない。

## Layer 4: 共通ポリシー層

- 入力契約、authority、containment、schema のいずれかが未達なら fail-closed とし、部分成功を PASS にしない。
- secret と認証情報を prompt 出力、graph、receipt に埋め込まない。
- 同一入力と同一 revision/digest では同じ decision と output shape を返す。

## Layer 5: エージェント層 (l5-contract v2.0.0)

### 5.1 担当 agent

- `run-dev-graph-system-spec/R3-import`。重い判断または独立検証は `Agent` で分離 context に fork する。

### 5.2 ゴール定義

- 目的: 確定system-spec章をC02経由で登録しsource_lineage(origin_kind/plugin/path/version/digest/imported_at)、confirmation=confirmed、evaluator evidenceを保持する
- 背景: この責務を隣接 responsibility から分離し、入力・出力・authority を一意にする。
- 達成ゴール: C02 receiptとlineage/confirmation/evidence付きimport reportが生成され、受入条件を満たした状態になっている。

### 5.3 完了チェックリスト (ゴール到達の停止条件)

- [ ] 宣言した入力が全て検証済みである
- [ ] 出力が宣言した shape と authority を満たす
- [ ] 責務境界に反する read/write/delegation が0件である
- [ ] 全node正規kind、lineage全field/evidence/readiness欠落0になる
- [ ] `validate-evidence-refs.py --repo-root <root> --registered <本runの登録・更新id(カンマ区切り)>`を実際に実行しexit 0である(本run分dangling 0件はこのscriptのexit codeのみを根拠とする。散文の自己申告は根拠にならない)
- [ ] 同scriptの出力`existing_dangling`をimport reportとprogress.jsonへblockerとして転記した(0件ならその旨を記録)
- [ ] 本runが登録・更新した全nodeの`source_digest`が各`source_path`の実fileのsha256と一致する(他fileのdigest流用0件)
- [ ] `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-system-spec-goal-spec.json`と`$DEV_GRAPH_ROOT/eval-log/run-dev-graph-system-spec-progress.json`を書き出した

### 5.4 実行方式

- 固定手順を持たない。未達 checklist を評価し、操作を都度立案・実行・検証する。各周回末に `original_goal`、`delta_from_original`、`merged_directive_for_next`、`drift_signal` を追記し、最大5周で未達なら上位 skill へ fail-closed で返す。

## Layer 6: オーケストレーション層

- ids/lineage/readinessをC04へ渡す。
- 前段 receipt/digest と後段 input digest を一致させ、stale handoff を拒否する。

## Layer 7: UserInput

- 不足情報が実行結果を変える場合だけ `AskUserQuestion` を使う。repo policy で決まる値、保存先、secret、node ID は質問しない。
- ユーザー提示は日本語、schema key/CLI parameter は原語を保つ。

## 出力指示

Layer 2 の入力・出力・責務境界・受入条件を正本としてこの単一責務だけを実行し、思考過程を出力せず、artifact/receipt、検証結果、未達 blocker だけを返す。

