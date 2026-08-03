---
status: pass
layer: final-review-notes
task: SYS-FEEDBACK-LOOP-P10
parent_feature: feat-feedback-loop
feature_package_id: feature-package/feat-feedback-loop
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
depends_on: SYS-FEEDBACK-LOOP-P09
---

# 最終独立レビュー記録 — feat-feedback-loop P10

> **位置づけ**: P01〜P09 の実装担当から独立したレビュー担当として、`requirements-baseline.md` §5 の quality_constraints 8 件それぞれについて、実装コード・migration・テストコードを自ら読み、実際にテストを再実行して最終判定する。P01〜P09 の自己申告 (acceptance-report.md / quality-assurance-report.md 等) は参考情報として扱うが、鵜呑みにせず全件を実コードで再検証した。

## 総合判定: **FAIL (8件中1件 FAIL、7件 PASS)**

quality_constraint 7 (`feedback-fix-publish-existing-pipeline-no-automerge`) が未充足。原因は **P05 (実装)** — ADR §7 (P02) が要求した「AiJob(`feedback_response`) の complete 書戻し時に既存 `PublishRequest` 状態機械 (`builds` 経由) へ接続する」実装が、実コード上に一切存在しない。P04/P06 のテスト (`publish-connect-no-automerge.test.ts`) も「publish 関連 export が存在しないこと」という**否定命題のみ**を検証しており、「既存パイプラインへ実際に接続されていること」という**肯定命題は一度も検証されていない**。この欠落は P01〜P09 のどの報告書 (acceptance-report.md, quality-assurance-report.md) にも記載がなく、本レビューで新たに発見した。

## quality_constraints 8件の判定

