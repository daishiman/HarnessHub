---
graph_node_id: "issue-hub-catalog-page-missing-tenant-scope-20260803"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["bug","hub","catalog","auth-tenancy","smoke-test"]
priority: "critical"
start_date: null
target_date: null
iteration: null
title: "[bug] catalog一覧(/catalog)が一般ユーザーの通常ナビゲーションで missing_tenant_scope (403) を返し到達不能"
owners: ["daishiman"]
created_at: "2026-08-03T00:00:00Z"
updated_at: "2026-08-03T07:45:55Z"
status: "closed"
closed_at: "2026-08-03T07:45:55Z"
depends_on: []
related_nodes: ["issue-hub-catalog-scope-unreachable-20260802","SYS-DUAL-CATALOG-WEB-P13"]
resource_scope: ["issues/hub-catalog-page-missing-tenant-scope-20260803.md","docs/features/feat-dual-catalog-web/release-completion-checklist.md","apps/hub/src/middleware/authz.ts","apps/hub/src/lib/auth/session.ts","apps/hub/src/__tests__/dual-catalog-web/catalog-hard-navigation-scope.test.ts"]
purpose: "本番旧 Worker の /catalog 通常 GET が 403 missing_tenant_scope を返す観測を、latest main との統合後に再評価し、独立した query-param 修正を作らず session-bound scope 実装へ収束する"
goal: "重複タスクを正しく close し、未完の本番再デプロイと smoke を HarnessHub-dhy.13 へ一元化する"
scope_in: ["latest main の session-bound scope 実装と 2026-08-03 本番観測の照合","重複する query-param 認可案の不採用判断","HarnessHub-dhy.13 への本番再測定責務の集約"]
scope_out: ["URL query を認可入力として信頼する実装","本番 Worker の再デプロイと authenticated smoke (HarnessHub-dhy.13)","CWV計測経路の整備 (HarnessHub-9cgb が所管)"]
acceptance: ["query-param 認可案を最新 main の session-bound scope 契約で置換している","HarnessHub-dhy.13 に本番再デプロイと smoke の未完条件が残っている","Beads と dev-graph が重複 close の判断を追跡できる"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/hub-catalog-page-missing-tenant-scope-20260803.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-03T07:45:55Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "本番 smoke 実測 (2026-08-03) を最新 main の正式実装と照合し、重複 issue と判定した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/hub-catalog-page-missing-tenant-scope-20260803.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-4lxg","linked_at":"2026-08-03T06:50:22Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-03T07:45:55Z","evidence_refs":["beads:HarnessHub-4lxg","main:41a79292","apps/hub/src/__tests__/dual-catalog-web/catalog-hard-navigation-scope.test.ts","docs/features/feat-dual-catalog-web/release-completion-checklist.md"],"policy":"manual","reconciled_at":"2026-08-03T07:45:55Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-03T07:45:55Z","missing_sections":[],"status":"complete"}
---

# 概要

本番 (`https://harness-hub.daishimanju.workers.dev`) の旧 Worker で、ログイン済みセッション Cookie を持つ実ユーザーが `/catalog` へ通常のブラウザナビゲーションで到達しようとすると失敗することを 2026-08-03 の smoke 実測で確認した。

- `GET /catalog?tenant=<tenantId>&workspace=<workspaceId>` → **HTTP 403** `{"error":"missing_tenant_scope"}`
- `GET /t/<tenantId>/w/<workspaceId>/catalog` → **HTTP 404**（該当 route が実装されていない）

実測に使った tenant/workspace は本番 DB で実在確認済み: `tenant=01KYREM0H83N4PVENM2491S7XF`（slug: `harness-hub`）, `workspace=01KYRHS4D705XSJA4HXPC262HZ`。

## 最終レビューでの収束判断

この issue を起票した後、latest `main`（PR #647、`41a79292`）を作業ブランチへ正規順序で統合した。そこには同じ到達性を解く正式実装が含まれる。

- 通常の browser GET は URL query を信用せず、session の `hh_active_workspace` を `principal.workspaceIds` に毎回照合して scope を解決する。
- 所属 workspace が 1 件なら自動選択し、複数所属で未選択なら従来どおり `missing_tenant_scope` として fail-closed（安全側に拒否）する。
- `apps/hub/src/__tests__/dual-catalog-web/catalog-hard-navigation-scope.test.ts` が、実際の Next.js middleware を通る `/catalog` の通常 session を 200 とし、query による scope 偽装を認可入力にしないことを固定している。

