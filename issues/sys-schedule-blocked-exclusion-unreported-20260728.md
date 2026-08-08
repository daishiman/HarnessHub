---
graph_node_id: "issue-schedule-blocked-exclusion-unreported-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["dev-graph","schedule-graph","observability","silent-drop","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "schedule-graph が依存未充足 task の除外理由を report しない"
owners: ["daishiman"]
created_at: "2026-07-28T05:55:00Z"
updated_at: "2026-08-01T05:55:26Z"
status: "closed"
depends_on: []
related_nodes: ["issue-register-package-projection-idempotency-drift-20260728"]
resource_scope: ["plugins/dev-graph/scripts/schedule-graph.py","plugins/dev-graph/references/execution-tracker-contract.md","issues/sys-schedule-blocked-exclusion-unreported-20260728.md"]
purpose: "ready set から外れた task の理由が出力から追えるようにし、schedule の除外判定を可観測にする"
goal: "未充足 depends_on を持つ task が unmapped へ理由付きで 1 件報告され、選択外・非 schedulable と機械的に区別できる状態"
mvp_alignment: null
scope_in: ["schedule-graph.py の ready 判定ループにおける除外理由の記録","execution-tracker-contract.md §10 への unmapped reason 追記","依存未充足 node が報告されることを固定する回帰テスト"]
scope_out: ["ready set の選定ロジックそのものの変更","lease / beads parity 側の既存 reason の改名","--max-parallel や batch 分割アルゴリズムの変更"]
acceptance: ["未充足 depends_on を持つ node が unmapped[] に理由付きで 1 件出力される","その理由が選択外・非 schedulable と機械的に区別できる","execution-tracker-contract.md §10 に新 reason が正本として記載される","依存未充足 node の報告を固定する回帰テストが追加され PASS する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-schedule-blocked-exclusion-unreported-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T05:55:00Z","origin_kind":"generated","source_digest":"ee21ebecdfda84391a0de537ab298c25982dd62fd219aaa1e513cf39089d3f87","source_path":"plugins/dev-graph/scripts/schedule-graph.py","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.97
classification_reason: "C15 live-trial 20260728T034005Z-ii90-schedule の独立評価で、依存除外の理由が unmapped/conflicts/conflict_pairs のいずれにも現れないことを実測したため"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-schedule-blocked-exclusion-unreported-20260728.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-fcth","linked_at":"2026-07-28T05:55:49.46351Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T05:55:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`schedule-graph.py` が「未充足の `depends_on` を持つ task」を ready set から除外するとき、
除外した事実と理由をどの出力欄にも記録しない。利用者からは「その task が最初から存在しない」
ようにしか見えず、待ち時間の原因が特定できない。

## 背景と問題

2026-07-28 の live-trial 再取得 (scenario `C15-OUT1-positive-ready-set-r16`,
run `eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260728T034005Z-ii90-schedule/`) で、
独立評価者が「the blocked task is excluded from the ready set and **the reason is reported**」を
実測できず FAIL を返した。除外そのものは正しく、報告だけが欠けている。

同じ script 内の他の除外経路は理由を必ず残しており、依存起因の除外だけが非対称に無言である。

- beads parity 不一致 → `unmapped[].reason = "beads_parity_stale_or_unconfirmed"`
- graph 側に node が無い → `unmapped[].reason = "graph_node_missing"`
- 有効 lease との衝突 → `conflict_pairs[].kind = "lease"`
- 依存未充足 → **どこにも出ない**

これは repo 契約が禁じる silent drop (報告から黙って項目を落とし、結果を緑に見せる行為) と
同じ形をしている。緑化の意図はないが、利用者が観測できる情報から欠落している点は同じである。

## 現在の挙動

`plugins/dev-graph/scripts/schedule-graph.py` の ready 判定ループ (2026-07-28 時点で 339-342 行):

```python
ready_ids: set[str] = set()
for node_id, node in by_id.items():
    if node_id not in selected or not is_schedulable(node) or not dependencies_satisfied(node, by_id, done):
        continue
```

`dependencies_satisfied()` が False を返した node は素の `continue` で捨てられ、
`unmapped` にも `conflicts` にも `conflict_pairs` にも現れない。
3 つの異なる除外理由 (選択外 / 非 schedulable / 依存未充足) が 1 本の条件式に畳まれているため、
どれで落ちたのかを事後に区別することもできない。

live-trial の実測値では `LT-SCHED-005` (`depends_on` に `LT-SCHED-001` を持ち、
上流の `completion_evidence.status` が `open`) が `ready_set` `[001, 002, 003, 006]` から
正しく外れていたが、出力のどこにも `LT-SCHED-005` という文字列が現れなかった。

## 期待する挙動

依存未充足で除外した node を、既存の分類欄と同じ粒度で機械可読に報告する。

- `unmapped[]` に `reason` を持つ行が 1 件出る (例: `dependency_unsatisfied`)
- その行に、どの上流 node が未充足なのか (`blocking_depends_on` 等) が入る
- `references/execution-tracker-contract.md` §10 の unmapped 分類に新しい reason を追記する
- 「選択外」「非 schedulable」「依存未充足」を条件式上で分離し、理由を取り違えない

## 再現手順またはユースケース

1. task 6 件を持つ fixture を用意し、うち 1 件に未充足の `depends_on` を設定する
   (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind schedule` が生成する
   `LT-SCHED-005` がこの条件を満たす)。
2. `python3 plugins/dev-graph/scripts/schedule-graph.py --repo-root 対象fixture --max-parallel 2` を実行する。
3. 出力 JSON 全体を `LT-SCHED-005` で検索する。1 件も一致しないことが本 issue の再現である。

## 影響と優先度

priority: medium。ready set の値そのものは正しいので誤スケジュールは起きない。
影響は運用の可観測性に限られるが、次の 2 つの実害がある。

- 利用者が「なぜこの task が出てこないのか」を script の出力からは追えず、graph を手で読む必要がある
- C15 の OUT1 受け入れ条件 (`the reason is reported`) が満たせず、live-trial が DEGRADED 止まりになる

## スコープ

対応する範囲:

- `schedule-graph.py` の ready 判定ループにおける除外理由の記録
- `references/execution-tracker-contract.md` §10 への reason 追記
- 依存未充足 node が報告されることを固定する回帰テスト

対応しない範囲:

- ready set の選定ロジックそのもの (現状の除外判定は正しい)
- lease / beads parity 側の既存 reason の改名
- `--max-parallel` や batch 分割アルゴリズムの変更

## 関連グラフ

- 由来: C15 live-trial `20260728T034005Z-ii90-schedule` の独立評価 FAIL
- 隣接: `issue-register-package-projection-idempotency-drift-20260728` (同じ dev-graph 品質系)
- 契約正本: `plugins/dev-graph/references/execution-tracker-contract.md` §10

## 受入条件

1. 未充足 `depends_on` を持つ node が `unmapped[]` に理由付きで 1 件出力される
2. その理由が「選択外」「非 schedulable」と機械的に区別できる
3. `execution-tracker-contract.md` §10 に新 reason が正本として記載される
4. 依存未充足 node の報告を固定する回帰テストが追加され PASS する
5. C15 の live-trial を再取得すると `the reason is reported` が実測で満たされる

## 検証証跡

- `eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260728T034005Z-ii90-schedule/verdict.json`
  (overall.goal_fit = FAIL、blocker に本件を記載)
- `eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260728T034005Z-ii90-schedule/transcript.jsonl`
- `plugins/dev-graph/scripts/schedule-graph.py` 339-342 行 (sha256 ee21ebecdfda84391a0de537ab298c25982dd62fd219aaa1e513cf39089d3f87)
