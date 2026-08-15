---
graph_node_id: "doc-s8oe-spec-reflection-receipt-20260815"
artifact_kind: "document"
artifact_subtypes: []
layer: "feature-spec-reflection"
project_id: "harness-hub"
domain: "operations"
tags: ["tenant","bootstrap","spec-reflection"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "本番テナント bootstrap CLI 仕様反映受領書"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00Z"
updated_at: "2026-08-15T00:00:00Z"
status: "active"
depends_on: ["issue-production-tenant-bootstrap-readiness-20260814"]
related_nodes: ["issue-production-tenant-bootstrap-readiness-20260814","feat-auth-tenancy","spec-harness-hub-system-specification-implementation-writebacks"]
resource_scope: ["docs/features/feat-auth-tenancy/s8oe-spec-reflection-receipt.md"]
purpose: "bootstrap CLI の仕様影響判断と写し先を HEAD に残す。"
goal: "確定章 reopen なしで運用契約が追跡できる。"
scope_in: ["影響判断","写し先","検証結果","残課題"]
scope_out: ["本番 apply"]
acceptance: ["各層の反映または無変更理由がある","Beads ID と graph node が一致する"]
architecture_refs: ["arch-harness-hub-infrastructure-operations-addenda"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-auth-tenancy/s8oe-spec-reflection-receipt.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b1336af955c7cbc66dbc5ec329637f74d376646aa9f673023dfe35917d7b4eec","evaluator":"final-review","evidence_ref":"packages/db/__tests__/bootstrap-tenant.test.ts"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "仕様反映受領書は document として feature docs へ置く。"
classification_candidates: [{"artifact_kind":"document","candidate_path":"docs/features/feat-auth-tenancy/s8oe-spec-reflection-receipt.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 本番テナント bootstrap CLI — 仕様反映受領書

## 対象読者

最終レビューと PR を読む運用者・レビュアー。

## 要約

公開 API と schema は変えていない。最初の管理者を作る運用契約を索引・writeback・追補へ写した。

## 本文

### 何を言われて・何をやったか

`HarnessHub-s8oe` の最終レビューとして、本番最初のテナントを作る CLI の差分を確認し、
品質ゲートを再実行し、仕様・設計への影響を正規の写し先へ戻した。
目的は、画面から作れない最初の管理者を、失敗後も監査可能なまま再実行できる運用経路に固定すること。

### 結論

実装は受入条件を満たす。公開 API・DB schema・role 語彙・JIT の `member` 固定は変えていない。
変えたのは「最初の tenant / workspace / workspace-admin を誰がどの順で足すか」という運用契約なので、
確定章は reopen せず、索引・writeback・運用追補・feature 追記へ反映した。

### TL;DR

最初の会社箱と管理者は画面では作れない。dry-run が既定の CLI が唯一の入口で、監査付きで何度でも同じ結果になる。

### 仕様影響の判断

| 層 | 判定 | 反映または無変更の理由 |
| --- | --- | --- |
| `system-spec/` | 索引のみ反映 | 確定 QA（tenant / workspace / role / JIT member）の本文は変えない。`index.md` の writeback 索引へ接続する |
| `specs/` | 反映済み | 実装 writeback 分冊へ運用契約を索引する |
| `architecture/` | 追補へ反映 | 本体 wrapper の source digest は触らず、infrastructure 運用追補へ記録する |
| `features/` | 追記済み | closed の `feat-auth-tenancy` に post-closeout の実装反映節を足す |
| `tasks/` | 補助 task を追加 | exact-13 は改変せず、handoff task で追跡する |
| `docs/` | 反映済み | backend-spec の tenants 行、auth / domain-model runbook、本受領書 |

影響が無いと言い切らない理由: 新しい公開 API は無いが、本番の最初の管理者を作る唯一経路が初めて文書化された。
これは運用契約の追加であり、確定質疑の reopen 対象ではない。

### 実装と検証の対応

- `bootstrap-tenant-core.ts` は既存行を更新・削除しない。無い行だけを足す。
- role 変更と membership 追加と監査 append は同一 transaction。監査失敗は rollback する。
- 未サインインの管理者指定は `ok=false`。テナント枠は残し、再実行で続ける。
- focused test 22 件 PASS、`@harness-hub/db` typecheck PASS。本番 `--apply` は未承認のまま残す。

### 残課題

- 本番 Turso への実適用は運用承認後。本 PR では行わない。
- `tenants.plan` は schema 上ただの文字列。空以外の製品 enum はまだ無い。

## 決定事項

- 確定章は reopen しない。写し先は index / writeback / 運用追補。

## 運用・更新方法

- 更新契機: CLI 契約または写し先が変わったとき
- 更新責任者: daishiman
- 鮮度確認: PR 前の `build-spec-reflection-receipt.py`

## 関連資料

- `issue-production-tenant-bootstrap-readiness-20260814`
- `HarnessHub-s8oe`

## 変更履歴

| Date | Change | Author |
|---|---|---|
| 2026-08-15 | 初版 | daishiman |
