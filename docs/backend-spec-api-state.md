---
status: confirmed
qa_ref: [qa-031, qa-032, qa-033, qa-048]
layer: implementation-spec
parent_doc: docs/backend-spec.md
sources: [system-spec/backend.md, system-spec/database.md, system-spec/auth.md, system-spec/security.md, system-spec/00-requirements-definition.md, docs/mockups/harness-studio-v2-analysis.md, doc/harness-hub-platform-concept.md]
---

# Harness Hub backend API・状態機械仕様

> **位置づけ**: [backend-spec.md](backend-spec.md) から責務分割した API endpoint 一覧と状態機械の詳細正本。API 共通契約・データモデル・共有 package・batch・非機能要件は親文書を参照する。

## 4. API エンドポイント一覧

### 4.1 認証・Device Flow (qa-008)

| Method Path | 認証 | 概要 |
|---|---|---|
| `GET/POST /api/auth/{tenant_slug}/{action}` | — | Auth.js (`@auth/core`) によるテナント別 OIDC。tenant slug を path で維持し、session cookie は認可 middleware と同じ JWT 署名・検証契約を使う。adapter 境界内 |
| `POST /api/v1/device/code` | なし (rate limit) | device_code + user_code + verification_uri + interval 発行 |
| `POST /api/v1/device/token` | なし (polling) | RFC 8628 準拠。`authorization_pending / slow_down / expired_token` → 承認後 access+refresh 発行 |
| `POST /api/v1/device/approve` | session | ブラウザ側承認 (user_code 入力)。SSO ログイン済み前提 |
| `POST /api/v1/token/refresh` | refresh token | access token 再発行 (rotation) |
| `GET /api/v1/tokens` | session | 自分の Publisher token 一覧 (admin は Workspace 全体) |
| `DELETE /api/v1/tokens/:id` | session | 失効 (本人 or admin)。監査 event |

### 4.2 ユーザー・組織管理 (B10)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/me` / `PATCH /api/v1/me` | member | プロフィール・通知/表示設定 (user_settings) |
| `GET /api/v1/users` | member (簡易) / admin (全列) | member には name/department のみ。**salary は admin のみ** |
| `POST /api/v1/users` | workspace-admin | 事前登録 (role/department/salary)。初回ログインは IdP JIT で idp_subject を紐付け |
| `GET /api/v1/users/:id` | workspace-admin | 個別ダッシュボード用 (削減効果 rollup 込み) |
| `PATCH /api/v1/users/:id` | workspace-admin | role/department/salary/status。監査 event |
| `GET/PATCH /api/v1/tenant/coefficients` | workspace-admin | annual_hours / minutes_per_run / sheet_reduction_rate。監査 event |

### 4.3 ヒアリングシート (B1: form / sheets)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `POST /api/v1/sheets` | member | ウィザード 30 項目提出 → HS コード発行、status=`received`、試算 snapshot 保存、AiJob(`sheet_generation`) 投入、受付通知 |
| `GET /api/v1/sheets` | member | 一覧 (filter: status/department/q, cursor)。member/owner は `applicant_user_id = principal.user_id` の自分のシートだけ、workspace-admin は自テナント全件。item は `id, code, status, title, domain, department, people, hours, applicant{name}, updated_at` を返す |
| `GET /api/v1/sheets/:id` | member | 詳細。自分のシートまたは admin のみ。`form_snapshot, estimate_snapshot, generated_sections{overview, issue, feature_tags, estimated_effect}, applicant, department, created_at, ai_job_status, build_ref, publish_request_ref` を返す。salary 原値は返さない |
| `PATCH /api/v1/sheets/:id` | workspace-admin | status 遷移 (§5.2)。監査 event |
| `POST /api/v1/sheets/:id/regenerate` | workspace-admin | AiJob 再投入 (status→`generating`) |

**FormData 30 項目 (mockup 実測の必須 12 項目 + skill-intake プラグイン由来の用途プロファイル 9 項目 + 任意の情報源/真の課題 2 項目 + 依頼者追加要件由来の要望パターン系 7 項目。ラベル和訳は表示層)**: `taskName, company, applicant, domain, issue, tools, hours, people, salary, features, output, priority, usagePurpose, expertise, role, context, motivation, sharingIntent, constraintTags, shareTarget, informationSources, trueProblem, knowledgeAssets, requestPatterns, integrationTools, integrationToolsOther, automationDescription, existingDataSources, existingDataSourcesOther, referenceUrls`

