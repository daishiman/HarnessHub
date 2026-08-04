---
status: recorded
layer: feature-spec-reflection
beads_id: HarnessHub-m0bd
dev_graph_node_id: issue-c19-live-trial-rerun-task-contract-r2-20260803
parent_feature: feat-dev-pipeline-improvement
spec_impact: none
reviewed_at: 2026-08-04
---

# C19 live-trial task contract r2 — 仕様反映受領書

## 目的と背景

`HarnessHub-eiky` は、system-spec の C19 live-trial が公式情報を実取得せず、古いモデル知識を citation（出典情報）として記録できた問題を防ぐため、C19 scenario に 3 つの必須 task contract を追加し、scenario ID を r2 へ更新した。

この更新で旧受領書は意図どおり stale（古い契約を参照する状態）になった。`HarnessHub-m0bd` は、新しい契約を満たす live-trial を実走して受領書を更新するための follow-up である。

## 結論

今回の変更は **HarnessHub 製品の仕様・設計を変更しない**。変更は `plugins/dev-graph/` の C19 試験契約と、その follow-up の記録だけである。

`main` 統合後の再実走では C14 の参照順序不備を検出して修正した。r5 は最終 `status.json` 前に中断し、r6 は機能・独立検証とも PASS だったが、運用者の継続指示 1 回を記録したため `DEGRADED` として除外した。r7 は一度 PASS したが、その後の audit-ledger（監査台帳）保護の強化で証跡選択の対象から外した。r8 は独立 verifier が stale（古い）な progress / intermediate を検出して FAIL とした。隔離 fixture を新しく作り直した r10 が nudge=0 / gate=0 で完走し、機械 verdict、C02 登録、独立 verifier のすべてを PASS とした。したがって r10 だけを C19 の成功証跡として登録する。

## 層別の反映判断

| 層 | 結果 | 理由 |
| --- | --- | --- |
| `docs/` | 更新 | 本受領書と feature の変更履歴に、C14 修正、r5/r6/r8 の不採用理由、r10 の受入証跡を記録する。 |
| `features/` | 非変更 | feature 本体は変更履歴を `docs/features/.../feat-dev-pipeline-improvement-changelog.md` へ分離する規約であり、そこへ記録する。 |
| `system-spec/` | 非変更 | API、データ、認可、UI、配備、運用 SLO の確定事項に変更がない。 |
| `specs/` | 非変更 | 製品要件・外部契約は変わらない。plugin 内部契約を複製すると二重正本になる。 |
| `architecture/` | 非変更 | 既存 `qa-100` の「scenario 改訂後は fresh run で旧受領書を更新する」設計を適用するだけで、新たな設計判断はない。 |
| `tasks/` | 非変更 | 本件は standalone issue。凍結済み exact-13 task spec を手編集すると source digest（内容の指紋）を壊す。 |

plugin 内部の技術契約の正本は `plugins/dev-graph/references/live-trial-task-contract.md` と `plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` である。

## 最終レビューと検証結果

