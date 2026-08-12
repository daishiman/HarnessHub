---
status: confirmed
layer: feature-architecture
task: SYS-DOCS-CMS-P02
parent_feature: feat-docs-cms
feature_package_id: feature-package/feat-docs-cms
source: docs/features/feat-docs-cms/requirements-baseline.md
feature_context_digest: sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend]
---

# feat-docs-cms アーキテクチャ設計 (P02)

> **位置づけ**: P02 (アーキテクチャ設計) の成果物。[requirements-baseline.md](requirements-baseline.md) の purpose/goal/scope/acceptance/quality_constraints を満たす設計を確定し、P03 独立レビューと P05 実装の入力とする。実装コードはここでは作成しない (task spec スコープ外)。

## 0. 既存パターンとの整合方針

本機能は既存の `hearing-intake` feature (S10/S11/S12 の一覧/閲覧/生成/AI キュー) と同型のスタックを踏襲する。新規パターンを発明せず、以下を再利用する。

- 認可単一ミドルウェア: `apps/hub/src/lib/authz/{rules.ts,decide.ts,with-authz.ts}` の `ACTION_RULES` 表引き。**`docs.read` / `docs.write_tenant` / `docs.write_common` は既に定義済み** (rules.ts:70-72)。本設計はこの3 action をそのまま使う。
- zod スキーマ単一ソース: `packages/schemas/docs-cms/{contracts.ts,index.ts}` を新設し、`packages/schemas/src/index.ts` から re-export する (`hearing-intake/` と同型)。
- AiJob 共通キュー: `packages/db/schema/hearing-intake/schema.ts` の `aiJobs` テーブルを流用する (新規テーブルを作らない)。**`AI_JOB_KINDS` に `doc_draft` が既に登録済み**。
- 監査: `packages/db/repository/audit.ts` の `AuditRepo.append()` を消費するのみ (新規 repository を作らない)。
- Markdown: `packages/ui` の `MarkdownView`/`MarkdownEditor` (rehype-sanitize) を消費するのみ (独自 sanitize 実装をしない)。

## 1. Doc エンティティ — カラム一覧

新規テーブル: `packages/db/schema/docs-cms/schema.ts` の `documents`。

| column | type | null許容 | 説明 |
|---|---|---|---|
| `id` | text (ULID) | NOT NULL, PK | |
| `tenant_id` | text | NOT NULL | D4 必須列。作成者の所属 tenant。**`scope='common'` の可視性はこの列ではなく repository 層の `OR scope='common'` 条件で担保する** (§3 参照)。 |
| `scope` | text enum(`common`,`tenant`) | NOT NULL | B7/qa-024 の確定スコープ値 |
| `title` | text (1–200) | NOT NULL | |
| `body_markdown` | text (≤200,000) | NOT NULL | sanitize は描画側 (`MarkdownView`) の責務。DB には生 Markdown を保存する (既存 `hearingSheets.formJson` と同じく「保存は生、描画時に共通レンダラで sanitize」方針) |
| `status` | text enum(`draft`,`published`) | NOT NULL default `draft` | AI 下書き生成直後は `draft`。`scheduled` は保存値に追加せず、`draft` + 未来の `publish_at` から導出する |
| `publish_at` | integer (epoch ms) | NULL | 予約公開日時。additive（純増）列。NULL は予約なし。future のみ API で受理する |
| `category` / `tags` | text / JSON text | NULL | 分類と最大 20 件のタグ。一覧は category 完全一致、tag は JSON 配列要素の完全一致で絞る |
| `thumbnail_url` / `thumbnail_source` | text / enum(`auto`,`manual`) | NULL / NOT NULL | 認証済み内部画像 path または安全な http(s) URL。手動値は本文更新で上書きしない |
| `excerpt` / `excerpt_source` | text / enum(`auto`,`manual`) | NULL / NOT NULL | 一覧要約。手動値は本文更新で上書きしない |
| `asset_summary` | JSON text | NULL | `imageCount/hasTable/hasCode` を本文から常にサーバ算出する |
| `external_source` / `external_document_id` | text | NULL | tenant + 外部自然キー。両方を持つ外部同期文書だけ一意 index の対象になる |
| `external_content_hash` / `external_revision` | text / integer | NULL | 同期済み内容 hash と ETag/CAS の単調増加 revision。Hub 側実変更後は hash を NULL にして `modified` を表す |
| `created_by` / `updated_by` | text (user id) | NOT NULL | |
| `created_at` / `updated_at` | integer (epoch ms) | NOT NULL | |

