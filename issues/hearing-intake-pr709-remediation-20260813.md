---
graph_node_id: "issue-hearing-intake-pr709-remediation-20260813"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "backend"
tags: ["bug","hearing-intake","rate-limit","share-token","attachments"]
priority: "high"
start_date: "2026-08-13"
target_date: null
iteration: null
title: "PR #709 後始末として公開共有の仕様と pre-DB 上限を揃える"
owners: ["daishiman"]
created_at: "2026-08-13T13:00:00Z"
updated_at: "2026-08-13T13:00:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-hearing-intake"]
resource_scope: ["issues/hearing-intake-pr709-remediation-20260813.md","apps/hub/src/lib/hearing-share/rate-limit.ts","apps/hub/src/app/api/hearing/[token]/route.ts","docs/backend-spec-api-state.md"]
purpose: "マージ済み PR #709 のあとで、公開共有リンクの回数制限を token 解決より前に置き、添付・FormData・migration 番号の正本を実装と同じ値に揃える。"
goal: "無効 token でも DB read が増幅せず、仕様書の添付・件数・migration 番号が実装と一致している状態にする。"
scope_in: ["token 非依存の pre-DB rate limit と回帰テスト","添付 allowlist 8 種・25 MiB の正本化","FormData 30 / snapshot 29 / migration 0013 の表記揃え"]
scope_out: ["公開 token の 404 畳み方の変更","認可 role 階層の変更","/legal の scope 分離","本番デプロイ"]
acceptance: ["公開経路は token 解決より前に IP 単位 240 req/min で止まり、無効 token では DB read が走らない","有効 token と無効 token の 429 応答が一致する","添付の正本が allowlist 8 種・25 MiB である","FormData 30 / snapshot 29 / migration 0013 が docs・system-spec・architecture で一致する"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-security","arch-harness-hub-data"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/hearing-intake-pr709-remediation-20260813.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"76e38518a857923c6c8a6fa7341a679e4a49844a7b0bf02e852b2222ab80db11","evaluator":"PR #709 後の実装と仕様差分の照合","evidence_ref":"apps/hub/src/lib/hearing-share/rate-limit.ts"}
source_lineage: {"imported_at":"2026-08-13T13:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "マージ済み公開共有の仕様ドリフトと pre-DB rate limit 欠落を直す再現可能な backend 不具合。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/hearing-intake-pr709-remediation-20260813.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-hodi","linked_at":"2026-08-13T13:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-13T13:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

マージ済み PR #709 のあとで、仕様と実装が食い違っていた点を揃える。

## 背景と問題

PR #709 は main に入っている。残っていたのは次の後始末である。

1. 無効・random な共有 token でも、rate limit より先に DB read が走っていた。
2. 仕様書は画像 50 MiB / FormData 28 / migration 0010 のままだったが、実装は添付 8 種 25 MiB / FormData 30 / migration 0013 だった。

## 期待する挙動

- 公開経路は token 解決より前に IP 単位 240 req/min で止まる。
- 上限超過時は無効 token でも DB read が走らない。
- 仕様書の添付・件数・migration 番号が実装と同じである。

## スコープ

- In: pre-DB limiter、添付・FormData・migration の正本化、回帰テスト
- Out: 404 畳み方の変更、認可階層、/legal 分離、本番デプロイ

## 受入条件

- [x] 公開経路は token 解決より前に IP 単位 240 req/min で止まり、無効 token では DB read が走らない。
- [x] 有効 token と無効 token の 429 応答が一致する。
- [x] 添付の正本が allowlist 8 種・25 MiB である。
- [x] FormData 30 / snapshot 29 / migration 0013 が docs・system-spec・architecture で一致する。
