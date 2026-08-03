---
status: confirmed
layer: feature-design
task: SYS-TENANT-DATA-RETENTION-P02
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
source: docs/features/feat-tenant-data-retention/requirements-baseline.md
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: [arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-backend, arch-harness-hub-infrastructure]
---

# feat-tenant-data-retention アーキテクチャ決定記録 (ADR)

> **位置づけ**: P02 の成果物。[requirements-baseline.md](./requirements-baseline.md) §6 が P02 必須解消事項として引き継いだ 3 点 (encryption_keys.purpose enum 拡張、API 詳細設計、削除完全性テスト採番) に加え、R2 tenant prefix 分離と R2 使用量監視 cron 拡張の合計 5 系統を確定する。本書で確定した決定は P05 実装の拘束条件であり、実装が本書と矛盾した場合は実装側を是正する。
>
> **改訂 (P03 差し戻しによる修正・2026-08-03)**: [design-review-notes.md](./design-review-notes.md) (P03 独立設計レビュー) が是正指摘 C1/C2/C3 を提起し、AD-1/AD-2/AD-3/AD-6 を修正した。C3 (最重大): AD-3 のコンテンツアドレス収束と AD-2 の行単位 AAD・AD-6 の行単位物理削除が非両立だったため、**方式 (a) 行ごとに一意な R2 key を採用**する形へ AD-3 を修正し (content-addressed 収束を撤回)、AD-2/AD-6 との整合を取った。C1/C2: AD-1 に `wrapAad` の tenant_id 込み化と active DEK 判定クエリの tenant_id スコープを追記した。

## 0. 決定一覧 (索引)

