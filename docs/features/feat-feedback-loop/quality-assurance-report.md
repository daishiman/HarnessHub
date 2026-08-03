---
status: pass
layer: quality-assurance-report
task: SYS-FEEDBACK-LOOP-P09
parent_feature: feat-feedback-loop
feature_package_id: feature-package/feat-feedback-loop
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
depends_on: SYS-FEEDBACK-LOOP-P08
test_run_report: docs/features/feat-feedback-loop/test-run-report.md
refactoring_migration_note: docs/features/feat-feedback-loop/refactoring-migration-note.md
---

# 品質保証報告書 — feat-feedback-loop P09

CI 品質ゲート5種 (axe / tenant 分離 / 認可単一ミドルウェア適合 / AI キュー lease・attempt 上限 / 監査) の充足を確認する。P09 は「確認のみ」であり未達ゲートの原因修正は行わない (published task spec スコープ外)。

## 再現コマンド

```bash
pnpm --filter hub lint
cd apps/hub && /opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run --coverage
python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-feedback-loop
```

## 5種の確認結果

| # | ゲート | 判定 | 根拠 |
|---|---|---|---|
| 1 | axe アクセシビリティ (qa-021, S14) | **未実施** | `apps/hub/tests/a11y/hub-screens.spec.ts` は共通スクリーン (トップ画面・Device Flow承認画面) のみを対象とし、S14 (feedback 一覧/詳細/新規フォーム) の axe 専用テストが存在しない。他 feature (hearing-intake) には `tests/hearing-intake/a11y-screens.test.tsx` が存在するが feedback-loop には同等物が無い |
| 2 | tenant 分離 (D4, qa-032) | **PASS** | `packages/db/__tests__/tenant-isolation.test.ts` (実 DB 経由、P06 で fixture 追随修正済み) + `apps/hub/src/__tests__/feedback-loop/feedback-entity-tenant-scope-isolation.test.ts` (5件、リポジトリ層の tenant_id/workspace_id 強制注入の契約テスト)。両方 PASS |
| 3 | 認可単一ミドルウェア適合 (B1/SEC2, ADR §8) | **部分 PASS (静的検査のみ)** | `rest-zod-authz-mw.test.ts` は `route.ts` を `readFileSync` で読み込み文字列/正規表現で feature 固有 authz 分岐が無いことを検査する静的検査であり、実際に HTTP リクエストを `route.ts` ハンドラへ通す実行テストではない。coverage 実測が下記 §3 の通り `app/api/v1/feedback/` 0% であることがこれを裏付ける |
| 4 | AI キュー lease 失効/attempt 上限 (§5.5) | **未実施 (実装はあるが実行テスト無し)** | `packages/db/repository/feedback-loop-queue.ts` は lease 失効時の `queued` 復帰 (`claimable = status='queued' OR (status='processing' AND leaseExpiresAt<=now)`) と `attempt>=maxAttempts` での `dead` 遷移を実装済みだが、`packages/db/__tests__/` に `feedback-loop-queue.ts` を対象とした実行テストが存在しない (`hearing-intake.test.ts` は同型ロジックの `hearing-intake-queue.ts` 向けで feedback 側をカバーしない)。apps/hub 側の `ai-pull-queue-provider-admin-device-flow.test.ts` も静的検査のみ |
| 5 | 監査 event 記録漏れ (`feedback.status_change`) | **部分 PASS (実コード確認済み・自動実行テストは純粋関数のみ)** | P07 受入検証で `apps/hub/src/app/api/v1/feedback/[id]/route.ts` の PATCH ハンドラが成功時のみ `audit.record({action:'feedback.status_change',...})` を呼ぶ実コードを直接確認済み。`status-transition-workspace-admin-audit.test.ts` は `isValidFeedbackStatusTransition` の状態遷移規則 (隣接遷移のみ許可) を純粋関数として検証するのみで、PATCH ハンドラを実行して `audit.record` 呼び出しを直接アサートする自動テストは存在しない |

## 3. Coverage 実測 (`pnpm --filter hub test -- --coverage`)

| 対象 | line coverage | 備考 |
|---|---|---|
| `app/(dashboard)/feedback/*` (S14 UI) | 0% | テストから import/render されていない |
| `app/api/v1/feedback/*` (route ハンドラ) | 0% | 静的検査のみで実行 import が無い |
| `features/feedback-loop/*` (service/notification) | 4.68% | `service.ts` の `resolveFeedbackNotificationChannels` のみ純粋関数として直接呼ばれている |
| apps/hub 全体 (global threshold: 80%) | **72.54%** | **CI 必須ゲート未達 (閾値 80% に対し 72.54%)**。feedback-loop 領域の未実行コードが主要因 |

