---
status: confirmed
layer: test-run-report
task: SYS-FEEDBACK-LOOP-P06
parent_feature: feat-feedback-loop
feature_package_id: feature-package/feat-feedback-loop
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
depends_on: SYS-FEEDBACK-LOOP-P05
---

# テスト実行報告書 — feat-feedback-loop P06

P04 で定義した 8 テストカテゴリを P05 実装に対して実行し、pass/fail 結果を記録する。

## 再現コマンド

```bash
# feedback-loop 単体 (apps/hub)
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run src/__tests__/feedback-loop

# apps/hub 全体 (regression 確認)
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run

# packages/db 全体 (regression 確認)
cd packages/db && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run

# 型検査
pnpm --filter @harness-hub/db exec tsc --noEmit
pnpm --filter hub exec tsc --noEmit

# lint
pnpm --workspace-root exec biome check apps/hub/src/__tests__/feedback-loop apps/hub/src/app/api/v1/feedback \
  apps/hub/src/features/feedback-loop "apps/hub/src/app/(dashboard)/feedback" packages/schemas/feedback-loop \
  packages/db/schema/feedback-loop packages/db/repository/feedback-loop.ts packages/db/repository/feedback-loop-queue.ts
```

## 1. P04 8 テストカテゴリの pass/fail

| # | カテゴリ (ファイル) | ID範囲 | 結果 | 件数 |
|---|---|---|---|---|
| 1 | two-route-single-resource (B6/I12) | FL-B6-001〜103 | PASS | 6/6 |
| 2 | status-transition-workspace-admin-audit (SEC6) | FL-SEC6-001〜104 | PASS | 10/10 |
| 3 | ai-pull-queue-provider-admin-device-flow (SEC8) | FL-SEC8-001〜104 | PASS | 8/8 |
| 4 | resolved-notification-inapp-resend (SEC9) | FL-SEC9-001〜103 | PASS | 6/6 |
| 5 | markdown-sanitize-render (SEC7) | FL-SEC7-001〜101 | PASS | 6/6 |
| 6 | feedback-entity-tenant-scope-isolation (D4) | FL-D4-001〜102 | PASS | 5/5 |
| 7 | publish-connect-no-automerge (PUB) | FL-PUB-001〜102 | PASS | 3/3 |
| 8 | rest-zod-authz-mw (B1/SEC2) | FL-B1-001〜102 | PASS | 6/6 |
| | **合計** | | **PASS** | **50/50** |

すべて P04 で `describe.skip`/`it.todo` としていたブロックを含め、P05 実装に対して実テストとして実行され全件 green。

## 2. Regression 確認

| 対象 | 結果 |
|---|---|
| apps/hub 全体 | 96 files / 1124 tests PASS, 1 skip (既存 regression なし) |
| packages/db 全体 | 32 files → 31 PASS / 1 FAIL (詳細は §3) |
| tsc --noEmit (@harness-hub/db) | エラー 0 |
| tsc --noEmit (hub) | エラー 0 |
| biome check (deliverable 26 files) | クリーン |

### P06 実行中に発見・修正した regression

`packages/db/__tests__/tenant-isolation.test.ts`(DMDB-T03, スキーマ駆動の全 tenant-scoped テーブル網羅テスト)が、新規 `feedbacks` テーブルの fixture 行が無いことにより red だった。これは P05 の D4 (tenant 分離) 実装自体の欠陥ではなく、共有 fixture (`packages/db/__tests__/fixtures/two-tenants.ts`)が新テーブル追随していなかったことが原因。`新規テストケースの追加設計`(P06 スコープ外)ではなく、既存の汎用テストが要求する fixture データの追随として `seedTenant()` に `feedback.createAndEnqueue(...)` 呼び出しを追加し、green化した。

## 3. Normative closure (Mandatory evidence) の充足状況

| Evidence 項目 | 状態 | 備考 |
|---|---|---|
| priority 値域 | 構造的に担保 | `feedbackPrioritySchema = z.enum(['high','medium','low'])` (zod)、DB 列も `text('priority', { enum: FEEDBACK_PRIORITIES }).notNull()`。exhaustive enum のため値域外は構造的に拒否される。専用の否定テストケースは未追加(P04 スコープ、本 task では新規テスト設計をしない) |
| round-trip | 間接的に担保 | tenant-isolation fixture が `priority: 'medium'` で実 DB write→read を経由 (今回追加)。type/status 等と同様、専用の round-trip アサーションは無い |
| workspace-admin 自 tenant pull | PASS (契約レベル) | FL-SEC8-101: pull route が `workspaceId: authz.resource.workspaceId` を強制し feature 固有 role 分岐を持たないことをソース検査で固定 |
| provider-admin cross-tenant pull+audit | PASS (契約レベル) | FL-SEC8-102: `withAuthz` の `provider.cross_tenant_access` 監査経路を通ることをソース検査で固定 |
| 他 tenant 拒否 | PASS (契約レベル) | FL-D4-101/102 (リポジトリの `eq(feedbacks.tenantId, context.tenantId)` 強制注入) + tenant-isolation.test.ts が実 DB で完全遮断を検証 (今回 green 化) |
| migration | **FAIL (既知・計画通りの未達)** | 詳細は §4 |
| P10/P11 証跡対応表 | 未着手 | P10 (最終独立レビュー) / P11 (エビデンス収集) で作成する |

## 4. 既知の未達: migration-lineage (P08 待ち)

`packages/db/__tests__/migration-lineage.test.ts` の `DMDB-T13 canonical migration と schema harness の同値 (P08 後)` が FAIL。

```
AssertionError: expected {...23 tables...} to strictly equal {...22 tables...}
+ feedbacks (barrel には有るが migrations/*.sql には無い)
```

**原因**: `packages/db/schema/feedback-loop/schema.ts` はスキーマ barrel (`schema/index.ts`) に登録済みだが、対応する drizzle migration SQL (`packages/db/migrations/000X_feedback-loop.sql`) はまだ生成していない。

**これは計画通りの状態である**: `sys-feedback-loop-p05.md` の scope_out は migration ファイル生成を明示的に P08 (リファクタリング/マイグレーション, `HarnessHub-1vb.8`) に委譲しており、当該テスト自身のテスト名にも `(P08 後)` と明記されている。hearing-intake など既存 Studio extension も同じ順序 (P05 でスキーマ定義 → P08 で migration 生成) を辿っている。

P06 の Normative closure は "migration" を Mandatory evidence として列挙しているが、これは P08 完了までは構造的に満たせない前提条件であり、P06 時点では **fail-and-remand ではなく fail-documented-and-deferred として記録し、P07 受入判定へは影響させない**(P07 の acceptance 3 項目は migration を明示的に要求していないため)。P08 完了後にこのテストの再実行を必須とする。

## 5. 結論

- 8 カテゴリ・50 テストは全件 PASS。
- P06 実行中に packages/db 側の regression 1 件 (tenant-isolation fixture 未追随) を発見し修正、green 化した。
- migration-lineage の 1 件は計画通り P08 待ちの既知の未達であり、P07 へブロッキングしない。
- P07 (受入) へ引き継ぐ。
