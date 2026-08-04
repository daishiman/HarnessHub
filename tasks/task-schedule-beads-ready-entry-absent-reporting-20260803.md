---
graph_node_id: "task-schedule-beads-ready-entry-absent-reporting-20260803"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","schedule-graph","beads","observability","silent-drop"]
priority: "high"
start_date: "2026-08-03"
target_date: null
iteration: null
title: "schedule-graph が bd ready payload 欠落 node を理由付きで報告する"
owners: ["daishiman"]
created_at: "2026-08-03T00:00:00Z"
updated_at: "2026-08-04T01:26:17.145670Z"
status: "active"
depends_on: []
related_nodes: ["feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow","spec-harness-hub-requirements","issue-schedule-blocked-exclusion-unreported-20260728"]
resource_scope: ["plugins/dev-graph/scripts/schedule-graph.py","plugins/dev-graph/scripts/schedule_graph_nodes.py","plugins/dev-graph/tests/test_schedule_beads_ready_entry_absent_reporting.py","plugins/dev-graph/tests/test_runtime_coverage.py","plugins/dev-graph/references/schedule-graph-contract.md","plugins/dev-graph/plugin-composition.yaml","scripts/lint-script-naming.py","eval-log/dev-graph/run-dev-graph-schedule/criteria-test/scenario-verdict.json","eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260806T010001Z-xz0u-c15r5/verdict.json","system-spec/spec-state.json","system-spec/dev-workflow.md","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md","tasks/task-schedule-beads-ready-entry-absent-reporting-20260803.md","docs/features/feat-dev-pipeline-improvement/xz0u-ready-payload-entry-absent-spec-reflection-receipt.md","eval-log/coverage/scripts/plugins-dev-graph-scripts-schedule_graph_nodes.py.json"]
purpose: "bd ready の payload から欠けた beads task を schedule report が黙って落とさず、原因と復旧手順を機械可読に示す"
goal: "選択範囲内かつ schedulable な beads node が pre-lease 判定で ready_ids または unmapped に現れ、最終 report では conflicts を含めて取りこぼさず、payload 欠落時は ready_payload_entry_absent として復旧可能になる"
scope_in: ["schedule-graph.py の beads ready 判定に payload entry 欠落の unmapped 報告を追加する","pre-lease の ready_ids / unmapped と lease conflict を含む最終候補被覆、malformed dependency fail-closed、順序非依存 parity を回帰テストで固定する","schedule-graph-contract.md、system-spec、specs、architecture、feature、task、receipt、Beads を同じ判断へ更新する"]
scope_out: ["bd ready の選定規則、Beads issue の状態、依存 DAG の変更","Harness Hub の外部 API、DB schema、認証認可、UI、Cloudflare deploy unit の変更","ready payload に無い task を推測で ready set へ追加すること"]
acceptance: ["payload に entry が無い schedulable beads node が unmapped[] に exact reason と source 付きで出る","pre-lease の ready_ids と unmapped、および最終 report の conflicts を合わせて対象候補から node を取りこぼさない","C16/C28 の契約正本と全指定ドキュメント層が同一の復旧境界を記録する","focused と関連する品質ゲート、system-spec coverage、graph schema、document line limit、repository CI が blocking failure 0 で完了する","変更した手書きファイルは 500 行以下、管理対象 Markdown は repository の 300 行制約を満たす"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/task-schedule-beads-ready-entry-absent-reporting-20260803.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1cfe7bc2d9433a14011cde84341a3f824e8a7d6106f7dae7b8cfedf149c92d0e","evaluator":"final-review C01 qa-141/qa-142 and C03 compile","evidence_ref":"docs/features/feat-dev-pipeline-improvement/xz0u-ready-payload-entry-absent-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-03T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "HarnessHub-xz0u の bd ready payload 欠落を単独で修正・検証・公開する repository maintenance task"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/task-schedule-beads-ready-entry-absent-reporting-20260803.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xz0u","linked_at":"2026-08-03T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-03T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

`bd ready` の出力には存在しないが、dev-graph 上では選択範囲内かつ着手可能な
Beads task があるとき、C16 schedule がその task を結果から黙って落とさないようにする。
原因を機械可読な `unmapped[]` として残し、利用者が正規の同期・復旧手順を選べる状態にする。

## 背景

`schedule-graph.py` は C28 `bd-bridge.py --op ready` の parity 付き payload を受け取り、
次に作業できる node の一覧を作る。変更前は、payload に該当 node の entry が無い場合、
ready list にも `unmapped` にも入らず、候補から消えていた。これは silent drop
（サイレントドロップ＝除外理由を出さずに結果から消してしまうこと）であり、
operator が「blocked」「parity 不一致」「payload 欠落」を区別できなかった。

先行する `HarnessHub-fcth` は依存未充足の除外を `dependency_unsatisfied` として可視化した。
本 task はそれと異なる、tracker payload 自体に entry が無い経路を扱う。

## 入力と前提条件

- 入力: canonical dev-graph、C28 が生成した parity provenance 付き `bd ready` payload、選択範囲。
- 前提: payload の graph digest は current graph と一致している。stale snapshot は既存の
  fail-closed（判定できないときは処理を止める）境界で拒否する。
- 前提: 対象は `tracker_binding=beads`、選択範囲内、かつ schedulable な node だけである。

## 出力と成果物

- `schedule-graph.py` は entry 欠落時に
  `{ "external_ref": <node id>, "reason": "ready_payload_entry_absent", "source": "schedule-graph" }`
  を `unmapped[]` へ出力する。
- 回帰テストは pre-lease の ready_ids / unmapped と、active lease による最終 `conflicts[]` を
  合わせて候補 node を被覆することを確認する。P01 parent または dependency 形状が不正なら
  fail-closed で停止し、dependency 配列の順序だけでは parity 不一致にしない。
- 実行 tracker 契約、system-spec、specification wrapper、architecture wrapper、feature、task、
  仕様反映受領書、Beads note が同じ影響境界を記録する。

## 依存関係

- `depends_on`: なし。
- 関連: `feat-dev-pipeline-improvement`、`arch-harness-hub-dev-workflow`、
  `spec-harness-hub-requirements`、先行 issue
  `issue-schedule-blocked-exclusion-unreported-20260728`。
- ブロッカー: canonical graph と C28 payload の provenance が一致しない場合、schedule は
  recommendation を出さず、C03/C28 の正規同期を先に完了する。

## 実装対象

- Frontend / Backend / API / Database / Infrastructure: N/A。Harness Hub 製品 runtime は変更しない。
- Dev Graph: C16 の beads entry 欠落分岐、C16 schedule contract、candidate 被覆・fail-closed・
  順序非依存 parity の回帰テスト。
- Documentation: `system-spec/` を C01→C03 の正規フローで更新し、全指定文書層と受領書へ反映する。

## Write scope と競合制約

- `touches`: `plugins/dev-graph/scripts/schedule-graph.py`、その focused test、
  `plugins/dev-graph/references/schedule-graph-contract.md`、`system-spec/`、`specs/`、
  `architecture/`、`features/`、`tasks/`、`docs/features/feat-dev-pipeline-improvement/`、
  `.dev-graph/state/graph.json`、Beads `HarnessHub-xz0u`。
- 排他資源: `system-spec/spec-state.json` は C01 transition writer、graph は C02
  `upsert-node.py`、Beads mutation は C28 `bd-bridge.py` だけが更新する。
- branch: `devgraph/task-schedule-beads-ready-entry-absent-reporting-20260803`。
- completion projection: Draft PR 作成までは in_progress、default branch への merge 後に
  C26 reconciliation（正規の完了状態照合）で done にする。

## GitHub publication

- Mode: `local_only`。実行 task の状態正本は Beads であり、GitHub Issue は作らない。
- Publication gate: main 統合、対象差分のレビュー、仕様反映、全品質ゲート、Beads linkage、
  Draft PR 本文の required fields が揃うこと。
- Failure policy: push / PR 作成が失敗した場合、ローカル成果物を巻き戻さず Beads notes に
  失敗内容と次の正規コマンドを残す。
- PR linkage requirement: PR 本文に `HarnessHub-xz0u` と
  `dev-graph: task-schedule-beads-ready-entry-absent-reporting-20260803` を記載し、base は `main` とする。

## status の意味論

本文の `status` は文書ライフサイクルを表す。実行状態の正本は Beads と
`completion_evidence` であり、Draft PR の作成だけで merge 済みにはしない。

## 実行手順

1. remote `main` を local `main` へ反映し、local `main` を本 branch へ merge する。
2. C16 の missing-entry 分岐と focused regression test を実装する。
3. C01 で `dev-workflow.web` を reopen→再確定し、C03 で `system-spec/` を compile する。
4. C02 で specification、architecture、feature、task、receipt の graph/frontmatter lineage を更新する。
5. contract、task-spec、system-spec、dev-graph、document、repository CI の品質ゲートを再実行する。
6. 対象差分だけを commit・push し、`main` 向け Draft PR を作成して Beads と linkage を更新する。

## 受入条件

- payload entry が無い schedulable Beads node は `ready_payload_entry_absent` と
  `source=schedule-graph` を持つ `unmapped[]` entry として出力される。
- entry があるが parity 未確認の `beads_parity_stale_or_unconfirmed`、依存未充足の
  `dependency_unsatisfied` と誤分類しない。
- pre-lease の ready_ids と unmapped、および最終 `conflicts[]` の和が、選択範囲内かつ
  schedulable な対象候補を取りこぼさない。
- `system-spec/spec-state.json`、compiled `dev-workflow`、spec/architecture/feature/task/docs の
  source lineage と受領書が、製品 runtime 非変更・内部 dev-workflow 契約変更を一致して記録する。
- focused / related tests、system-spec coverage、graph schema、line-limit、repository CI が
  blocking failure 0 で完了する。

## 検証方法

- `python3 -m pytest plugins/dev-graph/tests/test_schedule_beads_ready_entry_absent_reporting.py -q`
- schedule 関連 regression、`validate-graph-schema.py`、`validate-system-plan.py`、
  system-spec coverage / compile validation、document line limit、`scripts/run-ci-checks.sh`。
- `git diff --check`、対象 stage、PR base/head/body、Beads / dev-graph linkage を手動確認する。

## リスクとロールバック

- リスク: payload entry 欠落を ready に推測追加し、実際には未同期・未連携の task を推奨する。
  対策: 欠落は必ず unmapped とし、正規 C03/C28 再同期を要求する。
- リスク: 既存 reason と混同し、原因別の recovery owner が曖昧になる。
  対策: exact-set の reason と `source` を contract と regression test で固定する。
- ロールバック: 本変更を 1 commit として `git revert` し、旧 report 形式へ戻す。Beads の状態は
  task completion authority に従い別途 reconcile する。

## Handoff

- 実装 route: repository maintenance / Dev Graph C16。
- merge 前: Draft PR URL、検証結果、仕様影響、graph node ID を Beads note へ記録する。
- merge 後: default branch で C26 lifecycle reconciliation を実行し、PR merge evidence と
  Beads を収束する。