- 用途プロファイル 9 項目 (`usagePurpose`〜`knowledgeAssets`) は skill-intake プラグイン(`.claude/agents/skill-intake-user-profiler.md` 等)が集める 6 軸プロファイル(熟練度/役割/文脈/制約/動機/共有意図)と 5 軸シート(出力先/情報源/共有相手/真の課題/ナレッジ資産)のうちクリックで完結できる軸を選択式・複数選択で取り込んだもの。未回答を選べない項目を残さないため、`informationSources`/`trueProblem` を除く全軸に `unknown`(不明・わからない)を選択肢として持つ。自由記述は `shareTarget`(共有相手)と `knowledgeAssets`(ナレッジ資産、改行区切り)のみ。
- `informationSources`(情報源、複数)・`trueProblem`(真の課題、自由記述)の 2 項目のみ任意で、未回答は `null`、複数入力の回答済み 0 件は空配列として保存し両者を区別する。
- 要望パターン系 7 項目 (`requestPatterns`〜`referenceUrls`) は「よくある要望パターン」選択・連携先ツール・参考 URL 一覧を保持する。
- `form_snapshot` は request schema から直接派生させず、現行 `schemaVersion=3` の永続化契約へ変換して保存する。読取時は version 3 に加え、version 2 (nullable プロファイル + informationSources/trueProblem)・初期 version 2 (informationSources/trueProblem 未実装)・`schemaVersion=1` の V1・履歴上の無版 11 項目 form_json・salary を含む無版 12 項目 form_json のすべてを dual-read で正規化する。プロファイル軸は `unknown`、`informationSources`/`trueProblem` は `null`、要望パターン系は空配列へ補完し、salary は破棄する。処理待ちの旧 `sheet_generation` payload にも同じ dual-read を適用する。既存の JSON 列を使うため DB migration は不要。

- `applicant` は表示用の自由入力を保存するが、認可の所有者判定は改ざん可能な form 値でなく session の `principal.user_id` を `applicant_user_id` へ固定して行う。
- status の保存値は §5.2 の `received/generating/review/completed`。mock の「下書き」は `received` の旧表示とみなし、統一 UI ラベルは「受付」。
- PDF は独立した非認可 API を作らず、認可済み詳細 DTO を frontend-spec §3.2 の印刷表示へ再利用する。

### 4.3.1 ヒアリングシート スクリーンショット・Claude Code への引き渡し (token-URL 方式)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `POST /api/v1/sheets/:id/screenshots` | member (`selfOnly`) | multipart (`file, title, linkedItem?, note?`)。PNG/JPEG/WebP のみ・50 MiB 以下。申告 MIME と先頭バイトの両方を検証する。tenant_data と同じ R2 bucket・暗号化機構を再利用し、メタデータのみ DB へ登録 |
| `GET /api/v1/sheets/:id/screenshots` | member (`selfOnly`) | 添付済みスクリーンショット一覧 (`id, title, linked_item, note, size_bytes, content_type, created_at`) |
| `GET /api/v1/sheets/:id/screenshots/:screenshotId` | member (`selfOnly`) | 認証済みの画像ダウンロード。PNG/JPEG/WebP を再検査し、`attachment` / `nosniff` / `no-store` で返す |
| `DELETE /api/v1/sheets/:id/screenshots/:screenshotId` | member (`selfOnly`) | 削除。`screenshotId` が別 sheet に属する場合は 404 (存在秘匿) |
| `POST /api/v1/sheets/:id/handoff-tokens` | member (`selfOnly`) | `audience`(`harness_creator` / `system_orchestrator`) を指定してトークン付き共有 URL を発行。TTL 7日。平文トークンはこのレスポンスでしか返さない (SHA-256 ハッシュのみ保存)。`instruction_text`(Claude Code へそのまま貼り付けられる誘導文) を同時に生成。監査 event (`hearing_share_token.issued`) |
| `GET /api/v1/sheets/:id/handoff-tokens` | member (`selfOnly`) | 発行済みトークン一覧 (`id, audience, expires_at, last_accessed_at, access_count, revoked_at, created_at`)。平文トークンは含まない |
| `PATCH /api/v1/sheets/:id/handoff-tokens/:tokenId` | member (`selfOnly`) | 手動無効化 (revoke)。CAS (compare-and-swap) で二重無効化を安全に無害化し `{ id, revoked: true }` を返す。存在しない/他 sheet の `tokenId` は 404。監査 event (`hearing_share_token.revoked`) |
| `GET /api/hearing/:token` | なし (トークンのみが唯一の境界) | 公開ヒアリング内容取得 API。`hearingSharePayloadSchema` 形 (`sheet_code, audience, form_snapshot, estimate_snapshot, generated_sections, reference_urls, screenshots[], handoff_text, expires_at`) を返す。無効・期限切れ・失効・存在しないトークンはすべて同一の undifferentiated 404 (推測攻撃で有効/無効を区別させない)。アクセスのたびに `access_count`/`last_accessed_at` を記録 (best-effort・失敗しても本処理は継続) |
| `GET /api/hearing/:token/screenshots/:screenshotId` | なし (トークンのみが唯一の境界) | 同一トークンでスコープされたスクリーンショット中継配信 (`content-disposition: attachment`, `X-Content-Type-Options: nosniff`)。raw R2 URL は公開せず、必ずこのアプリ経由で復号・中継する。`screenshotId` がトークンの sheet に属さない場合は 404 |

