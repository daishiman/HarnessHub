---
graph_node_id: "issue-fetched-reference-evidence-provenance-20260804"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["system-spec","citation","provenance","quality-gate"]
priority: "medium"
start_date: "2026-08-04"
target_date: null
iteration: null
title: "fetched reference の evidence provenance 欠落を解消する"
owners: ["daishiman"]
created_at: "2026-08-04T00:00:00Z"
updated_at: "2026-08-04T08:06:05Z"
status: "closed"
depends_on: []
related_nodes: ["issue-hooks-entry-point-parity-generalization-20260728","spec-harness-hub-requirements"]
resource_scope: ["issues/sys-fetched-reference-evidence-provenance-20260804.md","system-spec/fetched-references.json","system-spec/spec-state.json","plugins/system-spec-harness/scripts/validate-source-citation.py"]
purpose: "仕様 source citation gate を通すため、取得済み reference の証拠位置とハッシュを補完する。"
goal: "20 reference の evidence_ref と evidence_sha256 を再現可能に記録し citation gate を pass する。"
scope_in: ["fetched reference の provenance 補完","citation gate の再実行","根拠再取得とハッシュ記録"]
scope_out: ["Harness Hub の製品 API、DB schema、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["20 reference の provenance が揃う","citation gate が 0 で終了する","再コンパイル時の投影差分をレビューする"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-fetched-reference-evidence-provenance-20260804.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-04T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "C03 final review で検出した既存 citation provenance 欠落を、変更本体から分離して追跡する issue。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-fetched-reference-evidence-provenance-20260804.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-yxb2","linked_at":"2026-08-04T05:48:25Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`system-spec/fetched-references.json` に保存済みの 20 reference で、取得根拠を示す `evidence_ref` と内容ハッシュ `evidence_sha256` が欠落している。source citation gate は 40 件の違反として fail-closed になり、仕様コンパイルの出典追跡を完了できない。

## 背景と影響

この欠落は HarnessHub-vf66 の hook parity 変更より前から存在する reference record の移行残りである。本件の C03 再実行で検出したが、hook parity の仕様変更や製品機能が原因ではない。出典を再取得し、証拠ファイルとハッシュを記録してから citation gate を通す必要がある。

## 完了条件

- 20 reference すべてに有効な `evidence_ref` と `evidence_sha256` を記録する。
- `validate-source-citation.py --targets system-spec/spec-state.json --references system-spec/fetched-references.json --repo-root .` が 0 で完了する。
- 根拠の取得日時・対象・ハッシュを追跡可能にし、system-spec の再コンパイルで無関係な投影差分を出さない。

## 影響境界

対象は仕様ソースの provenance（根拠の来歴）記録であり、製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。
