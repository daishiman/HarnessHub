---
status: pass
layer: runbook
task: SYS-FEEDBACK-LOOP-P12
parent_feature: feat-feedback-loop
feature_package_id: feature-package/feat-feedback-loop
feature_context_digest: sha256:072f4574b7156af35459d941d9c0655fe9f50453e151420d6e98fcb7da5499c3
depends_on: SYS-FEEDBACK-LOOP-P11
---

# 運用 Runbook — feat-feedback-loop

S14(一覧+フォーム)の日常運用手順、AiJob(`feedback_response`)キューの運用手順、監査運用手順、resolved 通知のトラブルシュート手順をまとめる。実装・テスト担当以外の運用者が参照する前提で記載する。

参照エビデンス: [evidence/index.md](evidence/index.md)。本 runbook の記載は P11 エビデンスと矛盾しない。

## 1. S14 運用手順

- 画面: `apps/hub/src/app/(dashboard)/feedback/`(一覧・詳細・新規フォーム)
- 一覧フィルタ: `type`(improvement/review/bug)・`status`(open/in_progress/resolved) で絞り込み可能
- 新規フォーム: CLI(`claude harness feedback`)経由と Web フォーム経由の両方が同一 `feedbacks` リソースへ正規化される(B6, quality_constraint 1)。運用者が二重登録を疑う場合は `source` 列(harness/manual)で経路を判別する
- 詳細画面: `ai_response`(AI 対応結果)は Markdown を `MarkdownView`(rehype-sanitize allowlist)経由で描画するため、Markdown 内に不審な HTML/script が表示されないことを定期的に目視確認する
- status 変更: workspace-admin が対応中/対応済みへ手動遷移できる。遷移は隣接遷移のみ許可(未対応→対応中→対応済み、逆行不可)

## 2. AI キュー運用手順

- 実装: `packages/db/repository/feedback-loop-queue.ts`
- pull: `POST /api/v1/ai-jobs/pull` (`action=aijob.pull`)。workspace-admin は自 tenant のみ、provider-admin は全 tenant を pull できる(越境時は `provider.cross_tenant_access` を監査記録)
- lease 失効時の挙動: `status='processing'` かつ `leaseExpiresAt<=now` のジョブは自動的に再度 `claimable` になり、他ワーカーが再取得できる(手動復旧操作は不要)
- attempt 上限到達(dead)時の挙動: `attempt >= maxAttempts` で `fail` 経路(`POST /api/v1/ai-jobs/:id/fail`, `action=aijob.fail`)を通ると `status='dead'` に確定する。**`dead` 到達時の自動 admin 通知は実装されていない**(NotificationDispatcher は resolved 通知のみを対象とする)。運用者は以下のクエリで定期的に `dead` job を確認し、手動でフィードバック内容を確認・再登録するか利用者へ状況を伝える:
  ```sql
  SELECT id, ref_id, attempt, max_attempts, error, updated_at
  FROM ai_jobs
  WHERE kind = 'feedback_response' AND status = 'dead'
  ORDER BY updated_at DESC;
  ```
- `dead` 化しても `feedbacks.status` には一切触れない(SEC8-104)。自動で対応中へ退行させない設計のため、運用者が手動で status を確認・更新する

## 3. 監査運用手順

- 対象アクション: `feedback.status_change`(`apps/hub/src/app/api/v1/feedback/[id]/route.ts` PATCH)、`aijob.complete`/`ai_job.complete`(`.../ai-jobs/[id]/complete/route.ts`)、`aijob.fail`/`ai_job.fail`(`.../ai-jobs/[id]/fail/route.ts`)、`aijob.pull`(cross-tenant 時)
- 確認方法: `audit.record` 呼び出しは共通監査ストアへ記録される。特定 feedback の変更履歴を追う場合は `resourceType='ai_job'` または `feedback.status_change` の `resourceId` で該当 `feedback_id`/`job.id` を絞り込む
- provider-admin による越境 pull を確認する場合: `action='aijob.pull'` かつ `metadata.credential` が provider-admin のレコードを対象に、`resourceId`(tenant)が pull 実行者の自 tenant と異なる行を確認する

## 4. resolved 通知トラブルシュート手順

- 経路: `resolveFeedbackNotificationChannels`(`apps/hub/src/features/feedback-loop/service.ts`)が返す通知先へ `NotificationDispatcher.dispatch` を呼ぶ。`in_app` は常に正本として送信され、`email`(Resend 経由)は `user_settings.notify_feedback` が true のときだけ追加される
- Resend メール不達の疑いがある場合: まずアプリ内通知(`in_app`)が届いているか確認する。`in_app` が正本のため、Resend が不達でも情報欠落は発生しない設計になっている(D6, quality_constraint 4)
- Resend 自体の運用手順(APIキー・レート制限等)は `NotificationDispatcher` 共通層(owner=feat-hub-foundation)側の runbook を参照する。本 runbook は消費側(feedback-loop からの呼び出し)の確認手順のみを扱う

## publish 接続ポイント(feat-publish-pipeline との境界)

- AiJob(`feedback_response`)完了時に `builds` 行が `feedback_id` 一意で冪等作成される(`type=bug` は `stage=test`、それ以外は `stage=design` を起点とする)。修正版の実際の publish(既存 `PublishRequest` 状態機械への遷移)は feat-publish-pipeline の管轄であり、本 feature は `builds.publish_request_id` 列を将来の接続用に用意するに留める(ADR §7/§12)
- publish パイプライン自体の運用手順は本 runbook のスコープ外。feat-publish-pipeline 側の runbook を参照する

## 既知の制約・今後の運用改善候補(参考情報)

- dead job の自動 admin 通知は未実装のため、定期的な手動確認(§2 のクエリ)を運用フローへ組み込む必要がある
- S14 の axe アクセシビリティ検証は実行テスト化済み(P05 差し戻しで追加)だが、UI 変更時は `apps/hub/tests/feedback-loop/a11y-screens.test.tsx` の再実行を運用チェックリストに含めることを推奨する
