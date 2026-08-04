---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P06
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
executed_at: 2026-07-24
consumes: [docs/features/feat-domain-model-db/test-design.md, packages/db/__tests__/]
---

# feat-domain-model-db テスト実行結果 (P06)

> **位置づけ**: P04 の test-design.md に列挙された全テストケースを P05 実装に対して実行した記録。
> P06 契約どおり、スキーマ DDL は schema test harness (barrel から実行時導出) で供給し、P08 の canonical migration artifact を前提にしていない (DMDB-T13 のみ P08 完了後に有効化され、canonical migration との同値を追加検証した)。

## 1. 実行環境と再実行コマンド

- 実行日: 2026-07-24 / Node v22.21.1 / vitest 3.2.7 / drizzle-orm 0.45.2 / @libsql/client 0.15.x
- 再実行: `pnpm --filter @harness-hub/db test` (テスト本体) / `pnpm --filter @harness-hub/db run check:ddl && pnpm --filter @harness-hub/db run check:tenant-isolation-coverage && pnpm --filter @harness-hub/db run check:connection-isolation` (静的ゲート)
- 結果サマリ: **Test Files 13 passed / Tests 62 passed / 0 failed** (DMDB-T13 有効化後の最終走行)

## 2. Test ID 別結果

| Test ID | テストファイル | 結果 | 備考 |
|---|---|---|---|
| DMDB-T01 | `__tests__/dialect-compat.test.ts` (2 tests) | **pass** | 公開 package subpath (`/connection`, `/repository`, `/schema`) の解決を含め、libSQL (`@libsql/client` file backend = 本番同一 driver) と D1 (`drizzle-orm/d1` + node:sqlite shim) の双方で同一スキーマ・同一リポジトリ関数の CRUD が成功 |
| DMDB-T02 | `__tests__/release-immutable.test.ts` (6 tests) | **pass** | 公開 API 表面 = createRelease/updateReleaseStatus/読取のみ・汎用 CRUD 生成拒否・version 自動採番 (同一 hash 再採番なし / 差分 +1)・stable pointer atomic 切替と rollback・他 channel release の拒否 |
| DMDB-T03 | `__tests__/tenant-isolation.test.ts` (4 tests) | **pass** | スキーマ駆動で tenant_id 保有 14 テーブルを列挙し、A スコープから B の行 0 件・cross-tenant update/delete 不到達・TENANT_SCOPE_EXEMPT 宣言と実スキーマの一致を確認 |
| DMDB-T04 | `__tests__/ulid-epoch.test.ts` (4 tests) | **pass** | ULID 26 文字 Crockford Base32・時系列単調・衝突なし。クライアント指定の id/created_at はサーバ値で上書き。update での created_at 書換不可。last_login_at は `markLastLogin()` がサーバ時刻だけを書き込む |
| DMDB-T05 | `__tests__/r2-registry.test.ts` (4 tests) | **pass** | put の冪等 (再 put は書込 0 回)・決定的 key (`packages/{hash}`)・get round-trip バイト一致・DB は参照 4 列のみ保持 |
| DMDB-T06 | `__tests__/backup-restore.test.ts` (6/7 tests) | **pass** | export 断面に salary/secret 平文なし・暗号文形式維持・export 本文の決定論性・別 DB restore で exact 18 テーブル集合/行数/chain/断面整合・テーブル丸ごと欠落/行欠落 artifact の失敗判定・改竄 artifact の chain 検証失敗 |
| DMDB-T07 | `__tests__/migration-lineage.test.ts` (2 tests) + `check:ddl` | **pass** | drizzle.config の out 単一・journal 単一 lineage (idx 連番)・破壊的 DDL 0 件 |
| DMDB-T08 | `scripts/check-connection-layer-isolation.ts` + `__tests__/types/context-enforcement.ts` (tsc) | **pass** | packages/db 外からの driver 直接 import 0 件。RepositoryContext 省略は `@ts-expect-error` で tsc が強制 (tsc --noEmit exit 0) |
| DMDB-T09 | `__tests__/users-schema-match.test.ts` (3 tests) | **pass** | users 実カラム = §2.2 定義 (department/salary 含む) + created_at。UNIQUE(tenant_id, idp_subject)。コアドメイン exact 18 テーブル |
| DMDB-T10 | `__tests__/audit-chain.test.ts` (6 tests) | **pass** | 公開 API append/read のみ・正常 chain pass・改竄/削除/挿入の検出・並行 append 8 本で seq 1..8 重複なし |
| DMDB-T11 | `__tests__/encryption.test.ts` (6 tests) | **pass** | round-trip・並行初回暗号化時の DEK 発行競合収束・IV 非再利用・AAD 不一致失敗・purpose 間非互換・DEK rotation 後の旧版復号互換 + 新版採用・不正 KEK 拒否 |
| DMDB-T12 | `__tests__/backup-restore.test.ts` (CLI test) | **pass** | export CLI → restore CLI (`--ddl` = harness DDL) が exit 0。report.ok=true / chainOk=true。認証 token の argv option は存在せず、`TURSO_AUTH_TOKEN` env だけを参照 |
| DMDB-T13 | `__tests__/migration-lineage.test.ts` (P08 後有効化) | **pass** | canonical migration (0000_baseline-core-domain.sql) 適用スキーマ形状 ≡ harness DDL 適用形状 (18 テーブル・列・unique index 完全一致) |

静的ゲート実測: `check:ddl` OK (1 migration / 単一 lineage / 破壊的 DDL 0 件)、`check:tenant-isolation-coverage` OK (scoped=14 / exempt=4 宣言一致 / fixture 網羅 14/14)、`check:connection-isolation` OK (違反 0 件)。lint (biome) exit 0 / typecheck (tsc --noEmit) exit 0。

## 3. 実行中に検出し是正した事項 (差し戻しではなく P05 内是正)

1. **@libsql/client ローカル backend の transaction 別接続問題**: `:memory:` ではトランザクションごとに新接続が開かれスキーマが見えない。テスト DB を一時ファイル + `PRAGMA journal_mode=WAL` へ変更 (本番 Turso server には存在しない現象。support/test-db.ts に理由コメントを固定)。
2. **並行 append の SQLITE_BUSY**: rollback journal モードで reader の SHARED ロックが writer の COMMIT を塞ぐ偽 BUSY。WAL 化 + audit append の再試行条件へ busy/locked を追加 (UNIQUE 違反と同格の競合として扱う。ジッタ付きバックオフ)。

## 4. 判定

P04 の全テストケース (13 Test ID) が **fail 0 件で pass**。P07 (受入) へ引き継ぐ。
