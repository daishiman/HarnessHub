---
graph_node_id: "issue-runbook-cli-invocation-broken-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["runbook","backup","restore","pnpm","cli","documentation"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "runbook の export/restore 手動コマンドが pnpm 10.9.0 と cwd 差でそのままでは実行できない"
owners: ["daishiman"]
created_at: "2026-07-25T00:41:30Z"
updated_at: "2026-07-25T06:20:00Z"
status: "closed"
depends_on: []
related_nodes: ["SYS-DOMAIN-MODEL-DB-P13"]
resource_scope: ["docs/features/feat-domain-model-db/runbook.md","docs/features/feat-domain-model-db/refactoring-migration-note.md"]
purpose: "四半期 restore drill と障害時の手動 export/restore を、runbook に書かれたコマンドをそのまま貼るだけで実行できる状態にする"
goal: "runbook §1/§2 のコマンドが pnpm 10.9.0 の実環境で 1 回で通り、書かれた手順と実行可能な手順が一致する"
mvp_alignment: null
scope_in: ["runbook §1/§2 の pnpm run -- --url 形式を pnpm exec tsx 形式へ修正","restore の --migrations-dir 相対パス記述の削除または絶対解決への修正","refactoring-migration-note.md の同形記述の修正","修正後コマンドの実走確認"]
scope_out: ["CLI スクリプト側の引数パーサ仕様変更","backup/restore の設計そのものの変更"]
acceptance: ["runbook §1/§2 のコマンドをコピー&ペーストで実行して export と restore が成功する","誤りのある -- --url 形式と相対 --migrations-dir がリポジトリ内の文書から消えている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/runbook-cli-invocation-broken-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T00:41:30Z","origin_kind":"generated","source_digest":"df2069389627bfd0fee32914b5ec7bbeb83a1c5c97e199b5afe000b88d9bf38e","source_path":"docs/features/feat-domain-model-db/release-record.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.95
classification_reason: "SYS-DOMAIN-MODEL-DB-P13 の四半期 restore drill 実走中に踏んだ F-2 / F-3。runbook は P13 の resource_scope 外のため別 issue として切り出す"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/runbook-cli-invocation-broken-20260725.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-0yvi","linked_at":"2026-07-25T00:44:10Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-25T03:26:51Z","evidence_refs":["docs/features/feat-domain-model-db/runbook.md","docs/features/feat-domain-model-db/refactoring-migration-note.md","packages/db/__tests__/backup-restore.test.ts"],"policy":"manual","reconciled_at":"2026-07-25T03:26:51Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T00:41:30Z","missing_sections":[],"status":"complete"}
---

# 概要

四半期 restore drill と手動 export の runbook コマンドを pnpm 10.9.0 で実行できる形式へ修正し、日次 SQL dump の復元経路も実バックアップ形式と一致させた。

## 対応

- export / JSONL restore を `pnpm --filter @harness-hub/db exec tsx scripts/<name>.ts` 形式へ統一
- JSONL restore は CLI が持つ既定の `packages/db/migrations` 解決を利用し、誤った相対 `--migrations-dir` を削除
- 日次 SQL dump は R2 から取得後、新 Turso へ `turso db shell <name> < dump.sql` で直接 restore
- SQL restore 後に 18 domain table / 12 explicit index を独立確認し、さらに JSONL round-trip で行数・audit chain・暗号断面を検証
- Turso CLI 1.0.30 の `db create --from-dump` は成功表示でも 0 table だったため、runbook の経路として不採用

## 受入条件

- [x] runbook と同じ JSONL export / restore コマンドを一時 DB で実走し、両方 exit 0
- [x] 誤った `run ... -- --url` と二重相対 `--migrations-dir packages/db/migrations` が対象文書から消滅
- [x] 本番 SQL dump を使い捨て Turso へ restore し、18 table / 12 index を確認
- [x] SQL restore 後の DB を JSONL semantic round-trip し、`chainOk:true / errors:[]`
- [x] `@harness-hub/db` の 65 tests が pass

## 検証証跡

- `docs/features/feat-domain-model-db/runbook.md`
- `docs/features/feat-domain-model-db/refactoring-migration-note.md`
- `docs/features/feat-domain-model-db/release-record.md`
- `packages/db/__tests__/backup-restore.test.ts`