Index: `documents_tenant_scope_updated_idx (tenant_id, scope, updated_at)`, `documents_scope_updated_idx (scope, updated_at)`（scope 絞り込みと更新日時参照用）。一覧のページング順序は ULID の `id DESC` とし、`cursor` は最後に返した `id` を使う。編集で `updated_at` が変わってもページ送りの重複・欠落を起こさないためである。

**`workspace_id` 列を持たない**理由: 本 feature の scope 粒度は tenant/common の2値であり workspace 粒度を要求しない (requirements-baseline §3.1)。doc の可視性は tenant/common の2値だけで決まり workspace はスコープ軸に含まれない、という要件そのものが根拠であり、D4 の「全新規テーブルへ tenant_id/workspace_id 必須」は「該当する粒度の列を持つ」の意と解釈する。(P03 レビュー指摘: 当初 `tenantCoefficients` を先例として挙げていたが、同テーブルは tenant あたり1行のシングルトン設定テーブルであり、`documents` のような複数行コンテンツエンティティとは性質が異なるため先例として不適切だった。結論 [workspace_id 省略] は requirements-baseline §3.1 で直接正当化されるため変更しない。`packages/db/scripts/check-tenant-isolation-coverage.ts` は `tenant_id` 列の有無のみを機械検査し `workspace_id` の要否は検査しない。)

## 2. S15 画面構成表

| 画面 | path | 権限 | 内容 |
|---|---|---|---|
| 一覧 | `apps/hub/src/app/(dashboard)/docs/page.tsx` | member (閲覧) | tenant scope doc (自 tenant) + common scope doc の一覧。scope/status/category/tag/title を絞り込み、thumbnail/category/tags/excerpt/assets/source/予約日時をタイトル列へ要約表示。wide/middle は表、narrow は card collection |
| 閲覧 | `apps/hub/src/app/(dashboard)/docs/[id]/page.tsx` | member (閲覧) | `MarkdownView` で sanitize 済み本文を描画。lg 以上は追従目次、狭幅は折りたたみ目次。scope='tenant' は他 tenant からアクセス不可 (404) |
| 編集 | `apps/hub/src/app/(dashboard)/docs/[id]/edit/page.tsx` | admin のみ (tenant scope→workspace-admin, common scope→provider-admin) | title/status/category/tags/thumbnail/excerpt/publish_at + image upload 対応 `MarkdownEditor`。保存済み本文との比較を併設 |
| 新規作成 | `apps/hub/src/app/(dashboard)/docs/new/page.tsx` | admin のみ | scope 選択 + `MarkdownEditor`。最初の画像貼付時は暗黙 draft を一度だけ作り、保存後の本文に未参照の pending 画像を残さない |

UI 側の admin 判定は表示制御のみ (ボタンの出し分け)。実際の許可判定は必ず B7 API 側の認可単一ミドルウェアで行う (UI 側の非表示は防御の多層化であって認可の代替ではない)。

## 3. B7 API 契約

zod スキーマ: `packages/schemas/docs-cms/contracts.ts`。命名は既存 `hearing-intake/contracts.ts` に倣う (`documentScopeSchema`, `documentStatusSchema`, `documentDetailSchema`, `createDocumentRequestSchema`, `updateDocumentRequestSchema`, `documentListItemSchema`, `documentListQuerySchema`, `documentListResponseSchema` 等、すべて `.strict()`)。

### 3.1 エンドポイントと action