| id | 決定 | 対応する quality_constraint |
|---|---|---|
| [AD-1](#1-ad-1-encryption_keys-へ-tenant_id-nullable-列を追加しpurpose-に-tenant_data-を加える) | `encryption_keys` に `tenant_id` (nullable) を追加し `purpose` に `tenant_data` を加える。既存 salary/idp_secret は `tenant_id=NULL` で互換維持 | tenant-data-envelope-encryption-numeric-contract |
| [AD-2](#2-ad-2-aadiv-運用は既存-columncipher-と同一プリミティブを-r2-object-単位で適用する) | AAD/IV 運用は既存 `ColumnCipher` と同一プリミティブを R2 object 単位で適用する (AAD = `tenant_data_objects:content:{id}`) | tenant-data-envelope-encryption-numeric-contract |
| [AD-3](#3-ad-3-r2-tenant-prefix-は-tenanttenant_idworkspace_idkindcontent_hash-としpackageregistrybackup-とバケットを分離する) | R2 tenant prefix は `tenant/{tenant_id}/{workspace_id}/{kind}/{id}` (行単位で一意) とし、PackageRegistry/backup とバケットを分離する (P03 是正 C3: content-addressed 収束は撤回) | tenant-cross-boundary-read-prevention-t14-r2-prefix |
| [AD-4](#4-ad-4-tenant_data-保管-api-はエンドポイント5本zod-スキーマrate-limitを確定する) | tenant_data 保管 API はエンドポイント 5 本・zod スキーマ・rate limit を確定する | tenant-data-api-endpoint-detail-deferred-to-p02 |
| [AD-5](#5-ad-5-r2-使用量監視は既存-turso-使用量監視-cron-のステップへ追加するdispatchi-統合とする) | R2 使用量監視は既存 Turso 使用量監視 cron の同一ステップへ追加する (別 cron を新設しない) | r2-usage-monitoring-alert-cron-extension |
| [AD-6](#6-ad-6-削除完全性テストは-t-15-を採番しr2実体db行backup-tombstonecache-の-4-点確認とする) | 削除完全性テストは §8.3 に `T-15` を採番し、R2 実体・DB 行・backup tombstone・cache の 4 点確認とする | immediate-full-deletion-r2-db-backup-contract |
| [AD-7](#7-ad-7-テナント越境読取ケースは-84-テナント分離テストへ追加しt14-の検証先とする) | テナント越境読取ケースは §8.4 テナント分離テストへ追加し、脅威モデル T14 の検証先とする | tenant-cross-boundary-read-prevention-t14-r2-prefix |

---

## 1. AD-1: `encryption_keys` へ `tenant_id` nullable 列を追加し、`purpose` に `tenant_data` を加える

### 判断

`packages/db/schema/core/security.ts` の `encryptionKeys` テーブルへ `tenantId: text('tenant_id')` (nullable) を追加し、`purpose` enum を `['salary', 'idp_secret', 'tenant_data']` へ拡張する。

- 既存 global 用途 (`salary` / `idp_secret`) は **`tenant_id = NULL` で運用を継続**し、既存 unique index `encryption_keys_purpose_version_uq` (`UNIQUE(purpose, key_version)` WHERE `tenant_id IS NULL`) を維持する。
- `tenant_data` は **テナント別 DEK** とし、新規 partial unique index `encryption_keys_tenant_purpose_version_uq` (`UNIQUE(tenant_id, purpose, key_version)` WHERE `tenant_id IS NOT NULL`) を追加する。
- `active` は `tenant_data` では **tenant × purpose ごとに 1 件**とする (既存 global 用途は purpose ごとに 1 件のまま)。active 強制は新規 index ではなく、既存の `guardedWrite` (`packages/db/repository/conflict.ts`) によるアプリ層トランザクション制御を踏襲する (既存 `rotateDek` と同一パターン)。
- migration の**実施**は P08 (リファクタリング/マイグレーション) の責務。本 task は列追加と index 方針の確定のみを行う。
- **(P03 是正 C1)** KEK wrap 用 AAD (`crypto.ts` の `wrapAad(purpose, keyVersion)` 相当) は、既存実装の `` `${purpose}:v${keyVersion}` `` のままでは `tenant_data` の複数テナント行が同一 AAD を持ちうる (cut-and-paste 防止が機能しない)。`tenant_data` 用の DEK 台帳行に対しては AAD 材料へ `tenant_id` を含め、`` `${purpose}:${tenantId}:v${keyVersion}` `` の形へ拡張する。一方、既存 global 用途 (`salary` / `idp_secret`, `tenant_id=NULL`) は **従来の** `` `${purpose}:v${keyVersion}` `` を維持する。既存 DEK がこの AAD で wrap 済みであるため、`global` などの新しい区切り文字を足さず、P05 実装時に migration 前形式を読める回帰テストで固定する。
- **(P03 是正 C2)** `tenant-deks.ts` の active/latest DEK 判定クエリは、既存 `ColumnCipher` の `purpose` 単独フィルタをそのまま流用せず、**`tenant_id` と `purpose` の両方**を WHERE 句に含める。これにより他テナントの active DEK を誤参照する経路 (暗号化コンテキストの混線) を構造的に排除する。

### 根拠

| # | 証跡 | 内容 |
|---|---|---|
| ① | `packages/db/schema/core/security.ts:34-46` | 既存 `encryptionKeys` テーブルは `purpose: text('purpose', { enum: ['salary', 'idp_secret'] })` かつ `UNIQUE(purpose, key_version)` のみ。tenant scope 列が存在しない |
| ② | requirements-baseline.md quality_constraint `tenant-data-envelope-encryption-numeric-contract` | 「tenant_dataはtenant_id付きDEKを用い、UNIQUE(tenant_id,purpose,key_version)、tenant/purposeごとactive=1、KEK wrap、rotation/deletionを実装する。既存global用途はtenant_id=NULLで互換維持する」 |
| ③ | `docs/security-spec-data-integrity.md` §4.1.1 | 現行 `encryption_keys` の正本定義。tenant_id 追加は本 ADR が新規に確定する差分であり、旧定義を破壊しない (nullable 追加のため非破壊) |

### 実装/evidence パス (this phase の責務範囲のみ確定・実施は P05/P08)

- `packages/db/src/schema/encryption-keys.ts` (新設または `schema/core/security.ts` への追記。P05 が確定する)
- `packages/db/src/repository/tenant-deks.ts` (テナント別 DEK の lookup/rotation/deletion。既存 `ColumnCipher` の purpose 別 DEK cache パターンを踏襲)
- `packages/db/migrations/` (P08 が enum 拡張 + 列追加 + partial index 追加の migration を実施)

## 2. AD-2: AAD/IV 運用は既存 `ColumnCipher` と同一プリミティブを R2 object 単位で適用する

### 判断

既存 `packages/db/repository/crypto.ts` の `ColumnCipher` (AES-256-GCM、IV はレコードごとにランダム 96bit・再利用禁止、保存形式 `{key_version}:{iv_b64}:{ciphertext_b64}:{tag_b64}`) を、R2 object の暗号化にもそのまま再利用する。R2 object は DB の列ではないため AAD の材料を次のように定める。

- AAD = `` `tenant_data_objects:content:${tenantDataObjectId}` `` (table:column:row_id の既存規約を、DB 列ではなく R2 object の紐づけ先である `tenant_data_objects.id` に適用したもの)
- purpose は `tenant_data`、DEK は AD-1 のテナント別 DEK を使用する
- 暗号化した object 本体を R2 へ保存し、`tenant_data_objects.enc_key_version` に使用した `key_version` を記録する (復号時の DEK 特定に使用)

### 根拠

`docs/security-spec-data-integrity.md` §4.1 の AAD 規約 (`table:column:row_id`) を、R2 object という DB 列以外の対象へ一貫適用する。既存 `aadBytes()` 実装 (`crypto.ts:36-38`) の呼び出し規約を変えずに `ref.column` へ `'content'` 固定値、`ref.rowId` へ `tenant_data_objects.id` を渡すだけで再利用できる (新規プリミティブ不要)。

## 3. AD-3: R2 tenant prefix は `tenant/{tenant_id}/{workspace_id}/{kind}/{content_hash}` とし、PackageRegistry/backup とバケットを分離する

### 判断

- 業務データ用に新規 R2 bucket (`harness-hub-tenant-data` 相当。既存 PackageRegistry bucket とは**別バケット**とする) を設け、key を `tenant/{tenant_id}/{workspace_id}/{kind}/{tenant_data_objects.id}` とする。
  - `kind` は `tenant_data_objects.kind` (`knowledge_doc` / `run_input` / `run_output`) と一致させる。
  - key の末尾は **`tenant_data_objects.id` (ULID)** とし、**行ごとに一意な key** とする。
  - `content_hash` (sha256) は `tenant_data_objects` の列として保持するが、**R2 key の構成要素にはしない**。用途は整合性検証 (アップロード後の内容確認) のみとし、重複排除には用いない。
- 削除は object key を `tenant_id/workspace_id/kind/id` から一意に特定できるため、R2 delete API を直接呼び出せる (list による曖昧検索を要しない)。行ごとに key が一意なため、ある行の削除操作が他行の実体に影響することはない。

> **(P03 是正 C3・最重大)** 当初案は `content_hash` を key に含める content-addressed 方式 (同一内容の再アップロードを同一 key へ収束) だった。しかし AD-2 の AAD が行 ID に束縛されているため、複数行が同一 key を共有すると (i) 後着の暗号化が先着の ciphertext を上書きし先着行が AAD 不一致で復号不能になる、(ii) AD-6 の削除 (ある行の削除 API 実行) が他行の実体まで物理削除してしまう、という 2 つの欠陥が生じることを [design-review-notes.md](./design-review-notes.md) R2/R3 が指摘した。本 ADR はこの指摘を採用し、**方式 (a): content-addressed 収束を撤回して行ごとに一意な key を採用**する形へ修正した (参照カウント方式 (b) は採用しない。行単位の AAD・削除という他決定との整合を優先した)。重複保存 (同一内容の複数アップロード) は許容し、ストレージ削減はしない。

### 根拠

| # | 証跡 | 内容 |
|---|---|---|
| ① | requirements-baseline.md quality_constraint `tenant-cross-boundary-read-prevention-t14-r2-prefix` | 「業務データ用 prefix をテナント別に分離し、PackageRegistry [immutable] とはバケットまたは prefix を分ける」 |
| ② | `docs/security-spec-foundations.md` T14 | 「purpose=tenant_data の封筒暗号化 + D4 row-level + R2 tenant prefix 分離。認可 MW 通過後のみ復号」 |
| ③ | requirements-baseline.md quality_constraint `c4-revision-tenant-data-retention-qa045-048-appr007` | `tenant_data_objects` テーブル定義に `r2_key`・`content_hash`[sha256]・`kind` 列が明記されている |

**バケット分離を採る理由**: PackageRegistry は immutable 配布物 (公開基盤) であり、削除ライフサイクルも権限モデルも異なる。同一バケットの prefix 分離では bucket 単位の IAM/lifecycle policy を共有してしまうため、即時完全削除 (本 feature) と immutable 保持 (PackageRegistry) という相反する削除ポリシーをバケット単位で構造的に分離する。

## 4. AD-4: tenant_data 保管 API はエンドポイント 5 本・zod スキーマ・rate limit を確定する

### 判断

ベースパス `/api/v1` (qa-031 既定) 配下に以下を追加する。全 endpoint は既存の認可ミドルウェア (deny-by-default, tenant/workspace scope 強制) を通過してから処理する。

| メソッド/パス | 用途 | zod スキーマ (概要) | rate limit |
|---|---|---|---|
| `POST /api/v1/tenant-data/objects` | multipart アップロード → 封筒暗号化 → R2 保存 + DB 参照登録 | `{ workspaceId: ulid, kind: enum(knowledge_doc\|run_input\|run_output), title: string.max(200), file: multipart }` | 20 req/min/principal |
| `GET /api/v1/tenant-data/objects` | 一覧 (workspace スコープ、ページング) | query: `{ workspaceId: ulid, kind?: enum, cursor?: string, limit: number.max(100) }` | 120 req/min/principal |
| `GET /api/v1/tenant-data/objects/:id` | メタデータ取得 (認可 MW 通過後、平文メタのみ) | path: `{ id: ulid }` | 120 req/min/principal |
| `GET /api/v1/tenant-data/objects/:id/content` | 本体取得 (認可 MW 通過後にのみ復号してストリーム) | path: `{ id: ulid }` | 60 req/min/principal |
| `DELETE /api/v1/tenant-data/objects/:id` | 即時完全削除 (R2 blob + DB row + backup tombstone 登録を同一 workflow で実行) | path: `{ id: ulid }` | 20 req/min/principal |

- S15 添付 / S12 実行入出力閲覧向けの統合 API 契約は、host UI 側の feature が上記 5 endpoint を直接呼び出す形の extension point とし、本 feature 側に host UI 専用の追加 endpoint は設けない (scope_in の「任意統合 API 契約・extension point」を、既存 5 endpoint の再利用として満たす)。
- rate limit は Cloudflare Rate Limiting Rule ではなく、既存の「その他はアプリ層 (認可ミドルウェア前段) の IP + principal 制限で補完」方針 (`docs/infrastructure-spec.md` §該当箇所) に従い、アプリ層で実施する (Device Flow 系のみ Cloudflare Rule 対象)。
- **(P03 付記 N1)** 上記 5 endpoint の rate limit 数値は `docs/security-spec-request-controls.md` §7.2 の既存確定テーブルに**行として未反映**である。P05 実装時に §7.2 表へ 5 行を追記する (通常の spec reflection receipt 経路)。

### 根拠

`system-spec/spec-state.json qa-048` が「エンドポイント詳細設計 (パス・スキーマ・rate limit) は feature P02 で行い、認可は既存 deny-by-default マトリクスへ行を追加する」と明示的に本 task へ委譲している。`docs/backend-spec.md` §3.1 のベースパス規約・zod 単一ソース原則 (`packages/schemas`)・RFC 9457 エラー形式をそのまま踏襲する。

## 5. AD-5: R2 使用量監視は既存 Turso 使用量監視 cron のステップへ追加する (dispatch 統合とする)

### 判断

新規 cron trigger を追加せず、既存の日次 Workers scheduled handler (`0 15 * * *` JST 0:00、`docs/infrastructure-spec.md` §5 記載の「① metrics rollup → ② Turso 使用量監視 → ③ orphan_candidate 通知 → ④ token/認可コード掃除」) の **② の直後**に「R2 使用量監視」ステップを追加する。

- `apps/hub/src/lib/scheduled/usage-monitor.ts` (既存 Turso 使用量監視の実装ファイル) へ R2 使用量取得処理を追加する形で実装する (別ファイル・別 cron dispatch を新設しない)。
- 閾値は既存 Turso 監視と同一の **70% でアプリ内 admin 通知・90% で保持期間導入の R4-reopen 起票を促す** を踏襲する。R2 専用の別閾値は本 task では確定しない (goal-spec quality_constraint が「R2 専用の別閾値は現時点で confirmed されていない」と明示しているため)。
- 業務データ用バケット (AD-3) と PackageRegistry バケットの使用量は分けて計測し、通知メッセージにバケット種別を明記する (どちらが閾値超過したかを admin が判別できるようにする)。
- 無料枠: R2 10GB / Class A 100万 ops/月 / Class B 1,000万 ops/月 (`docs/infrastructure-spec.md` §3)。

### 根拠

requirements-baseline.md quality_constraint `r2-usage-monitoring-alert-cron-extension`、`docs/infrastructure-spec.md` §5 の cron dispatch 一覧、`docs/backend-spec.md` の既存 Turso 使用量監視エントリ (§7 相当)。既存 cron へ「実登録」することが P01 の Normative implementation closure で明記されており、新設ではなく統合が契約上の要求である。

## 6. AD-6: 削除完全性テストは §8.3 に `T-15` を採番し、R2 実体・DB 行・backup tombstone・cache の 4 点確認とする

### 判断

`docs/security-spec-assurance.md` §8.3 単体・結合テスト一覧は現行 `T-14` (Project/配布境界) までが採番済みであるため、次の空き番号 **`T-15`** を tenant_data 削除完全性テストとして採番する。

> **numbering 注意**: この `T-15` (§8.3 テスト ID) は `docs/security-spec-foundations.md` §1.3 の脅威モデル `T15` (削除不完全) の**検証先**であり、同じ番号だが体系が異なる (§8.3 はテスト ID の連番、§1.3 は脅威 ID の連番)。両者は意味的に対応するが同一の採番空間ではない。

`T-15` テストケース定義 (4 点確認、いずれも PASS が必須):

1. R2 実体: 削除 API 実行後、当該 `r2_key` に対する GET が 404 になること (blob が物理削除されていること)。AD-3 (P03 是正後) により `r2_key` は行単位で一意なため、他行の実体には影響しないことを併せて確認する
2. DB 行: 削除 API 実行後、`tenant_data_objects` の当該行が存在しないこと (soft delete 列を持たないため row 自体が消えること)
3. backup tombstone: 日次 export は `allTables` を対象に `tenant_data_tombstones` を含める。古い backup を restore する場合は、削除後の新しい export から抽出した tombstone manifest を必ず重ね、当該 object の DB 参照を除去する。R2 実体は削除時に物理削除済みであり、平文/暗号文のいずれも API 経路へ復元させない
4. cache: アプリ層キャッシュ (存在する場合) に当該 object の平文/暗号文が残存しないこと

### 根拠

requirements-baseline.md quality_constraint `immediate-full-deletion-r2-db-backup-contract` および `docs/security-spec-foundations.md` T15 の「検証先 = §8.3 削除完全性テスト (R2 実体・DB 行・キャッシュ)」表記に backup tombstone 確認を追加した (P01 Normative implementation closure が「日次exportの対象object/tombstone manifestを同一deletion transaction/workflowで更新し、過去backupからrestoreしてもtombstone適用で復元不能にする」ことを明記しているため、キャッシュのみでは不足)。実装は `packages/db/backup/tenant-data-tombstones.ts` の manifest 抽出・適用と `restore-control-plane.ts --tombstone-manifest` で担保する。

## 7. AD-7: テナント越境読取ケースは §8.4 テナント分離テストへ追加し、T14 の検証先とする

### 判断

新規テスト ID を採番せず、`docs/security-spec-assurance.md` §8.4 テナント分離テスト (CI 必須・SEC3) の既存スイートへ「業務データ越境読取ケース」を追加する。ケース内容: テナント A が保有する `tenant_data_objects` を、テナント B の provider-admin を含むいかなる authz role でも `GET /api/v1/tenant-data/objects/:id` および `:id/content` が 403/404 を返すこと。

### 根拠

`docs/security-spec-foundations.md` T14 の検証先が「§8.4 分離テスト (業務データ越境読取ケース)」と既に明記されており、独立した新規テスト ID を必要としない (既存分離テストスイートへのケース追加で足りる)。requirements-baseline.md acceptance 1 件目「テナント A の業務データがテナント B のいかなる authz role からも取得不可であること」と一致する。

---

## 8. Migration compatibility (P08 引き継ぎ事項)

`encryption_keys.purpose` enum 拡張・`tenant_id` 列追加は、既存 `salary`/`idp_secret` 運用 (`tenant_id=NULL`) と非破壊で共存する。P08 が実施する migration は以下を満たすこと:

1. `tenant_id` 列追加は `ALTER TABLE ... ADD COLUMN` (NULL 許容、既存行は自動的に `tenant_id=NULL` のまま)
2. 既存 unique index `encryption_keys_purpose_version_uq` を `WHERE tenant_id IS NULL` の partial index へ置換 (意味的に既存行の制約を変えない)
3. 新規 partial index `encryption_keys_tenant_purpose_version_uq` (`WHERE tenant_id IS NOT NULL`) を追加
4. migration 実行前後で既存 `salary`/`idp_secret` の DEK lookup/rotation が既存テスト (`packages/db/__tests__/encryption.test.ts`) を継続して PASS すること

**(P03 付記 N2)** テナント解約時の DEK 取り扱い (`retiring`/`retired` への遷移のみか、台帳行自体の物理削除も行うか) は本 ADR では確定しない。P08 (migration 実施) / P12 (runbook 文書化) で明記すること。

## 9. 転記元と検証

- 転記元: [requirements-baseline.md](./requirements-baseline.md) §5-6 (quality_constraints 6 件・P02 必須解消事項 3 点)
- 本文書の受入条件 (P02 required evidence): 5 系統 (encryption_keys.purpose拡張/AAD-IV運用、API詳細設計、R2 prefix分離、R2使用量監視cron拡張、削除完全性テストID採番) の architecture decision が記載されていること (§1-§7 で充足)
