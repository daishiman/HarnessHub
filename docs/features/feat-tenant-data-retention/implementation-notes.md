---
status: confirmed
layer: feature-implementation
task: SYS-TENANT-DATA-RETENTION-P05
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
source: [docs/features/feat-tenant-data-retention/architecture-decision-record.md, docs/features/feat-tenant-data-retention/test-design.md]
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: [arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-infrastructure]
---

# feat-tenant-data-retention 実装ノート (P05: 実装)

このメモは system-dev-planner の P05 (実装) フェーズで行った作業の記録であり、
`architecture-decision-record.md` (以下 ADR) の AD-1〜AD-6 と `requirements-baseline.md` を実装した際の
差分・判断根拠・未完了事項を残す。P04 までの契約確定を前提とする。

## 実装した範囲

### 1. `packages/db` — repository / registry (P04 で着手、本フェーズで list を追加)

- `packages/db/registry/tenant-data.ts`: `TenantDataRegistry`(R2 put/get/delete)。AD-3 の行単位一意 key
  (`tenant/{tenant_id}/{workspace_id}/{kind}/{tenant_data_objects.id}`)。
- `packages/db/repository/tenant-data.ts`: `TenantDataRepo`。`upload`/`findById`/`getContent`/
  `deleteTenantDataObject` に加え、本フェーズで **`list` を新規追加**。
  - AD-4 の GET 一覧 API 契約を実装する時点で、repository 側に一覧取得手段が無いことが判明した
    (P04 時点では upload/read/delete の TC-6〜TC-9 のみが検証対象で、一覧は設計されていなかった)。
  - `hearing-intake.ts` の `listSheets` と同じ cursor 方式 (ULID PK を `lt(id, cursor)` +
    `orderBy(desc(id))`、`limit+1` 件取得して `hasNext` を判定) を踏襲した。
  - `tenantDataObjects` の複合 index は `(tenantId, workspaceId, kind, createdAt)` であり `id` 単体ではないが、
    既存 2 repository (`hearing-intake`, `publish-requests`) も同様に PK cursor 方式を採用しているため、
    この feature だけ `createdAt` 複合 cursor へ複雑化する理由がないと判断し、既存慣行に揃えた。
  - テスト: `packages/db/__tests__/tenant-data-list.test.ts` (新規)。ページ境界・tenant/workspace 分離・
    kind フィルタを検証。
- `packages/db/repository/composition.ts` / `packages/db/src/index.ts`: `createTenantDataRepository` facade
  (専用 R2 bucket・専用 cipher インスタンス) と型 (`TenantDataObjectRow`, `TenantDataUploadInput`,
  `TenantDataListInput`, `TenantDataObjectPage`, `TenantDataRepo`) を公開境界へ追加。

### 2. `packages/schemas/tenant-data/` (新規)

AD-4 で確定した 5 エンドポイントの wire 契約を zod で定義 (`contracts.ts`)。`hearing-intake/contracts.ts` の
パターン (`.strict()`、`identifierSchema` ベースの brand ID、`paginatedSchema` 活用) を踏襲。

- `tenantDataObjectKindSchema`: `knowledge_doc | run_input | run_output`
- `uploadTenantDataMetadataSchema`: multipart のメタデータ部 (`file` 自体は zod で検証しない — route が
  `FormData` から取り出す)
- `tenantDataObjectSchema` / `tenantDataObjectListQuerySchema` / `tenantDataObjectListResponseSchema`

`packages/schemas/src/index.ts` から再エクスポート (単一公開入口の方針)。

### 3. `apps/hub/src/lib/authz/rules.ts`

5 action を追加。role 割当は ADR/requirements-baseline に明記が無かったため、既存語彙から類推して
このフェーズで確定した:

| action | minRole | 理由 |
| --- | --- | --- |
| `tenant-data.upload` / `list` / `read` / `read_content` | member | 通常業務のデータ入出力。`docs.read` と同強度 |
| `tenant-data.delete` | workspace-admin | 復元不可 (soft delete 列を持たない、AD-1) な破壊的操作。`sheets.status_change` 等と同強度 |