| method/path | action (base gate) | 追加判定 | 備考 |
|---|---|---|---|
| `GET /api/v1/docs` | `docs.read` (member) | なし | repository 層で `WHERE scope='common' OR (scope='tenant' AND tenant_id=:ctx)` |
| `GET /api/v1/docs/:id` | `docs.read` (member) | `resource.tenantId` は常に **header 申告値** (`requestScopedResource` の既定動作。doc の実 tenant_id へ差し替えない) を使う。repository 層の lookup を `WHERE id=:id AND (scope='common' OR tenant_id=:ctxTenantId)` とし、条件に合わない場合は `resolveResource` が `null` を返す (→400) のではなく、handler 側で「見つからない」扱いの 404 を返す (`ai-jobs/complete` の `findJob` が null なら owner 不明として扱う既存パターンと同型) | tenant-scope doc への越境は repository lookup の時点で「該当行なし」として弾かれるため 404 になる。common doc は `OR scope='common'` で無条件にヒットする。**`resource.tenantId` を書き換えないため `decide()` の `tenant_mismatch` 判定・`provider.cross_tenant_access` 監査発火条件のどちらにも影響を与えない** (P03 レビュー指摘への対応。既存コードの「`resource.tenantId` に principal 側の値を写さない」不変条件を維持する) |
| `POST /api/v1/docs` | `docs.write_tenant` (workspace-admin, 最低ゲート) | body の `scope==='common'` の場合、handler 内で `authz.can('docs.write_common')` を追加チェックし、false なら `AuthzError('insufficient_role', 403)` を投げる (`with-authz.ts` の `AuthzContext.can` — 「同じ principal/resource に対する追加 capability の照会」という設計意図の範囲内の用法) | |
| `PATCH /api/v1/docs/:id` | `docs.write_tenant` (workspace-admin, 最低ゲート) | resolveResource は `resource.tenantId` を header 申告値のまま解決する (上記 GET と同じ不変条件)。対象 doc を repository で先読みし `scope==='common'` なら `authz.can('docs.write_common')` を追加チェック | 監査 event 記録 (§5) |
| `POST /api/v1/docs/:id/draft` | `docs.write_tenant` (workspace-admin, 最低ゲート) | 同上 (`scope==='common'` は `docs.write_common` 追加チェック) | `ai_jobs` へ `kind=doc_draft` で enqueue するのみ。結果反映は共通 pull/complete 経路 (§4) |
| `POST /api/v1/docs/:id/images` | `docs.write_tenant` | common は `docs.write_common` 追加チェック | 許可 MIME + magic bytes + size 上限を検証し R2 へ保存。raw R2 URL は返さない |
| `GET /api/v1/docs/:id/images/:imageId` | `docs.read` | document/tenant 境界 | session 必須の同一 origin 画像を `private, no-store` / `nosniff` で中継 |
| `DELETE /api/v1/docs/:id/images/:imageId` | `docs.write_tenant` | common は `docs.write_common` 追加チェック | pending/orphan 画像の明示回収 |
| `GET/PUT /api/v1/docs/imports/:source/:externalId` | `docs.external_sync` + Bearer `docs:write` | 自 tenant の tenant doc だけ | 自然キー upsert、ETag/If-Match/revision CAS。common・画像転送・自動公開は scope 外 |

**設計決定 (P03 レビュー対応)**: 当初案は `scope==='common'` のとき `resource.tenantId` を doc の実 tenant_id から `ctx.tenantId` へ差し替える設計だったが、これは `with-authz.ts`/`resource.ts` が明示的に禁止する「`resource.tenantId` に principal 側の値を写す」パターンに該当し、provider-admin が他 tenant 作成の common doc へアクセスした際に `provider.cross_tenant_access` 監査が恒常的に発火しなくなる副作用があった (P03 独立レビューで指摘)。上記の「`resource.tenantId` は常に header 申告値のまま、common 可視性は repository 層の `OR` 条件だけで担保する」設計に変更し、この問題を構造的に解消した。

### 3.2 role×操作許可表 (確定済み rules.ts を正とする)

| role | docs.read | docs.write_tenant | docs.write_common |
|---|---|---|---|
| member | ✅ | ❌ | ❌ |
| owner | ✅ | ❌ | ❌ |
| workspace-admin | ✅ | ✅ (自 tenant の tenant-scope doc のみ) | ❌ |
| provider-admin | ✅ (全 tenant 横断) | ✅ | ✅ |

## 4. AI 下書きキュー (doc kind) 契約

### 4.1 payload/result スキーマ (`packages/schemas/docs-cms/contracts.ts`)

```
docDraftPayloadSchema: { document_id: string|null, scope: 'common'|'tenant', title: string, instructions: string (≤2000, optional) }
docDraftResultSchema: { body_markdown: string (≤200000) }
```

`document_id=null` は新規ドキュメントの下書き (POST /api/v1/docs で `status='draft'` の空 doc を先に作成してから `id` を確定させ、`document_id` を必ず埋めてから enqueue する。pull 型キューの `ref_type='document'`/`ref_id=<document.id>` に一致させ、書戻し時に対象を一意に特定できるようにするため)。

### 4.2 共通 pull/complete 経路の拡張 (AiJob 共通層汎化)

現状 `apps/hub/src/app/api/v1/ai-jobs/{pull,[id]/complete,[id]/fail}/route.ts` は `hearingIntakeRuntime()` と `sheet_generation` 固定のスキーマ (`pullSheetGenerationJobRequestSchema` が `kind: z.literal('sheet_generation')` 固定) にハードコードされている。**これを複製せず**、以下のように汎化する。

