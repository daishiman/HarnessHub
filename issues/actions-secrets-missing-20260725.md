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
updated_at: "2026-07-25T06:40:00Z"
status: "blocked"
depends_on: []
related_nodes: ["SYS-DOMAIN-MODEL-DB-P13"]
resource_scope: [".github/workflows/ci.yml",".github/workflows/backup.yml","docs/features/feat-hub-foundation/runbook.md"]
purpose: "CI が本番へ migration を適用し deploy し、日次 backup が実際に走る前提 (secret / variable) をリポジトリへ投入し、名前の系統を 1 つに揃える"
goal: "hub-ci の deploy job と hub-backup が secret 欠落で中止されず完走し、必要な secret 名の一覧が runbook から一意に引ける状態"
mvp_alignment: null
scope_in: ["GitHub Actions repository secret / variable の投入 (TURSO_*, CLOUDFLARE_*, HUB_HEALTH_URL)","backup.yml の TURSO_DATABASE_NAME と ci.yml の TURSO_DATABASE_URL の名前系統の統一","foundation runbook へ GitHub Actions secret 一覧節の追加","投入後に hub-backup を手動 dispatch し 1 回 green を実測"]
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
completion_evidence: {"completed_at":null,"evidence_refs":[".github/workflows/backup.yml",".github/workflows/ci.yml","docs/features/feat-hub-foundation/runbook.md"],"policy":"manual","reconciled_at":"2026-07-25T04:09:04Z","source":null,"status":"blocked"}
implementation_readiness: {"checked_at":"2026-07-25T00:41:30Z","missing_sections":[],"status":"complete"}
---

# 概要

GitHub Actions に不足していた Turso Secrets を登録し、日次 backup を既存の SQL dump 設計のまま R2 へ保存できるよう workflow と runbook を更新した。

## 対応済み

- repository secrets に DB 接続用 `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` を登録
- repository secrets に backup CLI 用 `TURSO_API_TOKEN` / `TURSO_DATABASE_NAME` を登録
- `TURSO_API_TOKEN` は空の Turso 設定 directory から `SELECT 1` を実行し、CLI 認証として有効であることを確認
- backup の R2 認証を専用 S3 key 3 件から既存の `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` へ統一
- Wrangler 4.113.0 の `r2 object put/get --remote` を用い、upload 後に byte 単位で一致検証
- CI / backup / foundation runbook の必要名と token 種別を同期
- R2 の使い捨て object で put → get → cmp → delete を実測

## 未完了

変更はユーザー指示により commit / push / PR 未実施である。GitHub 上の `hub-backup` 手動 dispatch と、main push 後の migration → deploy → health → smoke は、workflow がリモートへ反映されるまで実行できない。

## 受入条件

- [x] GitHub API が必要な 6 repository secrets を返す
- [x] backup.yml / ci.yml / runbook の secret 名と token 種別が一致
- [x] Turso Platform API token を設定ファイルへ依存せず検証
- [x] R2 転送経路を実バケットで検証し、検証 object を削除
- [ ] 更新後の `hub-backup` が GitHub Actions で success
- [ ] main push 後の `hub-ci` deploy job が migration → deploy → smoke を完走

## 検証証跡

- `.github/workflows/backup.yml`
- `.github/workflows/ci.yml`
- `docs/features/feat-hub-foundation/runbook.md`
