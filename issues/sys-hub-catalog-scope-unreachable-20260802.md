---
graph_node_id: "issue-hub-catalog-scope-unreachable-20260802"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["hub","authz","tenant-scope","catalog","feat-dual-catalog-web"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "GET /catalog はログイン済みでも tenant scope 未解決で 403 missing_tenant_scope になり得る — ?tenant=&workspace= がハードナビゲーション経路で認可されない疑義"
owners: ["daishiman"]
created_at: "2026-08-02T08:47:22Z"
updated_at: "2026-08-02T08:54:04.165993Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/middleware/scope.ts","apps/hub/src/middleware/authz.ts","apps/hub/src/app/(workspace)/catalog/page.tsx","apps/hub/src/components/catalog/CatalogList.tsx"]
purpose: "HarnessHub-9cgb (dev-graph node issue-hub-cwv-auth-required-route-unmeasurable-20260802) の CWV 計測経路調査中に、apps/hub/src/middleware/authz.ts の authorize() を tsx で直接実測したところ、ログイン済みだが tenant scope 情報を持たない要求は 403 (missing_tenant_scope) で拒否されることを確認した。tenant scope は apps/hub/src/middleware/scope.ts の resolveRequestedScope() が URL パス (/t/{tenantId}/w/{workspaceId}/...) か x-harness-tenant-id/x-harness-workspace-id ヘッダからしか読み取らない。一方 apps/hub/src/app/(workspace)/catalog/page.tsx は tenant/workspace を ?tenant=&workspace= のクエリパラメータで受け取る設計であり、これは pathname にも header にも現れない。カスタムヘッダは apps/hub/src/components/catalog/CatalogList.tsx 等クライアント component 内の fetch() でしか付与されておらず、ブラウザの通常のページ遷移 (リンククリック・URL 直打ちの top-level navigation) にはカスタムヘッダが乗らない。加えて /t/{tenantId}/w/{workspaceId}/... 形式の page route はアプリ内に 1 つも存在せず (存在するのは /[tenant_slug]/signin のみ)、/catalog への href リンクもコードベース全体に 1 件も見当たらない。"
goal: "GET /catalog へのハードナビゲーション (直接 URL 遷移・リンククリック) が、ログイン済みの実ユーザーに対して到達可能かどうかを feat-dual-catalog-web 所管で確定する。到達不能であれば scope 解決経路 (query パラメータ対応や redirect 設計) を補うか、意図的に未公開である旨を設計として明文化するかを判断し、architecture-decision-record.md の『RSC (page.tsx) が tenant/workspace を解決する』という記述と実装コードの間の齟齬を解消する。"
scope_in: ["ログイン済みユーザーによる GET /catalog (query あり・なし双方) の実機/実測検証","resolveRequestedScope が query パラメータや redirect を扱うべきかどうかの設計判断","architecture-decision-record.md の記述と実装の整合"]
scope_out: ["authz.ts / scope.ts の通常利用者向け実装変更そのもの (本 issue は疑義の確定と設計判断が対象。認可コア変更は system-spec reopen・ADR 改訂・spec-reflection-receipt を伴う正式ガバナンスが必要)","HarnessHub-9cgb が所管する、CWV 専用の短命・read-only credential の設計と実装 (別課題)","/catalog への nav link 追加そのもの (未実装の導線が意図的か否かの判断が先行する)"]
acceptance: ["ログイン済み実ユーザーによる GET /catalog (クエリなし) の応答が 200 か 403 missing_tenant_scope かを実機またはテストで確定する","?tenant=&workspace= クエリ付きの GET /catalog についても同様に確定する","到達不能と確定した場合は resolveRequestedScope の補完設計 (query 対応・redirect 等) または『意図的に未公開』の設計判断のいずれかが記録される","architecture-decision-record.md の該当記述と実装コードの整合が取れる (齟齬があれば ADR 改訂または実装追随のどちらかが決定される)"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-hub-catalog-scope-unreachable-20260802.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-02T08:47:22Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.85
classification_reason: "authorize()/resolveRequestedScope の実測から派生した認可到達性の疑義であり、認可境界コードを resource_scope に持つため security domain の issue として追跡する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-hub-catalog-scope-unreachable-20260802.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6o0r","linked_at":"2026-08-02T08:51:22Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-02T08:47:22Z","missing_sections":[],"status":"incomplete"}
---

# 概要

HarnessHub-9cgb (dev-graph node `issue-hub-cwv-auth-required-route-unmeasurable-20260802`) の CWV 計測経路調査で `apps/hub/src/middleware/authz.ts` の `authorize()` を tsx で直接実測したところ、ログイン済みだが tenant scope 情報を持たない要求は 403 (`missing_tenant_scope`) で拒否されることを確認した。`apps/hub/src/app/(workspace)/catalog/page.tsx` は tenant/workspace を `?tenant=&workspace=` のクエリパラメータで受け取る設計だが、scope 解決を担う `resolveRequestedScope()` はクエリパラメータを一切読まないため、この設計の食い違いにより `/catalog` へのハードナビゲーション（直接 URL 遷移・リンククリックなど通常のページ遷移）がログイン済みの実ユーザーにも到達不能に見える。

## 背景と問題