## 4. lint / validate-system-plan

- `pnpm --filter hub lint`: PASS (299 files clean)
- `validate-system-plan.py --feature-package feature-package/feat-feedback-loop`: `status: pass`, `violations: []` (この検証は package registration/digest 整合のみを見るため、上記 coverage 未達を検出しない)

## 5. 総合判定と rollback 推奨

**5種中 2種未達・2種部分未達**。特に coverage グローバル閾値 (80%) の実未達 (72.54%) は CI 必須ゲートの直接的な赤である。

根本原因は P04 (テスト設計) 時点で `route.ts` ハンドラが未実装だったため「ソース静的検査」で代替した契約テストが、P05 実装完了後・P06 テスト実行後も実行テストへ格上げされなかったことにある (各テストファイル冒頭のコメントに "ルートハンドラが存在しないため P05 実装後の受入契約とする" と明記されている残置コメントが根拠)。P06 の 50/50 PASS は静的検査レベルでの合格であり、実行カバレッジの欠落を検出できていなかった。

published task spec の rollback 節「未達の品質ゲートがある場合、quality-assurance-report.md に未達理由を記録し、原因が実装にある場合は sys-feedback-loop-p05 を再実行対象として dev-graph へ差し戻す」に従い、**本 task は P05 (実装) への差し戻しを推奨する**。P09 自身はスコープ外のため新規テスト追加は行わない。

## 6. Normative closure evidence 対応表 (P10/P11 引き継ぎ用)

| Evidence 項目 | 状態 |
|---|---|
| priority 値域/round-trip | PASS (test-run-report.md §3 で確認済み、構造的・間接的担保) |
| workspace-admin 自 tenant pull | 部分 PASS (静的検査のみ、実行テスト無し。本報告 §2-4 に対応) |
| provider-admin cross-tenant pull+audit | 部分 PASS (同上) |
| 他 tenant 拒否 | PASS (test-run-report.md §3、実 DB 検証済み) |
| migration | PASS (refactoring-migration-note.md、P08 で完了) |
| P10/P11 証跡対応表 | 本表が P10/P11 の引き継ぎ入力となる |

## 7. P05 差し戻し後の再検証 (追記)

§5 の rollback 推奨に従い `sys-feedback-loop-p05` を再オープンし、以下の実行テストを追加した。

- `apps/hub/tests/feedback-loop/a11y-screens.test.tsx`: S14 (feedback 一覧/詳細/新規フォーム) 3画面の axe 実行テストを追加
- `apps/hub/src/__tests__/feedback-loop/route-handler-execution.test.ts`: PATCH 状態遷移 + `audit.record` 呼び出しの実行検証を追加
- `packages/db/__tests__/feedback-loop-queue.test.ts`: AI キュー `claimNextFeedbackResponseJob` の lease 失効復帰・`failFeedbackResponseJob` の attempt 上限到達を実 DB で検証 (6 テスト新規)
- `apps/hub/src/__tests__/feedback-loop/runtime-notification-adapter.test.ts` / `screen-interactions.test.tsx`: 通知経路・画面操作の実行テストを追加

再検証は実装 Agent の自己申告を鵜呑みにせず、以下を独立に再実行して確認した。

| 検証項目 | 結果 |
|---|---|
| `apps/hub` vitest --coverage | Test Files 100 passed, Tests 1177 passed \| 1 skipped, **lines/statements 81.28%** (閾値80%達成), branches 86.27%, functions 86.41% |
| `packages/db` vitest | Test Files 33 passed, Tests 264 passed |
| `pnpm --filter hub lint` | Checked 304 files, No fixes applied |
| `pnpm --workspace-root exec biome check packages/db` | Checked 105 files, No fixes applied |
| `pnpm --filter @harness-hub/db exec tsc --noEmit` | エラー 0 |
| `pnpm --filter hub exec tsc --noEmit` | エラー 0 |

git diff で確認した `ai-jobs/[id]/complete/route.ts` 等の既存ファイル差分は、`feedback_response` 種別ジョブを共有 `ai_jobs` テーブル/ルートへ統合する元々の P05 実装 (acceptance-report.md 受入項目2 に対応) であり、今回の差し戻し作業とは独立した既存差分であることを確認した。

**5種中 5種すべて PASS。coverage 閾値 (80%) 達成 (81.28%)。§5 の未達理由は解消された。**