- pull request の `kind` を `z.enum(AI_JOB_KINDS)` (任意指定、省略時は runtime 側の全 kind を対象) に拡張する新スキーマ `pullAiJobRequestSchema` を `packages/schemas/docs-cms/contracts.ts` ではなく共有先 (`packages/schemas/hearing-intake/contracts.ts` が事実上の共通層になっているため、まずそこに `pullAiJobRequestSchema` として追加し、feature 名に依存しない場所への切り出しは本 task のスコープ外とする — 下記「未解決論点」参照)
- repository 側は `claimNextSheetGenerationJob` を `claimNextJob(context, kind?: AiJobKind)` へ一般化し、既存呼び出しは `claimNextJob(context, 'sheet_generation')` の薄いラッパーとして後方互換を保つ
- route handler (`pull/route.ts`, `[id]/complete/route.ts`) は `job.kind` に応じて adapter を分岐する:
  - `sheet_generation` → 既存 `features/hearing-intake/ai-job-adapter`
  - `doc_draft` → 新設 `apps/hub/src/features/docs-cms/ai-job-adapter/index.ts` (`buildDocDraftPayload`, `toPulledDocDraftJob`, `serializeDocDraftResult`)
- complete 時、`doc_draft` の場合は `documents` テーブルへ `body_markdown` を書き戻し `status` は `draft` のまま維持し、`publish_at` を NULL にする。外部同期文書なら `external_content_hash=NULL` と revision 増加も同じ CAS 書込みへ含める

### 4.3 認可

- pull: `aijob.pull` (workspace-admin, `aijob:process` scope, Device Flow token 必須) — 既存規則をそのまま流用 (kind を問わない共通ゲート)
- complete/fail: `aijob.complete`/`aijob.fail` (member, selfOnly=claim 者本人) — 既存規則をそのまま流用
- job payload に secret を含めない (SEC8): `docDraftPayloadSchema` に token/secret 系フィールドを持たせない (上記スキーマ定義で担保)

### 4.4 未解決論点 (P02 で確定せず、明記のみ)

- **AiJob adapter 登録の一般化**: 現在は route handler 内で `kind` を直接 switch する 2 分岐 (`sheet_generation`/`doc_draft`) で足りるが、3 kind 目が追加された場合に同じ if/switch 分岐を機械的に増やす設計は拡張性が低い。adapter registry (`Record<AiJobKind, Adapter>`) パターンへの一般化は本 feature のスコープ外とし、次の consumer 追加時に再検討する
- **`pullAiJobRequestSchema` の置き場所**: 暫定的に `packages/schemas/hearing-intake/contracts.ts` に置くが、feature 名を冠したパッケージに他 feature (docs-cms) が依存する非対称性が残る。共通層パッケージ (`packages/schemas/ai-jobs/` 相当) への切り出しは本 task のスコープ外の up-stream 論点として明記する (goal-spec scope_out の「AiJob キュー共通層自体の一般化」に該当)

## 5. doc 編集監査 event (SEC6) 契約

`packages/db/repository/audit.ts` の `AuditRepo.append()` を消費する (新規テーブル・repository を作らない)。

| action | resourceType | 発火点 | summary (値そのものを含めない) |
|---|---|---|---|
| `docs.create` | `document` | `POST /api/v1/docs` 成功時 | `{ scope, title_length }` |
| `docs.update` | `document` | `PATCH /api/v1/docs/:id` 成功時 (AI 下書き結果の書戻しによる更新は `ai_job.complete` 監査で代替し、二重記録しない) | `{ scope, fields_changed: string[] }` |
| `docs.external_sync` | `document` | 外部同期 PUT が created/updated/unchanged を確定した時 | `{ source, external_document_id, revision, outcome }`（本文なし） |
| `docs.image.upload` / `docs.image.delete` | `document` | 内部画像の保存/回収成功時 | `{ image_id, credential }`（画像本体なし） |
| `docs.scheduled_publish` | `document` | cron が期限到来 draft を公開し、repository が返した文書ごと | `{ credential: 'system', run_key }`（本文なし） |

`ai-jobs/[id]/complete/route.ts` は既に `ai_job.complete` action で監査記録済み (`ref_type='document'` が乗るだけ) のため、doc_draft 結果の書戻し自体に追加の監査 action は不要 — 既存の汎用 job 完了監査で SEC6 の「AI 下書き生成」トレーサビリティを満たす。人間による確定編集 (`PATCH`) だけを `docs.update` として区別する。

## 6. tenant 分離の強制点

