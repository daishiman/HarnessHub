---
title: "feat-docs-cms テストファースト設計 (P04)"
status: confirmed
layer: feature-test-design
graph_node_id: "SYS-DOCS-CMS-P04"
beads_linkage: "HarnessHub-9wb.4"
depends_on:
  - docs/features/feat-docs-cms/architecture-decision-record.md
  - docs/features/feat-docs-cms/design-review-notes.md
---

# feat-docs-cms テストファースト設計

> P03 で承認された設計 (architecture-decision-record.md, status: confirmed) に基づき、
> P05 実装が満たすべき受入契約として 5 テストカテゴリの合否基準を先に固定する。
> Trace rule: 本 P04 が test ID を定義し、P05 が subject を実装し、P06 が実行し、
> P07/P10 は実行済み evidence のみを判定に使う。

## テストスタブの配置

- 配置先: `apps/hub/src/__tests__/docs-cms/`
- 理由: `apps/hub/vitest.config.ts` の `test.include` は `src/__tests__/**/*.test.ts(x)` のみを収集対象とし、
  `src/features/<name>/__tests__/` は対象外 (config 内コメントに "P03 指摘 R6" として明記された既知の失敗モード:
  「テストを書いたのに実行 0 件で緑になる」)。実在する precedent (`apps/hub/src/__tests__/dual-catalog-web/`) もこの規約に従う。
  P04 published task spec の写像先表記 (`apps/hub/src/features/docs-cms/__tests__/`) は
  vitest.config.ts の実収集規約と矛盾するため、実際に収集される `apps/hub/src/__tests__/docs-cms/` を正とする。
  この配置差し替えは write scope の対象パスを変更するのみで、テストが検証する契約 (B7 route handler /
  ai-job-adapter / packages/schemas 配下の実装コード) の write scope には影響しない。

## 5 テストカテゴリ

### 1. tenant 分離 (D4) — `DOCS-TEN-*`

- 合否基準: `scope='tenant'` の doc は、異なる `tenantId` を持つリクエストから GET/PATCH ともに到達できない (404、tenant_mismatch を経由しない)。
- 合否基準: `scope='common'` の doc は、任意の tenant から GET できる。
- 合否基準: repository query が `or(eq(documents.scope,'common'), eq(documents.tenantId, context.tenantId))` 条件を経由する (ADR §3.1/§6 の設計を直接検証する)。
- 対応 acceptance: 「tenant スコープ doc が他テナントから参照できない」
- 対象ファイル: `apps/hub/src/__tests__/docs-cms/tenant-isolation.test.ts`

### 2. doc 編集 admin 限定認可 (SEC2/qa-021) — `DOCS-AUTHZ-*`

- 合否基準: `POST /api/v1/docs`・`PATCH /api/v1/docs/:id`・`POST /api/v1/docs/:id/draft` は `docs.write_tenant` (最低 workspace-admin) をゲートとして要求し、member ロールは 403。
- 合否基準: `scope='common'` への書き込みは追加で `authz.can('docs.write_common')` (provider-admin) を要求し、workspace-admin は 403。
- 合否基準: `GET /api/v1/docs`・`GET /api/v1/docs/:id` は `docs.read` (member 以上) で許可される。
- 対応 quality_constraint: SEC2 (最小権限)、qa-021
- 対象ファイル: `apps/hub/src/__tests__/docs-cms/authz-contract.test.ts`

### 3. Markdown XSS sanitize (SEC7) — `DOCS-SEC7-*`

- 合否基準: `<script>`・イベントハンドラ属性・`javascript:` スキームが `MarkdownView` 描画結果に残らない。
- 合否基準: 正常な Markdown は空描画にならず、danger 文字列の不在を「何も描画しない」ことで偽陽性緑化しない (hearing-intake の `HI-SEC7-004` と同じ Goodhart 対策パターン)。
- 合否基準: docs-cms 側が `dangerouslySetInnerHTML` や独自 sanitize schema 上書きを持たない。
- 対応 acceptance: 「Markdown 描画で XSS が sanitize される」
- 対象ファイル: `apps/hub/src/__tests__/docs-cms/markdown-sanitize.test.ts`

### 4. doc 編集監査 event (SEC6) — `DOCS-AUDIT-*`

- 合否基準: `POST /api/v1/docs` 成功時に `docs.create` audit event が記録される。
- 合否基準: `PATCH /api/v1/docs/:id` 成功時に `docs.update` audit event が記録される。
- 合否基準: AI 下書き (`doc_draft`) の書き戻しは既存 `ai_job.complete` audit で追跡され、二重記録しない (ADR §5 の設計を検証する)。
- 対応 acceptance: 「編集操作が監査 event に記録される」
- 対象ファイル: `apps/hub/src/__tests__/docs-cms/audit-events.test.ts`

### 5. AI 下書きキュー (doc kind) 認可 (SEC8/D5) — `DOCS-QUEUE-*`

- 合否基準: `doc_draft` kind の enqueue は `aijob.pull`/`aijob.complete`/`aijob.fail` の既存 authz ゲートを再利用し、独自のゲートを複製しない。
- 合否基準: 共通 pull/complete 経路 (`ai-jobs/pull`, `ai-jobs/[id]/complete`) が kind-dispatch で `doc_draft` を処理でき、`sheet_generation` 専用コードの複製ではない。
- 合否基準: payload/result に secret (API key 等) を含まない (SEC8)。
- 対応 quality_constraint: SEC8、AiJob 共通層汎化 (未解決論点を P05 実装で解消する)
- 対象ファイル: `apps/hub/src/__tests__/docs-cms/ai-queue-contract.test.ts`

## Evidence chain

上記 5 ファイルの test 実行結果 (P06)・doc_draft enqueue/complete round-trip・共通 queue consumer contract・
5 endpoint の role/tenant tests・監査 event を、`docs/features/feat-docs-cms/` 配下の evidence ドキュメント (P11) で
同一 chain として追跡する。source digest: `sha256:a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`。

## P10 最終レビューで追加した回帰

- `packages/db/__tests__/docs-cms.test.ts` の `DOCS-PAGE-001` は、`GET /api/v1/docs` の `next_cursor` が
  repository の `WHERE id < cursor` に接続され、ページをまたいで先頭ページを繰り返さないことを実 DB で確認する。
- ページ順序は編集時刻ではなく ULID の `id DESC` とする。編集で `updated_at` が変わっても cursor の意味を変えず、
  重複・欠落を防ぐためである。