- セキュリティ要件: 公開 middleware は `/api/hearing/:token` とその screenshot 子経路の形だけを通し、広い prefix 免除はしない。トークンは SHA-256 ハッシュのみ保存し、依頼者が `PATCH .../handoff-tokens/:tokenId` でいつでも手動無効化できる。`access_count` / `last_accessed_at` は best-effort の利用状況メタデータであり、追記専用の監査ログとは呼ばない。時刻値は全て epoch ms に統一する。画像配信も同じトークンでスコープし、誰でも見られる固定 URL にはしない。
- `POST /api/v1/sheets/:id/handoff-tokens` の応答 (`token` / `url` / `instruction_text`) は発行直後の 1 回しか返さない。再表示 API は提供しない。

### 4.4 構築パイプライン (pipeline board)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/builds` | member | 7 工程ボード一覧 (stage 別グルーピングはクライアント) |
| `GET /api/v1/builds/:id` | member | 詳細 + stage 履歴 |
| `POST /api/v1/builds` | workspace-admin | 手動復旧/例外用。`sheet_id` または `feedback_id` の一方だけを指定。通常経路は AiJob 完了時の自動作成 (§4.11) |
| `PATCH /api/v1/builds/:id` | workspace-admin | title/risk/eta/assignee/note |
| `POST /api/v1/builds/:id/stage` | workspace-admin | 工程遷移 (§5.3)。`publish` 工程は publish_request_id の接続を要求 (B4)。監査 event |

### 4.5 ハーネスカタログ (I4/I6 既存整合)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/harnesses` | member | CatalogEntry 一覧 (filter: target/status/q) |
| `GET /api/v1/harnesses/:projectId` | member | 詳細: channels + stable release + install 導線 (marketplace URL / web_app URL) + 利用統計 |
| `POST /api/v1/harnesses/:projectId/install` | member | 利用者の「追加/ダウンロード」操作。安定版だけを解決し、target 別 descriptor を返す (§4.5.1)。`Idempotency-Key` で download count の重複加算を防ぐ |
| marketplace 配信 (catalog.json / package 取得) | member | 既存 feat (S01-S04 / I6 URL 型 marketplace) の契約を維持。R2 key は公開せず Worker が tenant scope と安定版を再確認する |

#### 4.5.1 install/download descriptor (target 判別 union)

```json
{ "target": "skill", "release_id": "...", "marketplace_url": "https://...", "install_commands": ["..."], "download_url": null }
{ "target": "web_app", "release_id": "...", "launch_url": "https://..." }
```

- `skill`: Stage 0 の配布 Gate で採用した marketplace/Bootstrap Installer のコマンドを返す。raw ZIP 直接取得が Gate で採用された場合だけ `download_url` に 5 分以内の単回・短命 URL を返し、それまでは `null`。mock 内の `plugin install ./zip` は既定経路にしない。
- `web_app`: 健全性確認済み deployment の `launch_url` を返す。Hub は WebApp 本体を代理 download しない。
- suspended/非 stable/別 tenant の release は `404`。member が release id や R2 object key を指定して版をすり替える入力は受けない。