`selfOnly` は全て `false` (workspace 内の共有データであり、所有者限定にする根拠が無い —
`docs.write_tenant` と同じ考え方)。`credential` は全て `SESSION` (publisher token 等の長命資格情報に
テナントデータの入出力権限を持たせない)。

### 4. `apps/hub/src/lib/tenant-data/` (新規)

- `runtime.ts`: composition root。`lib/publish/runtime.ts` と同じ方針 (in-memory 実装を差さない、
  binding 未設定は例外にする、ADR AD-8)。`TENANT_DATA_BUCKET` という新規 R2 binding を要求する。
  isolate 内キャッシュ (`tenantDataRuntime()`) も publish 側の `publishRuntime()` と同じ理由で用意した。
- `rate-limit.ts`: AD-4 確定値 (upload/delete=20, list/read=120, read_content=60 req/min/principal) を
  `lib/publish/rate-limit.ts` の `createFixedWindowRateLimiter` (固定窓カウンタ) で実装。実装を複製せず
  既存の汎用関数を再利用した — 境界の burst 挙動の保証がテストで固定されている実装を 2 箇所に分岐させたくないため。
- `index.ts`: barrel export。

### 5. API routes (新規)

- `apps/hub/src/app/api/v1/tenant-data/objects/route.ts`: POST (multipart upload) / GET (一覧)。
- `apps/hub/src/app/api/v1/tenant-data/objects/[id]/route.ts`: GET (メタ) / DELETE。
- `apps/hub/src/app/api/v1/tenant-data/objects/[id]/content/route.ts`: GET (復号済み本体)。

全て `withAuthz` を経由 (`check-single-authz-middleware.mjs` の allowlist に頼らない)。
`workspaceId` は `x-harness-workspace-id` header を認可境界の正本とし、multipart/query の `workspaceId`
フィールドは header と不一致なら 400 で拒否する (`requestScopedResource` の「申告値をそのまま資源の所属として
使う」方針を踏襲しつつ、契約上のフィールドと認可境界を二重管理しない)。

アップロード本文の上限は 50MiB とした。security-spec / requirements-baseline に明示値が無いため、
R2 単一 PUT の実用上限に合わせた本フェーズの判断値。要件として別の上限が確定していれば差し替えが必要。

### 6. `apps/hub/wrangler.jsonc`

`TENANT_DATA_BUCKET` (bucket 名 `harness-hub-tenant-data`) を r2_buckets へ追加。
PackageRegistry のバケット (`PACKAGES_BUCKET`) とは分離 (AD-3)。

## 未完了事項 (本フェーズでは実施しなかった)

以下は AD-5 (R2 使用量監視) の対象だが、本フェーズのスコープからは切り離した。理由を含めて記録する。

### AD-5 の前提が崩れていた

AD-5 は「既存の Turso 監視 cron の直後に R2 監視を追加する」という統合方針だったが、実装調査の結果、
参照先の「既存実装」が実在しないことが判明した:

- `apps/hub/src/worker/cron.ts` の `DEFAULT_CRON_REGISTRY` に登録されている 6 ジョブ
  (`metrics-rollup-daily`, `turso-usage-monitor`, `orphan-candidate-notify`, `token-cleanup`,
  `metrics-rollup-weekly`, `weekly-summary-mail`) は **全て `pendingJob(id)` という未実装スタブ**
  (`run: async () => {}`) のままである。
- つまり「既存の Turso 監視 cron」自体が存在しない。AD-5 が前提とした統合先が無い。

R2 使用量監視の実装 (`turso-usage-monitor` スロットを実ジョブへ置き換える、または新規スロットを起こす) は
Turso 側の実装方針 (別 feature の責務の可能性がある) と合わせて設計し直す必要があるため、本フェーズでは
見送った。実装する場合の技術的制約も記録しておく:

- R2Bucket binding には集計 API が無い。`bucket.list()` のページングでオブジェクトサイズを積算する方式のみ
  実行可能。Cloudflare GraphQL Analytics API は別途アカウントトークンが必要で、本環境の binding からは
  到達できない。
- 上記の制約により、Class A/B 操作数の監視は測定不能。ストレージ使用量 (bytes) のみが監視対象になる。