- `apps/hub/src/middleware/authz.ts` の `authorize()` は、ログイン済みでも tenant スコープが取れない要求を 403 (`missing_tenant_scope`) で拒否する。
- tenant スコープは `apps/hub/src/middleware/scope.ts` の `resolveRequestedScope()` が、URL パス (`/t/{tenantId}/w/{workspaceId}/...`) か `x-harness-tenant-id`/`x-harness-workspace-id` ヘッダからしか読まない。
- `apps/hub/src/app/(workspace)/catalog/page.tsx` は tenant/workspace を `?tenant=&workspace=` のクエリパラメータで受け取る設計であり、これは `resolveRequestedScope` のどちらの経路にも該当しない。
- カスタムヘッダは `apps/hub/src/components/catalog/CatalogList.tsx` 等クライアント component 内の `fetch()` でしか付与されておらず、ブラウザは通常のページ遷移（top-level navigation）にカスタムヘッダを付けられない。
- `/t/{tenantId}/w/{workspaceId}/...` 形式の page route はアプリ内に 1 つも存在しない（存在するのは `/[tenant_slug]/signin` のみ）。
- `/catalog` への `href` リンクもコードベース全体に 1 件も存在しない（nav/layout 含む）。
- 実際に `authorize()` を tsx で直接実行し、ログイン済みだが scope 情報なしの `GET /catalog` が `403 missing_tenant_scope` になることを実測で確認済み（実測記録は HarnessHub-9cgb の notes 末尾に記載）。
- `feat-dual-catalog-web` の architecture-decision-record.md は「RSC (page.tsx) が tenant/workspace を解決する」と記述しているが、実装コードにはその解決ロジックが見当たらない（query パラメータをそのまま渡しているだけに見える）。

## 現在の挙動

ログイン済みユーザーが `GET /catalog`（クエリなし・カスタムヘッダなし）を送ると、`resolveRequestedScope` が `tenantId=null` を返し、`authorize()` が `403 missing_tenant_scope` を返すはずに読める。ただし「ログイン済みだが scope 未指定」のケース自体は 9cgb の実測記録で一度も実機/ブラウザ経由では確認されておらず（実測済みなのは `authorize()` の直接実行のみ）、`?tenant=&workspace=` クエリ付きの実際のブラウザ遷移でどう応答するかも未確認である。

## 期待する挙動

`GET /catalog` へのハードナビゲーションが、ログイン済みの実ユーザーに対して到達可能かどうかを feat-dual-catalog-web 所管で確定する。到達不能であれば scope 解決経路（query パラメータ対応や redirect 設計）を補うか、意図的に未公開の機能である旨を設計として明文化するかを判断し、architecture-decision-record.md の記述と実装コードの間の齟齬を解消する。

## 再現手順またはユースケース

1. ログイン済みセッションを用意する。
2. ブラウザまたは同等の HTTP クライアントで `GET /catalog`（クエリ・カスタムヘッダなし）を実行し、応答を記録する。
3. `GET /catalog?tenant=<tenantId>&workspace=<workspaceId>` を同様に実行し、応答を記録する。
4. `apps/hub/src/middleware/authz.ts` の `authorize()` と `apps/hub/src/middleware/scope.ts` の `resolveRequestedScope()` を tsx で直接実行し、上記 2 パターンの scope 解決結果を突き合わせる。

## 影響と優先度

priority は `medium`。`/catalog` への導線 (nav link) 自体が未実装のため、「意図的にまだ非公開の機能」である可能性も残っており白黒は確定していない。feat-dual-catalog-web の実装完成度に属する論点であり、HarnessHub-9cgb の resource_scope（CWV 計測経路の設計）の変更範囲外として派生的に起票する。

## スコープ

**対象:**

- ログイン済みユーザーによる `GET /catalog`（query あり・なし双方）の実機/実測検証
- `resolveRequestedScope` が query パラメータや redirect を扱うべきかどうかの設計判断
- `architecture-decision-record.md` の記述と実装の整合

**対象外:**

- `authz.ts` / `scope.ts` の実装変更そのもの（本 issue は疑義の確定と設計判断が対象。認可コア変更は system-spec reopen・ADR 改訂・spec-reflection-receipt を伴う正式ガバナンスが必要）
- HarnessHub-9cgb が所管する CWV 専用の短命・read-only credential の設計と実装（別課題）
- `/catalog` への nav link 追加そのもの（未実装の導線が意図的か否かの判断が先行する）

## 関連グラフ

- 本 issue は HarnessHub-9cgb（dev-graph node `issue-hub-cwv-auth-required-route-unmeasurable-20260802`）の CWV 計測経路調査から派生した。9cgb は CWV 専用の狭い認可経路を実装するが、通常利用者の tenant scope 解決や `/catalog` の公開導線は変更しないため、この疑義は別 issue として追跡する。
- Beads: 本 issue 登録時に `bd-bridge.py --op create` で新規発行する。

## 受入条件

- ログイン済み実ユーザーによる `GET /catalog`（クエリなし）の応答が 200 か 403 `missing_tenant_scope` かを実機またはテストで確定する
- `?tenant=&workspace=` クエリ付きの `GET /catalog` についても同様に確定する
- 到達不能と確定した場合は `resolveRequestedScope` の補完設計（query 対応・redirect 等）または「意図的に未公開」の設計判断のいずれかが記録される
- `architecture-decision-record.md` の該当記述と実装コードの整合が取れる（齟齬があれば ADR 改訂または実装追随のどちらかが決定される）

## 検証証跡

未着手。一次記録は HarnessHub-9cgb の notes（`authorize()`/`resolveRequestedScope()` の tsx 直接実行結果）と本 issue である。着手時に実機/テストでの実行コマンド・結果・repository 内 evidence path を追記する。