#### 4.5.2 Project 管理 (S01 公開ウィザードの入口)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `POST /api/v1/projects` | member | 現在の tenant/workspace に draft Project を作成し、`owner_user_id = principal.user_id` に固定。slug/name は Workspace 内一意。`project.create` を監査 |
| `PATCH /api/v1/projects/:id` | owner | name/description の変更。tenant/workspace/owner は body から変更不可。`project.update` を監査 |

1 Workspace に Project を複数作れ、各 Project は `skill` / `web_app` の複数 TargetChannel を持てる。S01 の Web 公開ウィザードは Project 作成後に §4.6 を **session 認証**で呼ぶ。既存 Project の再公開は S02 から同じ §4.6 を呼び、Project を重複作成しない。

### 4.6 公開 (B4/B9: PublishRequest / Release / Channel — §7.2/qa-009)

| Method Path | 認証/最小 role | 概要 |
|---|---|---|
| `POST /api/v1/publish` | session or Bearer / owner | Draft PublishRequest 作成 (project, target, visibility)。Idempotency-Key 必須。Draft は channel を占有しない。session は S01/S02 Web ウィザード、Bearer は Publisher CLI |
| `GET /api/v1/publish` | session or Bearer | PublishRequest 一覧 (filter: project/channel/status, cursor)。owner = 自 Project のみ、workspace-admin = Workspace 全体。S03 (公開状態) の進行中 request 発見と S05 (承認キュー = status=approval_pending) の供給元 (frontend-spec §3.4 の additive 追加要求。qa-040。状態機械・直列化 (qa-009) は不変) |
| `PUT /api/v1/publish/:id/package` | session or Bearer / owner | package upload (multipart) → R2 staging + content hash。サイズ/種別制限 (SEC7)。session は CSRF token も必須 |
| `POST /api/v1/publish/:id/submit` | session or Bearer / owner | Draft→Validating。検査 pipeline を Worker 内同期実行 (skills-only 小サイズ前提) し結果を DB 記録。同一 TargetChannel に別の非終端 request があれば 409 `channel_busy` |
| `GET /api/v1/publish/:id` | Bearer or session | 状態 polling (Publisher/Hub Web 共用, qa-009) |
| `POST /api/v1/publish/:id/approve` | session / workspace-admin | Yellow 承認 (Stage 2 approval queue)。監査 event |
| `POST /api/v1/publish/:id/cancel` | session or Bearer / owner | 非終端のみ→Draft 差戻し。session は Origin/CSRF 必須。Web の Needs Fix 再投入と CLI の取消が同じ owner・tenant/workspace 境界を使う |
| `GET /api/v1/projects/:id/releases` | member | Release 履歴 (immutable 一覧) |
| `POST /api/v1/channels/:id/promote` | owner | stable pointer 昇格。監査 event |
| `POST /api/v1/channels/:id/rollback` | owner | 2 版目以降のみ rollback 先検査 (§7.2)。監査 event |
| `POST /api/v1/releases/:id/suspend` | owner or admin | 公開停止 (Release status=suspended) |
| `POST /api/v1/projects/:id/deployment` | Bearer / owner | wrangler 実行結果 (exit code/URL) の登録 + HTTP health 確認。Catalog 昇格失敗時は orphan_candidate 記録 (§7.2) |

### 4.7 フィードバック (B6)

| Method Path | 認証/最小 role | 概要 |
|---|---|---|
| `POST /api/v1/feedback` | session=`manual` / Bearer=`harness` | source は principal 種別から導出。同一キューへ格納。`project_id, type=improvement/review/bug, priority=high/medium/low, body` を受理 |
| `GET /api/v1/feedback` | member | 一覧 (filter: status/type/project) |
| `GET /api/v1/feedback/:id` | member | 詳細 (ai_response 含む) |
| `PATCH /api/v1/feedback/:id` | workspace-admin | status 遷移 (§5.4)。監査 event。AI 対応は AiJob(`feedback_response`) 書戻しで `ai_response` 更新 + 起票者へ通知 |