したがって、ここで検討していた `?tenant=&workspace=` を認可入力として allowlist 化する変更は、既存仕様 qa-135 / qa-137 と競合し、main の安全な実装を重複させるため**不採用**とする。本 issue は重複 close し、本番 Worker への再デプロイと authenticated smoke は `HarnessHub-dhy.13` に集約する。

## 観測時点の原因

`apps/hub/src/app/(workspace)/catalog/page.tsx` は query param (`tenant`/`workspace`/`target`/`q`) を読む設計になっている一方、認可層はそれを一切見ない。

- `apps/hub/src/middleware/scope.ts` の `resolveRequestedScope()` は `/t/{tenantId}/w/{workspaceId}/...` 形式の **path** と `x-harness-tenant-id`/`x-harness-workspace-id` の **header** しか見ない。
- 通常のブラウザ GET では、client 側から任意 header を付与できないため header 経路は使えない。
- `/t/{tenantId}/w/{workspaceId}/catalog` という path 形式のページ自体が実装されておらず、404 になる。

結果として、一般ユーザーが**通常のブラウザナビゲーション**で catalog 一覧画面 (S01) に到達する経路が存在しない。`apps/hub/src/middleware.ts` の CWV probe 専用分岐 (`__cwv_probe` ticket) のコメントにも、「catalog page の初回 GET には client が header を付けられない」という同種の既知の制約が明記されている。

この不具合は feat-dual-catalog-web の受入条件 U5（2 社の顧客 Workspace が同時にカタログを閲覧できる）を、CWV probe や API 直叩き以外の実ユーザー導線では満たせないことを意味する。

## 再現手順

```bash
export TENANT="01KYREM0H83N4PVENM2491S7XF"
export WORKSPACE="01KYRHS4D705XSJA4HXPC262HZ"
export HUB_PUBLIC_URL="https://harness-hub.daishimanju.workers.dev"

curl -sS -o /tmp/catalog-list.html -w '%{http_code}\n' \
  "$HUB_PUBLIC_URL/catalog?tenant=$TENANT&workspace=$WORKSPACE" -b "$SESSION_COOKIE_VALUE"
# => 403 missing_tenant_scope

curl -sS -o /tmp/catalog-list.html -w '%{http_code}\n' \
  "$HUB_PUBLIC_URL/t/$TENANT/w/$WORKSPACE/catalog" -b "$SESSION_COOKIE_VALUE"
# => 404
```

## 観測時点の再現

- [ ] 一般ユーザーの通常ブラウザナビゲーションで `/catalog` (または同等の一覧画面) へ到達すると HTTP 200 を返す
- [ ] テナント/Workspace スコープをブラウザ経路で安全に伝搬する設計 (path 形式 route の実装、または別の伝搬手段) が実装される
- [ ] 上記手順で 200 が実測され、HarnessHub-dhy.7 / HarnessHub-dhy.13 の smoke 3.1 が pass する

## Close 根拠と残課題

- Beads: `HarnessHub-4lxg` は重複 close。`HarnessHub-dhy.7` / `HarnessHub-dhy.13` の既存受入・リリース課題は close しない。
- 本番は `41a79292` の session-bound scope をまだ配信していないため、`HarnessHub-dhy.13` で再デプロイ後に一覧・詳細・marketplace の smoke を改めて実施する。
- 仕様・設計の新規反映は不要。qa-135 / qa-137 と `specs/harness-hub-post-signin-workspace-scope-addendum.md` が session 入力、所属再検証、scope 不一致の拒否を既に正本化している。

## 参照

- `apps/hub/src/middleware.ts`
- `apps/hub/src/middleware/authz.ts`
- `apps/hub/src/middleware/scope.ts`
- `apps/hub/src/app/(workspace)/catalog/page.tsx`
- `docs/features/feat-dual-catalog-web/release-completion-checklist.md` §3.1
- HarnessHub-dhy, HarnessHub-dhy.7, HarnessHub-dhy.13
- HarnessHub-6o0r, HarnessHub-3sjj.13
