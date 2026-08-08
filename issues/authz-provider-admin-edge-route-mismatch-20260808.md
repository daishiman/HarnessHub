---
graph_node_id: "issue-authz-provider-admin-edge-route-mismatch-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["authz","multi-tenancy","audit","dead-code"]
priority: "high"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "provider-admin 越境の edge 遮断と route 層監査契約の不整合を解消する"
owners: ["daishiman"]
created_at: "2026-08-08T09:00:00Z"
updated_at: "2026-08-08T09:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-production-smoke-coverage-gaps-20260808"]
resource_scope: ["apps/hub/src/middleware/authz.ts","apps/hub/src/lib/authz/with-authz.ts","apps/hub/scripts/smoke-production-coverage.ts","apps/hub/src/__tests__/feedback-loop"]
purpose: "provider-admin の越境許可が『契約上は許可・実運用では到達不能』という二枚舌になっている状態を、どちらかへ倒して解消する。"
goal: "edge middleware と route 層 (withAuthz) の provider-admin 越境の扱いを一致させ、本番 smoke S8 の期待値と FL-SEC8-101..104 を新しい契約へ揃える。"
scope_in: ["edge/route いずれへ倒すかの設計判断と実装","FL-SEC8-102 の契約記述の更新","本番 smoke S8 の期待値更新"]
scope_out: ["provider-admin 以外の role の判定順変更","T-ISO-06 (存在秘匿 404) の方針変更"]
acceptance: ["provider-admin の越境要求に対する挙動が edge と route で一致している","provider.cross_tenant_access 監査行が『必ず出る』か『そもそも契約に無い』かのいずれかに確定している","本番 smoke S8 が新しい契約の期待値で緑になる"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/authz-provider-admin-edge-route-mismatch-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T09:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-p0lr の実装中に判明した、単一 feature に属さない横断的な認可設計の不整合。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/authz-provider-admin-edge-route-mismatch-20260808.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-stmx","linked_at":"2026-08-08T09:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:00:00Z","missing_sections":[],"status":"complete"}
---

# provider-admin 越境の edge 遮断と route 層監査契約の不整合を解消する

## 概要

provider-admin (プロバイダ側の管理者) が他 tenant のリソースへアクセスしたとき、route 層は「許可して監査に残す」契約なのに、その手前の edge middleware が role を見ずに 404 で落としている。結果、route 層の越境監査は本番で一度も動かない。

## 背景と問題

`apps/hub/src/lib/authz/with-authz.ts` は provider-admin の越境要求を許可し、`provider.cross_tenant_access` を監査イベントとして記録する契約になっている (FL-SEC8-102)。

一方 `apps/hub/src/middleware/authz.ts` の `authorize()` は role を参照せず、`scope.tenantId !== principal.tenantId` を一律 `tenant_mismatch` / 404 で落とす。`apps/hub/src/middleware.ts` の matcher は `_next/static` などを除く全 path を通すため、API route も例外ではない。

route 単体テスト (`apps/hub/src/__tests__/feedback-loop/ai-pull-queue-provider-admin-device-flow.test.ts`) は `withAuthz` を直接呼ぶので、この乖離を検出できないまま緑を保っていた。`tenant_mismatch` の 403/404 不一致とまったく同じ構図である。

## 現在の挙動

`HarnessHub-p0lr` で追加した本番 smoke の S8 (`apps/hub/scripts/smoke-production-coverage.ts`) が実測で固定している。

- provider-admin token で他 tenant の `POST /api/v1/ai-jobs/pull` を叩くと **404 / `tenant_mismatch`**
- 対象 tenant の `provider.cross_tenant_access` 監査行は **0 件** (`countCrossTenantAuditEvents`)

## 期待する挙動

次のいずれかに確定していること。

- (a) edge に provider-admin の例外経路を設け、越境を route 層へ通す。監査行は必ず 1 件以上出る。
- (b) route 層の `provider.cross_tenant_access` 分岐を dead code として畳み、FL-SEC8-102 の契約記述も「越境は edge で 404」に改める。

## 再現手順またはユースケース

1. 本番相当環境で provider-admin role の使い捨て user を作る
2. Device Flow で access token を取り、他 tenant の tenant/workspace scope を付けて `POST /api/v1/ai-jobs/pull`
3. status と `audit_events` の `provider.cross_tenant_access` 件数を突き合わせる

`pnpm --filter @harness-hub/hub smoke:coverage-production` の S8 がこの手順そのものである。

## 影響と優先度

priority: high。プロバイダ運用者が越境調査をしたいときに機能しないか、あるいは「監査に残るから安全」という前提が実は空振りしているかのどちらかであり、いずれもセキュリティ上の判断材料が誤っている。データ漏洩は現状発生しない (edge が閉じているため) ので critical ではない。

## スコープ

`scope_in` / `scope_out` は frontmatter を正本とする。認可判定そのものを触るため、`HarnessHub-p0lr` (smoke 実装) からは意図的に分離した。

## 関連グラフ

- `issue-production-smoke-coverage-gaps-20260808` (この不整合の発見元。S8 で現行挙動を固定済み)
- `arch-harness-hub-infrastructure`

## 受入条件

frontmatter の `acceptance` を正本とする。

## 検証証跡

- `apps/hub/scripts/smoke-production-coverage.ts` の S8 ブロック (現行挙動の実測)
- `apps/hub/tests/hub-foundation/production-coverage-smoke-script.test.ts` の「provider-admin 越境がどの層で止まるかを監査行で測る」
- `issues/production-smoke-coverage-gaps-20260808.md` の「実装中に判明した設計上の不整合」節
