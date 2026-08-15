---
graph_node_id: "issue-production-tenant-bootstrap-readiness-20260814"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["tenant","bootstrap","production","audit","idempotency"]
priority: "medium"
start_date: "2026-08-14"
target_date: null
iteration: null
title: "本番テナント bootstrap CLI の監査・冪等性・入力検証を完成する"
owners: ["daishiman"]
created_at: "2026-08-14T12:50:00Z"
updated_at: "2026-08-15T00:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-cloudflare-free-tier-runtime-limits-20260814","SYS-TENANT-DATA-RETENTION-P13","task-production-tenant-bootstrap-handoff-20260815","doc-production-tenant-bootstrap-runbook-20260815","doc-s8oe-spec-reflection-receipt-20260815"]
resource_scope: ["packages/db/scripts/bootstrap-tenant-core.ts","packages/db/scripts/bootstrap-tenant.ts","packages/db/__tests__/bootstrap-tenant.test.ts","packages/db/package.json"]
purpose: "本番の最初のテナントと管理者を安全に作る唯一のCLIを、失敗後も監査可能で再実行できる状態へする。"
goal: "dry-run、適用、部分失敗、再実行の各経路でデータと監査が収束し、不正なslug・email・planを本番DBへ入れない。"
scope_in: ["入力の正規化と検証","冪等なtenant/workspace/membership作成","role変更とmembership変更の監査帰属","部分成功後の再実行で監査を再収束させる検査"]
scope_out: ["本番データへの実適用","秘密値の投入","テナント削除","既存テナント名・planの上書き"]
acceptance: ["同じ入力を複数回適用してもtenant/workspace/membership/監査イベントが重複しない","監査append失敗後の再実行で欠落監査が補われるか、未回復を明示して成功扱いにしない","membership追加とrole変更を異なる監査actionで帰属できる","slug・email・planの不正値をDB書込前に拒否する","dry-runとfocused testが本番秘密値なしで再現できる"]
architecture_refs: ["arch-harness-hub-data"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/production-tenant-bootstrap-readiness-20260814.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":"packages/db/__tests__/bootstrap-tenant.test.ts"}
source_lineage: {"imported_at":"2026-08-14T12:50:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "未追跡の本番運用CLIを既存10件から分離し、独立した所有・受入境界で追跡する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/production-tenant-bootstrap-readiness-20260814.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-s8oe","linked_at":"2026-08-14T12:54:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-14T12:50:00Z","missing_sections":[],"status":"complete"}
---

# 概要

本番で最初のテナント、workspace、管理者所属を作る唯一のCLIを、既存10課題とは独立した所有境界で完成させる。

## 背景と問題

`packages/db/scripts/bootstrap-tenant-core.ts`、CLI、focused test、package script が未追跡で、帰属課題が無い。現状は初回作成と再実行を扱う一方、監査appendだけが失敗した部分成功後の再実行、membershipだけを作った場合の監査action、slug・email・planの形式検証が受入条件として固定されていない。

## 現在の挙動

既定はdry-runで、`--apply`時だけtenant/workspace/admin membershipを追加する。既存tenantのname/planは上書きせず、JIT provisioning前のadmin指定は部分成功を明示する。

## 期待する挙動

同一入力の再実行でデータと監査が一意に収束し、監査欠落や不正入力を成功扱いにしない。membership追加とrole変更は異なる監査actionへ帰属する。

## 再現手順またはユースケース

1. 本番秘密値を使わずfocused testでdry-run、apply、再実行を実行する。
2. 監査append失敗を注入し、再実行時に欠落が補われるか未回復が明示されることを確認する。
3. slug、email、planの不正値がDB書込前に拒否されることを確認する。

## 影響と優先度

本番テナントの初回作成経路であり、誤ると管理者不在、監査欠落、復旧不能な識別子が残る。優先度はP2。

## スコープ

- In: 入力検証、冪等作成、role/membership監査、部分成功後の再収束、focused test
- Out: 本番DBへの実適用、秘密値投入、削除、既存tenantの更新

## 関連グラフ

- `issue-cloudflare-free-tier-runtime-limits-20260814`
- `SYS-TENANT-DATA-RETENTION-P13`

## 受入条件

- 同じ入力を複数回適用してもtenant/workspace/membership/監査イベントが重複しない。
- 監査append失敗後の再実行で欠落監査が補われるか、未回復を明示して成功扱いにしない。
- membership追加とrole変更を異なる監査actionで帰属できる。
- slug・email・planの不正値をDB書込前に拒否する。
- dry-runとfocused testが本番秘密値なしで再現できる。

## 検証証跡

- `packages/db/__tests__/bootstrap-tenant.test.ts`
- `packages/db/scripts/bootstrap-tenant-core.ts`