### 4.8 ドキュメント CMS (B7)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/docs` | member | scope 合成一覧 (common + 自テナント)。filter: `scope/status/category/tag/q`。`tag` は JSON 配列要素の完全一致、`q` はタイトルだけを検索。ULID `id DESC` の cursor 順を固定し、一覧中の編集で `updated_at` が変わっても重複・欠落させない |
| `GET /api/v1/docs/:id` | member | `body_markdown` は raw 保存・レンダリング時 sanitize (SEC7)。分類・カード情報と `publish_at` を含む |
| `POST /api/v1/docs` | workspace-admin (tenant) / provider-admin (common) | 必ず `draft` で作成。`category/tags/thumbnail_url/excerpt/publish_at` は任意。未来でない非 NULL `publish_at` は 422。監査 event `docs.create` |
| `PATCH /api/v1/docs/:id` | 同上 | タイトル/本文/状態/分類/カード情報/予約時刻を部分更新。未来でない非 NULL `publish_at` は 422。監査 event `docs.update` |
| `POST /api/v1/docs/:id/draft` | workspace-admin | AI 下書き AiJob(`doc_draft`) 投入 |
| `POST /api/v1/docs/:id/images` | 同上 | Markdown editor 用画像 upload。PNG/JPEG/WebP/GIF の許可形式・申告 MIME・先頭バイト・サイズ上限を検証し、R2 の `docs/{tenantId}/{documentId}/{imageId}` へ保存。`docs.image.upload` を監査 |
| `GET /api/v1/docs/:id/images/:imageId` | member | 同一 document/tenant の認可済み画像だけを中継。`private, no-store` / `nosniff`。common 文書でも session 必須で、raw R2 URL は公開しない |
| `DELETE /api/v1/docs/:id/images/:imageId` | 同上 | 未参照・orphan 画像の明示回収口。別 document/tenant の key は組み立てない。`docs.image.delete` を監査 |
| `GET /api/v1/docs/imports/:source/:externalId` | Bearer: workspace-admin + `docs:write` (自テナントのみ) | 外部作成文書の同期状態と ETag を取得。`externalId` は repository 識別子と相対 path から導出した SHA-256 |
| `PUT /api/v1/docs/imports/:source/:externalId` | Bearer: workspace-admin + `docs:write` (自テナントのみ) | tenant/draft 文書を自然キー `(tenant, source, externalId)` で冪等 upsert。既存内容の変更には直前 GET の `If-Match` が必須 (428/412)。監査 event |

外部同期 v1 は Claude Code / Codex 等で作成した Markdown の tenant 下書き反映に限定する。
固定 API key、common 文書、自動公開、画像転送は扱わない。文書は workspace ではなく tenant に帰属し、
同じ自然キーかつ同じ内容の再送は文書を増やさず `unchanged` を返す。Hub 側でタイトル・本文・公開状態を
実際に変更したとき、AI 下書きを書き戻したとき、または予約公開したときは revision を単調増加させる。
画面でタイトル・本文・公開状態を実変更した外部文書は `external_content_hash=NULL` (`sync_state=modified`) とし、
CLI は明示的な `--force true` が無い限り停止する。分類・タグ・手動サムネイル・手動要約は Hub 側の管理値で、
外部同期は上書きしない。`thumbnail_source/excerpt_source='auto'` の項目と `asset_summary` だけを同期本文から再算出する。

### 4.8.1 公開予約・派生フィールド・外部同期の整合規則

- 保存状態は `draft/published` の 2 値だけで、`scheduled` は API/UI の派生表示である。
  `status='draft' AND publish_at > now` を予約中、`draft` かつそれ以外を非公開、`published` を公開と読む。
- `publish_at` は既存分類・外部同期列を置き換えない additive（純増）列である。予約作成・変更は future epoch ms
  のみ受理し、現在以前・不正形式・`status='published'`との同時指定は 422 problem+json とする。取消は
  `publish_at:null` で表す。future指定時の保存statusは`draft`へ導出する。
- 手動で`status`を指定したとき（同値再送を含む）、タイトルまたは本文が**保存値から実際に変わった**とき、
  外部版を `--force true` で反映したとき、AI 下書きを書き戻したとき、予約公開 cron が公開したときは
  `publish_at` を NULL にする。ただしタイトル/本文変更と同じ request で新しい未来 `publish_at` を明示した場合は、
  その日時を採用して `draft` にする。同じタイトル/本文を再送しただけの場合と分類・タグ・サムネイル・要約だけの変更では予約を保持する。
