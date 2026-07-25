---
graph_node_id: "issue-qa070-qa-log-entry-missing-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["system-spec","traceability","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "main 側 qa-070 が spec-state.json の qa_log に不在 (実体は存在する記録欠落)"
owners: ["daishiman"]
created_at: "2026-07-26T00:00:00Z"
updated_at: "2026-07-26T00:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["spec-harness-hub-requirements"]
resource_scope: ["system-spec/spec-state.json","issues/sys-qa070-implementation-feature-20260722.md","features/feat-doc-governance-portability.md"]
purpose: "main の qa-070 (ドキュメント規約 — kebab-case 接頭辞体系・1 文書 300 行上限の fail-closed CI lint・仕組みとナレッジのオン/オフ分離) は issues/sys-qa070-implementation-feature-20260722.md・features/feat-doc-governance-portability.md・scripts/lint-doc-line-limit.py が実体として参照しているのに、system-spec/spec-state.json の qa_log に確定エントリが無い。ID が空き番に見えるため後続ブランチが再利用でき、実際に feat-task-spec-test-strategy が二重採番して衝突した。"
goal: "qa-070 の確定エントリが qa_log に復元され、実体側の参照と spec-state.json が一致する"
scope_in: ["qa-070 の確定内容 (question / answer / status / 確定日時) を実体参照元から復元し qa_log へ追記","同種の記録欠落が他 ID にも無いか (実体参照はあるが qa_log に不在) の点検"]
scope_out: ["feat-task-spec-test-strategy 側の再採番 (qa-076..081) の巻き戻し","validate-coverage-matrix.py の一意性ゲート追加 (issue-qa-log-id-uniqueness-gate-20260726 の担当)"]
acceptance: ["system-spec/spec-state.json の qa_log に qa-070 の確定エントリが存在する","復元した内容の出典 (どの実体参照から復元したか) が本 issue に記録されている","validate-coverage-matrix.py が引き続き exit 0 を返す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-qa070-qa-log-entry-missing-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"system-spec/spec-state.json","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "feat-task-spec-test-strategy の origin/main マージ時に観測した qa_log 記録欠落 (docs/features/feat-task-spec-test-strategy/qa-id-renumbering-20260725.md §残課題 1) から起票した仕様記録の follow-up"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-qa070-qa-log-entry-missing-20260726.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dxfe","linked_at":"2026-07-26T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-26T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`main` の `qa-070` は実体 (issue / feature / lint) が存在するのに、`system-spec/spec-state.json` の `qa_log` に確定エントリが無い。

## 背景と問題

`qa-070` は「ドキュメント規約 2 件 — kebab-case 接頭辞体系・1 文書 300 行上限の fail-closed CI lint・仕組みとナレッジのオン/オフ分離」を確定した質疑であり、2026-07-22 起源で既に landed している。

参照している実体:

- `issues/sys-qa070-implementation-feature-20260722.md`
- `features/feat-doc-governance-portability.md`
- `scripts/lint-doc-line-limit.py`

にもかかわらず `spec-state.json` の `qa_log` 配列に該当エントリが無い。**ID は消費済みなのに台帳上は空き番に見える**状態である。

## 現在の挙動

分岐元 `abd46e5` の時点で既に `qa_log` に `qa-070` が無かった。このため後続ブランチ `feat-task-spec-test-strategy` が `qa-070` を空き番と誤認して別内容で再利用し、マージ時に衝突した (後発側を `qa-076`..`qa-081` へ再採番して解消済み)。

## 期待する挙動

`qa_log` に `qa-070` の確定エントリが存在し、実体側の参照と台帳が一致する。台帳を読めば消費済み ID が判別できる。

## 再現手順またはユースケース

```bash
python3 -c "import json;d=json.load(open('system-spec/spec-state.json'));print([e['id'] for e in d['qa_log'] if e['id']=='qa-070'])"
# -> []  (期待: 確定エントリ 1 件)
grep -rl 'qa-070' issues/ features/ scripts/
# -> 実体は存在する
```

## 影響と優先度

- 影響範囲: data (仕様確定記録の完全性) / 並行開発の ID 採番
- 深刻度: medium
- 緊急度: 一度は事故になった。`issue-qa-log-id-uniqueness-gate-20260726` のゲートが入れば再発時に検出はできるが、台帳の欠落自体は残る

## スコープ

- In: 実体参照元から `qa-070` の確定内容を復元して `qa_log` へ追記、同種の欠落 (実体参照はあるが `qa_log` に不在) の横断点検
- Out: `feat-task-spec-test-strategy` 側の再採番の巻き戻し、`validate-coverage-matrix.py` のゲート追加

## 備考

復元の際は「実体側の記述から確定内容を再構成した」旨と出典を明記すること。確定日時が復元できない場合は推定である旨を残し、事後の捏造にしないこと。
