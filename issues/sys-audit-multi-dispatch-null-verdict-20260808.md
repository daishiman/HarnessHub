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
updated_at: "2026-08-11T06:56:56Z"
status: "draft"
depends_on: []
related_nodes: ["issue-audit-fork-ledger-forgery-20260728","feat-dev-pipeline-improvement","task-uypz-audit-multi-dispatch-handoff-20260811","arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
resource_scope: ["plugins/system-spec-harness/hooks/record-audit-fork.py","plugins/system-spec-harness/hooks/tests/test_record_audit_fork.py","plugins/system-spec-harness/hooks/references/hook-guard-protection-scope.md","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/SKILL.md","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/prompts/R2-delegate.md","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/scripts/audit_fork_attribution.py","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/schemas/completeness-findings.schema.json","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/tests/completeness_test_support.py","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/tests/test_audit_fork_attribution.py","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/tests/test_aggregate_completeness.py","eval-log/system-spec-harness/audit-fork-ledger.jsonl","docs/features/feat-dev-pipeline-improvement/uypz-audit-fork-schema12-spec-reflection-receipt.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-uypz-audit-multi-dispatch-handoff.md","architecture/harness-hub-dev-workflow.md","architecture/harness-hub-testing-qa.md"]
purpose: "per-tool-call PostToolUse が観測した top-level tool_use_id・call 全体 response digest・生 verdict を、writer→receipt schema→consumer の全経路で同一 dispatch へ結び付ける"
goal: "schema 1.2 の複数 dispatch 対応を fail-closed に実装し、schema 1.1 legacy 互換を維持したうえで fresh live-trial により不要な再 fork が発生しないことを実証する"
scope_in: ["per-tool-call PostToolUse 入力契約と PostToolBatch との境界","writer schema 1.2 の tool_use_id・verdict_state・whole per-call response digest","receipt schema と consumer の schema 1.2 ID 照合・schema 1.1 legacy 互換","単一/複数 dispatch の回帰テスト","fresh live-trial canary と正式 evaluator 直列化 gate"]
scope_out: ["監査 evaluator の採点基準変更","fresh live-trial 前の正式 evaluator parallel 運用許可","製品 API・DB・UI の変更"]
acceptance: ["writer schema 1.2 が top-level tool_use_id・verdict_state・call 全体 tool_response の response_sha256・生 verdict を同一 per-call event に記録する","receipt と consumer が schema 1.2 の tool_use_id・response_sha256・resolved verdict を全一致で照合し取り違えを fail-closed 拒否する","schema 1.1 は ID 無し legacy 経路で互換を維持しschema 1.2 の ID 欠落・不一致を downgrade しない","単一 dispatch と複数 dispatch canary の回帰テストが PASS する","fresh live-trial で複数 dispatch の全 per-call event と最終 receipt の対応を実証し不要な再 fork が発生しない","fresh live-trial 完了までは1 message=1 foreground forkを維持しbackground launchを最終verdictとして扱わない"]
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

最終 live-trial 監査で、1つの assistant message から複数の監査 Agent を dispatch した際、一部の台帳 event が `audit_verdict=null` になり、集約器が安全側に同期再 fork を要求する事象を確認した。

現行 hook の正式契約では、PostToolUse は batch 全体に 1 回ではなく **matching tool call ごとに 1 回**発火する。payload top-level の `tool_use_id` がその call を識別し、parallel dispatch では各 PostToolUse が並行発火する。batch 単位の lifecycle は PostToolBatch である。したがって「1つの `tool_response` に同一 message の全 tool result が入る」という先行仮説を正本にせず、per-call payload を writer・receipt・consumer の共通境界にする。

## 目的と背景

監査偽装を防ぐ fail-closed 契約は正しいが、正当な複数 dispatch まで不完全な台帳として扱うと試験時間と利用量が増える。writer schema 1.2 は top-level `tool_use_id`、`verdict_state`、当該 call の **`tool_response` 全体**の canonical `response_sha256`、生 `audit_verdict` を同じ台帳行へ記録する。receipt と consumer も schema 1.2 では ID まで照合し、schema 1.1 は ID を持たない legacy 互換として分離する。

parallel 対応は defensive hardening / canary であり、その実装や fixture PASS だけでは正式 evaluator 運用を parallel へ変更しない。current runtime の fresh live-trial で 3 監査全ての per-call 台帳行と最終 receipt を実証するまでは、`1 message = 1 foreground fork` の直列運用を維持する。background / 非同期 launch の起動受理 response は最終 verdict ではない。

## スコープ

- PostToolUse の per-tool-call payload (`tool_use_id` / `tool_input` / `tool_response`) と PostToolBatch の責務境界
- writer schema 1.2 の `tool_use_id` / `verdict_state` / whole per-call response digest / 生 `AUDIT_VERDICT`
- completeness report receipt schema と `audit_fork_attribution.py` の schema 1.2 ID 照合
- schema 1.1 台帳の ID 無し legacy 互換と、1.2 → 1.1 downgrade 禁止
- 単一 dispatch / 複数 dispatch canary / 取り違え拒否 / background 未完了 response の回帰テスト
- fresh live-trial 完了までの正式 evaluator 直列化 gate

## 受入条件

- [x] writer schema 1.2 が top-level `tool_use_id`、`verdict_state`、call 全体 `tool_response` の digest、生 verdict を同一 per-call event に記録する
- [x] receipt / consumer が schema 1.2 の `tool_use_id`、response digest、`verdict_state=resolved`、verdict の取り違えを fail-closed で拒否する
- [x] schema 1.1 は ID 無し legacy 経路で既存契約を維持し、schema 1.2 の ID 欠落・不一致を legacy 扱いへ downgrade しない
- [x] 単一 dispatch と複数 dispatch canary の回帰テストが PASS する
- [ ] current runtime の fresh live-trial で複数 dispatch の全 per-call event が非 null verdict を持ち、最終 receipt と一致し、不要な再 fork が発生しない
- [x] fresh live-trial 完了までは正式 evaluator を `1 message = 1 foreground fork` で運用し、background launch を最終 verdict として扱わない
