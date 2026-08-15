---
graph_node_id: "issue-elegant-review-condition-derivation-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["elegant-review","schema","single-source-of-truth","follow-up"]
priority: "low"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "findings の condition を condition_signal から導出して二重帳簿を根絶する"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-12T01:27:57Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["plugins/harness-creator/skills/run-elegant-review/schemas/findings.schema.json","plugins/harness-creator/skills/run-elegant-review/scripts/build-verdict.py","plugins/harness-creator/skills/run-elegant-review/scripts/validate-paradigm-coverage.py"]
purpose: "同じ事実を 2 箇所に書かせる設計をやめ、対応検査そのものを不要にする。"
goal: "issues[].condition が condition_signal から機械導出され、両者の不一致が構造的に発生しない状態にする。"
scope_in: ["findings.schema.json から condition を削除するか derived 扱いにする","SIGNAL_TO_CONDITION を唯一の対応表として consumer 側で導出","既存 findings.json の移行方針"]
scope_out: ["condition_signal の値域変更","4 条件の定義変更"]
acceptance: ["新規 findings.json が condition を持たなくても verdict が導出できる","condition と condition_signal の対応検査が不要になる (または no-op になる)","既存 run の findings.json が読めなくならない"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/elegant-review-condition-derivation-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "同じ事実を 2 箇所に書かせる設計をやめ、対応検査そのものを不要にする。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/elegant-review-condition-derivation-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-o3qb","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
---

## 背景

`issues[]` は `condition` (C1-C4) と `condition_signal` (contradiction / omission / inconsistency /
dependency_break / smell) の両方を持つ。両者は `SIGNAL_TO_CONDITION` で 1 対 1 に対応する
(smell だけが対応先を持たない警告枠) ため、同じ事実が 2 箇所に書かれている。

HarnessHub-hz8m で対応検査を CI 経路へ組み込んだが、これは二重帳簿を**検出する**対策であって
**発生させない**対策ではない。基数が違う (4 と 5) ことも混乱の元で、実際に
「smell に便宜値の condition を入れる」という運用が生まれていた。

## やること

`condition` を schema から外すか derived として扱い、`SIGNAL_TO_CONDITION` を唯一の対応表に
する。consumer は signal から condition を導出する。そうすれば不一致という状態が表現できなくなり、
対応検査は不要になる。

## 注意

既存 run の findings.json を読めなくしないこと。移行は「新規は condition を書かない / 既存は
読めるが検査は signal 基準」の 2 段階にする。
