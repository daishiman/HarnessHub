---
graph_node_id: "doc-production-tenant-bootstrap-runbook-20260815"
artifact_kind: "document"
artifact_subtypes: []
layer: "operations"
project_id: "harness-hub"
domain: "operations"
tags: ["tenant","bootstrap","operations"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "本番テナント bootstrap 運用手順"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00Z"
updated_at: "2026-08-15T00:00:00Z"
status: "active"
depends_on: ["issue-production-tenant-bootstrap-readiness-20260814"]
related_nodes: ["issue-production-tenant-bootstrap-readiness-20260814","feat-auth-tenancy"]
resource_scope: ["docs/features/feat-auth-tenancy/production-tenant-bootstrap-runbook.md"]
purpose: "本番最初の tenant / workspace / workspace-admin を画面なしで作る手順を固定する。"
goal: "dry-run 既定の CLI 手順と失敗時の再実行が運用者に届く。"
scope_in: ["dry-run","apply","再実行","失敗時の扱い"]
scope_out: ["本番秘密値の投入","seed-local"]
acceptance: ["手順が秘密値なしで再現できる","画面経路が無いことが明記される"]
architecture_refs: ["arch-harness-hub-data"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-auth-tenancy/production-tenant-bootstrap-runbook.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f4f17d9dec2fff09bd90a0b5ab62ee91821814c3351c07da57058ad47691d09f","evaluator":"final-review","evidence_ref":"docs/features/feat-auth-tenancy/s8oe-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "運用手順は document として docs/features へ置く。"
classification_candidates: [{"artifact_kind":"document","candidate_path":"docs/features/feat-auth-tenancy/production-tenant-bootstrap-runbook.md","confidence":0.99}]
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

# 本番テナント bootstrap 運用手順

最初のテナント・Workspace・管理者所属を、画面を使わず安全に作る手順。
画面から新規テナントを作る経路は無く、初回サインインは role を常に `member` にする。
そのため 1 人目の `workspace-admin` だけは本 CLI が唯一の正規経路になる。

## 対象読者

本番 control-plane を扱う運用担当者。

## 要約

既定は dry-run。`--apply` のときだけ書く。管理者は先に 1 回サインインしてから再実行する。

## 本文

### いつ使うか

- 本番 DB に最初の tenant / workspace がまだ無い
- 対象利用者が 1 回サインインしたあと、管理者へ上げたい
- 途中で失敗したあとに、同じ入力でもう一度実行したい

使わないこと:

- 手元の使い捨ての作り直し（それは `seed-local`）
- 既存テナント名や plan の上書き
- 利用者行そのものの作成（IdP の初回サインインが作る）

### 手順

1. 既定は dry-run。何が起きるかを JSON で確認する。

```bash
TURSO_AUTH_TOKEN=<secret> pnpm --filter @harness-hub/db bootstrap:tenant \
  --url libsql://<db>.turso.io \
  --tenant-slug acme \
  --tenant-name 'ACME 株式会社' \
  --workspace-slug default \
  --workspace-name '既定 Workspace' \
  --admin-email admin@acme.example
```

2. `--apply` で tenant と workspace を足す。管理者指定時に利用者が未サインインなら
   `ok=false` / `user-not-found` で止まる。テナント枠は残る。
3. 対象の人に 1 回サインインしてもらう（JIT で `member` 行が作られる）。
4. 同じコマンドに `--apply` を付けて再実行する。role 昇格と所属追加と監査が
   1 つの transaction（まとめて成功かまとめて失敗）になる。
5. もう一度 `--apply` しても行は増えず `existing` / `already-admin` になる。

### 失敗したとき

- 監査だけ失敗した実行は rollback する。role や所属だけ残して成功扱いしない。
- 同じ入力の再実行で欠落を埋める。埋められない場合は成功にしない。
- slug / email / 空の plan は DB 書き込み前に拒否する。
- 秘密値は argv に載せない。`TURSO_AUTH_TOKEN` を使う。

### 検証

- 本番秘密値なし: `pnpm --filter @harness-hub/db exec vitest run __tests__/bootstrap-tenant.test.ts`
- 受領書: [s8oe 仕様反映受領書](./s8oe-spec-reflection-receipt.md)

## 決定事項

- 画面経路は作らない。最初の管理者は CLI のみ。
- `seed-local` の削除再作成は本番禁止。

## 運用・更新方法

- 更新契機: CLI の受入条件や監査 action が変わったとき
- 更新責任者: daishiman
- 鮮度確認: focused test と本手順のコマンドが一致すること

## 関連資料

- `issue-production-tenant-bootstrap-readiness-20260814`
- `HarnessHub-s8oe`

## 変更履歴

| Date | Change | Author |
|---|---|---|
| 2026-08-15 | 初版 | daishiman |
