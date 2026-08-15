---
graph_node_id: "issue-marketplace-unauthenticated-consumer-route-20260810"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["dual-catalog","marketplace","distribution","security","design"]
priority: "medium"
start_date: "2026-08-10"
target_date: null
iteration: null
title: "marketplace.json 未認証 consumer 経路を H7 と同時に確定する"
owners: ["daishiman"]
created_at: "2026-08-10T00:00:00Z"
updated_at: "2026-08-12T04:26:41Z"
status: "active"
depends_on: ["issue-h7-git-subdir-revalidation-20260730"]
related_nodes: ["feat-dual-catalog-web","feat-stage0-distribution-gate"]
resource_scope: ["apps/hub/src/app/marketplace.json","apps/hub/src/lib/authz","docs/features/feat-dual-catalog-web"]
purpose: "CLI や plugin manager など browser session を持たない consumer が marketplace document を取得する正式な認証・scope 境界を確定する。"
goal: "H7 の配布経路と整合する未認証 consumer 契約を、deny-by-default・cache・監査・rollback と共に確定する。"
scope_in: ["consumer identity と credential","tenant/workspace scope","cache と署名","監査と rate limit","ADR/API 契約/テスト"]
scope_out: ["H7 配布経路そのものの先行決定","認証無しの無制限公開","plugin artifact の build 実装"]
acceptance: ["browser Cookie を持たない正式 consumer の認証方式が決まっている","scope・cache・TTL・失効・監査が fail-closed に定義されている","H7 source 形式と marketplace body/header が整合する","ADR・API 契約・security test・rollback が同一変更で反映されている"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/marketplace-unauthenticated-consumer-route-20260810.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"285d88f967f7488fd54c0d9a55f946b14c208a2f0eb957bcc06c3779b7468fb7","evaluator":"feat-dual-catalog-web independent design review","evidence_ref":"docs/features/feat-dual-catalog-web/design-review-notes.md"}
source_lineage: {"imported_at":"2026-08-10T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "marketplace route は browser session 認可だけを持ち、配布 consumer の契約が H7 待ちで未確定なため独立 design issue。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/marketplace-unauthenticated-consumer-route-20260810.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dctf","linked_at":"2026-08-09T20:50:46.120771Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-10T00:00:00Z","missing_sections":[],"status":"complete"}
---

# marketplace.json の未認証 consumer 経路を H7 と同時に確定する

## 概要

browser session を持たない CLI や plugin manager が `marketplace.json` を取得する正式な経路を、H7 の配布方式と同時に決める。

## 背景と問題

現行 route は Hub の Cookie と tenant/workspace scope を前提とする。人が browser で見る経路は守れるが、自動 consumer が何を credential として使うかは H7 待ちで未確定である。場当たり的に公開すると tenant 情報と cache の境界を崩す。

## 現在の挙動

- browser session は単一認可層で保護される。
- private cache と scope ごとの `Vary` を返す。
- session を持たない正式 consumer の契約は無い。

## 期待する挙動

H7 の source 形式と整合し、短命 credential、scope、TTL、失効、cache、rate limit、監査を含む fail-closed な consumer 経路が定義される。

## 再現手順またはユースケース

1. Cookie を持たない plugin manager から route を要求する。
2. 現行では 401 となり、正式な token 交換または署名 URL の契約が無いことを確認する。
3. H7 の採用方式ごとに credential と source 表現を評価する。

## 影響と優先度

現在の browser 利用は保護されており緊急障害ではない。配布方式の確定前に決めると二重実装になるため medium とし、H7 決定を依存にする。

## スコープ

認証方式、scope、cache、署名、監査、rate limit、ADR/API 契約/test を対象とする。H7 の方式そのものは先行決定しない。

## 関連グラフ

- `feat-dual-catalog-web`
- `feat-stage0-distribution-gate`
- `arch-harness-hub-security`

## 受入条件

- session を持たない consumer の credential と失効方式が確定している。
- tenant/workspace scope と cache が交差しない。
- body/header/source と H7 verdict が一致する。
- security test と rollback が同じ変更にある。

## 検証証跡

起票根拠は `docs/features/feat-dual-catalog-web/design-review-notes.md` §5.4 / F4。H7 決定時に threat model と focused security test を追加する。
