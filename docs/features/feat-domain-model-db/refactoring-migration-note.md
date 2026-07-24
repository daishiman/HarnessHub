---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P08
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
consumes: [packages/db/schema/core/, packages/db/schema/index.ts, docs/features/feat-domain-model-db/acceptance-record.md]
---

# feat-domain-model-db マイグレーション運用ノート (P08)

> **位置づけ**: 初回ベースライン migration の生成記録と、単一 migration lineage の運用規約 (命名・Studio 拡張の積み増しルール)。

## 1. 初回ベースライン migration の生成 (実施記録)

- 生成コマンド: `pnpm --filter @harness-hub/db exec drizzle-kit generate --name baseline-core-domain`
- 生成物: `packages/db/migrations/0000_baseline-core-domain.sql` (コアドメイン 18 テーブル + UNIQUE index 群) / `packages/db/migrations/meta/_journal.json` / `meta/0000_snapshot.json`
- 設定正本: `packages/db/drizzle.config.ts` — dialect=sqlite / schema=`./schema/index.ts` (barrel 単一入力) / out=`./migrations` (単一出力先)
- 検証 (実測):
  - DMDB-T13: migration SQL 適用後のスキーマ形状 (テーブル・列・unique index) が schema barrel 導出 DDL と**完全一致** (pass)
  - DMDB-T13 追補: 2-tenant fixture が canonical migration 適用 DB 上でも成立 (backup-restore 系テストの DDL 供給源を通じて検証)
  - `check:ddl`: 単一 lineage (journal ↔ .sql 1:1・idx 連番)・未承認の破壊的 DDL 0 件
- 本 feature は control-plane DB の最初のスキーマ確立者であり、既存データへの破壊的変更は無い (新規作成のみ)。backfill 対象なし。

## 2. 命名規約とタイムスタンプ順序

- migration ファイル名は drizzle-kit の既定 `NNNN_<name>.sql` (NNNN = 0 起点の連番 = journal の idx) を維持する。手動リネーム禁止 (journal との対応が壊れる)。
- `--name` には変更内容が読める kebab-case を与える (例: `0001_add-hearing-sheets`)。
- 適用順序は `meta/_journal.json` の entries 順が正本。ファイル名の辞書順は結果的に一致するが、正本は journal である。

## 3. Studio 拡張 feature の積み増しルール (単一 lineage の維持)

1. 自 feature の write_scope `packages/db/schema/{studio-feature}/` にテーブル定義を追加する (`drizzle-orm/sqlite-core` の driver 非依存 API のみ。共通規約: ULID PK / INTEGER epoch ms / tenant_id 必須)。
2. `packages/db/schema/index.ts` (barrel) へ `export * from './{studio-feature}/…'` を 1 行追加する (barrel は re-export のみ。編集はこの 1 行に限る)。
3. `pnpm --filter @harness-hub/db exec drizzle-kit generate --name <変更名>` を実行する。出力先・入力は drizzle.config.ts が固定しているため、必ず同一 lineage への追加 migration になる。
4. `check:ddl` と `check:tenant-isolation-coverage` を通す。tenant_id を持つ新テーブルは 2-tenant fixture への seed 追加が必須 (未追随は CI fail)。tenant_id を持たせない場合は `TENANT_SCOPE_EXEMPT` へ理由つきで宣言する (未宣言は CI fail)。
5. コンフリクト時 (並行して別 feature が migration を追加した場合): 後から merge する側が自分の migration を破棄し、main を取り込んだ後に手順 3 を**再実行**して連番を採り直す。生成済み SQL の手編集で番号を詰めることは禁止 (snapshot と乖離する)。

## 4. 破壊的 DDL の扱い (expand/contract)

- 既定で許すのは追加系 (CREATE TABLE / CREATE INDEX / ADD COLUMN) のみ。
- DROP/RENAME/破壊的 ALTER は expand → デュアルリード/ライト → contract の 3 段階を経たうえで、該当文の直前行に `-- ddl:contract-approved <理由>` を明記した場合のみ CI (`check:ddl` = G7) を通過する。

## 5. 適用手順 (参照)

- ローカル/検証: `pnpm --filter @harness-hub/db run restore:control-plane -- --url file:<path> --in <artifact> --migrations-dir packages/db/migrations` が「migration 適用 → データ復元 → 整合検査」を一括で行う。スキーマ適用のみ必要な場合も同 CLI の DDL 適用部 (`--migrations-dir`) が正本。
- 本番適用は P13 (リリース/デプロイ) の手順に従う。
