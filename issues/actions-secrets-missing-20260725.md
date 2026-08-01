---
graph_node_id: "issue-actions-secrets-missing-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "infrastructure"
tags: ["ci","deploy","backup","secrets","turso","cloudflare","fail-closed"]
priority: "critical"
start_date: null
target_date: null
iteration: null
title: "GitHub Actions の Turso secrets が未登録で deploy migration と日次 backup が失敗する (secret 名の系統も二重)"
owners: ["daishiman"]
created_at: "2026-07-25T00:41:30Z"
updated_at: "2026-08-01T05:40:00Z"
status: "closed"
depends_on: []
related_nodes: ["SYS-DOMAIN-MODEL-DB-P13"]
resource_scope: [".github/workflows/ci.yml",".github/workflows/backup.yml","scripts/ci/actions-secrets-registry.json","scripts/ci/check-actions-secrets.mjs","apps/hub/tests/ci/actions-secrets.test.ts","docs/features/feat-hub-foundation/runbook.md"]
purpose: "CI が本番へ migration を適用し deploy し、日次 backup が実際に走る前提 (secret / variable) をリポジトリへ投入し、名前の系統を 1 つに揃える"
goal: "hub-ci の deploy job と hub-backup が secret 欠落で中止されず完走し、必要な secret 名の一覧が runbook から一意に引ける状態"
mvp_alignment: null
scope_in: ["GitHub Actions repository secret / variable の投入 (TURSO_*, CLOUDFLARE_*, HUB_HEALTH_URL, HUB_PUBLIC_URL)","workflow 実参照と機械可読台帳の双方向突合","backup.yml の日次形式を restore CLI と同じ JSONL へ統一","foundation runbook へ投入・live 検査手順を追加","投入後に hub-backup を手動 dispatch し 1 回 green を実測"]
scope_out: ["Turso / Cloudflare のアカウント設計そのものの変更","backup 保持世代・cron 時刻の再設計"]
acceptance: ["gh api repos/daishiman/HarnessHub/actions/secrets が必要な secret を返す","hub-backup の直近 run が success で R2 に export が存在する","main への push で hub-ci の deploy job が migration 適用 → deploy → smoke を完走する","secret 名が backup.yml / ci.yml / runbook で一致する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/actions-secrets-missing-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T00:41:30Z","origin_kind":"generated","source_digest":"a3ff8e3653e08fdd5d1f62d199b0b054aedf7a0c31ca8694fb3e3694862f4c22","source_path":"docs/features/feat-domain-model-db/release-record.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.95
classification_reason: "SYS-DOMAIN-MODEL-DB-P13 のリリース検証中に実測した F-1 / F-4。feature の実装欠陥ではなくリポジトリ運用設定の欠落であり、独立 issue として切り出す"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/actions-secrets-missing-20260725.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-fnzl","linked_at":"2026-07-25T00:43:40Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-01T05:40:00Z","evidence_refs":[".github/workflows/backup.yml",".github/workflows/ci.yml","scripts/ci/actions-secrets-registry.json","scripts/ci/check-actions-secrets.mjs","apps/hub/tests/ci/actions-secrets.test.ts","docs/features/feat-hub-foundation/runbook.md","docs/features/feat-hub-foundation/evidence/backup-heartbeat-applied-2026-08-01.json"],"policy":"manual","reconciled_at":"2026-08-01T05:40:00Z","source":null,"status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T00:41:30Z","missing_sections":[],"status":"complete"}
---

# 概要

GitHub Actions の secret / variable を機械可読台帳で管理し、workflow の実参照と CI で双方向突合するようにした。日次 backup は restore CLI と同じ JSONL 形式へ統一し、「保存できたが復元経路が別物」という欠陥も同時に解消した。

## 対応済み

- `scripts/ci/actions-secrets-registry.json` に required 6 / optional 2 / auto 1 の 9 項目を登録
- `scripts/ci/check-actions-secrets.mjs` で workflow → 台帳、台帳 → workflow、台帳 → 実投入、実投入 → 台帳の 4 方向を fail-closed で突合
- `ci.yml` の静的ゲートから非 live 突合を実行し、`--live` で GitHub 上の投入済み集合も確認可能にした
- `backup.yml` は `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` で control-plane JSONL を生成し、gzip → R2 put → get → `cmp` を実行
- `smoke-production.ts` は DB package から bare `wrangler` を起動せず、Hub workspace の依存を repo root から解決
- 台帳の 4 方向突合 14 tests、runbook 記載コマンド 3 tests、backup/smoke 10 testsを追加・更新

## 完了 (2026-08-01)

残っていた 2 条件を実測で満たした。

- 旧 `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME` は 2026-07-28 に削除済みで、`--live` は exit 0 (workflow 実参照 13 件 = 台帳 13 件)。
- 最後まで未投入だった `BACKUP_HEARTBEAT_URL` を 2026-08-01 に投入した。これは backup 専用 heartbeat の分離 (`HarnessHub-dbx6`) で `required` へ昇格した項目で、未投入の間は `backup.yml` の前提確認が fail-closed で停止していた (7/29・7/30・7/31 の 3 連続 failure はいずれもこの 1 件が原因)。
- `hub-backup` run `30686023662` (workflow_dispatch / main) が success。export 検証 19 テーブル 64 行、R2 往復一致、heartbeat ping まで到達した。
- `hub-ci` は main HEAD `21339342` の run `30684710098` が success で、migration → deploy → health → smoke を完走している。

## 受入条件

- [x] required 項目が GitHub に投入済み (`--live` exit 0)
- [x] workflow 実参照 13 項目と台帳 13 項目が一致
- [x] backup.yml / ci.yml / runbook の secret / variable 種別が一致
- [x] R2 転送と本番 smoke の Wrangler 起動境界を regression test で固定
- [x] 更新後の `hub-backup` が GitHub Actions で success (run `30686023662`)
- [x] main push 後の `hub-ci` deploy job が migration → deploy → smoke を完走 (run `30684710098`)

## 検証証跡

- `.github/workflows/backup.yml`
- `.github/workflows/ci.yml`
- `scripts/ci/actions-secrets-registry.json`
- `scripts/ci/check-actions-secrets.mjs`
- `apps/hub/tests/ci/actions-secrets.test.ts`
- `docs/features/feat-hub-foundation/runbook.md`
- `docs/features/feat-hub-foundation/evidence/backup-heartbeat-applied-2026-08-01.json`