- サムネイルと要約は `auto/manual` の source を持つ。未指定または空欄へ戻した項目は本文から再算出し、
  手動値は本文変更・外部同期でも保持する。自動サムネイル候補は `http(s)` または認可済みの
  `/api/v1/docs/:id/images/:imageId` だけで、相対 repository path、`javascript:`、`data:` 等を採用しない。
- 外部同期の ETag は `"docs-import-{revision}"`。初回作成以外の変更は `If-Match` が必須で、欠落は 428、
  stale は 412 とし、最終書込みも revision CAS（比較して一致した時だけ更新）で競合を拒否する。
- 予約公開 repository は `publishDueDocuments(now, limit?)` とし、`limit` のdefault/maxは100。
  `publish_at ASC, id ASC` の安定順で `limit+1` 件を読み、各行CASで公開する。返却値は
  `{publishedCount, hasMore, publishedDocuments:[{id,tenantId}]}`。`hasMore` は同じ時刻snapshotに期限到来候補が残ることを示す。通常時の予約時刻からの追加遅延は
  24 時間未満（運用上は最大 24 時間程度）だが、cron 失敗・積み残し時の SLA ではない。
- 人間操作は `docs.update`、外部同期は `docs.external_sync`、予約公開は返却された文書ごとに
  actor=`system` / action=`docs.scheduled_publish`、AI 書戻しは既存 `ai_job.complete` で追跡する。監査 metadata に本文・画像本体・token を残さず、
  revision、変更フィールド、結果、run key のような識別情報だけを記録する。

### 4.9 メトリクス (B2/B3)

| Method Path | 認証/最小 role | 概要 |
|---|---|---|
| `POST /api/v1/metrics/events` | Bearer (短命 token) | 実行ログ ingest。**回数のみ受理・時刻はサーバ採用・Idempotency-Key 必須** (SEC5)。207 なし、重複 key は 200 (既存応答再生) |
| `GET /api/v1/metrics/summary` | member | dashboard KPI 6 カード + 推移 (rollup 読取のみ。Turso 読取予算対策) |
| `GET /api/v1/metrics/rollups` | member (集計値) / admin (user 次元の金額) | dim=`tenant/department/project` は全員、dim=`user` の金額換算は admin のみ (SEC4 逆算対策) |

