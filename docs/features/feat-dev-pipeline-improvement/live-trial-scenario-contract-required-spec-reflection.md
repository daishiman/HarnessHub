---
status: confirmed
layer: feature-spec-reflection
beads_ids:
  - HarnessHub-yn71
dev_graph_node_id: issue-live-trial-scenario-contract-required-20260730
feature_node_id: feat-dev-pipeline-improvement
spec_impact: reflected
reviewed_at: 2026-07-30
---

# live-trial scenario contract 受領強化 — 仕様反映受領書

## 依頼と目的

今回変更中の全差分を最終レビューし、task 仕様書を含む品質ゲートを再実行した。
目的は、live-trial（実環境に近い試験）の判定書が必要な観測を証明していないのに、
開発タスクの受入証拠として合格できる穴を閉じることである。

## 結論

**仕様・設計への影響は反映あり。ただし製品契約と scheduler の動作は非変更。**

`qa-089` が要求する scenario 束縛を受領側で省略不可にするため、`qa-100` と
`appr-017` を正規 writer で記録した。Harness Hub 製品の外部 API、DB schema、
認証認可、UI、Cloudflare deploy unit、`run-dev-graph-schedule` の計算処理は変更しない。

## TL;DR

試験結果に「何を全部確認したか」が無ければ合格にせず、4 項目を実測した新しい
C15 run へ更新した。仕様書・設計書・feature・task・Beads も同じ判断へ同期済みである。

## 最終レビューで確認・補強した内容

- 変更前の criteria-test は `scenario_contract` が存在するときだけ内容を検査し、
  field が無い旧判定書を通せた。
- field 必須化に加え、`required_observations` と `observed` の番号・本文が
  同数かつ同順であることを受領側で再計算する。`unobserved=[]` という自己申告だけに頼らない。
- 引数、宣言済み task 契約、run directory 内に閉じた evidence ref の実在も照合する。
- field 欠落と observed 1 件欠落の負例を追加し、どちらも失敗することを固定した。
- C15 schedule の現行 scenario を fresh 実走し、required observation 4/4、
  `unobserved=[]`、引数一致、独立 evaluator PASS の durable run を保存した。

## 正規フローでの反映先

| 層 | 反映内容 |
|---|---|
| `system-spec/spec-state.json` | 単一 transition writer で `qa-100` / `appr-017` を追記 |
| `system-spec/testing-qa.md` | qa-089 の横断追補として非省略・全観測再照合・fresh run 更新を確定 |
| `specs/harness-hub-system-specification.md` | 開発品質への影響と製品非変更の境界を記録 |
| `architecture/harness-hub-testing-qa.md` | schema 互換性と acceptance 合格条件を分離する設計を記録 |
| `features/feat-dev-pipeline-improvement.md` | 実装結果、C15 4/4、qa-100 への参照を記録 |
| `tasks/feat-dev-pipeline-improvement/*-p13.md` | P13 release evidence の受領条件を追補 |
| `issues/sys-live-trial-scenario-contract-required-20260730.md` | dev-graph 正規 issue と完了証拠を記録 |

## 品質ゲート

- 対象 criteria test: `22 passed`。
- Dev Graph 全体: `721 passed, 2 skipped, 5 subtests passed`。
- repository `make test`: `7640 passed, 5 skipped`、LLM coverage `100.0%`、
  Phase 0 `PASS`。
- CI/local parity: `136 PASS / 4 WARN / 0 FAIL`。4 WARN は段階導入中の
  既存 completeness 3 件と rubric ref 1 件で、本変更起因の failure は 0。
- task package: `feature-package/feat-dev-pipeline-improvement` の P01〜P13 exact-set、
  digest `af8a73df…ffda6`、violations 0。
- system-spec: matrix 未収集 0、foundation trace 完全、source citation PASS。
- Dev Graph schema: readiness complete、missing section / violation 0。
- live-trial lint: Dev Graph の verdict 9 件を検証。repository 横断の既存 6 missing は
  record-only warning で、今回対象の C15 は PASS。
- 文書配置、300 行上限、`git diff --check` は PASS。

## 行数と分冊判断

手書き変更はテスト 386 行、Markdown はすべて 300 行以下で、500 行超の新規・肥大化
ファイルはない。`.dev-graph/state/graph.json` と `system-spec/spec-state.json` は
単一 writer と schema が所有する機械正本のため分割対象にせず、今回分は node 1 件と
QA/承認 1 件だけを正規 writer で追記した。live-trial transcript も 183 行である。

## main 統合

初回は `origin/main` と local `main` の `5bacf2e` を確認し、本 branch へ merge した。
PR 作成後に main が `b1009d0` へ進んだため、remote と local main の一致を再確認して
もう一度 merge した。`spec-state.json` の ID だけが競合したので、main の auth 契約
`qa-097`〜`qa-099` / `appr-016` を保持し、本変更を次の空き ID `qa-100` /
`appr-017` へ単一 transition writer で再登録した。統合後に全ゲートを再実行した。

## Beads / dev-graph

- Beads: `HarnessHub-yn71`
- dev-graph node: `issue-live-trial-scenario-contract-required-20260730`
- branch: `devgraph/issue-live-trial-scenario-contract-required-20260730`

## 残課題

本変更に起因する残課題はない。上記 CI/local の 4 WARN と live-trial 6 missing は
既存の段階導入 backlog であり、本 issue の scope へ混在させない。
