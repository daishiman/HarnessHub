---
graph_node_id: "task-production-tenant-bootstrap-handoff-20260815"
artifact_kind: "task"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["tenant","bootstrap","auth-tenancy","handoff"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "本番テナント bootstrap CLI の最終レビューと仕様写しの補助記録"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00Z"
updated_at: "2026-08-15T00:00:00Z"
status: "active"
depends_on: ["issue-production-tenant-bootstrap-readiness-20260814"]
related_nodes: ["issue-production-tenant-bootstrap-readiness-20260814","feat-auth-tenancy","arch-harness-hub-infrastructure-operations-addenda","spec-harness-hub-system-specification-implementation-writebacks"]
resource_scope: ["packages/db/scripts/bootstrap-tenant-core.ts","packages/db/scripts/bootstrap-tenant.ts","packages/db/__tests__/bootstrap-tenant.test.ts","packages/db/package.json","docs/features/feat-auth-tenancy/production-tenant-bootstrap-runbook.md","docs/features/feat-auth-tenancy/s8oe-spec-reflection-receipt.md"]
purpose: "凍結済み auth-tenancy exact-13 を改変せず、bootstrap CLI の最終レビュー・仕様写し・draft PR を追跡する。"
goal: "受入条件と仕様反映判断が同じ Beads ID / graph node を指し、本番未適用が成功と混同されない。"
scope_in: ["最終レビュー","仕様影響判断","品質ゲート","Beads と draft PR の追跡"]
scope_out: ["本番 Turso への実適用","tenant 削除","既存 name/plan の上書き","exact-13 の再計画"]
acceptance: ["focused test と typecheck が PASS","仕様写し先と無変更理由が受領書にある","本番 apply を残課題として明示する"]
architecture_refs: ["arch-harness-hub-data","arch-harness-hub-infrastructure-operations-addenda"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "tasks/feat-auth-tenancy/production-tenant-bootstrap-handoff.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1c470ab897723e75094f875109361cbaee6f43f087a91a83edf2f16d346d7318","evaluator":"final-review","evidence_ref":"docs/features/feat-auth-tenancy/s8oe-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "closed feature の exact-13 を手編集せず、運用 CLI の公開前統合だけを補助 task で記録する。"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-auth-tenancy/production-tenant-bootstrap-handoff.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-s8oe","linked_at":"2026-08-15T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":["packages/db/__tests__/bootstrap-tenant.test.ts"],"policy":"manual","reconciled_at":null,"source":"manual","status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 目的

本番の最初のテナントと管理者を、失敗後も監査可能な CLI として固定し、
仕様写しと draft PR の境界を 1 つの補助 task で追跡できる。

## 背景

画面と JIT は最初の `workspace-admin` を作れない。`seed-local` は消して作り直すので本番に使えない。
本作業は既存 exact-13 を増やさず、独立 issue `HarnessHub-s8oe` の実装を公開前レビューする。

## 入力と前提条件

- 入力: bootstrap CLI、focused test、既存 tenant / workspace / role 契約
- 前提: 本番秘密値と Turso 実適用は未承認

## 出力と成果物

- 生成物: `packages/db/scripts/bootstrap-tenant*.ts`、focused test、運用手順、受領書
- 更新対象: `docs/`、`features/feat-auth-tenancy.md`、`system-spec/index.md`、`specs/` writeback、architecture 追補

## 依存関係

- `depends_on`: `issue-production-tenant-bootstrap-readiness-20260814`
- ブロッカー: 本番 apply の運用承認

## 実装対象

- Frontend: N/A。画面経路は作らない
- Backend/API: N/A。公開 API は増やさない
- Database/Data: 既存テーブルへ append-only の運用 CLI
- Infrastructure: 本番 apply は残課題
- Security/Privacy: 監査 action を role と membership で分ける
- Documentation: runbook・受領書・writeback・索引

## 実行手順

1. git status と diff から本課題の対象ファイルだけを確定する。
2. focused test と typecheck を再実行する。
3. 仕様影響を判断し、index / writeback / 運用追補 / feature docs へ写す。
4. リモート main をローカル main へ取り込み、本 branch へマージする。
5. 対象ファイルだけを commit / push し、正しい base へ draft PR を作る。

## Write scope と競合制約

- `touches`: `packages/db/scripts/bootstrap-tenant*`、`packages/db/__tests__/bootstrap-tenant.test.ts`、関連 docs
- 排他資源: 本番 Turso
- branch: `devgraph/issue-production-tenant-bootstrap-readiness-20260814`
- completion projection: 本番未適用の間は Beads を完了扱いにしない

## 受入条件

- focused test と typecheck が PASS する。
- 仕様写し先と、確定章を reopen しない理由が受領書にある。
- 本番 apply を残課題として明示する。

## 検証方法

bootstrap focused test、db typecheck、関連 feature package の task spec validator、graph schema、artifact placement、doc line limit を MVP 深度で実行する。

## リスクとロールバック

最大リスクは、テスト通過を本番投入完了と誤認すること。問題時は本 PR を revert し、本番 DB には触らない。

## GitHub publication

- Mode: `local_only`
- Completion policy: `manual`（本番 apply は別承認）

## Handoff

draft PR の review / merge 後も、本番 Turso への `--apply` が承認されるまで `HarnessHub-s8oe` を自動 close しない。
