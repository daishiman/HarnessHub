---
graph_node_id: "issue-hub-root-500-signin-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["bug","hub","signin","routing","production","ci-gate"]
priority: "critical"
start_date: null
target_date: null
iteration: null
title: "[bug] 本番ランディング `/` が DYNAMIC_SERVER_USAGE で 500 になり、サインイン入口・Workspace 選択・拒否画面が欠落していた"
owners: ["daishiman"]
created_at: "2026-08-08T12:00:00Z"
updated_at: "2026-08-08T12:00:00Z"
status: "active"
depends_on: []
related_nodes: ["feat-post-signin-scope-routing","feat-workspace-switch-ux","SYS-POST-SIGNIN-SCOPE-P13","arch-harness-hub-frontend","arch-harness-hub-security"]
resource_scope: ["issues/hub-root-500-signin-20260808.md","apps/hub/src/app/page.tsx","apps/hub/src/app/signin/route.ts","apps/hub/src/app/signin/workspace/route.ts","apps/hub/src/lib/routing/signin-entry.ts","apps/hub/src/lib/routing/workspace-entry.ts","apps/hub/src/lib/routing/deny-navigation.ts","apps/hub/src/lib/routing/dashboard-scope.ts","apps/hub/src/middleware.ts","apps/hub/src/middleware/authz.ts","apps/hub/scripts/check-dynamic-routes.mjs",".github/workflows/ci.yml"]
purpose: "本番 `/` の 500 を解消し、未認証のテナント入口・複数 Workspace 選択・ブラウザ拒否時の人間可読導線を閉じる"
goal: "利用者が最初に開く `/` が 200 でサインイン入口を描画し、認証済みは scope 解決後に着地し、拒否時は JSON 生値ではなく回復導線を返す"
scope_in: ["`/` の動的 route 強制と cookies() 無条件呼出し","テナント入力 → /signin → /{slug}/signin の JS 無し導線","所属 2 件以上時の Workspace 選択と /signin/workspace cookie 束縛","ブラウザ navigation 拒否時の HTML 応答","PUBLIC_EXACT_PATHS と tenantSlugSchema による public 判定","prerender-manifest 静的化ゲートと本番ランディング smoke"]
scope_out: ["共通シェルからの常時 Workspace 切替 UI (feat-workspace-switch-ux 残)","S09-L 着地ダッシュボード本体","authorize() の判定順・role 判定の変更","catalog/sheets API と DB schema"]
acceptance: ["ビルド成果物で `/` が静的 prerender されていない","未認証 GET `/` が 200 かつ name=\"tenant\" フォームを含む","認証済み singleton workspace は既定着地へ redirect","認証済み multi workspace 未選択は選択 UI を出し missing_tenant_scope 行き止まりにしない","ブラウザ GET 拒否は HTML、API/Bearer は JSON 契約を維持","task-spec gate / focused tests / auth gates が PASS"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/hub-root-500-signin-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a51a02da70fc69875c76f37d99d888f738403ecad38c9632f7a3deb0b5d31e92","evaluator":"manual-final-review","evidence_ref":"docs/features/feat-post-signin-scope-routing/spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-08T12:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "本番 500 実測とサインイン入口欠落を 1 つの issue として修復する"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/hub-root-500-signin-20260808.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-8o3i","linked_at":"2026-08-08T12:05:24Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-08T12:00:00Z","missing_sections":[],"status":"complete"}
---


# 概要

2026-08-08 に本番ランディング `/` が **HTTP 500** を返した。post-deploy 検証は `/health`・OIDC start-flow・DB/R2・hearing とも緑のままで、**利用者が最初に開く入口だけ**が落ちていた。

## 原因

1. **静的化と実行時動的 API の衝突**  
   `cookies()` の呼び出しが `AUTH_SESSION_SECRET` の有無の内側にあった。secret 未設定のビルド環境では動的 API に到達せず Next が `/` を静的 prerender し、実行時 (secret あり) に `DYNAMIC_SERVER_USAGE` で 500 になった。`next dev` / `next start` では再現せず workerd 上の本番ビルドでのみ顕在化した。

2. **入口そのものを HTTP GET していなかった**  
   既存 smoke は `/health` や API 系のみで、ランディング HTML の描画成功を見ていなかった。

3. **導線の欠落**  
   未認証のテナント ID 入力、複数 Workspace 所属時の選択、ブラウザ拒否時の人間可読 HTML が無く、scope 未解決は JSON 生値の行き止まりになっていた。

## 修正方針

| 領域 | 内容 |
| --- | --- |
| 動的強制 | `export const dynamic = 'force-dynamic'` と **無条件の `cookies()`**（`dashboard-scope` も同様） |
| サインイン入口 | `/` でテナント ID を受け、`GET /signin` が `/{slug}/signin` へ 303 |
| Workspace 選択 | 所属 2 件以上・未選択時は `/` で選択 UI。`GET /signin/workspace` が cookie を fail-closed で書く |
| 拒否表現 | navigation 要求のみ HTML（API/Bearer は JSON 維持） |
| public 判定 | `PUBLIC_EXACT_PATHS` + `tenantSlugSchema` で slug 形を一意化 |
| 検知 | `check:dynamic-routes`（prerender-manifest）と本番ランディング smoke（200 + `name="tenant"`） |

## 関連 Beads / feature

- `HarnessHub-3sjj` / `HarnessHub-3sjj.13` — post-signin scope 結線と P13 リリース
- `HarnessHub-f91a` — Workspace 選択・切替 UX（本 issue は入口選択と拒否 HTML の最小実装。シェル常設切替は残）
- feature: `feat-post-signin-scope-routing`, `feat-workspace-switch-ux`

## 境界

- 認可判定順・role・deny-by-default は変更しない
- 共通シェルの常時 Workspace 切替 UI と S09-L 本体は本 issue の外
- 本番 6 系統 scope 実測の完了は `HarnessHub-3sjj.13` の checklist に従う
