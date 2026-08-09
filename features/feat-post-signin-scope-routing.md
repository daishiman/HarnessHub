---
graph_node_id: "feat-post-signin-scope-routing"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "auth"
tags: ["macro-feature","stage-1","auth","frontend","post-signin"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "サインイン後のスコープ解決とルーティング結線"
owners: ["daishiman"]
created_at: "2026-08-02T05:05:00Z"
updated_at: "2026-08-08T12:35:34.200652Z"
status: "active"
depends_on: []
related_nodes: ["spec-post-signin-workspace-scope","feat-auth-tenancy","feat-dual-catalog-web","spec-harness-hub-ui-foundation-addendum","issue-hub-shell-page-surface-unification-20260808","issue-hub-root-500-signin-20260808","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["features/feat-post-signin-scope-routing.md","apps/hub/src/middleware.ts","apps/hub/src/middleware/authz.ts","apps/hub/src/lib/routing/dashboard-scope.ts","apps/hub/src/lib/routing/post-signin-landing.ts","apps/hub/src/lib/routing/signin-entry.ts","apps/hub/src/lib/routing/workspace-entry.ts","apps/hub/src/lib/routing/deny-navigation.ts","apps/hub/src/lib/routing/pathname-header.ts","apps/hub/src/components/shell/","apps/hub/src/app/(dashboard)/layout.tsx","apps/hub/src/app/(workspace)/layout.tsx","apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx","apps/hub/src/app/page.tsx","apps/hub/src/app/signin/route.ts","apps/hub/src/app/signin/workspace/route.ts","apps/hub/scripts/check-dynamic-routes.mjs"]
purpose: "ログイン後に業務画面が 403 missing_tenant_scope になる実装未結線を、判定順と deny-by-default を変えずに解消する"
goal: "scope の入力系統 2 系統とサインイン後の着地先解決を結線し、業務画面 6 種へ通常のブラウザ操作で到達できるようにする"
scope_in: ["scope 解決の 2 系統 (明示ヘッダー / session active tenant-workspace)","ambiguous_scope による不一致拒否","session への active workspace 束縛と所属再検証","サインイン後の着地先解決 (遷移元 path -> 既定着地 /sheets)","戻り先の同一 origin 相対 path 制限 (open redirect 防止)","認証済み / の既定着地への redirect","未認証 / のテナント入口と /signin 振り分け","RSC 画面の session scope フォールバック (resolveDashboardScope)","HubShell の scope 付き route projection と deny-by-default navigation","ブラウザ navigation 拒否時の HTML 回復導線","動的必須 route の静的化防止ゲート"]
scope_out: ["authorize() の判定順・role 判定・deny-by-default の変更","catalog/sheets API 実装と DB schema の変更","共通シェル常設の Workspace 切替 UI (feat-workspace-switch-ux)","Web 公開ウィザードの導線","サイドバー段階表示契約の変更 (qa-018 本実装)"]
acceptance: ["遷移元が無いサインイン成功で /sheets に着地し / に留まらない","絶対 URL・スキーム付き・protocol-relative の戻り先は既定着地へ落ちる","認証済みで scope 確定済みの / は既定着地へ redirect される","未認証の / が 200 でテナント入力フォームを描画する","業務画面 6 種が通常のブラウザ操作で 403 missing_tenant_scope にならない","明示ヘッダーと session scope が不一致なら ambiguous_scope で拒否される","両方の scope 入力が無い場合は missing_tenant_scope のまま (deny-by-default 非退行)","所属検証を通らない workspace は session へ束縛されない","戻り先の解決結果に対しても authorize() が適用される","URL クエリ無しの着地直後でも resolveDashboardScope が session から scope を補完する","/ が prerender-manifest に静的 route として載らない"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-post-signin-scope-routing.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/plan-findings.json"}
source_lineage: {"imported_at":"2026-08-02T12:30:00Z","origin_kind":"system-spec-harness","source_digest":"564ffbb11081059fcaa732f66f20a849b57ee5c835a783a385910f8804d3f403","source_path":"specs/harness-hub-post-signin-workspace-scope-addendum.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.96
classification_reason: "qa-135/qa-137 の scope 解決とルーティング結線を担うマクロ feature"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-post-signin-scope-routing.md","confidence":0.96}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-3sjj","linked_at":"2026-08-02T08:05:20Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-02T05:45:00Z","missing_sections":[],"status":"complete"}
---

# feat-post-signin-scope-routing — サインイン後のスコープ解決とルーティング結線

## 目的

ログインは成功するのに業務画面が 403 `missing_tenant_scope` になる実装未結線を、認可の判定順と deny-by-default を変えずに解消する。判定へ渡す **scope の入力系統**と、サインイン後の**着地先解決**を結線する。

## 位置づけ

本 feature は新規機能の追加ではなく、**既にデプロイ済みのコードどうしの結線欠落を埋める統合修正**である。前提となる認可ミドルウェア (`apps/hub/src/middleware/authz.ts`) と業務画面 (`/sheets` `/catalog` 系) は本番で稼働しており、欠けているのは両者を繋ぐ scope の受け渡しと遷移先の解決である。

このため機能間 `depends_on` は空とし、`feat-auth-tenancy` / `feat-dual-catalog-web` との関係は `related_nodes` で表現する。両 feature の残タスク完了を待たせると、既に稼働している経路の欠陥修正が不当にブロックされるためである。

## スコープ内

1. **scope 解決の 2 系統**
   - (a) 明示ヘッダー = API / 機械クライアント (Publisher・CLI・Device Flow token 保持クライアント)
   - (b) session の active tenant/workspace = ブラウザ通常遷移。server 側で session principal から解決する
   - 両方あって不一致は `ambiguous_scope` で拒否。どちらかを黙って優先しない
   - 両方無い場合は従来どおり `missing_tenant_scope`
   - 両経路は同一 `authorize()` に収束させ、判定を二重実装しない

2. **session への active workspace 束縛**
   - 束縛できるのは principal の所属検証を通過した workspace だけ
   - 切替のたびに所属を再検証し、session 保持値を所属検証の代替に使わない

3. **サインイン後の着地先解決**
   - `callbackUrl` 固定値 `"/"` を廃止し、(a) 遷移元 path → (b) 既定着地 `/sheets` の順で解決
   - 既定着地は単一定数から解決し画面ごとに散らさない
   - 戻り先は同一 origin の相対 path のみ許可。絶対 URL・スキーム付き・protocol-relative (`//`) は既定着地へ落とす
   - 戻り先の解決結果にも通常の `authorize()` を適用し、redirect を認可の迂回路にしない

4. **`/` の扱い (2026-08-08 追補)**
   - 未認証時: テナント ID 入力フォーム + 稼働確認 Alert。`GET /signin` が `/{slug}/signin` へ 303（slug 形のみ検証、存在有無は答えない）
   - 認証済み + scope 確定: 既定着地へ redirect し、`/` を終着点にしない
   - 認証済み + 複数 Workspace 未選択: 入口で Workspace 選択を提示（cookie 束縛は `/signin/workspace`）。常設切替 UI は feat-workspace-switch-ux
   - `cookies()` は env 分岐より前で無条件に呼び、`dynamic = 'force-dynamic'` で静的 prerender を禁止する（本番 500 再発防止）

5. **RSC 画面シェル (2026-08-08 追補)**
   - 既定着地はクエリ無しのため、各業務 page が `resolveDashboardScope()` で session をフォールバックする
   - layout の `HubShell` が scope 付きリンクで他画面へ遷移できるようにする。2026-08-08 当初の `PrimaryNav` 最小シェルは削除し、同じ scope 伝搬責務を `components/shell/nav-items.ts` が引き継ぐ
   - active `SessionRole` を使い、利用できない管理 route は role 未確定時を含めて表示しない。API 認可を最終決定者とする境界は変えない

6. **ブラウザ拒否の表現 (2026-08-08 追補)**
   - navigation 要求のみ人間可読 HTML。API / Bearer は JSON 契約を維持
   - 認可判定は `authz.ts` 単一層のまま。表示だけを分離する

## スコープ外

- `authorize()` の判定順・role 判定・deny-by-default の変更
- catalog / sheets API 実装と DB schema の変更
- 共通シェル常設の Workspace 切替 UI (feat-workspace-switch-ux が所有)
- Web 公開ウィザードの導線 (feat-web-only-publish-journey が所有)
- サイドバー 9 項目の段階表示契約の変更 (qa-018 本実装)

## 共通シェルへの後続接続 (2026-08-08 / `HarnessHub-imzk`)

本 feature が所有した scope 解決と route 到達性は、後続の共通 `HubShell` へ接続した。pathname は middleware が認可後の内部 request header へ渡し、server component のまま現在地を表示する。UI shell・page surface・overlay の正本は `specs/harness-hub-ui-foundation-addendum.md` qa-206 / qa-207 とし、本 feature の認可判定順・scope 不一致拒否・open redirect 防止は変更しない。

## 受入基準

1. 遷移元が無いサインイン成功で `/sheets` に着地し、`/` に留まらない
2. 絶対 URL・スキーム付き・protocol-relative の戻り先は既定着地へ落ちる (open redirect 防止)
3. 認証済みで scope 確定済みの `/` を開くと既定着地へ redirect される
4. 未認証の `/` が 200 でテナント入力フォーム (`name="tenant"`) を描画する
5. 業務画面 6 種が通常のブラウザ操作で 403 `missing_tenant_scope` にならない
6. 明示ヘッダーと session scope が併存し不一致なら `ambiguous_scope` で拒否される
7. どちらの scope 入力も無い場合は `missing_tenant_scope` のまま (deny-by-default 非退行)
8. 所属検証を通らない workspace は session へ束縛されない
9. 戻り先の解決結果に対しても `authorize()` が適用される
10. URL クエリ無しの着地直後でも `resolveDashboardScope` が session から scope を補完する
11. `/` がビルド成果物の prerender-manifest に静的 route として載らない

## 出典

`specs/harness-hub-post-signin-workspace-scope-addendum.md` A 節・B 節 / `system-spec/spec-state.json` qa-135 【1】【2】【3】・qa-137 【1】【2】【3】【6】

## Production acceptance (2026-08-08 / `HarnessHub-p0lr`)

- OIDC smoke O5 は敵対的な外部 `returnTo` が遷移属性へ入らず、安全な既定 `/sheets` へ落ちることを本番 SSR 応答で検査する。
- coverage smoke S1〜S8 は scope の欠落・衝突・越境・credential/scope 不足を HTTP status + error code で検査する。
- main `35a10b87` / hub-ci run `31253674292` で OIDC O5 と coverage S1〜S8 が SUCCESS。provider-admin 越境の設計差は `HarnessHub-stmx` へ分離し、本 feature の production acceptance とは別に追跡する。
