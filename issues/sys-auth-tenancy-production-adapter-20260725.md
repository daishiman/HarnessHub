---
graph_node_id: "issue-auth-tenancy-production-adapter-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["follow-up","auth-tenancy","authjs","database","production-blocker"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "feat-auth-tenancy の Auth.js・本番 AuthPorts adapter・DB 永続化契約を実結線する"
owners: ["daishiman"]
created_at: "2026-07-25T01:05:00Z"
updated_at: "2026-07-26T06:45:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-auth-tenancy","feat-domain-model-db","feat-hub-foundation","issue-auth-501-doc-refresh-20260726","issue-db-write-gate-sweep-20260726","issue-libsql-connection-recovery-20260726","issue-refresh-race-observability-20260726"]
resource_scope: ["apps/hub/package.json","pnpm-lock.yaml","apps/hub/next.config.ts","apps/hub/src/lib/auth/","apps/hub/src/lib/authz/runtime.ts","apps/hub/src/app/api/auth/","apps/hub/tests/auth-tenancy/","packages/db/schema/","packages/db/repository/","packages/db/connection/","packages/db/migrations/","packages/db/__tests__/","system-spec/","specs/","architecture/","features/feat-auth-tenancy.md","tasks/feat-auth-tenancy/sys-auth-tenancy-p11.md","docs/features/feat-auth-tenancy/"]
purpose: "初回 feature 完了時は OIDC 検証・session claims・認可・Device Flow の pure core と in-memory E2E までで、Auth.js route と本番 DB ports が未結線だった。HarnessHub-b7ng は vendor 境界を維持したまま @auth/core、session bridge、本番 DB AuthPorts、CAS 永続化、Workers composition root を実結線し、仕様・設計・migration・証跡を正規フローで同期する"
goal: "テナント別 OIDC と Device Flow が in-memory テストだけでなく本番 repository と Auth.js を通って動く"
scope_in: ["Auth.js 依存と route handler の実結線","Auth.js session と独自 claims/revocation の bridge","AuthPorts の packages/db adapter 実装","Device Flow に必要な永続化契約の schema owner 合意と migration","実 DB adapter を使う統合テスト"]
scope_out: ["dev 専用 provider や password login の追加","本番資格情報の平文保存","認証 gate の CI 結線 (HarnessHub-1f28)"]
acceptance: ["Auth.js または承認済み後継を adapter 境界内へ導入し、/api/auth が 501 ではなく tenant 別 OIDC を処理する","Auth.js が発行する session と lib/auth の SessionClaims が同じ検証経路で認識される","AuthPorts の本番 adapter が packages/db repository へ結線され、Device Flow の永続化契約差が解消される","実 DB adapter を使う 2 tenant OIDC・Device Flow・refresh rotation・revocation の統合テストが pass する"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-auth-tenancy-production-adapter-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52","evaluator":"final-review/pnpm-verify+system-spec-gates","evidence_ref":"docs/features/feat-auth-tenancy/spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-07-25T01:05:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-auth-tenancy/release-record.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "feat-auth-tenancy のローカル core 実装と本番実行経路の間に残る単一の結線課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-auth-tenancy-production-adapter-20260725.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-b7ng","linked_at":"2026-07-25T01:05:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":["docs/features/feat-auth-tenancy/spec-reflection-receipt.md","tasks/feat-auth-tenancy/sys-auth-tenancy-p11.md"],"policy":"linked_pr_merged_all","reconciled_at":null,"source":"manual","status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-26T06:45:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`feat-auth-tenancy` の Auth.js route、session claims bridge、本番 DB `AuthPorts`、
Device Flow / refresh token の永続化を結線した。初回 feature の pure core と
in-memory E2E を、本番 Cloudflare Workers の composition root まで到達させる変更である。

## 背景と問題

着手前は `/api/auth/[...nextauth]` が 501 を返し、`authRuntime()` も本番 DB を構成できなかった。
`packages/db` の既存 schema と認証 port の間には、Workspace 帰属、Device Flow の scope・
試行回数・poll 状態、refresh token の CAS に必要な列が不足していた。

## 現在の挙動

- `/api/auth/{tenant_slug}/{action}` が `@auth/core` でテナント別 OIDC を処理する。
- Auth.js cookie と認可 middleware は同じ `SessionClaims` JWT を署名・検証する。
- `AuthPorts` は tenant scope 付き repository を通り、OIDC secret は必要時だけ復号する。
- Device Flow の approve / consume / 失敗回数と refresh rotation は CAS で競合を拒否する。
- `user_workspaces` は `(tenant_id,user_id,workspace_id)` を主キーにし、テナント間で同じ ID を許す。
- Secret・DB binding 値が変わった場合、isolate 内の runtime cache を再構築する。

## 期待する挙動

テナント別 OIDC と Device Flow が in-memory テストだけでなく本番 repository と
Cloudflare Workers build を通り、同時要求でも token または試行回数を複製・取りこぼししない。

## 再現手順またはユースケース

1. tenant A / B に別 OIDC 設定と同一文字列の user/workspace ID を用意する。
2. tenant slug ごとに Auth.js 設定を解決し、session cookie を発行・検証する。
3. 同じ device code / refresh token / user code を並行提示する。
4. 勝者が 1 本、user-code の 5 失敗が全件記録され、tenant B の行へ触れないことを確認する。

## 影響と優先度

- 影響範囲: Web session、OIDC、Device Flow、Publisher token、DB migration、Workers runtime。
- 深刻度: high。未結線だった本番認証経路を開通するため。
- migration: 旧 Publisher token と device code は安全に Workspace 帰属を復元できないため再認証する。

## スコープ

- In: Auth.js、session bridge、本番 DB ports、schema/migration、CAS、Workers build、仕様反映。
- Out: dev password login、本番 Secret の投入、本番デプロイ、後続の DB 全 write 掃き出し。

## 関連グラフ

- feature: `feat-auth-tenancy`
- architecture: `arch-harness-hub-security`, `arch-harness-hub-backend`,
  `arch-harness-hub-data`, `arch-harness-hub-infrastructure`
- docs drift: `issue-auth-501-doc-refresh-20260726` / `HarnessHub-mr3c`
- 残課題: `HarnessHub-mb7c`, `HarnessHub-njkm`, `HarnessHub-v22l`

## 受入条件

- [x] `@auth/core` を adapter 境界内へ導入し tenant 別 route を処理する。
- [x] Auth.js session と `SessionClaims` が同じ検証経路で認識される。
- [x] 本番 DB ports と Device Flow 永続化契約差を解消する。
- [x] 2 tenant OIDC / Device Flow / refresh rotation / revocation の実 DB 統合テストが pass する。
- [x] system-spec / specs / architecture / features / tasks / docs を正規フローで反映する。
- [ ] draft PR が default branch へ merge され、dev-graph lifecycle が reconciliation される。

## 検証証跡

- `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-auth-tenancy`
- `pnpm verify`
- `docs/features/feat-auth-tenancy/spec-reflection-receipt.md`
