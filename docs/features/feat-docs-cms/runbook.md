---
status: ready
layer: feature-operations
task: SYS-DOCS-CMS-P12
feature_package_id: feature-package/feat-docs-cms
---

# ドキュメント CMS 運用runbook

## S13〜S15の日常運用

1. memberは `/docs` で一覧を閲覧し、common (全テナント共有) / tenant (自テナント限定) の絞り込みができる。
2. `/docs/[id]` でMarkdownを閲覧する。本文は共通 `MarkdownView` が sanitize 済みで描画するため、
   運用者がHTMLを手で除去したりDBのraw Markdownを書き換えたりしない。
3. 編集 (`/docs/[id]/edit`) と新規作成 (`/docs/new`) はworkspace-admin以上に限定される。memberは閲覧のみ。
4. `scope='common'` への書き込みはprovider-adminに限定される。workspace-adminはtenantスコープのみ書ける。
5. AI下書き生成は `/docs/[id]/draft` からjobをenqueueし、Claude Codeセッション側がDevice Flow tokenで
   `/api/v1/ai-jobs/pull` (kind=`doc_draft`) をpullして生成、`/complete`で書き戻す。サーバ側でAI課金は発生しない。
6. `POST /api/v1/docs`・`PATCH /api/v1/docs/:id` は成功時に `docs.create`/`docs.update` 監査eventを記録する。
   AI下書きの書き戻しは既存 `ai_job.complete` 監査で追跡され、doc側で二重記録しない。

## AIキュー滞留監視 (doc_draft kind)

`ai_jobs` テーブルはkindを問わず1テーブル共有 (kind-dispatch)。`doc_draft` を対象に絞って監視する。

```sql
SELECT tenant_id, workspace_id, status, COUNT(*) AS jobs, MIN(created_at) AS oldest_created_at
FROM ai_jobs
WHERE kind = 'doc_draft'
  AND status IN ('queued', 'processing', 'dead')
GROUP BY tenant_id, workspace_id, status;
```

- warning: 最古の`queued`が15分超。
- critical: 60分超、lease期限超過の`processing`が繰り返す、または`dead`が増加。
- 正常化の確認: workerがpullし、`queued → processing → completed`へ遷移し、
  対象documentのbody_markdownが下書き結果で更新される。

### アラート対応

1. 対象tenant、job id、`attempt`、`lease_expires_at`、`error`を記録する。
2. worker tokenが有効で `aijob:process` scopeを持つか確認する (doc_draft専用のscope/actionは存在しない。
   `sheet_generation`と同じ既存 `aijob.pull`/`aijob.complete`/`aijob.fail` ゲートを再利用している)。
3. pull時のtenant/workspace headerとworker稼働を確認する。
4. lease切れjobは次のpullで再claimされることを確認する。DBを手で`completed`へ変更しない。
5. 3回失敗して`dead`ならdocumentの下書き反映は行われない。原因修正後、管理者が編集画面から再度draft要求する。
6. 他tenantのjobが見える、別tokenでcompleteできる等があればセキュリティ事象として即時停止する。

## tenant分離の運用上の注意

- `scope='tenant'` のdocumentは、他テナントからのGET/PATCHは404になる (存在自体を明かさない)。
  「見えない」問い合わせを403ではなく404として報告してよい (仕様通り)。
- `scope='common'` のdocumentは全テナントから閲覧可能。common docへの誤った機密情報記載は
  即座に他tenantから閲覧可能になる。作成前にscope選択を必ず確認する。
- repository queryは `scope='common' OR tenant_id=自テナント` のOR条件で一覧・詳細を絞り込む。
  この条件を手動SQLで上書き・迂回しない。

## リリース前後の確認

```bash
pnpm --filter hub test
pnpm --filter @harness-hub/db run check:ddl
pnpm --filter @harness-hub/db run check:tenant-isolation-coverage
node apps/hub/scripts/check-single-authz-middleware.mjs
```

本番migration (`0005_common_stepford_cuckoos.sql`、`documents`テーブル新規CREATEのみ) を先にdry-runし、
既存テーブルへの影響が無いことを確認する。反映後はテストtenantで作成→閲覧→編集→AI下書き要求→pull→complete
→編集画面反映までをsmokeする。失敗時は新規docs機能へのアクセスを止め、直前のHub Worker versionへ戻す。
未完了jobは削除せず、原因修正後にlease再取得または再度draft要求する。