### 4.10 通知 (B8/D6)

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/notifications` | member | 自分宛て一覧 (未読数含む) |
| `POST /api/v1/notifications/read` | member | 個別 or 一括既読 |
| (送信は API でなく共通層) | — | NotificationDispatcher 純関数層: アプリ内 (正本) + Resend メール (opt-in・日次 100 通制限はバッチ分割+リトライ, D6) |

### 4.11 AI ジョブキュー (B5/D5: pull 型)

| Method Path | 認証 | 概要 |
|---|---|---|
| `POST /api/v1/ai-jobs/pull` | Bearer (**workspace-admin = 自テナントのみ / provider-admin = 全テナント**, qa-048 で改訂) | 最古の `queued` を lease 付き claim (`processing`, lease 10 分)。kind filter 可。空なら 204 |
| `POST /api/v1/ai-jobs/:id/complete` | Bearer (claim 者のみ) | result 書戻し → 参照先 (sheet/feedback/doc) へ反映 + 通知。`sheet_generation` は P2 有効後に `sheet_id` 一意で Build (`hearing`) を、`feedback_response` は P3 有効後に `feedback_id` 一意で修正版 Build (`improvement/review`=`design`, `bug`=`test`) を冪等に自動作成する。監査 event |
| `POST /api/v1/ai-jobs/:id/fail` | Bearer (claim 者のみ) | attempt++。max_attempts 到達で `dead` + admin 通知 |
| `GET /api/v1/ai-jobs` | workspace-admin | キュー監視 (滞留は保守運用 qa-027 の監視対象) |

- **pull 権限 (qa-048 で改訂・2026-07-18 中立再確認)**: workspace-admin にも開放する。workspace-admin の pull は自テナントのジョブに限定 (D4 row-level scope 内で完結)。provider-admin の pull のみ cross-tenant で、audit_events へ tenant 明示で記録する (D4 の唯一の明示例外は従来どおり)。開放の目的は提供者単一障害点の解消。workspace-admin 側の Claude Code 契約が処理の前提となる点を運用ドキュメントへ明記する。
- **phase 境界**: P1 の間は生成済み Sheet を完成扱いにでき、S12 の Build 導線は非表示。P2 有効化 migration で `build_id IS NULL AND status IN ('review','completed')` の既存 Sheet を 1 回だけ backfill し、以後は `complete` と同一トランザクションで Build を作る。これにより mock の「生成後に構築パイプラインへ登録」を満たしつつ P1→P2 の順序を守る。

### 4.12 監査・検索

| Method Path | 最小 role | 概要 |
|---|---|---|
| `GET /api/v1/audit-events` | workspace-admin | append-only 閲覧 (filter: action/entity/actor/期間, cursor) |
| `GET /api/v1/search?q=` | member | ハーネス + ユーザー横断 (ユーザーは name/department のみ返す) |

### 4.13 tenant_data 保管

| Method Path | 最小 role | 概要 |
|---|---|---|
| `POST /api/v1/tenant-data/objects` | member | multipart の `workspaceId` / `kind` / `title` / `file` を受理。header の workspace と一致必須、50 MiB 以下。R2 へ tenant 別 DEK で暗号化保存し、メタデータだけを DB に登録 |
| `GET /api/v1/tenant-data/objects` | member | `workspaceId` 必須、`kind` / cursor / limit (1..100、既定 50) でページング。自テナント・認可済み workspace の行だけを返す |
| `GET /api/v1/tenant-data/objects/:id` | member | メタデータ取得。他 tenant または存在しない id は同じ 404 (存在秘匿) |
| `GET /api/v1/tenant-data/objects/:id/content` | member | 認可後にだけ R2 実体を復号して返す。`Cache-Control: no-store`、他 tenant は 404 |
| `DELETE /api/v1/tenant-data/objects/:id` | workspace-admin | R2 blob と DB 行を物理削除し、tombstone と監査 event を残す。削除前 backup の restore では新しい tombstone manifest を重ねて参照を除去 |

- 5 endpoint はすべて `withAuthz()` を通り、`x-harness-workspace-id` が無い要求は 400 で拒否する。
- R2 key は `tenant/{tenant_id}/{workspace_id}/{kind}/{object_id}`。同じ内容の再アップロードは重複保存を許容し、行単位 AAD と物理削除を安全に保つ。

## 5. 状態機械

### 5.1 PublishRequest (§7.2 完全準拠, qa-009)

```text
Draft → Validating ├─ Needs Fix → Draft (差戻し)
                   └─ Ready ├─ Approval Pending → Approved (管理者承認)   ← Stage 2 で有効化
                            └─ Approved (policy 自動承認 = Green)
                            → Publishing ├─ Failed (既存 stable 維持)
                                         └─ Published (Release 生成 → Promote)
```

- MVP サブセット: Yellow/Red 相当は `Needs Fix` 差戻し。`Approval Pending` は Stage 2 まで到達しない。
- 同一 TargetChannel の直列化: Draft は編集可能な待機状態として複数作成できるが channel を占有しない。先行が終端 (`Published/Failed/Draft` 差戻し) になるまで、後続の `POST /publish/:id/submit` (`Draft→Validating`) は 409 `channel_busy` とし Draft に留める。

### 5.2 HearingSheet

```text
received (受付) → generating (生成中: AiJob 投入中) → review (レビュー待ち) → completed (完了)
                       └─ AiJob dead → received へ戻し admin 通知 (再生成可能)
```

### 5.3 Build (7 工程, mockup pipeline)

```text
hearing → requirements → design → build → test → review → publish
```

- 遷移は隣接工程間 (前進/差戻し) のみ。`publish` 遷移時は接続済み PublishRequest の `Published` を確認する (B4)。
- **初期配置は遷移ではない**: HearingSheet 起点は `hearing`、Feedback 起点は `improvement/review`=`design`・`bug`=`test` で作成する。作成後の移動だけが隣接遷移制約と `build.stage_change` 監査の対象。

### 5.4 Feedback

```text
open (未対応) → in_progress (対応中) → resolved (対応済み)
```

### 5.5 AiJob

```text
queued → processing (lease 10 分) ├─ completed
                                  ├─ failed → attempt < 3 なら queued へ再投入
                                  └─ lease 失効 → queued へ自動返却
attempt = 3 → dead (admin 通知)
```
