---
graph_node_id: "issue-production-smoke-coverage-gaps-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["ci","smoke","production","fail-closed","test-coverage"]
priority: "high"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "本番 smoke の未カバー領域を塞ぐ (post-signin scope / Feedback / Docs CMS)"
owners: ["daishiman"]
created_at: "2026-08-08T00:00:00Z"
updated_at: "2026-08-08T09:52:24.683829Z"
status: "active"
depends_on: []
related_nodes: ["spec-post-signin-landing-observability","spec-production-coverage-smoke","issue-authz-provider-admin-edge-route-mismatch-20260808"]
resource_scope: [".github/workflows/ci.yml","apps/hub/scripts","apps/hub/package.json","apps/hub/tests","packages/db/repository/hearing-smoke.ts","packages/db/__tests__/hearing-smoke.test.ts","system-spec/spec-state.json","system-spec/testing-qa.md","specs/harness-hub-production-coverage-smoke-addendum.md","architecture/harness-hub-testing-qa.md","features","tasks","docs/features"]
purpose: "本番へ出ている 3 feature が『測る手段が無い』ために P13 を完了できない状態を解消する。"
goal: "post-signin scope 判定 6 系統・open redirect フォールバック・Feedback 3 項目・Docs CMS round-trip を本番 smoke として自動化し、ci.yml で毎デプロイ実行する。"
scope_in: ["本番 smoke script の新規実装","ci.yml smoke 群への結線","smoke:publish-production が未結線である件の判断と記録"]
scope_out: ["認可判定ロジックそのものの変更","新しい secret の追加","rollback 方針の再設計"]
acceptance: ["3 feature の未カバー項目が本番 smoke として実行され、失敗時に fail-closed で deploy job を赤にできる","新しい secret を要求せず、使い捨て tenant が検査後に自動削除される","smoke:publish-production を結線するか外すかが決まり記録されている"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/production-smoke-coverage-gaps-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"890fca92b19c4bec3739128692d6d1fe4742712767e972969fb6bd331598fa4d","evaluator":"CI 実測 (hub-ci run 31240466397) と apps/hub/scripts の smoke 一覧突合","evidence_ref":"docs/features/feat-feedback-loop/release-notes.md"}
source_lineage: {"imported_at":"2026-08-08T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "3 つの P13 task に共通する根本原因 (smoke 未実装) を、各 feature package から分離して追跡する issue。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/production-smoke-coverage-gaps-20260808.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-p0lr","linked_at":"2026-08-08T06:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 本番 smoke の未カバー領域を塞ぐ (post-signin scope / Feedback / Docs CMS)

## 背景

`HarnessHub-3sjj.13` / `HarnessHub-1vb.13` / `HarnessHub-9wb.13` の P13 が完了しない理由は、これまで各 feature の記録上「本番へ出ていないから」と読まれてきた。2026-08-08 の実測でこれは誤りと判明した。

main `44109782` の hub-ci run [31240466397](https://github.com/daishiman/HarnessHub/actions/runs/31240466397) は deploy job の全 step が success で、`失敗時ロールバック` は skipped である。3 feature の実装 PR (#648 / #652 / #649) はいずれも main へ merge 済みで、この run が配備した版に含まれている。

つまり **3 件に共通する残作業は「本番へ出すこと」ではなく「出ているものを測る手段を実装すること」** である。

## 現状のカバレッジ

`apps/hub/scripts/` に存在する本番 smoke は 3 系統のみ。

| smoke | ci.yml から実行 |
|---|---|
| `smoke-production-oidc.mjs` | される |
| `smoke-production-hearing.ts` (`smoke:hearing-production`) | される |
| `smoke-production-publish.ts` (`smoke:publish-production`) | **されない** |
| `packages/db` の `smoke-production.ts` (DB/R2 6 項目) | される |

## 未カバー項目

### post-signin scope routing (`HarnessHub-3sjj.13`)

`authorize()` (`apps/hub/src/middleware/authz.ts`) の判定順に沿った 6 系統。

1. 未認証 (`unauthenticated`, 401)
2. scope 未申告 (`missing_tenant_scope`, 403)
3. 二重申告・ヘッダーと session の不一致 (`ambiguous_scope`, 403)
4. tenant 越境 (`tenant_mismatch`, **404**)
5. workspace 非所属 (`workspace_not_member`, 403)
6. 正常到達 (`/sheets` または安全な `returnTo` の同一 origin 相対 path)

加えて open redirect フォールバック — 絶対 URL・スキーム付き・`//host`・backslash trick の戻り先がいずれも既定着地 `/sheets` へ倒れること。

**いずれも HTTP の status と `Location` で機械判定できる。** 現在 checklist は「人手のブラウザ確認」を前提にしているが、それでは次のデプロイで壊れても気付けない。

### Feedback Loop (`HarnessHub-1vb.13`)

- S14 (`/feedback`) の本番到達性
- `POST` / `GET /api/v1/feedback` の疎通
- AI キュー pull — workspace-admin による自 tenant pull、provider-admin による cross-tenant pull と `provider.cross_tenant_access` 監査記録

### Docs CMS (`HarnessHub-9wb.13`)

- create → read → update → AI draft enqueue → pull → complete → 本文反映 の round-trip

## 方針

`smoke-production-hearing.ts` と同型で実装する。同 script が満たしている前提を引き継ぐこと。

- **新しい secret を要求しない** — 使う値は既に台帳にある `TURSO_*` と `HUB_PUBLIC_URL` だけ
- 使い捨て tenant を作り、検査後に自動削除する
- 提出のような session-only の経路は route と同じ server code を本番 DB へ実行し、HTTP を通す部分は Device Flow で得た本物の access token を使う

実装後は `ci.yml` の smoke 群へ結線する。結線しなければ「書いたのに走っていない smoke」が増えるだけで、`smoke:publish-production` が既にその状態にある。

## 副次的に判明した論点

`apps/hub/package.json` に `smoke:publish-production` (336 行) が登録されているが、`ci.yml` のどの step からも呼ばれていない。書かれてはいるが一度も本番で走っていない。本課題の実装と同時に、結線するのか意図的に外しているのかを決めて記録する。

## 実装記録 (2026-08-08)

### 何を足したか

| 追加 | 実体 | 検査 |
|---|---|---|
| 未カバー 3 領域の本番 smoke | `apps/hub/scripts/smoke-production-coverage.ts` (`smoke:coverage-production`) | S1-S8 / F1-F5 / D1-D6 |
| open redirect の本番実測 | `apps/hub/scripts/smoke-production-oidc.mjs` の O5 | SSR 済みサインインページの `callbackUrl` が既定 `/sheets` へ倒れ、敵対的 `returnTo` が遷移属性へ入らない |
| 使い捨て tenant の後始末拡張 | `packages/db/repository/hearing-smoke.ts` | `feedbacks` / `documents` / `builds` の削除と残数計上 |
| CI 結線 | `.github/workflows/ci.yml` の `coverage_smoke` step | 失敗時ロールバックの判定材料 (`COVERAGE_SMOKE_OUTCOME`) にも含める |
| 契約テスト | `apps/hub/tests/hub-foundation/production-coverage-smoke-script.test.ts` | 資格情報なしの `--help` 起動・各検査の存在・CI 結線 |

session-only の action (`feedback.read`・`docs.*`) は Google OIDC なしに HTTP から駆動できないため、**route と同じ server code を本番 DB へ実行**し、HTTP 側は「Bearer では通らないこと」だけを実測する。これは `smoke-production-hearing.ts` と同じ切り分けで、新しい secret を 1 つも増やさない。

### `smoke:publish-production` の判断: **結線しない (現状維持)**

理由は 1 つで、この smoke が `PUBLISH_ACCESS_TOKEN` (publish:write を持つ短命 owner token) と `CLOUDFLARE_API_TOKEN` を要求するため。前者は台帳に無い**新しい secret** であり、本課題の `scope_out` (新しい secret の追加) に真正面から当たる。

したがって `smoke:publish-production` は「手動・オンデマンドで走らせる runner」と位置づける。CI へ載せたい場合は、hearing / coverage smoke と同じく Device Flow で `publish:write` scope の token を本番から取る作りへ変える必要があり、それは publish 経路の権限設計 (owner role 必須) を触る別課題になる。

### 実装中に判明した設計上の不整合 (別課題へ送る)

`withAuthz` は provider-admin の越境要求を許可して `provider.cross_tenant_access` を監査する契約 (FL-SEC8-102)。しかし edge middleware の `authorize()` は role を見ずに `scope.tenantId !== principal.tenantId` を 404 で落とすため、**本番では route 層の越境監査に到達しない**。route 単体テストは `withAuthz` を直接呼ぶので緑のまま素通りする — `tenant_mismatch` の 403/404 不一致とまったく同じ構図。

本課題の `scope_out` が認可判定ロジックの変更を除いているため、ここでは **S8 で現行挙動 (edge 遮断・監査行 0 件) を実測して固定する**に留める。provider-admin の越境を本当に許すのか、route 層の監査を dead code として畳むのかは設計判断であり、別課題 `HarnessHub-stmx` (`issues/authz-provider-admin-edge-route-mismatch-20260808.md`) で扱う。
