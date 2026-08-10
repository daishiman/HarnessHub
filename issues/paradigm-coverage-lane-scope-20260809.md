---
graph_node_id: "issue-paradigm-coverage-lane-scope-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["elegant-review","validator","follow-up"]
priority: "low"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "validate-paradigm-coverage に lane 単位の検査モードが無い"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T03:45:34.768254Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/harness-creator/skills/run-elegant-review/scripts/validate-paradigm-coverage.py"]
purpose: "Phase 2 の各 lane が自分の出力を自己検査できるようにし、集約まで誤りを持ち越さない。"
goal: "findings-phase2-<lane>.json を単体で検証でき、30 思考法の被覆は集約時にだけ課される状態にする。"
scope_in: ["--lane モード (被覆検査を外し schema と signal 整合だけを見る) の追加","集約ファイルとの判定差分の明示"]
scope_out: ["30 思考法の配分見直し","lane 分割そのものの変更"]
acceptance: ["lane 単体の findings-phase2-*.json が exit 0 で検証できる","集約 findings.json では従来どおり 30 被覆が課される","lane モードで被覆不足が見逃されても集約で必ず捕まることをテストで固定する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/paradigm-coverage-lane-scope-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "Phase 2 の各 lane が自分の出力を自己検査できるようにし、集約まで誤りを持ち越さない。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/paradigm-coverage-lane-scope-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-lg8s","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
---

## 背景

`validate-paradigm-coverage.py` を Phase 2 の lane 別出力 (`findings-phase2-<lane>.json`) に
かけると「missing paradigm_findings ids without skip_reason」で exit 1 になる。
30 思考法の被覆は 3 lane の**集約**で初めて成立する性質なので、これは仕様どおりの挙動である。

しかし結果として lane は自分の出力を一切検査できず、schema 違反や condition/condition_signal の
不整合を集約まで持ち越してしまう。実際に `variable_abstraction` の schema 違反が集約時まで
発見されなかった。

## やること

`--lane` モードを足し、被覆検査だけを外して schema と signal 整合を検査できるようにする。
集約ファイルに対しては従来どおり 30 被覆を課す。

lane モードで被覆不足が素通りしても集約で必ず捕まることを、テストで固定すること
(lane モードが被覆検査の抜け道にならないため)。