- `git diff --check`: PASS（空白エラーなし。r5 の共有台帳への試験専用副作用は除去済み）。
- task specification gate: `validate-system-plan.py --feature-package feature-package/feat-dev-pipeline-improvement` は既存の exact-13 契約を維持する。凍結済み task spec は変更していない。
- live-trial planner: `main` 統合直後に旧 r2 verdict を `scenario-contract-superseded` と判定して新規実走を要求した。これは旧証跡を成功扱いしない fail-closed（不整合を成功扱いしない）判定である。
- r4 live-trial: `20260803T221040Z-m0bd-c19-r4-postmain-conflict` は FAIL。C14 が要求する knowledge catalog の位相順と、C03 が消費する設計参照順が異なる実装不備を検出した。
- C14 修正: `build-knowledge-order.py` を責務分離で追加し、`compile-spec-doc.py` が catalog の依存関係を topological order（前提を先にする順序）として消費するようにした。compile 関連と source-citation validator の focused pytest は 131 passed。
- r5 live-trial: `20260803T232940Z-m0bd-c19-r5-topo-order` は evaluator 6/6 PASS、C02 登録、source digest/evidence reference の実検査、独立検証の 3 観測まで PASS。しかし `out/status.json` の作成前に利用上限で中断したため、正式 verdict は未作成である。
- r6 live-trial: `20260804T004500Z-m0bd-c19-r6-ledger` は機能・独立 verifier を PASS したが、継続指示 1 回を受けて `overall=DEGRADED` となった。自走受入の成功証跡には採用しない。
- r7 live-trial: `20260804T015000Z-m0bd-c19-r7-autonomous` は初回 PASS だったが、後続の audit-ledger 保護追加後は current behavior を表さないため、監査履歴としてのみ保存する。
- r8 live-trial: `20260804T050000Z-m0bd-c19-r8-post-review` は fresh independent verifier が最終化前の progress / intermediate を検出して FAIL とした。失敗を削除せず、r10 task に「独立検証 fork 前に最終成功周回を記録する」契約として反映した。
- r10 live-trial: `20260804T083000Z-m0bd-c19-r10-clean-fixture` は `overall=PASS`、nudge=0、gate=0、正規 4 entry point、C02 registration、source digest/evidence reference、fresh independent verifier の必須 3 観測を PASS とした。behavior closure digest は `90affd8245f8099d5595cc4c26898eb6cc217f1073577952426352cd2ef313e0`。
- evidence 選択: task-contract / verdict の両 lint は、run-id の辞書順ではなく criteria receipt の OUT1 が受領した PASS verdict を優先する。将来日付を含む歴史的 r3 や r7 の stale 証跡が r10 を覆い隠さないことを、回帰 pytest と両 lint の PASS で確認する。
- 最終品質ゲート（exact-13、graph schema、open residue、live-trial task contract、文書行数、artifact placement、plugin package、全 CI）は r10 の verdict 登録後に再実行する。未実行を PASS と記録しない。

## Beads と Dev Graph

- Beads: `HarnessHub-m0bd`（in_progress）
- Dev Graph: `issue-c19-live-trial-rerun-task-contract-r2-20260803`
- 依存: `HarnessHub-eiky`

Beads の `external_ref` と Dev Graph の `beads_linkage` を接続した。r4/r5/r6/r7/r8 の試験証跡は失敗・劣化・旧挙動の監査記録として保持し、`criteria-test/scenario-verdict.json` は r10 の PASS verdict を指す。Beads は PR review、CI、merge が完了するまで in_progress を維持する。

## 中学生向けの説明

これは「実験の説明書を少し厳しくしたので、前の実験結果をそのまま合格にせず、新しい説明書どおりにもう一度実験する」ための変更である。途中で見つけた「読む順番が逆」の不具合も直した。Web サービスの画面や会員情報は変わらない。正しい情報を実際に調べたことを、あとから確かめられるようにする安全装置を強くした。

## 技術的な説明

C19 scenario に `upsert-node.py`、fixture 内の `SYSTEM_SPEC_AUDIT_FORK_LEDGER`、公式ページを実取得して version を記録することを必須断片として追加した。scenario ID の r2 bump により、replay planner と criteria validator は旧 run の PASS を再利用できず、新しい task contract を含む transcript と verdict を要求する。C14 修正では resource map で選んだ card を knowledge catalog の DAG（依存関係グラフ）から導いた位相順で整列する。さらに両 lint は criteria receipt が示す OUT1 PASS evidence を選ぶため、時計ずれした履歴 run-id による stale verdict の誤選択を防ぐ。これは evidence provenance（証跡の出所追跡）と設計知識の前提関係を fail-closed に保つための内部実装修正である。

## 行数と次のアクション

この受領書は 500 行未満であり、既存の feature 履歴も分冊の 300 行上限内である。live-trial の `transcript.jsonl` は 500 行を超えるが、SHA-256 で束縛された一次証跡のため分割・編集せず run ディレクトリに保持する。`HarnessHub-m0bd` の実走受入条件は r10 で満たした。残る作業は、最終品質ゲート、対象ファイルだけの commit、push、Draft PR 更新、PR review・CI・merge である。
