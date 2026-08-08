---
graph_node_id: "issue-doc-line-limit-followup-mfh7-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","governance"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "bd-bridge.py と mfh7 issue 本文の 500 行超過の分割方針を確定する"
owners: ["daishiman"]
created_at: "2026-07-28T00:00:00Z"
updated_at: "2026-08-02T03:04:53Z"
status: "done"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725"]
resource_scope: [".dev-graph/state/graph.json","plugins/dev-graph/scripts/bd-bridge.py","plugins/dev-graph/lib/bd_bridge_audit.py","plugins/dev-graph/lib/bd_bridge_contracts.py","plugins/dev-graph/lib/bd_bridge_graph.py","plugins/dev-graph/lib/bd_bridge_projection.py","issues/sys-doc-line-limit-followup-mfh7-20260728.md","issues/sys-bd-external-ref-orphan-nodes-20260725.md","issues/sys-bd-external-ref-orphan-nodes-20260725-log.md","issues/sys-guard-graph-schema-newline-segment-split-20260728.md","system-spec/dev-workflow.md","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","features/feat-dev-pipeline-improvement.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p08.md","docs/features/feat-dev-pipeline-improvement/feat-dev-pipeline-improvement-changelog.md","docs/features/feat-dev-pipeline-improvement/w7n7-bd-bridge-split-spec-reflection-receipt.md","eval-log/dev-graph/run-dev-graph-node/","eval-log/dev-graph/run-dev-graph-sync/","eval-log/dev-graph/run-dev-graph-decompose/","eval-log/dev-graph/run-dev-graph-schedule/"]
purpose: "HarnessHub-mfh7 の変更で plugins/dev-graph/scripts/bd-bridge.py が 1124 行 (529 行増)、issues/sys-bd-external-ref-orphan-nodes-20260725.md が 533 行になり、ユーザー指定の 500 行上限を超えた。どちらもリポジトリの CI lint (scripts/lint-doc-line-limit.py は system-spec/architecture/features/tasks/docs の 5 root のみ対象で issues/ と *.py は対象外) には抵触しないが、可読性と変更差分の追跡性のため分割が望ましい"
goal: "bd-bridge.py が choke-point 契約と既存テスト coverage を壊さずに 500 行以下へ責務分割され、mfh7 issue 本文の分割が dev-graph node body との整合 (C02 再登録) を保ったまま完了している状態"
mvp_alignment: null
scope_in: ["bd-bridge.py の責務分割方針の設計 (create/update/close 等の verb 別 module 化など)。HarnessHub-2mor (500 行分割が harness coverage の分母を希釈し ratchet を回帰させる懸念) と矛盾しない進め方の確認","分割後も plugins/dev-graph/tests/ 配下の既存テストが変更なしで通ることの検証","issues/sys-bd-external-ref-orphan-nodes-20260725.md の分割方針の設計 (時系列フォレンジック記録のため自然な境界がなく、素朴な分割は監査証跡を断片化するリスクがある)","mfh7 本文分割後は C02 upsert-node.py で node body を再登録し validate-graph-schema.py で整合を確認する"]
scope_out: ["bd-bridge.py の挙動変更 (choke-point 契約・C28 検証ロジックは変えない。ファイル分割のみ)","issues/sys-bd-external-ref-orphan-nodes-20260725.md の内容変更 (レイアウトの分割のみ)"]
acceptance: ["bd-bridge.py が 500 行以下の複数ファイルへ分割され、既存テストが無変更で全件 PASS する","mfh7 issue 本文が分割され、分割後も C02 の frontmatter 検証と graph body 整合が保たれている","HarnessHub-2mor の懸念 (coverage 分母希釈) との整合が判断根拠として記録されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-doc-line-limit-followup-mfh7-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:00:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-mfh7 の最終レビューで検出した 500 行超過 2 件。ユーザー判断によりファイル分割は今回の PR に含めずフォローアップ課題として切り出した (共有インフラである bd-bridge.py と graph authority 下の issue 本文を、大規模レビューの最中に安全確認なく分割するリスクを避けるため)"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-doc-line-limit-followup-mfh7-20260728.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-w7n7","linked_at":"2026-07-28T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-01T13:48:01Z","evidence_refs":["docs/features/feat-dev-pipeline-improvement/w7n7-bd-bridge-split-spec-reflection-receipt.md","eval-log/dev-graph/run-dev-graph-node/live-trial/20260801T121510Z-wt28-w7n7-node/verdict.json","eval-log/dev-graph/run-dev-graph-sync/live-trial/20260801T123553Z-wt28-w7n7-sync/verdict.json","eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260801T131339Z-wt28-w7n7-decompose/verdict.json","eval-log/dev-graph/run-dev-graph-schedule/live-trial/20260801T125011Z-wt28-w7n7-schedule/verdict.json"],"policy":"manual","reconciled_at":"2026-08-01T13:48:01Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-28T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`HarnessHub-mfh7` (bd external_ref orphan 解消) の実装で、2 ファイルがユーザー指定の
500 行上限を超過した。

| ファイル | 変更前 | 変更後 | 増分 |
|---|---:|---:|---:|
| `plugins/dev-graph/scripts/bd-bridge.py` | 601 | 1124 | +523 |
| `issues/sys-bd-external-ref-orphan-nodes-20260725.md` | 127 | 533 | +406 |

## リポジトリ CI lint との関係

`scripts/lint-doc-line-limit.py` は 300 行上限だが対象は `system-spec/architecture/
features/tasks/docs` の 5 root のみで、`issues/` と `*.py` は対象外。したがって
どちらも CI ゲート上のブロッカーではない。今回のフォローアップはユーザー指定の
可読性基準を満たすための任意改善であり、緊急度は medium とする。

## なぜ mfh7 の PR で分割しなかったか

1. **`bd-bridge.py` は beads mutation の唯一の choke-point**。分割時に import 経路や
   関数の可視性を誤ると、C28 の検証ロジック (P1 の実在検証、P2 の removal-preflight) が
   静かに壊れうる。mfh7/ii90 の大規模レビュー中に追加の構造変更を混ぜるとレビュー範囲が
   広がりすぎる。
2. **`HarnessHub-2mor`** は「500 行分割が harness coverage の分母を希釈し ratchet を
   回帰させる」既知の懸念を持つ専用課題であり、bd-bridge.py の分割はこの懸念と整合する
   進め方 (テストファイルも同時に分割し coverage 比率を保つ等) を先に設計すべきである。
3. **issue 本文はグラフ authority の node body**。分割すると C02 `upsert-node.py` で
   node body を再登録し `validate-graph-schema.py` で整合を取り直す必要があり、
   単純な `Edit` では正規フローを満たさない。加えて本文は単一の時系列フォレンジック
   記録であり、自然な分割境界がない (章単位で切ると調査の因果関係が読みにくくなる)。

## 対処方針

1. `bd-bridge.py` の verb 別責務分割案を設計し、`HarnessHub-2mor` の担当領域と重複しない
   範囲を確認する
2. 分割後、`plugins/dev-graph/tests/` の全件が無変更で PASS することを確認する
3. `issues/sys-bd-external-ref-orphan-nodes-20260725.md` の分割案 (例: 棚卸し実測ログを
   `-log.md` へ分離) を設計し、C02 再登録の手順を検証する

## 検証

```bash
wc -l plugins/dev-graph/scripts/bd-bridge.py issues/sys-bd-external-ref-orphan-nodes-20260725.md
cd plugins/dev-graph && python3 -m pytest tests/ -q
```

## 実装結果 (2026-08-01)

- `bd-bridge.py` は CLI / preflight / receipt に限定し、内部判定を
  `bd_bridge_contracts.py`、`bd_bridge_graph.py`、`bd_bridge_projection.py`、
  `bd_bridge_audit.py` へ分離した。既存 operation と private symbol は adapter で維持した。
- mfh7 本文は課題定義 130 行と実測ログ 422 行へ分割した。ログは node を持たない分冊で、
  親文書だけが `graph_node_id` を保持する。
- 分割先を `plugins/dev-graph/lib/` としたため、`scripts/*.py` を分母にする harness
  coverage ratchet は分割前と同値を維持した。
- 製品仕様は変えないが、内部 component 境界は設計影響として
  `system-spec/`、`specs/`、`architecture/`、`features/`、`tasks/` へ反映した。

最終ゲートと Beads 更新、commit、draft PR の受領結果は
`docs/features/feat-dev-pipeline-improvement/w7n7-bd-bridge-split-spec-reflection-receipt.md`
を正とする。