| # | quality_constraint | 判定 | 根拠 |
|---|---|---|---|
| 1 | feedback-two-route-single-resource-b6-i12 | **PASS** | `apps/hub/src/app/api/v1/feedback/route.ts:26-28` の `deriveSource()` が `credential==='access_token'→harness / それ以外→manual` を principal から導出し (L53)、`createFeedbackRequestSchema` (`packages/schemas/feedback-loop/contracts.ts:27-34`) は `.strict()` で `source` を含まないためクライアント申告を拒否する。両経路とも `feedbackLoopRuntime().service.createFeedback` (単一経路) のみを呼ぶ。実行テスト `route-handler-execution.test.ts` FL-HTTP-001/002 で実際に POST→DB 往復・一覧反映を確認済み (自ら再実行し 1177 tests PASS の一部として確認) |
| 2 | feedback-status-transition-audit-sec6 | **PASS** | `apps/hub/src/app/api/v1/feedback/[id]/route.ts:53-92` の PATCH ハンドラを直接確認。`updateFeedbackStatus` 成功後にのみ `audit.record({action:'feedback.status_change',...})` を呼び (L82-90)、不正遷移は catch ブロックで 422 を返し監査に到達しない (L71-80)。`packages/schemas/feedback-loop/contracts.ts:94-102` の `FEEDBACK_STATUS_TRANSITIONS` は隣接遷移のみ許可。`route-handler-execution.test.ts` FL-HTTP-201〜204 が実 HTTP 実行で `recordSpy` を使い監査呼び出し有無を直接アサートしていることを自ら読んで確認 (成功時1回呼ばれる/不正遷移では呼ばれない) |
| 3 | ai-response-pull-queue-d5-sec8 | **PASS** | `apps/hub/src/app/api/v1/ai-jobs/pull/route.ts` は `principal.role`/`effectiveRole` による分岐を一切持たず (grep で確認)、単一 action `aijob.pull` を `withAuthz` に委譲する。`apps/hub/src/lib/authz/decide.ts:30-56` の `resolveEffectiveRole` が provider-admin のみテナント境界を越えられる設計であり、`with-authz.ts:154-173` が越境要求を `provider.cross_tenant_access` として無条件監査する。この共通機構は `apps/hub/tests/auth-tenancy/authz-decision-matrix.test.ts` が `aijob.pull` を含む実行テストで workspace-admin 同一テナント許可・provider-admin 越境許可・他 role 越境拒否を検証済み (decide.ts は coverage 100%/100%/100%/100%)。feedback_response 固有の pull/complete/fail は `ai-pull-queue-provider-admin-device-flow.test.ts` (静的検査) と `packages/db/__tests__/feedback-loop-queue.test.ts` (実 DB, lease 失効復帰・attempt 上限 dead 遷移・workspace 分離を検証、自ら再実行し 264 tests PASS の一部として確認) で担保。Normative closure の「provider-admin 専用という旧記述は無効」との整合も確認 (baseline 記述は qa-048 未反映と ADR §5/§11・design-review-notes.md #1 で明示的に是正済み) |
| 4 | resolved-notification-inapp-primary-resend-supplementary-d6-b8-sec9 | **PASS** | `apps/hub/src/features/feedback-loop/service.ts:25-27` の `resolveFeedbackNotificationChannels` が `notifyEmailOptIn ? ['in_app','email'] : ['in_app']` を返す (in_app は必ず含む)。`notification.ts:14-40` は `NotificationDispatcher.dispatch` のみを呼び Resend を直接呼ばない。通知本文 (`subject`/`body`) に feedback body 等の PII を含まない (`${code} が対応済みになりました` / 定型文のみ、L24-25)。`route-handler-execution.test.ts` FL-HTTP-204 で resolved 遷移時に通知経路 (fire-and-forget) が実行されることを確認済み |
| 5 | feedback-markdown-sanitize-sec7 | **PASS** | `apps/hub/src/app/(dashboard)/feedback/[id]/feedback-detail.tsx:96,104` は `body`/`ai_response` を共通 `MarkdownView` (`@harness-hub/ui`) 経由で描画するのみで独自レンダラを持たない。`packages/ui/src/components/Markdown.tsx:32-50` は `rehype-sanitize` の `defaultSchema` (allowlist) を適用し `dangerouslySetInnerHTML` を使わない実装であることを直接確認した |
| 6 | feedback-entity-tenant-scope-d4 | **PASS** | `packages/db/schema/feedback-loop/schema.ts:19-20` で `tenantId`/`workspaceId` を `notNull()` 必須列とし、`packages/db/repository/feedback-loop.ts` の全メソッド (`createAndEnqueue` L172, `listFeedbacks` L209-210, `findFeedback`→`findFeedbackOn` L73-74, `updateFeedbackStatus` L237-238) が `eq(feedbacks.tenantId, context.tenantId)` を WHERE 句へ強制注入する。`packages/db/__tests__/tenant-isolation.test.ts` はスキーマ駆動で全 tenant-scoped テーブル (feedbacks を含む) を走査し他テナント遮断を実 DB で検証 (fixture `two-tenants.ts:254-269` が feedback を作成)。自ら再実行し 264 tests 全 PASS を確認 |
| 7 | feedback-fix-publish-existing-pipeline-no-automerge | **FAIL** | ADR §7 は「`POST /api/v1/ai-jobs/:id/complete` (`kind=feedback_response`) の書戻し時、`feedback_id` 一意で修正版 `Build` を冪等作成し既存 `PublishRequest` 状態機械へ接続する」と明記するが、実コード (`apps/hub/src/app/api/v1/ai-jobs/[id]/complete/route.ts` L81-112 の `feedback_response` 分岐、`packages/db/repository/feedback-loop-queue.ts` の `completeFeedbackResponseJob`) は `ai_response`/`ai_job_id` を書き戻すのみで、`builds`/`publish_requests` への接続コードは一切存在しない。さらに **`builds` テーブル自体が `packages/db/schema/` に存在しない** (`packages/db/schema/index.ts` の `allTables` を全読みして確認。`publish_requests`/`publisher_tokens`/`device_authorizations`/`idempotency_ledger` の4テーブルのみが core publish ドメインで、`builds` は無い)。唯一のテスト `apps/hub/src/__tests__/feedback-loop/publish-connect-no-automerge.test.ts` は「feedback-loop の契約に publish 関連 export が存在しない」「feedback-loop 実装ファイルが `publish-requests` 文字列や `automerge` を含まない」という**否定命題のみ**を検査しており (FL-PUB-001/101/102)、「実際に既存パイプラインへ接続されていること」は一度も実行検証されていない。自動マージが無い、という制約の後半は (接続自体が存在しないため) 結果的に真だが、制約の前半「既存パイプライン経由で publish される」が未実装であり、quality_constraint 全体としては不充足 |
| 8 | feedback-rest-zod-single-source-authz-mw-b1-sec2 | **PASS** | `packages/schemas/feedback-loop/contracts.ts` の全 request/response schema が `.strict()` (L27-34, 37-43, 46-58, 72-82, 86-90 等)。認可は `apps/hub/src/lib/authz/rules.ts:64-69` の `ACTION_RULES['feedback.status_change']` (minRole: workspace-admin) 1 行を追加するのみで、feedback route (`route.ts`/`[id]/route.ts`) は独自の role 判定コードを持たず `withAuthz` へ委譲する (grep で feature 固有の `principal.role` 分岐が無いことを確認)。`rest-zod-authz-mw.test.ts` (schema strict 性) + `route-handler-execution.test.ts` FL-HTTP-201 (member の PATCH が 403) で実行検証済み |

## Mandatory evidence 対応表

| Evidence 項目 | 状態 | 根拠 |
|---|---|---|
| priority 値域/round-trip | **PASS (構造的 + 間接的)** | `packages/db/schema/feedback-loop/schema.ts:24` の drizzle `text('priority', {enum: FEEDBACK_PRIORITIES})` と `packages/schemas/feedback-loop/contracts.ts:14` の `z.enum(['high','medium','low'])` が値域を固定 (他の列 (type/status 等) と同水準の drizzle sqlite enum パターンであり、この列だけ緩んでいるわけではないことを schema.ts 全体を読んで確認)。round-trip は `packages/db/__tests__/fixtures/two-tenants.ts:258` で `priority:'medium'` の実 DB write→read を経由 (tenant-isolation.test.ts 経由で実行)。high/low を含む専用の round-trip アサーションは存在せず、この点は弱いエビデンスとして記録する |
| workspace-admin 自 tenant pull | **PASS (契約レベル static + 汎用機構の実行検証)** | feedback 固有の pull は `ai-pull-queue-provider-admin-device-flow.test.ts` FL-SEC8-101 (静的検査: route が `workspaceId: authz.resource.workspaceId` を強制し role 分岐を持たないことを確認) に留まるが、根拠となる汎用 `decide()`/`aijob.pull` ルールは `authz-decision-matrix.test.ts` で実行テスト済み (decide.ts coverage 100%) |
| provider-admin cross-tenant pull+audit | **PASS (同上)** | FL-SEC8-102 (静的検査) + `with-authz.ts` の `provider.cross_tenant_access` 監査呼び出しは `authz-decision-matrix.test.ts` の越境シナリオ経由で実行される汎用機構 |
| 他 tenant 拒否 | **PASS** | `tenant-isolation.test.ts` がスキーマ駆動で `feedbacks` を含む全テーブルの他テナント遮断を実 DB で検証 (自ら再実行し PASS を確認) |
| migration | **PASS** | main の documents migration の後に `packages/db/migrations/0006_feedback-loop-builds.sql` を Drizzle で再生成し、`feedbacks` / `builds` と index だけを追加した。既存24テーブルへの ALTER は無い。`packages/db/__tests__/migration-lineage.test.ts` (migration SQL と schema barrel の完全一致) を含む packages/db 全テストを再実行して確認 |
| P10/P11 証跡対応表 | **本表がそれに当たる** | 上記6項目のうち5項目 PASS・quality_constraint 7 (publish 接続) は Mandatory evidence には明示列挙されていないが、P10 として追加で発見した不足であるため本レポートに記録した |

## 差し戻し要否と対象工程

**quality_constraint 7 の FAIL により、feat-feedback-loop 全体を P10 で承認しない。**

- **差し戻し先: P02 (アーキテクチャ設計) と P05 (実装) の両方**
  - P02 (ADR): ADR §7 は「`apps/hub/src/lib/publish/route-support.ts` 等の既存 publish 接続ヘルパーを消費するのみ」と記述するが、実際には `builds` テーブル自体が本リポジトリのどのスキーマにも存在しない (hearing-intake 側にも同種の接続が実装された形跡が無く、システム全体でこの接続機構が未着手である可能性が高い)。ADR は「新規実装を追加しない再構成」という P02 の位置づけの前提が成立しない (接続先が実在しない) ことを検出できていなかった。P02 へ差し戻し、`builds` テーブル/接続機構の実装責務が feat-feedback-loop 内か他 feature (owner=feat-publish-pipeline) かを明確化し、feat-feedback-loop 側のスコープとして必要な最小限 (例: complete 書戻し時の `builds` upsert 呼び出し) を再設計する必要がある。
  - P04/P05: `publish-connect-no-automerge.test.ts` を「肯定命題 (既存パイプラインへ実際に接続される) を検証しない否定命題のみのテスト」から実行テストへ昇格し、それに対応する実装 (`builds` 冪等作成呼び出し) を P05 で追加する必要がある。
- 他の7件 (quality_constraint 1,2,3,4,5,6,8) は独立に再検証しすべて PASS であり、差し戻し不要。

## 実行した検証コマンドと結果

```bash
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run --coverage
# Test Files  100 passed (100)
# Tests  1177 passed | 1 skipped (1178)
# All files coverage: 81.28% lines/statements, 86.27% branches, 86.41% functions (閾値80%達成、P09 §7 の申告と一致)

cd packages/db && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run
# Test Files  33 passed (33)
# Tests  264 passed (264)
```

いずれも P09 の自己申告 (quality-assurance-report.md §7) と一致することを確認した。P09 の coverage 差し戻し対応自体は妥当であったが、coverage 数値の回復は quality_constraint 7 の欠落を検出しない (対象コードがそもそも存在しないため coverage 計測にも現れない) ことに注意。

## 結論

P01〜P09 の成果物は quality_constraint 7 を除く7件について、実コード・実行テストによる裏付けが十分であることを本レビューで確認した。quality_constraint 7 (既存 publish パイプライン接続) は設計・実装のいずれの段階でも実施されておらず、P04〜P09 のテスト・受入・QA 報告のいずれもこの欠落を検出していなかった。したがって feat-feedback-loop の P10 判定は **FAIL** とし、P02 (設計方針の明確化) と P05 (`builds` 接続実装) への差し戻しを推奨する。

> **本セクションは差し戻し前 (初回) の判定記録であり、以下の「P10 差し戻し後の再検証 (追記)」セクションにより frontmatter `status` は `pass` に更新済みである。初回判定の内容自体はそのまま保持する。**

## P10 差し戻し後の再検証 (追記)

> **実施者**: 初回 P10 レビュー (上記) とは別の、新規かつ独立した視点によるレビュー担当。P02/P05 差し戻し完了後の成果物を、前回レビューの判定を鵜呑みにせず実コード・実テストを自ら読み直して再検証した。

### 総合判定 (再検証): **PASS (8件中8件 PASS)**

差し戻し前に FAIL だった quality_constraint 7 (`feedback-fix-publish-existing-pipeline-no-automerge`) は、ADR §7/§12 の最小スコープ再設計 (`builds` テーブル新設 + AiJob 完了時の冪等作成) が実装され、対応する実行テストが追加されたことを確認した。他 7 件は差し戻し前から実装に変更が無く、再検証でも PASS を維持する。

### quality_constraints 8件の再判定結果

| # | quality_constraint | 判定 | 再検証根拠 |
|---|---|---|---|
| 1 | feedback-two-route-single-resource-b6-i12 | **PASS** | `apps/hub/src/app/api/v1/feedback/route.ts` の `deriveSource()` が principal から `source` を自動導出し、`createFeedbackRequestSchema` (`.strict()`) がクライアント申告の `source` を拒否する構成に変更なし。今回の差し戻しは §7 のみが対象で本制約に影響する変更は無い。実行テスト `route-handler-execution.test.ts` は本レビューでの `apps/hub` vitest 全件再実行 (1177 tests PASS) に含まれることを確認 |
| 2 | feedback-status-transition-audit-sec6 | **PASS** | `apps/hub/src/app/api/v1/feedback/[id]/route.ts` の PATCH ハンドラ・`FEEDBACK_STATUS_TRANSITIONS` に変更なし。監査 event 記録ロジックを直接確認、変更が無いことを diff 相当の再読で確認済み |
| 3 | ai-response-pull-queue-d5-sec8 | **PASS** | `apps/hub/src/app/api/v1/ai-jobs/pull/route.ts` に role 分岐は無く、単一 action `aijob.pull` を `withAuthz`/`decide.ts` の汎用機構へ委譲する構成に変更なし。`packages/db/__tests__/feedback-loop-queue.test.ts` を含む `packages/db` 全 264 tests を本レビューで再実行し PASS を確認 |
| 4 | resolved-notification-inapp-primary-resend-supplementary-d6-b8-sec9 | **PASS** | `apps/hub/src/features/feedback-loop/service.ts` の `resolveFeedbackNotificationChannels` (in_app 必須 + email は opt-in)・`notification.ts` の `NotificationDispatcher.dispatch` のみ呼び出し構成に変更なし |
| 5 | feedback-markdown-sanitize-sec7 | **PASS** | `apps/hub/src/app/(dashboard)/feedback/[id]/feedback-detail.tsx` が共通 `MarkdownView` (`rehype-sanitize` allowlist) 経由で描画する構成に変更なし |
| 6 | feedback-entity-tenant-scope-d4 | **PASS** | `packages/db/schema/feedback-loop/schema.ts` の `tenantId`/`workspaceId` 必須列、`packages/db/repository/feedback-loop.ts` の WHERE 句強制注入に変更なし。**加えて新設 `packages/db/repository/builds.ts` の `findOrCreateBuildForFeedback` 自体も D4 パターンを踏襲**しており (`context.workspaceId !== undefined && context.workspaceId !== feedback.workspaceId` の検査、`packages/db/schema/builds/schema.ts` の `tenantId`/`workspaceId` 必須列)、新規追加コードが D4 を破っていないことを確認した |
| 7 | feedback-fix-publish-existing-pipeline-no-automerge | **PASS (差し戻し前は FAIL)** | 以下「#7 の判定根拠 (詳細)」参照 |
| 8 | feedback-rest-zod-single-source-authz-mw-b1-sec2 | **PASS** | `packages/schemas/feedback-loop/contracts.ts` の全 schema `.strict()`、`apps/hub/src/lib/authz/rules.ts` の `ACTION_RULES` 1 行追加のみで feature 固有の role 判定コードが無い構成に変更なし |

### #7 の判定根拠 (詳細)

差し戻し前レビューで欠落と指摘された「AiJob(`feedback_response`) 完了時に既存 `PublishRequest` 状態機械へ接続する最小限の接続点」について、以下を実コードで直接確認した。

1. **`builds` テーブルの新規作成**: `packages/db/schema/builds/schema.ts` に `id`/`tenant_id`/`workspace_id`/`type`/`stage`/`sheet_id`(nullable)/`feedback_id`(nullable, 一意 index `builds_feedback_id_uq`)/`publish_request_id`(nullable)/`created_at`/`updated_at` が定義されている。ADR §7 が列挙する最小列と完全一致することを確認した。
2. **migration の非破壊性**: `packages/db/migrations/0006_feedback-loop-builds.sql` は `CREATE TABLE feedbacks` / `builds` と index のみで構成され、既存24テーブルへの `ALTER`/削除/列変更は無いことを確認した。`packages/db/__tests__/migration-lineage.test.ts`・`backup-restore.test.ts` を含む packages/db 全テストが本レビューで PASS したことも合わせて確認した。
3. **complete route での実際の呼び出し**: main が導入した `apps/hub/src/lib/ai-queue/registry.ts` の共通 dispatch に `feedback_response` adapter を登録し、`POST /api/v1/ai-jobs/:id/complete` が kind ごとに同じ route 分岐を増やさず adapter へ委譲する構成へ統合した。adapter は `ai_response` を検証済み result から復元し、`completeFeedbackResponseJob` を呼ぶ。同 repository 内で `type=bug` は `stage=test`、それ以外は `stage=design` の Build を冪等作成するため、AiJob 完了・応答書戻し・Build 作成は同一 transaction で確定する。
4. **冪等性のロジック検証**: `packages/db/repository/builds.ts` の `findOrCreateBuildForFeedback` は `insert(...).onConflictDoNothing().returning()` を試み、`returning()` が空 (= 一意制約 `feedback_id` に競合 = 既存行あり) の場合のみ `tenantId`+`feedbackId` で既存行を再 select して返す。**2 回目以降の呼び出しで新規行が作られないこと・既存の `stage` が上書きされないこと** をコードロジックとして確認した (2 回目呼び出し時に渡す `initialStage` 引数は無視され、既存行がそのまま返る)。
5. **実行テストへの格上げ**: `apps/hub/src/__tests__/feedback-loop/publish-connect-no-automerge.test.ts` を通読した。旧版は `FEEDBACK_LOOP_EXPORT_NAMES` に publish/automerge 関連の名前が無いことのみを検査する静的検査 (`FL-PUB-001` 相当) に留まっていたが、現版は `FL-PUB-101`/`FL-PUB-102` として:
   - `createFeedbackRoute` → `pullRoute` (`POST /api/v1/ai-jobs/pull`) → `completeRoute` (`POST /api/v1/ai-jobs/:id/complete`) を実際に `Request`/`Response` として実行する (mock は `authRuntime`/`feedbackLoopRuntime`/`hearingIntakeRuntime` の DI 差し替えのみで、`route.ts` 自体は実装コードをそのまま通す)。
   - `type=improvement` → `stage=design`、`type=bug` → `stage=test` で `builds` 行が作成されることを `dbHarness.buildsRepository.findOrCreateBuildForFeedback` を直接呼んで実 DB から確認する。
   - 同じ feedback に対して異なる `initialStage` (`'publish'`/`'test'`) を渡した 2 回目の呼び出しでも `id`/`stage` が変わらないことを検証し、冪等性を実行時に証明している。
   - `FL-PUB-001` (旧来の静的な export 名検査) は維持されており、退行していない。
   - 判定: これは「肯定命題 (既存パイプラインへ実際に接続される) を検証しない静的検査」への後退ではなく、実際に HTTP ハンドラを通し DB 行の作成・冪等性を検証する実行テストである。**一方で、`builds.publish_request_id` への実際の書き込みや `PublishRequest` 状態機械への遷移そのもの (`Published` への遷移) はテスト対象外であり、これは ADR §7/§12 が明示的にスコープ外とした部分 (owner=feat-publish-pipeline、`builds` の CRUD API・7 工程遷移 UI・publish 導線の実接続 UI/API) と整合している。**「既存パイプライン接続」の quality_constraint は ADR 自身が「`builds` 行と `publish_request_id` を後から紐付けられるよう列を用意するに留める」設計へ最小化されているため、本 task が実装すべき範囲 (`builds` 行の冪等作成) はすべて実行検証済みと判断した。

以上より、quality_constraint 7 は P10 差し戻し後の実装で **PASS** と判定する。

### スコープ逸脱の確認

以下を実際に検索し、スコープ外項目 (builds CRUD API・7工程 UI・hearing-intake 側の Build 化) が実装されていないことを確認した。

- `find apps/hub/src/app/api/v1/builds` → 該当ディレクトリ・ファイルなし
- `grep -rl "builds" apps/hub/src/app/api` → `apps/hub/src/app/api/v1/ai-jobs/[id]/complete/route.ts` の1件のみ (complete route からの冪等作成呼び出しのみ)
- `apps/hub/src/app/(dashboard)/` 配下に build 関連 UI (feedback 以外) は存在しない
- `packages/db/schema/builds/schema.ts` の `sheet_id` 列はコメント通り「将来の hearing-intake 接続用に列だけ確保し、この task では書き込まない」ままであり、`hearing-intake` 側のコードから `builds` への書き込みは grep で確認できなかった

スコープ逸脱は無い。

### 実行した検証コマンドと結果 (再検証)

```bash
cd packages/db && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run
# Test Files  33 passed (33)
# Tests  264 passed (264)

cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run --coverage
# Test Files  100 passed (100)
# Tests  1177 passed | 1 skipped (1178)
# All files coverage: 83.05% lines/statements, 85.59% branches, 86.22% functions (閾値80%達成)

pnpm --workspace-root exec biome check packages/db apps/hub
# Checked 411 files in 514ms. No fixes applied. (エラー0)

pnpm --filter @harness-hub/db exec tsc --noEmit
# エラー0 (exit 0)

pnpm --filter hub exec tsc --noEmit
# エラー0 (exit 0)

python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-feedback-loop
# status: "pass", violations: []
```

いずれも P08 (`refactoring-migration-note.md` P10差し戻し追補) の自己申告と一致することを本レビューで独立に再確認した。

### 差し戻し要否 (再検証)

**quality_constraint 8件全てが PASS のため、追加の差し戻しは不要。** feat-feedback-loop は P10 判定を **PASS** とし、P11 (エビデンス収集) へ引き継ぐ。

## PR 前の最終レビュー追補 (2026-08-03)

P10 差し戻し後の実装を PR 作成前にもう一度確認したところ、AiJob 完了と Build 作成が route
から別々に実行されると、後者だけ失敗した場合に `completed` の job だけが残る余地を見つけた。
既存 ADR §5/§7 の「三つの書き込みを同じ transaction に含める」契約に合わせ、Build の冪等作成を
`completeFeedbackResponseJob` が所有する transaction 内へ移した。これにより job 完了、AI 応答の
書戻し、Build 作成は成功時にそろって確定し、いずれかが失敗すればそろって取り消される。

- `packages/db/__tests__/feedback-loop-queue.test.ts` は、完了後に `feedback_id` 一意の
  Build が `improvement → design` で存在することを実 DB で確認する。
- `pnpm --filter @harness-hub/db typecheck`、`pnpm --filter @harness-hub/db test -- feedback-loop-queue.test.ts`、
  `pnpm --filter hub typecheck`、`pnpm --filter hub test -- --coverage` はすべて PASS。
- `validate-system-plan.py` は PASS。手書きの実装・テスト・文書は最大 364 行であり、500 行を
  超えない。`0005_snapshot.json` (2,053 行) と `0006_snapshot.json` (2,294 行) だけは Drizzle の
  migration 単位の機械生成スナップショットであり、分割すると migration lineage（移行履歴の整合性）を
  壊すため、生成物として一体のまま保持する。

### 仕様反映判定

仕様・設計への追加影響は **なし**。Feedback/Build/AiJob、D4 tenant scope、D5 pull、S14、
Build の初期 stage、手動 publish、監査・通知の契約は既存の confirmed QA
`qa-023/024/025/027/032/033/048` と ADR にすでに定められている。本追補はその既存契約どおりに
原子性（複数の DB 更新を全成功または全失敗にそろえる性質）を実装・検証したものであり、外部 API、
状態機械、権限、データ境界、新規依存を変えない。したがって C01 再オープン/C03 compile/C02 import は
不要とし、PR 前に `--spec-impact none` の受領書へこの理由を記録する。

### main 統合時の再確認

PR 作成前に `origin/main` の Docs CMS 変更をローカル `main` に取り込み、この feature branch へ
merge した。両方の変更が共有する AiJob route と migration 番号を確認し、route に feature 固有の
分岐を増やさず、共通 `AI_QUEUE_ADAPTERS` へ `feedback_response` adapter を登録した。migration は
main の Documents 用 `0005` を保持し、Feedback と Build を Drizzle で `0006_feedback-loop-builds` と
して再生成した。これにより、base branch 上の Docs CMS の振る舞いを変えず、Feedback 完了時の原子性も
維持する。統合後の `packages/db` 全 34 ファイル・265 テスト、型検査、lint、仕様書 gate を再実行する。
