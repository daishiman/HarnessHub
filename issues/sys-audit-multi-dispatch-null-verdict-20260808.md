---
graph_node_id: "issue-audit-multi-dispatch-null-verdict-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-spec-harness","audit-ledger","follow-up"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "複数監査 dispatch の台帳 verdict=null を原子的に記録する"
owners: ["daishiman"]
created_at: "2026-08-08T11:00:00Z"
updated_at: "2026-08-08T11:05:42.334830Z"
status: "draft"
depends_on: []
related_nodes: ["issue-audit-fork-ledger-forgery-20260728"]
resource_scope: ["plugins/system-spec-harness/hooks/record-audit-fork.py","eval-log/system-spec-harness/audit-fork-ledger.jsonl"]
purpose: "1つの assistant message に複数の監査 Agent dispatch がある場合も、各 response の生 verdict を対応する台帳 event へ結び付ける"
goal: "複数 dispatch の全 event が audit_verdict 非 null と正しい response_sha256 を持ち、fresh live-trial の不要な再 fork を発生させない"
scope_in: ["複数 tool_use と複数 tool_result の対応付け","event ごとの AUDIT_VERDICT 抽出","回帰テスト"]
scope_out: ["監査 evaluator の採点基準変更","製品 API・DB・UI の変更"]
acceptance: ["同一 message の複数監査 dispatch がすべて非 null verdict で記録される","tool_use_id・response_sha256・verdict の対応違いを fail-closed 拒否する","単一 dispatch の既存挙動を維持する"]
architecture_refs: ["arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-audit-multi-dispatch-null-verdict-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T11:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.96
classification_reason: "最終 C01-C19 live-trial 監査で、同一 assistant message の複数 dispatch が audit_verdict=null となり同期再 fork を要求する事象を実測した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-audit-multi-dispatch-null-verdict-20260808.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-uypz","linked_at":"2026-08-08T11:05:16.215042Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-08T11:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

最終 live-trial 監査で、1つの assistant message に複数の監査 Agent dispatch が含まれると、一部の台帳 event が `audit_verdict=null` になり、集約器が安全側に同期再 fork を要求する事象を確認した。

## 目的と背景

監査偽装を防ぐ fail-closed 契約は正しいが、正当な複数 dispatch まで不完全な台帳として扱うと試験時間と利用量が増える。各 tool use と対応する response を原子的に結び付ける。

## スコープ

- 同一 message 内の複数 tool use / tool result 対応付け
- 各 response からの生 `AUDIT_VERDICT` 抽出
- 単一 dispatch と複数 dispatch の回帰テスト

## 受入条件

- [ ] 複数監査 dispatch の全 event が非 null verdict を持つ
- [ ] tool_use_id、response digest、verdict の取り違えを拒否する
- [ ] 単一 dispatch の既存契約を維持する
