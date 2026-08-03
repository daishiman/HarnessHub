---
status: pass
layer: feature-migration
task: SYS-FEEDBACK-LOOP-P08
feature_package_id: feature-package/feat-feedback-loop
parent_feature: feat-feedback-loop
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
depends_on: SYS-FEEDBACK-LOOP-P07
---

# feat-feedback-loop リファクタリング・migration記録

## 変更

- `packages/db/migrations/0005_feedback-loop.sql`
- `packages/db/migrations/meta/0005_snapshot.json`
- `packages/db/migrations/meta/_journal.json`

`pnpm exec drizzle-kit generate --name feedback-loop` (schema barrel: `packages/db/schema/index.ts`, out: `./migrations`, single-migration-pipeline 契約どおり) で生成した。追加したのは `feedbacks` 単一テーブルと、`(tenant_id, code)` の一意 index、`(tenant_id, workspace_id, status, updated_at)` / `(tenant_id, project_id, updated_at)` の検索用 index である。

## 互換性

- 既存23テーブル (baseline / auth-tenancy device flow / hearing-intake ai-queue / 共通・顧客持ち込み Google OIDC) への `ALTER` / 削除 / 列変更は無い。migration SQL は `CREATE TABLE feedbacks` と3つの `CREATE INDEX` のみで構成される。
- `ai_job_id` は `feedbacks` から `ai_jobs` への参照列 (アプリケーション層の紐付けのみ、SQL上のFK制約は既存 hearing_sheets と同様に付与しない設計) であり、`ai_jobs` テーブル自体への `ALTER` は無い。
- `ai_jobs.kind` enum に `feedback_response` を追加するスキーマ変更は不要だった。`packages/db/schema/hearing-intake/schema.ts` の `ai_jobs.kind` 列は元々 text 型で enum 制約が無く、P05 実装時点で drizzle-orm の型レベル union (`'hearing' | 'feedback_response' | ...`) のみを追加していたため、migration SQL への影響が無い。
- migration全体は24テーブルとなり、`pnpm exec drizzle-kit generate` のdry-run相当 (barrel再導出DDLとのSQL文字列比較) で差分ゼロを確認した。新規テーブルのみなので既存データのbackfillは不要。

## 検証

- `packages/db/__tests__/migration-lineage.test.ts` (DMDB-T07/T13): migration SQL 適用結果 (24テーブル) と schema barrel 導出 DDL が完全一致することを確認。ハードコードされたテーブル数期待値 (23→24) を本 task で更新した (過去の feat-hearing-intake 等の P08 でも同様の更新パターンを踏襲)。
- `packages/db/__tests__/backup-restore.test.ts` (P13 production migration CLI): `migrate-deploy.ts --dry-run` → 初回適用 → 再適用の冪等性テストの journal/pending/applied 件数期待値 (5→6) を更新し、dry-run→初回適用→再適用の全経路が green であることを確認した。
- `packages/db` 全体: 32 files / 258 tests PASS (regression なし)。
- `apps/hub` 全体: 96 files / 1124 tests PASS, 1 skip (regression なし)。
- `tsc --noEmit` (`@harness-hub/db`): エラー 0。
- `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-feedback-loop`: `status: pass`, `violations: []`。

## 再確認・rollback

適用失敗 (後方互換性違反) 時は本 migration ファイルを破棄し、`packages/db/schema/feedback-loop/schema.ts` (sys-feedback-loop-p05 の write scope) を修正してから本 task を再実行する。本番環境への migration 適用自体は P13 (`sys-feedback-loop-p13`) の責務であり、本 task では未実施。

## P10差し戻し追補 (builds テーブル追加)

P10 最終独立レビューで `quality_constraint 7` (`feedback-fix-publish-existing-pipeline-no-automerge`) が未実装と判定され、ADR (`docs/features/feat-feedback-loop/architecture-decision-record.md`) §7/§12 が「`builds` テーブルの新規作成 + AiJob(`feedback_response`) 完了時の冪等作成」へ最小スコープで再設計された。本追補はその再設計を実装した記録である。

### 変更 (追加分)

