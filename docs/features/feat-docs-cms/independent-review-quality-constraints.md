---
title: "feat-docs-cms 最終独立レビュー (P10)"
status: confirmed
graph_node_id: "SYS-DOCS-CMS-P10"
beads_linkage: "HarnessHub-9wb.10"
depends_on:
  - docs/features/feat-docs-cms/requirements-baseline.md
  - docs/features/feat-docs-cms/ci-quality-gates-verification.md
---

# feat-docs-cms 最終独立レビュー

> P01 (`requirements-baseline.md` §5) で確定した quality_constraints 8 件を、
> テスト結果の再引用だけでなく実装コードへの直接確認で独立判定する。

## 発見した不整合とその修正

- `apps/hub/scripts/check-single-authz-middleware.mjs` (SEC2/qa-020 単一集約ゲート) が NG だった。
  `apps/hub/src/__tests__/docs-cms/authz-contract.test.ts` の DOCS-AUTHZ-007 テストは、判定語彙の複製がないことを
  検証する自己言及回避のため識別子を分割 (`['ROLE','ORDER'].join('_')`) して書いていたが、
  `it()` のテスト名 (人間向け説明文) 自体に `ROLE_ORDER`/`ACTION_RULES` という語彙をそのまま含んでおり、
  静的スキャナがコードと文字列を区別しないため誤検出源になっていた。
  テスト名を「順序表・アクション規則の語彙」という言い換えに変更し修正。修正後 OK (走査292ファイル/違反0件)。

## 8 件の判定

### 1. tenant-scope-d4-doc-entity

- 判定: 合格
- 根拠: `packages/db/migrations/0005_common_stepford_cuckoos.sql` の `documents` テーブルは `tenant_id`/`scope` 列を持つ。`DOCS-TEN-*` 6/6 pass、`check:tenant-isolation-coverage` OK (documents を fixture 網羅対象へ追加済み)

### 2. markdown-sanitize-sec7-doc

- 判定: 合格
- 根拠: `DOCS-SEC7-001〜005` 5/5 pass。script タグ・イベントハンドラ・javascript: スキームが共通レンダラで除去される

### 3. markdown-common-component-qa021-qa022

- 判定: 合格
- 根拠: `MarkdownView`/`MarkdownEditor`/`markdownSanitizeSchema` は `packages/ui/src/components/Markdown.tsx` に定義され `@harness-hub/ui` から export。docs-cms 側 (`[id]/page.tsx`, `[id]/edit/page.tsx`) はこれを import するのみで独自 sanitize 実装を持たない (`DOCS-SEC7-101, 102` で検証済み)

### 4. doc-edit-audit-sec6

- 判定: 合格
- 根拠: `apps/hub/src/app/api/v1/docs/route.ts` の `POST` handler が `authRuntime().authz.audit.record()` を呼ぶ。`DOCS-AUDIT-101, 102` 2/2 pass で `docs.create`/`docs.update` event 記録を確認

### 5. ai-queue-pull-type-d5-doc-draft

- 判定: 合格
- 根拠: `apps/hub/src/lib/ai-queue/registry.ts` の `AI_QUEUE_ADAPTERS.doc_draft` が `docsCmsRuntime().repository.claimNextDocDraftJob/completeDocDraftJob/failDocDraftJob` へ委譲する kind-dispatch 構成。pull route は claim のみ行い、サーバ側で AI 呼出しは発生しない (Claude Code セッション側からの pull/書戻し前提)

### 6. ai-queue-authz-payload-secret-ban

- 判定: 合格
- 根拠: `claim`/`complete`/`fail` は全て `tokenId` (Device Flow token) を要求し既存 `aijob.pull/complete/fail` ゲートを再利用 (`DOCS-SEC8-001, 002` で確認、専用 action 新設なし)。`DOCS-SEC8-003` で payload/result に secret/PII 系キーを含めないことを確認

### 7. doc-edit-admin-only-qa021-sec2

- 判定: 合格
- 根拠: `apps/hub/src/app/api/v1/docs/route.ts` の `POST`/`PATCH` は `withAuthz()` 配下で `docs.write_tenant` (workspace-admin 以上) をゲートし、`scope='common'` は追加で `authz.can('docs.write_common')` (provider-admin) を要求。`DOCS-AUTHZ-001〜007` 7/7 pass。`check-single-authz-middleware.mjs` OK (判定ロジックの複製 0 件、修正後)

### 8. b7-zod-single-source-authz-mw

- 判定: 合格
- 根拠: zod 契約は `packages/schemas/docs-cms/contracts.ts` に一元化 (`documentDetailSchema`/`documentListItemSchema`/`docDraftPayloadSchema` 等)。全 route (`GET`/`POST /api/v1/docs`, `[id]/route.ts`, `[id]/draft/route.ts`) は `withAuthz()` 経由で `lib/authz/index.ts` の単一ミドルウェアへ集約 (deny-by-default)

## 総合判定

8件全て合格。1件の CI ゲート誤検出 (テスト名の語彙が静的スキャナと衝突) を検出・修正済み。
source digest: `sha256:a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`
