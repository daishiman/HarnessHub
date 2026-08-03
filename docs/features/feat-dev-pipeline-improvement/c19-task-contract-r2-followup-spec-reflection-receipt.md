---
status: recorded
layer: feature-spec-reflection
beads_id: HarnessHub-m0bd
dev_graph_node_id: issue-c19-live-trial-rerun-task-contract-r2-20260803
parent_feature: feat-dev-pipeline-improvement
spec_impact: none
reviewed_at: 2026-08-03
---

# C19 live-trial task contract r2 — 仕様反映受領書

## 目的と背景

`HarnessHub-eiky` は、system-spec の C19 live-trial が公式情報を実取得せず、古いモデル知識を citation（出典情報）として記録できた問題を防ぐため、C19 scenario に 3 つの必須 task contract を追加し、scenario ID を r2 へ更新した。

この更新で旧受領書は意図どおり stale（古い契約を参照する状態）になった。`HarnessHub-m0bd` は、新しい契約を満たす live-trial を実走して受領書を更新するための follow-up である。

## 結論

今回の変更は **HarnessHub 製品の仕様・設計を変更しない**。変更は `plugins/dev-graph/` の C19 試験契約と、その follow-up の記録だけである。

`main` 統合後の新しい r2 live-trial が受領書を更新し、C19 の旧証跡検出を解消した。commit、push、Draft PR は下記の最終品質ゲートがすべて PASS した場合にのみ実施する。

## 層別の反映判断

| 層 | 結果 | 理由 |
| --- | --- | --- |
| `docs/` | 更新 | 本受領書と feature の変更履歴に、判定・検証結果・再開条件を記録する。 |
| `features/` | 非変更 | feature 本体は変更履歴を `docs/features/.../feat-dev-pipeline-improvement-changelog.md` へ分離する規約であり、そこへ記録する。 |
| `system-spec/` | 非変更 | API、データ、認可、UI、配備、運用 SLO の確定事項に変更がない。 |
| `specs/` | 非変更 | 製品要件・外部契約は変わらない。plugin 内部契約を複製すると二重正本になる。 |
| `architecture/` | 非変更 | 既存 `qa-100` の「scenario 改訂後は fresh run で旧受領書を更新する」設計を適用するだけで、新たな設計判断はない。 |
| `tasks/` | 非変更 | 本件は standalone issue。凍結済み exact-13 task spec を手編集すると source digest（内容の指紋）を壊す。 |

plugin 内部の技術契約の正本は `plugins/dev-graph/references/live-trial-task-contract.md` と `plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` である。

## 最終レビューと検証結果

- `git diff --check`: PASS（空白エラーなし）。
- task specification gate: `validate-system-plan.py --feature-package feature-package/feat-dev-pipeline-improvement` は exact-13、violations 0、digest `af8a73df…da6` で PASS。
- live-trial planner: `main` 統合直後に旧 r2 verdict を `scenario-contract-superseded` と判定して新規実走を要求した。実走後は新 verdict を `current-pass` として再利用可能と判定する。これは fail-closed（不整合を成功扱いしない）設計が正しく切り替わった証拠である。
- 新規 live-trial: `20260806T020000Z-m0bd-c19-r3-postmain` は overall=PASS、nudge=0、gate=0。`run-system-spec-doc-fetch` が SQLite と FastAPI の公式ページを実 Fetch し、取得時刻・現行 version を記録した。独立監査 C06/C07/C08、C02 登録、source digest・evidence reference 検証、fresh evaluator の3観測もすべて PASS した。
- C19 acceptance pytest: `test_live_trial_fixture_builders.py`、`test_skill_criteria_evidence.py`、`test_live_trial_task_contract.py` は 92 passed。最新 task と scenario-verdict が r2 scenario ID、task_contract の3必須断片、3 required observations、goal-seek 証跡を参照することを検査した。
- 最終品質ゲート: exact-13 task specification、graph schema、open residue、live-trial task contract、文書行数、artifact placement、plugin package、`git diff --check` はすべて PASS（plugin package の 23 件は既定の非ブロッキング advisory のみ）。

## Beads と Dev Graph

- Beads: `HarnessHub-m0bd`（in_progress）
- Dev Graph: `issue-c19-live-trial-rerun-task-contract-r2-20260803`
- 依存: `HarnessHub-eiky`

Beads の `external_ref` と Dev Graph の `beads_linkage` を接続した。新規 live-trial の証跡は `eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260806T020000Z-m0bd-c19-r3-postmain/` と `criteria-test/scenario-verdict.json` に記録した。Beads は PR 作成まで in_progress を維持する。

## 中学生向けの説明

これは「実験の説明書を少し厳しくしたので、前の実験結果をそのまま合格にせず、新しい説明書どおりにもう一度実験する」ための変更である。Web サービスの画面や会員情報は変わらない。正しい情報を実際に調べたことを、あとから確かめられるようにする安全装置を強くした。

## 技術的な説明

C19 scenario に `upsert-node.py`、fixture 内の `SYSTEM_SPEC_AUDIT_FORK_LEDGER`、公式ページを実取得して version を記録することを必須断片として追加した。scenario ID の r2 bump により、replay planner と criteria validator は旧 run の PASS を再利用できず、新しい task contract を含む transcript と verdict を要求する。これは evidence provenance（証跡の出所追跡）を fail-closed に保つための意図的な互換性切り替えである。

## 行数と次のアクション

この新規受領書は 500 行未満であり、既存の feature 履歴も分冊の 300 行上限内である。live-trial の `transcript.jsonl` は 500 行を超えるが、SHA-256 で束縛された一次証跡のため分割・編集せず run ディレクトリに保持する。`pane.txt` は 500 行未満である。`HarnessHub-m0bd` の実走受入条件は満たした。残る作業は、最終品質ゲート、対象ファイルだけの commit、push、Draft PR 作成である。