- `packages/db/schema/builds/schema.ts` (新規): `builds` テーブル定義 (`id`/`tenant_id`/`workspace_id`/`type`/`stage`/`sheet_id`/`feedback_id`/`publish_request_id`/`created_at`/`updated_at`)。`feedback_id` は一意 index、`(tenant_id, workspace_id, stage, updated_at)` は検索用 index。
- `packages/db/schema/index.ts`: `builds` を `allTables` (studio extensions) へ登録。
- `packages/db/migrations/0006_builds.sql` + `packages/db/migrations/meta/_journal.json` (`pnpm exec drizzle-kit generate --name builds` で生成): `CREATE TABLE builds` と 2 つの `CREATE INDEX` のみで構成。既存 25 テーブル中 24 テーブルへの `ALTER`/削除/列変更は無い。
- `packages/db/repository/builds.ts` (新規): `findOrCreateBuildForFeedback(context, feedback, initialStage)` — `feedback_id` 一意制約と `onConflictDoNothing` + 再 select による冪等 find-or-create (D4 のテナント/ワークスペース強制付き)。
- `packages/db/repository/composition.ts` / `packages/db/src/index.ts`: `createBuildsRepository` facade を既存 `feedback-loop` と同じパターンで公開。
- `apps/hub/src/features/feedback-loop/runtime.ts`: `FeedbackLoopRuntime` に `buildsRepository` を追加し、`createFeedbackLoopRuntime` のシグネチャを `(repository, buildsRepository)` へ拡張。
- `apps/hub/src/app/api/v1/ai-jobs/[id]/complete/route.ts`: `feedback_response` 完了直後に対象 feedback の `type` を判定し、`type=bug` は `stage=test`、それ以外 (`improvement`/`review`) は `stage=design` で `builds` 行を冪等作成する分岐を追加。`builds` の CRUD API・7 工程遷移 UI・`PublishRequest` 状態遷移ロジックへの変更は無い (スコープ外)。
- `apps/hub/src/__tests__/feedback-loop/publish-connect-no-automerge.test.ts`: 旧 `FL-PUB-101`/`FL-PUB-102` (ソース文字列の静的否定検査のみ) を、`POST /api/v1/ai-jobs/pull` → `POST /api/v1/ai-jobs/:id/complete` を実際に Request/Response として実行し、`builds` 行が feedback 種別ごとに正しい `stage` で冪等作成される (2 回目の作成呼び出しでも行が増えない・既存 stage が上書きされない) ことを検証する実行テストへ格上げした。`FL-PUB-001` (publish/automerge 関連 export が無いことの契約検査) は維持。
- `apps/hub/src/__tests__/feedback-loop/support/real-db.ts`: `0006_builds.sql` を migration 一覧へ追加し、`FeedbackDbHarness` に `buildsRepository` を追加。
- `apps/hub/src/__tests__/feedback-loop/route-handler-execution.test.ts` / `runtime-notification-adapter.test.ts`: `createFeedbackLoopRuntime` シグネチャ拡張への追従。
- `apps/hub/tests/auth-tenancy/support/token-route-runtime.ts`: `issuePublisherToken` に `scope` 引数 (既定 `['publish:write']`) を追加し、`['aijob:process']` などテスト固有スコープを発行可能にした。既存呼び出し箇所は位置引数のみを使うため後方互換。
- `packages/db/__tests__/fixtures/two-tenants.ts`: `builds` 行を両テナントへ追加 (DMDB-T03 tenant-isolation のスキーマ駆動網羅チェックに追随)。
- `packages/db/__tests__/migration-lineage.test.ts`: テーブル数期待値 24→25。
- `packages/db/__tests__/backup-restore.test.ts`: migration 件数期待値 (journal/applied/pending) 6→7。

### 検証 (追補分)

- `packages/db` 全体: 33 files / 264 tests PASS (regression なし。tenant-isolation 含む)。
- `apps/hub` 全体 (`--coverage`): 100 files / 1177 tests PASS, 1 skip。全体カバレッジ Stmts 83.05% / Branch 85.59% / Funcs 86.22% / Lines 83.05% (閾値 80% 以上を満たす)。
- `pnpm --workspace-root exec biome check packages/db apps/hub`: エラー 0 (import 順序の自動修正を適用済み)。
- `tsc --noEmit` (`@harness-hub/db` / `hub`): いずれもエラー 0。
- `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-feedback-loop`: `status: pass`, `violations: []`。

### 再確認・rollback (追補分)

`builds` テーブルは feedback-loop からの読み取り専用参照 (`findOrCreateBuildForFeedback` の冪等作成のみ) であり、Build 7 工程パイプライン UI・`sheet_id` 書き込み (`hearing-intake` の Build 化)・`builds` CRUD API は本追補のスコープ外のまま (ADR §12 の申し送り事項)。将来これらを実装する task は、本追補が確定した `builds` スキーマ・`findOrCreateBuildForFeedback` の契約を破壊しないこと (特に `feedback_id` 一意制約と冪等セマンティクス) を前提に設計すること。
