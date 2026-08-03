---
title: "feat-docs-cms 受入検証 (P07)"
status: confirmed
layer: feature-acceptance
graph_node_id: "SYS-DOCS-CMS-P07"
beads_linkage: "HarnessHub-9wb.7"
depends_on:
  - docs/features/feat-docs-cms/requirements-baseline.md
  - docs/features/feat-docs-cms/test-run-report.md
---

# feat-docs-cms 受入検証

> P01 (`requirements-baseline.md` §4) で確定した goal-spec acceptance 3 件を、
> P06 (`test-run-report.md`) の実行済み evidence に対して1件ずつ突合する。
> Trace rule: 本文書は新規テストを実行せず、P06 の結果のみを判定材料とする。

## 受入基準 1: tenant スコープ doc が他テナントから参照できない (分離テスト)

- 判定: 合格
- Evidence: `apps/hub/src/__tests__/docs-cms/tenant-isolation.test.ts` (DOCS-TEN-001〜003, 101〜103) 6/6 pass
- 根拠: tenant スコープ doc は所有テナント以外の requester から不可視 (DOCS-TEN-001)、一覧フィルタに他テナントの tenant スコープ doc が混入しない (DOCS-TEN-003)、他テナントからの GET/PATCH は 404 (DOCS-TEN-103、tenant_mismatch 分岐に依存しない直接検証)、repository query が scope=common と tenantId 一致の OR 条件を実装する (DOCS-TEN-102、実装詳細への白箱検証)

## 受入基準 2: Markdown 描画で XSS が sanitize される (テスト付き)

- 判定: 合格
- Evidence: `apps/hub/src/__tests__/docs-cms/markdown-sanitize.test.ts` (DOCS-SEC7-001〜005, 101〜102) 7/7 pass
- 根拠: script タグ (DOCS-SEC7-001)・イベントハンドラ属性 (DOCS-SEC7-002)・javascript: スキーム (DOCS-SEC7-003) が描画結果に残らない。正常な Markdown は非空描画され (DOCS-SEC7-004)、danger 文字列の不在のみで偽陽性緑化しない (hearing-intake HI-SEC7-004 と同じ Goodhart 対策)。閲覧画面・編集プレビューとも共通レンダラの既定 sanitize schema のみを使用し、raw HTML API を経由しない (DOCS-SEC7-101, 102)

## 受入基準 3: 編集操作が監査 event に記録される

- 判定: 合格
- Evidence: `apps/hub/src/__tests__/docs-cms/audit-events.test.ts` (DOCS-AUDIT-001, 002, 101〜103) 5/5 pass
- 根拠: `POST /api/v1/docs` 成功時に `docs.create` event を記録 (DOCS-AUDIT-101)、`PATCH /api/v1/docs/:id` 成功時に `docs.update` event を記録 (DOCS-AUDIT-102)、metadata に本文・secret 等の値そのものを含めない契約を型で強制 (DOCS-AUDIT-002、PII 禁止)、AI 下書き書き戻しは既存 `ai_job.complete` 記録を再利用し二重記録しない (DOCS-AUDIT-103、ADR §5 の設計通り)

## 総合判定

3件全て合格。goal-spec acceptance を過不足なく満たしている。source digest: `sha256:a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85`