### ドキュメント更新

`docs/infrastructure-spec.md` (binding 台帳・R2 バケット設計表) および
`docs/security-spec-request-controls.md` (§7.2 のレート制限表) への反映は、上記 cron 統合の設計が
固まった後にまとめて行う方が二度手間にならないため、本フェーズでは保留した。
`wrangler.jsonc` の binding 追加はコードの動作に必須のため実施済みだが、ドキュメント側の台帳への反映は
未実施であることに注意。

## 追記 (P06 で AD-5 を実装)

上記「未完了事項」に記録した AD-5 (R2/Turso 使用量監視) は、P06 (受入テスト実行) の過程で
前提の再確認とユーザー判断を経て実装した。判断根拠を記録する。

- **前提の再確認**: `apps/hub/src/worker/cron.ts` の `turso-usage-monitor` スロットは、上記記載通り
  `pendingJob(id)` の未実装スタブのままだった。P05 時点の記載は正しかった。
  「別 feature の責務の可能性」については、ADR (AD-5) が本 feature のスコープと明記しているため、
  ユーザー確認の上で本 feature 内で実装する方針を採った。
- **Turso Platform API の仕様確認**: DB 接続用の `TURSO_AUTH_TOKEN` とは別に、使用量取得専用の
  Platform API token が必要と判明した (WebSearch で公式ドキュメント
  `https://docs.turso.tech/api-reference/databases/usage` を確認)。
  `GET /v1/organizations/{organizationSlug}/databases/{databaseName}/usage` が
  `{database: {total: {rows_read, rows_written, storage_bytes, ...}}}` を返す。
- **通知の永続化はスコープ外にした (ユーザー確認済み)**: `shared/notification` の `NotificationDispatcher`
  は transport 実装を consumer 側の責務とする設計 (`tests/fixtures/consumer-a/uses-notification.ts` の
  `inAppTransport` で確認)。DB 保存・admin 画面への一覧表示までは別途「通知基盤」feature のスコープとし、
  本 feature では `console.log` による構造化ログ出力のみを `in_app` transport として実装した
  (`apps/hub/src/lib/scheduled/usage-monitor.ts` の `createLogInAppTransport`)。閾値判定・cron 統合・
  R2/Turso 使用量取得自体は ADR 通り実装している。
- **未投入 secret の扱い**: `TURSO_API_TOKEN` / `TURSO_ORG_SLUG` / `TURSO_DATABASE_NAME` は
  `scripts/ci/worker-secrets-registry.json` へ `requirement: "planned"` として登録した
  (`RESEND_API_KEY` 等の先例に倣う)。`wrangler.jsonc` の `secrets.required` へは追加していない。
  理由: 実投入前に required 化すると CI が恒常的に赤くなり、本当に不足している secret の検知が鈍る。
  実投入が決まった時点で `required` へ移す。
- **R2 使用量の測定制約**: 上記記載通り、R2Bucket binding に集計 API が無いため `bucket.list()` の
  ページングでオブジェクトサイズを積算する方式のみを実装した。Class A/B 操作数は引き続き測定不能。

実装ファイルと検証結果は `apps/hub/src/lib/scheduled/usage-monitor.ts` /
`apps/hub/tests/scheduled/usage-monitor.test.ts`、および P06 の
`test-run-results.md` を参照。

## 検証結果 (本フェーズ実施分)

- `tsc --noEmit`: `packages/db`, `packages/schemas`, `apps/hub` すべて PASS。
- `biome check`: 変更ファイル全て PASS (自動整形適用済み)。
- `node packages/db/scripts/check-db-write-gate.mjs`: PASS (guardedWrite 経由 82 件、fail-closed 検査)。
- `node apps/hub/scripts/check-single-authz-middleware.mjs`: PASS (新規 route 3 本が withAuthz 経由と確認)。
- `node scripts/ci/check-shared-layer-duplicates.mjs`: PASS (境界迂回無し)。
- `vitest`: `tenant-data-list.test.ts` (新規 3 件) / `tenant-data-deletion.test.ts` (既存 4 件、退行なし)
  すべて PASS。
