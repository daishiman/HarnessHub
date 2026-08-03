---
status: partial
layer: feature-operations
task: SYS-TENANT-DATA-RETENTION-P13
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
source: [docs/infrastructure-spec.md, docs/features/feat-tenant-data-retention/evidence-summary.md]
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
architecture_refs: []
---

# feat-tenant-data-retention P13 リリース/デプロイ記録

- graph_node_id: `SYS-TENANT-DATA-RETENTION-P13`
- feature_context_digest: `sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327`
- 記録日: 2026-08-03

## 0. 実施範囲の明示的な境界

**本セッションでは Cloudflare への実デプロイ権限 (`CLOUDFLARE_API_TOKEN` 等の投入環境・GitHub Actions
実行権限) を持たない。** `docs/infrastructure-spec.md` §7/§12 が確定している通り、本番デプロイは
`main` ブランチへの merge をトリガに GitHub Actions (`ci.yml`) が全自動実行するものであり、開発セッション
から直接 `wrangler deploy` を叩く運用ではない。したがって本 task で **実施できるのは手順の文書化のみ**
であり、以下は実施していない。

- 実際の production への migration 適用・`wrangler deploy` 実行
- post-deploy smoke test (upload/取得/削除 API・R2 使用量監視 cron 起動・テナント分離縮小確認)

これらは本ブランチが `main` へ merge され CI/CD デプロイジョブが走った後に初めて実行可能になる。
本ファイルの `status: partial` はこの制約を示す。

## 1. encryption_keys DEK seed migration の適用順序

既存の deploy job (`docs/infrastructure-spec.md` §7) は「必須設定 preflight → Worker secret 実投入
検査 → production へ drizzle migrate → `wrangler deploy` → post-deploy health + smoke → 失敗時
rollback」の順で実行される。本 feature の migration (`0005_tenant-data-retention-envelope-encryption.sql`
/ `0006_tenant-data-tombstones.sql`) はこの既存パイプラインにそのまま乗る。

- migration は追記のみ (既存 0000〜0004 を書き換えない、`refactoring-migration-note.md` §1.2 参照)。
- `encryption_keys.tenant_id` は nullable で追加するため、migration 適用直後もアプリケーションコード
  デプロイ前の旧コードが新 schema 上でそのまま動作する (expand-only、§7 G7 の前方互換方針と一致)。
  そのため「migration 先行・deploy 追従」の順序で問題が起きない。
- `tenant_data` purpose の DEK は初回 upload 時に遅延生成される設計であり、事前の seed 投入は不要
  (`ColumnCipher.ensureActiveDek()` が active DEK 不在時に生成する、`crypto.ts` 既存実装)。

## 2. wrangler ロールアウト

`apps/hub/wrangler.jsonc` の `r2_buckets` に `TENANT_DATA_BUCKET` (bucket_name:
`harness-hub-tenant-data`) が追加済み (P08 で非破壊性確認済み)。この binding は `wrangler deploy` 実行
時に設定ファイルから押し込まれる (§7 の「vars・binding・cron trigger は deploy が本設定ファイルから
押し込むため乖離しない」)。追加の手動 R2 バケット作成手順が必要な場合は、deploy 前に Cloudflare
dashboard または `wrangler r2 bucket create harness-hub-tenant-data` で当該バケットを作成しておく必要が
ある (バケット自体は `wrangler deploy` が作成しない)。

## 3. rollback 手順

既存の rollback 契約 (`infrastructure-spec.md` §7、2026-07-25 確定) をそのまま適用する。

- deploy step が success したときのみ `wrangler rollback` (直前 version へ) が failure 時に自動実行
  される。
- **DB は自動 rollback しない**。本 feature の migration は expand-only (nullable 列追加 + 新規
  index) のため、旧コードが新 schema 上でも動作し続ける。このため deploy を rollback しても migration
  を巻き戻す必要はない。

## 4. post-deploy smoke test 項目 (実行手順のみ文書化、実行は未実施)

`main` merge 後の CI/CD deploy job で以下を smoke test として実行すべきことを記録する。

| # | 項目 | 確認内容 |
| --- | --- | --- |
| 1 | upload API | `POST /api/v1/tenant-data/objects` が 201 を返す |
| 2 | 取得 API | upload したオブジェクトを `GET .../objects/:id` および `.../content` で取得できる |
| 3 | 削除 API | `DELETE .../objects/:id` 後、一覧・取得から消えることを確認する |
| 4 | R2 使用量監視 cron 起動 | `turso-usage-monitor` スロットが登録済みであることを health/log から確認する |
| 5 | テナント分離縮小確認 | 2 テナントで upload し、互いの `:id` を指定した取得が 404 になることを確認する |

## 5. feature context の scope_in/acceptance 全件の P13 責務追跡

`feature_context_digest` の scope_in 6 件のうち、本 task が直接変更したのは本ファイルのみ (残り 5 件
`apps/hub/src/lib/scheduled/usage-monitor.ts` / `packages/db/migrations/` / `packages/db/src/backup/
tenant-data-tombstones.ts` / `packages/db/src/repository/tenant-deks.ts` / `packages/db/src/schema/
encryption-keys.ts` は task spec 記載パスであり、実パスは P08 で確認済みの `packages/db/schema/core/
security.ts` 等に対応、いずれも P05〜P08 で実装・検証済みでコード変更は本 task では発生していない)。

**未割当項目: 0 件** (前段の 5 件は本ファイル §1〜§3 で移行元の実装との対応を明記した)。

## 6. 判定

acceptance「release-record.md に本番デプロイ完了記録と smoke test 全項目の pass 結果が記載されている」
は、**手順の文書化までを完了し、実デプロイと smoke test 実行そのものは本セッションの権限外のため未実施**
である。この点を偽って「完了」と記載することはしない。実デプロイ・smoke test の実行は、本ブランチが
`main` へ merge され CI/CD パイプラインが走った後、`docs/infrastructure-spec.md` §7 の既存 deploy job
が自動的に担う。
