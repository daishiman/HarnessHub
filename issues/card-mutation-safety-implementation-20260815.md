---
graph_node_id: "issue-card-mutation-safety-implementation-20260815"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "data-safety"
tags: ["card-mutation-safety","idempotency","etag","cas","tdd"]
priority: "high"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "Docs / Sheets の冪等 POST と entity revision CAS を実装する"
owners: ["daishiman"]
created_at: "2026-08-14T23:04:55Z"
updated_at: "2026-08-14T23:08:39Z"
status: "active"
depends_on: []
related_nodes: ["feat-card-mutation-safety","arch-harness-hub-backend","arch-harness-hub-security","feat-docs-cms","feat-hearing-intake"]
resource_scope: ["features/feat-card-mutation-safety.md","apps/hub/src/app/api/v1/docs/","apps/hub/src/app/api/v1/sheets/","apps/hub/src/features/docs-cms/","apps/hub/src/features/hearing-intake/","apps/hub/src/lib/http/","apps/hub/src/app/(dashboard)/docs/","apps/hub/src/app/(dashboard)/sheets/","packages/schemas/docs-cms/","packages/schemas/hearing-intake/","apps/hub/src/lib/publish/idempotency.ts","packages/db/repository/","packages/db/schema/","packages/db/migrations/","apps/hub/src/__tests__/"]
purpose: "Docs / Sheets の通常 CRUD で二重作成と古い表示からの後勝ち上書きを防ぎ、外部 import 専用 revision と分離したデータ安全基盤を作る"
goal: "scope 付き 24h 冪等台帳による response replay と、tenant/workspace 所有境界内の原子 entity revision CAS を、API/repository/実 DB テストで証明する"
scope_in: ["Docs / Sheets 通常 POST の Idempotency-Key 必須化・canonical payload hash・24h TTL・response replay","tenant + workspace + resource + operation を必ず含む scope 契約と、同時同 key で1件だけ作成する原子性","documents / hearing_sheets の通常 entity revision と ETag / If-Match CAS","412 で現行 representation と ETag を返す競合契約","docs-import-* / externalRevision と通常 entity revision の非干渉回帰","既存 Docs 作成/編集・Sheets 作成/状態変更 caller の Idempotency-Key / If-Match 配線と412後の未保存 draft 保持","Docs 作成の業務行・wire snapshot・append-only audit を同一 DB transaction で確定"]
scope_out: ["Catalog / PublishRequest の状態機械と既存冪等契約","カード一覧の表示構造と Markdown カード本文（既存 mutation caller の安全配線は対象内）","外部 import 専用 docs-import-* / externalRevision の意味変更","commit・push・PR・deploy"]
acceptance: ["同 key・同 scope・同 payload の同時 POST で業務行が1件だけ作成され response が replay される","同 key の異 payload は422、key 欠落/不正は400、scope は tenant/workspace/resource/operation の全要素を含む","Docs / Sheets の GET/POST/PATCH が entity revision ETag を返し、PATCH は If-Match を必須とする","同 revision の同時 PATCH は1件だけ成功し、敗者は現行 representation / ETag 付き412になる","外部 import ETag と通常 entity ETag の相互非受理と Catalog / PublishRequest 非変更が回帰で固定される"]
architecture_refs: ["arch-harness-hub-backend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/card-mutation-safety-implementation-20260815.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"36925c7f1d98c33c04655bac3c6ef2be4a2d396ca5a1104bfb015cdae1c87bd2","evaluator":"parent-task-implement-mutation-safety-20260815","evidence_ref":"features/feat-card-mutation-safety.md"}
source_lineage: {"imported_at":"2026-08-14T23:04:55Z","origin_kind":"manual","source_digest":null,"source_path":"features/feat-card-mutation-safety.md","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "親タスクが feat-card-mutation-safety 1件の製品実装を明示指定した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/card-mutation-safety-implementation-20260815.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6oi5","linked_at":"2026-08-14T23:08:27Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-15T00:54:09Z","evidence_refs":["features/feat-card-mutation-safety.md","packages/db/__tests__/mutation-safety-repositories.test.ts","apps/hub/tests/card-mutation-safety/http-contract.test.ts","tests/test_card_feature_contracts.py","beads:HarnessHub-6oi5"],"policy":"manual","reconciled_at":"2026-08-15T00:55:35Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-14T23:04:55Z","missing_sections":[],"status":"complete"}
---

# 概要

`features/feat-card-mutation-safety.md` を正本とし、Docs / Sheets 通常 CRUD の二重送信と更新競合を API / repository / DB の縦切りで安全化する。

## 背景と問題

現状の通常 POST は必須冪等キーがなく、ネットワーク再送で重複作成できる。通常 PATCH には entity revision CAS がなく、古い表示からの更新が後勝ち上書きになる。Docs の `docs-import-*` / `externalRevision` は外部同期専用であり、通常編集に流用しない。

## 実装方針

- `Idempotency-Key` は UUID v4 のみを受理し、scope に tenant / workspace / resource / operation を全て含める。
- canonical payload hash と 24h TTL を台帳で管理し、同 payload は status / headers / body を replay、異 payload は422、欠落/不正は400とする。
- 同 key の同時 POST はハンドラの後で台帳を書く形ではなく、業務行作成まで含めて1件に固定する。
- documents / hearing_sheets に正の整数 revision を追加し、tenant + workspace + id + expected revision の原子 UPDATE で CAS する。
- 412 は現行 representation と ETag を返し、自動 merge は行わない。
- 既存 Docs 作成/編集・Sheets 作成/状態変更 caller から必須 header を送り、412 後も未保存 draft を保つ。カード一覧の表示構造・Markdown 本文は対象外。
- Docs 作成は業務行、wire snapshot、append-only audit を同一 transaction で確定する。Sheets 通知は既存 AD-5 の created-only best-effort 契約を維持する。

## 受入条件

- 実 DB の同時 POST / PATCH で原子性を証明する。
- API 契約で400 / 412 / 422 / replay / ETag / If-Match を固定する。
- tenant/workspace 所有境界、入力検証、秘密・PII非ログを維持する。
- Catalog / PublishRequest、カード一覧の表示構造、Markdown 本文を変更しない。既存 mutation caller の安全配線は本 issue の必須範囲とする。

## 対象外

commit、push、PR、deploy は行わない。UI 目視はこの API/DB 縦切りの成果判定に使わない。
