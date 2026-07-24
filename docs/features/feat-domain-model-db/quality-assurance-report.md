---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P09
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
executed_at: 2026-07-24
consumes: [docs/security-spec.md, packages/db/schema/core/, packages/db/connection/, packages/db/repository/]
---

# feat-domain-model-db 品質保証レポート (P09)

> **位置づけ**: security-spec §8 の CI 品質ゲートのうち本 feature に該当する項目を実装・実測し、`.github/workflows/ci.yml` へ接続した記録。全ゲート fail-closed (検出 = CI 失敗)。

## 1. CI ゲート一覧と実測結果

| ゲート | 実装 | CI 接続 (ci.yml) | 実測結果 (2026-07-24) |
|---|---|---|---|
| テナント分離テスト (CI 必須, §8.4) | `__tests__/tenant-isolation.test.ts` (DMDB-T03。2 テナント fixture + スキーマ駆動列挙) | G4 `pnpm -r test` | **pass** (4/4。A スコープから B の行 0 件) |
| schema-driven 分離テスト網羅性 (§8.4「新テーブル追加時に未対応なら fail」) | `scripts/check-tenant-isolation-coverage.ts` (barrel 列挙 ↔ TENANT_SCOPE_EXEMPT 宣言 ↔ fixture seed の 3 者突合) | **G7b** (新設) | **pass** (scoped=14 / exempt=4 宣言一致 / fixture 網羅 14/14) |
| 接続層隔離 (qa-020 / CI-6 相当) | `scripts/check-connection-layer-isolation.ts` (packages/db 外からの `@libsql/client`・`drizzle-orm/libsql`・`drizzle-orm/d1`・`node:sqlite` import 禁止) + 型レベル強制 (`__tests__/types/context-enforcement.ts`, tsc) | **G7b** (新設) + G3 typecheck | **pass** (直接 import 0 件 / tsc exit 0) |
| secret scan (§8.3 CI-4 / G6) | 既存 `packages/inspection` scan:secrets (リポジトリ全体) — encryption_keys/idp_connections 関連コードに平文シークレットのハードコードなし。KEK はテスト用固定値のみ (`TEST_KEK_B64`、鍵素材ではなく全 0x07 のテストベクタ) | G6 (既存) | **pass** (exit 0) |
| 単一 migration 系統の維持 | `scripts/check-ddl.mjs` (journal↔.sql 1:1・idx 連番・drizzle.config out 単一) + `__tests__/migration-lineage.test.ts` (DMDB-T07/T13) | G7 (既存。migrations/ 出現により有効化) | **pass** (1 migration / 単一 lineage / 破壊的 DDL 0 件 / canonical ≡ harness) |
| migration apply | DMDB-T13 (canonical migration を実 SQLite へ適用しスキーマ形状を検証) | G4 | **pass** |
| export artifact 完全性 + 別 DB restore round-trip (qa-019) | DMDB-T06/T12 (`__tests__/backup-restore.test.ts`。exact 18 テーブル集合・行数・audit chain・暗号断面。CLI 経由含む) | G4 | **pass** (7/7) |
| audit append-only (CI-2 相当) | AuditRepo が append/read のみを公開 (実行時 API 表面検査 = DMDB-T10) + 汎用 CRUD の生成拒否 | G4 | **pass** |

## 2. ci.yml への接続内容

- **G7 (既存)**: `packages/db/migrations` の出現により `check:ddl` が有効化された (workflow は変更不要の設計が既に組まれており、`package.json` へ `check:ddl` script を追加して要求を充足)。
- **G7b (新設)**: `check:tenant-isolation-coverage` と `check:connection-isolation` を required step として追加。`check-required-package-script.mjs` により script の存在自体も fail-closed で検査される。
- **G4 (既存)**: packages/db のテスト 62 件 (分離・migration apply・export/restore round-trip・chain・暗号) が `pnpm -r test` で実行される。ci.yml 内にコメントで対応関係を明記した。

## 3. 判定

該当する全 CI 品質ゲート (テナント分離・分離テスト網羅・接続層隔離・secret scan・単一 migration 系統・migration apply・export/restore round-trip) が **pass**。P10 (最終独立レビュー) へ引き継ぐ。
