---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P07
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
judged_at: 2026-07-24
consumes: [docs/features/feat-domain-model-db/test-run-results.md, .dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/goal-spec.json]
---

# feat-domain-model-db 受入記録 (P07)

> **位置づけ**: goal-spec の acceptance 3 項目を P06 の実行済み証跡のみに基づいて判定した記録。
> P07 契約どおり、P06 の executable な証跡 (D1 互換・immutable・tenant 分離・export/restore round-trip) だけで判定し、P12 (runbook) を前提にしていない。

## 判定

| # | acceptance (goal-spec 転記原文) | 判定 | 根拠 (P06 実行済み証跡) |
|---|---|---|---|
| A1 | スキーマが SQLite 方言互換で D1 接続テストが通る | **pass** | DMDB-T01: 同一スキーマ barrel に対し libSQL 接続 (`drizzle-orm/libsql` + `@libsql/client`) と D1 接続 (`drizzle-orm/d1`) の双方で CRUD 成功 (2/2 pass)。DMDB-T13: canonical migration 適用スキーマが harness 導出スキーマと同値 (18 テーブル一致)。スキーマ定義は `drizzle-orm/sqlite-core` の driver 非依存 API のみを使用 (SQLite 方言互換) |
| A2 | Release が immutable として強制される | **pass** | DMDB-T02 (6/6 pass): リポジトリ層公開 API に status 以外の更新関数が存在しない (API 表面検査)・汎用 CRUD 生成が immutable 契約で拒否される・updateReleaseStatus は status のみ変更・version 自動採番 (差分 + content hash)・stable pointer atomic 切替/rollback |
| A3 | バックアップ export と復元手順が検証済み | **pass** | DMDB-T06 (6/6 pass): export → **別 DB** restore round-trip 成功 (行数一致 + audit chain 検証 + salary/secret 暗号断面維持)。壊れた artifact (行欠落・改竄) は失敗と判定 = 「復元できないバックアップを成功と数えない」(qa-019)。DMDB-T12: CLI (`export-control-plane.ts`/`restore-control-plane.ts`) 経由でも exit 0 で完走 |

## 結論

**acceptance 3 項目すべて pass**。P05/P06 への差し戻しなし。P08 (リファクタリング/マイグレーション) へ引き継ぐ (時系列注記: P08 の初回ベースライン migration は本判定と同一セッションで生成済みであり、DMDB-T13 の同値検証も pass 済み)。
