---
status: ready
layer: feature-operations
task: SYS-HEARING-INTAKE-P12
feature_package_id: feature-package/feat-hearing-intake
---

# ヒアリング受付・AI生成キュー運用runbook

## S10〜S12の日常運用

1. memberは `/sheets/new` の8画面ウィザード (FormData 28項目) を入力する。上位の4大工程 (基本情報/業務詳細/要件/確認) は維持し、用途プロファイル・依頼パターン・参考URLを含む。
2. 送信成功時に `HS-xxxx` と「生成中」を確認する。年収は試算だけに使われ保存されない。
3. workerはDevice Flow token (`aijob:process`) で `/api/v1/ai-jobs/pull` を呼ぶ。
4. 生成成功時は `/complete`、失敗時は `/fail` へ同じclaim tokenで書き戻す。
5. S11 `/sheets` で状態を確認し、S12 `/sheets/[id]` でsanitize済みMarkdownを読む。
6. S12 でスクリーンショットを添付できる (PNG/JPEG/WebP)。Claude Code への引き渡しはトークン発行後に表示される指示文を1回だけコピーする。失効は S12 の無効化操作。
7. status変更と再生成はworkspace-admin以上だけが行う。memberへ管理操作を代行させない。

S11/S12は`generating`の間だけ30秒ごとに再取得する。Markdownの安全確認は共通
`MarkdownView` が担うため、運用者がHTMLを手で除去したりDBのraw Markdownを書き換えたりしない。
公開経路 `GET /api/hearing/:token` は session を持たない。無効・期限切れ・失効トークンはすべて同一404にする。

## AIキュー滞留監視 (qa-027)

次の状態をtenant別に監視する。

```sql
SELECT tenant_id, workspace_id, status, COUNT(*) AS jobs, MIN(created_at) AS oldest_created_at
FROM ai_jobs
WHERE kind = 'sheet_generation'
  AND status IN ('queued', 'processing', 'dead')
GROUP BY tenant_id, workspace_id, status;
```

- warning: 最古の`queued`が15分超。
- critical: 60分超、lease期限超過の`processing`が繰り返す、または`dead`が増加。
- 正常化の確認: workerがpullし、`queued → processing → completed`へ遷移し、
  対象sheetが`review`になる。

### アラート対応

1. 対象tenant、job id、`attempt`、`lease_expires_at`、`error`を記録する。
2. worker tokenが有効で `aijob:process` scopeを持つか確認する。
3. pull時のtenant/workspace headerとworker稼働を確認する。
4. lease切れjobは次のpullで再claimされることを確認する。DBを手で`completed`へ変更しない。
5. 3回失敗して`dead`ならsheetは`received`へ戻る。原因修正後、管理者がS12から再生成する。
6. 他tenantのjobが見える、別tokenでcompleteできる等があればセキュリティ事象として即時停止する。

## 受付番号

- `HS-0001`からの連番はtenant別であり、他tenantとの重複は正常。
- 採番・sheet作成・enqueueは1transactionなので、番号だけを手動で先行発行しない。
- `display_code_counters.next_value` を手動で巻き戻さない。重複時は再試行でなく原因調査を行う。
- 10000以降は `HS-10000` のように桁が伸びる。

## リリース前後の確認

```bash
pnpm --filter @harness-hub/hub build:worker
pnpm check:bundle
pnpm check:client-bundle
pnpm --filter @harness-hub/hub exec vitest run tests/hearing-intake
```

本番migrationを先にdry-runし、hearing 系テーブル
(`hearing_sheets` / `ai_jobs` / `display_code_counters` / `tenant_coefficients` /
`hearing_screenshots` / `hearing_share_tokens`) が適用対象であることを確認する。反映後は
テストtenantで提出→pull→complete→S12表示→screenshot添付→handoff token発行までをsmokeする。
失敗時は新規受付を止め、直前のHub Worker versionへ戻す。未完了jobは削除せず、原因修正後に
lease再取得または再生成する。