- repository 層: `documents` の read query は必ず `or(eq(documents.scope, 'common'), eq(documents.tenantId, context.tenantId))` の形で書き、`scope='tenant'` 側は暗黙に `tenant_id=context.tenantId` の一致が無ければヒットしない (query builder に tenant filter を素通りさせない — `packages/db/repository/docs-cms.ts` に repository を1本化し、feature 側から直接 drizzle query を書かせない)
- authz 層: `resource.tenantId` は常に header 申告値のまま解決し (doc の実 tenant_id へ差し替えない)、tenant-scope doc への越境は repository lookup が該当行なしを返すことで自然に 404 になる (§3.1 参照。`decide()` の `tenant_mismatch` 判定・`provider.cross_tenant_access` 監査には影響しない)
- `packages/db/scripts/check-tenant-isolation-coverage.ts` の対象に `documents` テーブルを含める (P05 で `tenant_id` 列の存在が拾われるため追加の宣言は不要)

## 7. Markdown sanitize (SEC7) の消費点

- 保存: `body_markdown` は生 Markdown のまま DB へ保存する
- 描画: 一覧は sanitize 済み excerpt だけを持ち、詳細/編集画面は `packages/ui` の `MarkdownView` (rehype-sanitize, `dangerouslySetInnerHTML` 不使用) を使用する。`pre`/inline `code`/`blockquote` の装飾は `[data-hh-markdown]` scope の token CSS に限定し、他画面の素の要素へ広げない
- editor: `MarkdownEditor` (write/preview タブ) をそのまま使用し、独自 textarea 実装を作らない

## 8. Rollout / Rollback

### 8.1 予約公開の状態・clear 契約

`scheduled` は永続化しない。表示状態は次の順で導出する。

| 保存値 | 派生表示 |
|---|---|
| `status='published'` | 公開 |
| `status='draft' AND publish_at > now` | 予約中 |
| `status='draft'` かつ上記以外 | 非公開 |

`publish_at` の非 NULL 入力は future epoch ms だけを受理し、現在以前・不正形式・`status='published'`との
同時指定は 422 problem+json。future指定時は`draft`へ導出する。次の操作は未レビュー内容を古い予約で
公開しないため `publish_at=NULL` を同じ write に含める。

- 手動の`status`指定（同値再送を含む）
- 保存済み値と異なるタイトル/本文への変更（同値再送は除く）。ただし同じrequestで新しいfuture `publish_at`
  を明示した場合はその予約を採用して`draft`にする
- AI 下書きの本文書戻し
- CLI の明示 `--force true` による外部版の反映
- cron の期限到来公開

分類・タグ・サムネイル・要約だけの変更と外部同期の `unchanged` は予約を保持する。予約 repository
`publishDueDocuments(now, limit?)` は`limit` default/max=100、`publish_at ASC, id ASC`の安定順で
`limit+1`候補を読み、各行CASで処理する。返却は
`{publishedCount,hasMore,publishedDocuments:[{id,tenantId}]}`。
repository は処理済み各文書の status・publish_at・updated fields・外部 revision を同一transactionで更新し、
Hubは返却文書ごとにactor=`system` / action=`docs.scheduled_publish`を既存監査へ順次記録する。監査追記は
DB更新と同一transactionではないため、失敗時は`docs_scheduled_publish_audit_failed`を構造化ログへ残して
ジョブを失敗扱いにし、件数ログだけで完全成功と誤認しない。
日次相乗りの追加遅延は通常24時間未満だが、失敗/backlog時のSLAではない。

### 8.2 Rollout / Rollback

- Rollout: migration の固定ファイル名や件数を手順へ埋め込まず、current Drizzle journal（2026-08-12
  統合時点の最新 ordinal は `0014`）の dry-run が示す pending を DB 先行で適用し、再 dry-run の
  `pending=0` を確認してから Worker を配備する。
- Rollback: additive 列/index や R2 object を逆 migration で削除せず、Hub Worker を直前版へ戻して
  新規 Docs 操作を止める。予約行、外部 revision、監査 event、未完了 AI job は原因調査・再試行のため保持する。

## 9. 参照情報

- Requirements: [requirements-baseline.md](requirements-baseline.md)
- System spec: `system-spec/database.md` (qa-024), `system-spec/security.md` (qa-025 SEC2/SEC6/SEC7/SEC8), `system-spec/backend.md` (qa-023 B1/B7), `system-spec/ui-ux.md` (qa-021 S15), `system-spec/frontend.md` (qa-022)
- 既存実装参照: `apps/hub/src/lib/authz/rules.ts`, `apps/hub/src/app/api/v1/sheets/`, `packages/db/schema/hearing-intake/schema.ts`, `apps/hub/src/app/api/v1/ai-jobs/`, `packages/db/repository/audit.ts`, `packages/ui/src/components/Markdown.tsx`
