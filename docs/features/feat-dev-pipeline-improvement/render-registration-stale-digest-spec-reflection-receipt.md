---
status: confirmed
layer: spec-reflection-receipt
feature_id: feat-dev-pipeline-improvement
beads_id: HarnessHub-0ui0
graph_node_id: issue-render-registration-stale-digest-20260803
branch: devgraph/issue-render-registration-stale-digest-20260803
base_branch: main
spec_impact: reflected
reviewed_at: 2026-08-04
---

# registration receipt stale digest 仕様反映受領書

## 対象と結論

| 項目 | 内容 |
| --- | --- |
| Beads | `HarnessHub-0ui0` |
| Dev Graph node | `issue-render-registration-stale-digest-20260803` |
| 目的 | 後続 sync により graph digest だけが古くなった正常な registration receipt を、完全な検証失敗と区別して表示する。 |
| 仕様・設計影響 | **あり（repository 内の Dev Graph testing-qa 契約）**。製品 API、DB schema、認証認可、製品 UI、Cloudflare deploy unit には影響なし。 |

node ID、件数、source digest、source lineage がすべて一致することは登録の本体証拠である。登録後の sync により graph 全体の digest だけが変化した場合は、HTML を停止せず `partial` / `graph_digest_stale` を表示する。他の証拠の不一致は従来どおり fail-closed（不整合時に処理を止める）である。

## 正規フローで反映した層

| 層 | 反映先 | 内容 |
| --- | --- | --- |
| system-spec | `system-spec/testing-qa.md` | 正常照合、digest のみ stale、fail-closed の境界を testing-qa 実装フィードバックとして確定。 |
| specs | `specs/harness-hub-system-specification.md` | `HarnessHub-0ui0` を既存の receipt 検証仕様へ追記し、3 状態の表示契約を集約。 |
| architecture | `architecture/harness-hub-testing-qa.md` | renderer の evidence 評価順序と出力状態を設計判断として追記。 |
| features | `features/feat-dev-pipeline-improvement.md` | feature の変更履歴と scope を更新。 |
| tasks | `tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13-registration-stale-digest-handoff.md` | 300 行上限を守る専用 P13 引継ぎに branch、検証、統合条件を記録し、補助 task node `task-render-registration-stale-digest-handoff-20260804` として正規登録。 |
| docs | `docs/features/feat-dev-pipeline-improvement/` | changelog、最終レビュー、本受領書へ判断と証跡を記録。 |
| graph / Beads | `issues/sys-render-registration-stale-digest-20260803.md`、補助 task node と Dev Graph / Beads | task と実装・受領書を相互に追跡可能にする。 |

`system-spec/spec-state.json` は製品仕様セルの状態を変えないため更新しない。今回の反映は、確定済み製品仕様を変更せず repository tooling の検証契約を具体化するものだからである。

## 実装契約

| 受領書と graph の関係 | renderer の結果 | HTML |
| --- | --- | --- |
| 全証拠と graph digest が一致 | `verified` | 生成する |
| graph digest **だけ**が後続 sync により stale | `partial` / `graph_digest_stale`、`graph_digest_match: "stale"` | 生成し、部分照合と明示する |
| receipt 未指定 | `not_performed` | 生成する |
| node ID・件数・source digest・source lineage のいずれかが不一致 | `ContractError` | 生成しない |

この契約は CLI JSON、HTML banner、HTML 埋込み metadata、
`run-dev-graph-render` Skill、回帰テストで同一の状態語を使う。

## 受領した検証証跡

- task 仕様書ゲート: `validate-system-plan.py --feature-package feat-dev-pipeline-improvement` は exact P01--P13、違反 0。
- focused regression: `pytest -q plugins/dev-graph/tests/test_render_registration_verification.py` は 3 PASS。stale digest 単独で `partial` と HTML を生成するケースを含む。
- graph: `validate-graph-schema.py` は valid、complete、violations 0。
- C05 fresh live trial: `20260806T030000Z-0ui0-render-guardclean`。通常 render、分母・分子・source digest の独立再計算、C02 receipt-write bypass guard を再実行し、独立 evaluator は PASS と判定した。
- plugin 全回帰と repository CI は PR 前の最終品質ゲートとして再実行し、結果を下記「最終更新」に記録する。

## 500 行制約

変更した手書きコード・文書はすべて 500 行以下で確認する。既存の canonical
`.dev-graph/state/graph.json` は writer が管理する単一の graph authority であり、消費者契約を壊して分割しない。

## 中学生向けの説明

受付をしたあとで、名簿に別の人の作業が追加されると「名簿全体の番号」は変わることがある。受付した人の名前、人数、元の書類が全部合っているなら、「番号だけ少し古い」と正直に表示して、受付まで失敗とは言わないようにした。名前や人数が違うときは、これまでどおり止める。

## 技術的な説明

registration receipt は node 集合、適用件数、source digest、source lineage、graph digest を持つ。前四者は対象 registration の完全性を示し、graph digest は登録後の正規 sync が graph revision を進めると変化しうる周辺状態である。renderer は前四者の mismatch を例外にしつつ、graph digest 単独 mismatch を三値 `graph_digest_match="stale"` として `partial` state に落とす。これにより証拠の改ざんと時間経過による digest drift を区別し、失敗閉鎖の安全性を維持する。

## 最終更新

2026-08-04 の最終レビューで、task 仕様書ゲート（P01--P13 exact、違反 0）、13 node の
source digest 検査（不一致 0）、renderer focused regression（3 PASS）、runtime coverage
（11 PASS）、C05 criteria evidence（2 PASS）、content review、plugin package check、artifact
placement、doc line limit を再実行し合格した。C05 の guard-clean fresh live trial は overall PASS、
nudge=0、gate=0 である。

repository CI は **138 PASS / 5 WARN / 1 FAIL** だった。FAIL は今回未変更の C03
`run-dev-graph-sync` と C14 `run-dev-graph-decompose` の既存 live-trial behavior closure が
stale であるためで、今回の C05 は最新証跡により解消済みである。残課題は C03/C14 の fresh
live trial をそれぞれの担当変更として再取得すること、および本 draft PR のレビューと main への
取り込みである。commit SHA と PR 番号は公開後に Beads `HarnessHub-0ui0` の notes へ記録する。
