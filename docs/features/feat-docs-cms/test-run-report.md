---
title: "feat-docs-cms テスト実行結果 (P06)"
status: confirmed
graph_node_id: "SYS-DOCS-CMS-P06"
beads_linkage: "HarnessHub-9wb.6"
depends_on:
  - docs/features/feat-docs-cms/test-design.md
---

# feat-docs-cms テスト実行結果

> P04 (`test-design.md`) が定義した 5 テストカテゴリ + UI/DTO/HTTP/adapter 補助テストの実行結果。
> Trace rule: P04 が test ID を定義し、P05 が subject を実装し、本 P06 が実行し、P07/P10 は本結果のみを判定に使う。

## 実行コマンド (rerun可能)

```bash
pnpm --filter hub test
```

または個別実行:

```bash
cd apps/hub
/opt/homebrew/bin/node ../../node_modules/.bin/vitest run --coverage
```

`/opt/homebrew/bin/node` (arm64) を明示するのは、既定の `node` が x64 スライスで起動し
`@rollup/rollup-darwin-x64` を要求してしまう既知の環境差異を避けるため。

## 全体結果

- Test Files: 99 passed (99)
- Tests: 1136 passed | 1 skipped (1137)
- Exit code: 0
- Coverage (`apps/hub` グローバル閾値 80%):
  - lines: 80.03%
  - branches: 85.8%
  - functions: 82.5%
  - statements: 80.03%
- source digest: `sha256:a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`

## 5 テストカテゴリ (P04 定義) の結果

### 1. tenant 分離 (D4) — `DOCS-TEN-*`

- 対象: `apps/hub/src/__tests__/docs-cms/tenant-isolation.test.ts`
- 結果: 6/6 pass (DOCS-TEN-001, 002, 003, 101, 102, 103)
- 検証内容: tenant スコープ doc の他テナント不可視・common スコープの全テナント可視・repository query の OR 条件・他テナントからの GET/PATCH が 404 になること

### 2. doc 編集 admin 限定認可 (SEC2/qa-021) — `DOCS-AUTHZ-*`

- 対象: `apps/hub/src/__tests__/docs-cms/authz-contract.test.ts`
- 結果: 7/7 pass (DOCS-AUTHZ-001〜007)
- 検証内容: `docs.write_tenant` (workspace-admin 以上) ゲート、`docs.write_common` (provider-admin 限定) 追加ゲート、role 判定ロジックの複製禁止

### 3. Markdown XSS sanitize (SEC7) — `DOCS-SEC7-*`

- 対象: `apps/hub/src/__tests__/docs-cms/markdown-sanitize.test.ts`
- 結果: 7/7 pass (DOCS-SEC7-001〜005, 101, 102)
- 検証内容: script タグ・イベントハンドラ属性・javascript: スキームの除去、正常 Markdown の非空描画 (偽陽性緑化対策)、共通レンダラの既定 sanitize schema 使用

### 4. doc 編集監査 event (SEC6) — `DOCS-AUDIT-*`

- 対象: `apps/hub/src/__tests__/docs-cms/audit-events.test.ts`
- 結果: 5/5 pass (DOCS-AUDIT-001, 002, 101, 102, 103)
- 検証内容: `docs.create`/`docs.update` event 記録、metadata への値そのもの (本文・secret) の非含有、AI 下書き書き戻しの二重記録防止

### 5. AI 下書きキュー認可 (SEC8/D5) — `DOCS-QUEUE-*`

- 対象: `apps/hub/src/__tests__/docs-cms/ai-queue-contract.test.ts`
- 結果: 8/8 pass (DOCS-QUEUE-001, 101, 102, DOCS-SEC8-001〜003)
- 検証内容: 既存 `aijob.*` action の再利用 (専用 action 新設なし)、kind-dispatch 汎化、payload への secret/PII 非含有

## 補助テスト (P05 実装カバレッジ充足のため追加)

| ファイル | テスト数 | 内容 |
| --- | --- | --- |
| `dto.test.ts` | 2 | `toDocumentDetail`/`toDocumentListItem` の snake_case 変換 |
| `http.test.ts` | 4 | `problemResponse`/`parseJsonRequest` の problem+json 応答 |
| `ai-job-adapter.test.ts` | 5 | `buildDocDraftPayload`/`toPulledDocDraftJob`/`serializeDocDraftResult`/`parseDocDraftResult` |
| `apps/hub/tests/docs-cms/a11y-screens.test.tsx` | 6 | DOCS-A11Y-001〜006: 実画面初期状態の axe 違反 0 件 |
| `document-screens-interaction.test.tsx` | 11 | DOCS-UI-001〜011: 一覧取得・絞り込み・ページ送り・作成・詳細・編集の fetch 成功/失敗パスと操作 |
| `packages/db/__tests__/docs-cms.test.ts` | 1 | DOCS-PAGE-001: ULID cursor で 3 ページを重複なく走査する repository 実 DB 回帰テスト |

## 既知の許容事項

- `apps/hub/src/app/api/v1/docs/**/route.ts`・`apps/hub/src/features/docs-cms/runtime.ts` は
  Next.js API route handler / 環境変数へ触れる composition root であり、
  `sheets`/`hearing-intake` の既存ベースラインと同様にカバレッジ 0% のままで許容される
  (route の契約自体は上記 5 カテゴリの統合テストで間接的に検証済み)。
