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

2026-08-03 最終レビューで確定。`apps/hub/src/__tests__/dual-catalog-web/catalog-hard-navigation-scope.test.ts` が、署名済みの通常 session を持つ `NextRequest` を実際の `src/middleware.ts` へ渡し、以下を固定する（3 件 pass）。

1. 通常 session・`/catalog`・クエリなし・カスタムヘッダなし → `403 missing_tenant_scope`
2. 同上 + `?tenant=tenant-a&workspace=workspace-a1` → `403 missing_tenant_scope`（query は通常認可層の scope 入力ではない）
3. 単一認可層では、path/header で宣言した一致 scope のみを許可する → `allowed: true`

併せて既存の `apps/hub/tests/security/middleware-entry.test.ts` を再確認した。署名済みの `__cwv_probe` は `/catalog` で一度だけ受理され、ticket を URL から除去して HttpOnly cookie 化した後に到達する。これは CWV 計測だけの read-only credential であり、通常 session の browser navigation、任意 query、または任意 header を許可する抜け道ではない。

**結論（受入条件を満たす）**:

- 受入条件1・2: **通常 session の**ログイン済み実ユーザーによる `GET /catalog`（クエリあり・なし双方）はハードナビゲーションでは **到達不能**（`403 missing_tenant_scope`）と確定。CWV 専用 credential はこの結論の対象外であり、既存の qa-133 契約どおりに限定された運用経路である。
- 受入条件3: 一般利用者向けの `/catalog` 公開経路は現時点で提供しない。`/catalog` への nav link が無く、middleware は query の tenant/workspace を信用しない。`resolveRequestedScope()` への query 対応や redirect 補完を採用するには、単一認可層 (`authz.ts`/`scope.ts`) のコア変更として system-spec reopen・ADR 改訂・spec-reflection-receipt を伴う正式 governance が必要であり、本 issue では実施しない。
- 受入条件4: `docs/features/feat-dual-catalog-web/architecture-decision-record.md` §1.1・§7 を改訂し、「RSC が tenant/workspace を解決する」がUI表示用スコープの受け渡しであり認可判定ではないことを明記して整合を取った。

仕様反映判断と対象外の理由は `docs/features/feat-dual-catalog-web/catalog-scope-unreachable-spec-reflection-receipt.md` を正とする。残課題（別途 governance が必要なため本 issue の対象外）: `/catalog` を一般利用者へ公開する場合の到達経路設計（query→canonical path redirect、または別の安全な session-bound scope bootstrap）。CWV probe は計測専用のため一般利用の候補にはしない。
