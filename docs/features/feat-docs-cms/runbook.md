---
status: ready
layer: feature-operations
task: SYS-DOCS-CMS-P12
feature_package_id: feature-package/feat-docs-cms
---

# ドキュメント CMS 運用runbook

## S13〜S15の日常運用

1. memberは `/docs` で一覧を閲覧し、scope/status/category/tag/title を絞り込める。category は完全一致、
   tag は1件の配列要素完全一致、title検索は本文を対象にしない。
2. `/docs/[id]` でMarkdownを閲覧する。本文は共通 `MarkdownView` が sanitize 済みで描画するため、
   運用者がHTMLを手で除去したりDBのraw Markdownを書き換えたりしない。
3. 編集 (`/docs/[id]/edit`) と新規作成 (`/docs/new`) はworkspace-admin以上に限定される。memberは閲覧のみ。
   Markdown editor は PNG/JPEG/WebP/GIF の画像 upload・drag/drop・paste に対応し、画像は認証必須の
   document-scoped URL で参照する。raw R2 URL を文書へ貼らない。
4. `scope='common'` への書き込みはprovider-adminに限定される。workspace-adminはtenantスコープのみ書ける。
5. AI下書き生成は `/docs/[id]/draft` からjobをenqueueし、Claude Codeセッション側がDevice Flow tokenで
   `/api/v1/ai-jobs/pull` (kind=`doc_draft`) をpullして生成、`/complete`で書き戻す。サーバ側でAI課金は発生しない。
6. category/tags は手動、thumbnail/excerpt は `auto/manual` を持つ。空欄へ戻すと本文からの自動算出へ戻り、
   手動値は本文更新・外部同期で上書きしない。自動 thumbnail は安全な http(s) または認証済み内部画像だけを採用する。
7. `POST /api/v1/docs`・`PATCH /api/v1/docs/:id` は成功時に `docs.create`/`docs.update` 監査eventを記録する。
   AI下書きの書き戻しは既存 `ai_job.complete`、外部同期は `docs.external_sync`、画像は
   `docs.image.upload/delete`、予約公開は文書ごとの `docs.scheduled_publish` で追跡する。
8. 予約中は保存 status ではなく `draft + future publish_at` の派生表示。未来でない日時・不正形式・
   `status=published`との同時指定は422 problem+json。future指定時はdraftへ導出する。
   手動の`status`指定（同値再送を含む）、タイトル・本文の実変更、AI 書戻し、force sync、cron 公開は予約を clear する。
   ただしタイトル/本文変更と同じrequestで新しいfuture `publish_at`を明示すれば、その予約を採用してdraft化する。

## Claude Code / Codex からの Markdown 同期

外部作成環境からの反映は、ブラウザ Cookie や固定 API key ではなく Device Flow の短命 token と
`docs:write` scope を使う。同期先は token と同一 tenant の `draft` 文書だけで、common 化や公開は
Harness Hub の画面から人が確認して行う。

```bash
node /absolute/path/to/HarnessHub/apps/publisher/bin/harness-publisher.mjs docs \
  --file "$PWD/docs/example.md" \
  --root "$PWD" \
  --repository-id owner/repository \
  --hub-url https://hub.example.com \
  --tenant-slug example \
  --origin https://hub.example.com
```

HarnessHub checkoutでは先にrootで `pnpm install --frozen-lockfile` を実行する。インストール済みPublisher
からは、同じoptionを `harness-publisher docs ...` に渡してよい。Claude CodeのMarketplace plugin command
`/harness-hub-publisher:docs-sync`（plugin直接読込時は`/docs-sync`）はSkill `run-docs-sync`のscriptを介して
このCLIを薄く呼び出す。外部repositoryでPATHにCLIが
無い場合は、`HARNESS_HUB_PUBLISHER_BIN` に上記binの絶対pathを設定する。CodexやCI内の生成処理も
同じCLI/APIを利用し、別の認証・保存ロジックを再実装しない。

- 初回は Device Flow の認可 URL が表示される。workspace-admin で認可する。
- 文書の同期キーは `tenant + source + SHA-256(repository-id + 相対path)`。絶対 path や利用者名は送信しない。
- 同じ内容を再送すると既存文書を再利用し、`outcome=unchanged` になる。
- Hub 画面で同期文書のタイトル・本文・公開状態を実変更すると `sync_state=modified` になる。CLI は上書きを止めるため、内容を確認して
  外部版を正本に戻す場合だけ `--force true` を付ける。公開済み文書へforce同期すると、内容を差し替えて
  確認用のdraftへ戻し、既存の公開予約もclearするため、再公開前に必ず画面で確認する。
- API を直接使う場合は `GET /api/v1/docs/imports/:source/:externalId` の ETag を、更新 PUT の
  `If-Match` にそのまま渡す。欠落は 428、古い ETag は 412。最終書込みもrevision CASで競合を拒否する。
  初回作成時は `If-Match` 不要。
- v1 は Markdown 本文とタイトルだけ。画像、common 文書、自動公開は同期しない。
- category/tags と `manual` thumbnail/excerpt は Hub 管理値として保持する。`auto` thumbnail/excerpt と
  asset summary は同期本文から再算出する。外部repository相対画像や危険なschemeをauto thumbnailへ昇格しない。

同期成功は `docs.external_sync` 監査eventで追跡する。本文は監査 metadata に保存せず、source・外部ID・
revision・結果だけを記録する。

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

Worker配備前に、`documents` 基盤以降の **current Drizzle journal が pending と判定した全 migration** を
DBへ適用する。2026-08-12統合時点では最新ordinalは`0014`だが、手順を固定番号や件数へ依存させない。
分類・カード列、外部同期列/index、`publish_at` のどれかを欠いたDBへ新Workerを先行配備してはいけない。

```bash
pnpm --filter @harness-hub/db run migrate:deploy --url "$TURSO_DATABASE_URL" --dry-run
pnpm --filter @harness-hub/db run migrate:deploy --url "$TURSO_DATABASE_URL"
pnpm --filter @harness-hub/db run migrate:deploy --url "$TURSO_DATABASE_URL" --dry-run
```

1回目のdry-runでjournal末尾と適用予定を確認し、適用実行後の`appliedAfter`が同じ末尾へ到達したことを確認する。
続けて2回目のdry-runを行い、その出力で`pending=0`を確認してからWorkerを配備する。失敗時は
Workerを配備せず、DB backupを保持したままmigrationの原因を修正する。既にWorkerを配備していた場合は
新規Docsアクセスを止めて直前のWorker versionへ戻す。列削除によるrollbackは行わない。反映後はテストtenantで
作成→画像貼付→閲覧→分類/要約編集→未来日時予約→手動clear→外部同期→競合停止→明示force→AI下書き要求
→pull→complete→予約clear→編集画面反映までをsmokeする。予約cronは default/max 100、
`publish_at ASC, id ASC`、各行CAS、`{publishedCount,hasMore,publishedDocuments}`、actor=`system`の文書監査、
revisionの整合をfixtureで確認し、実日次runでは構造化ログとheartbeatを確認する。
監査はDB公開後に文書ごとに逐次追記されるため、`docs_scheduled_publish_audit_failed`が出たrunはジョブ失敗として
扱い、既に公開済み・監査未記録の文書を`publishedDocuments`と監査eventで突合する。dispatcherは後続jobを継続する。
未完了jobは削除せず、原因修正後にlease再取得または再度draft要求する。
