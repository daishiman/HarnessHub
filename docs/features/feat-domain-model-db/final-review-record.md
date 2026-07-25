---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P10
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
reviewer: independent-fork (P02-P09 実行 context から独立した subagent。read-only + 検証コマンド実走)
judged_at: 2026-07-24
consumes: [docs/features/feat-domain-model-db/architecture-decision-record.md, docs/features/feat-domain-model-db/design-review-notes.md, docs/features/feat-domain-model-db/test-run-results.md, docs/features/feat-domain-model-db/acceptance-record.md, docs/features/feat-domain-model-db/quality-assurance-report.md]
---

# feat-domain-model-db 最終独立レビュー記録 (P10)

> **位置づけ**: goal-spec の quality_constraints **10 件 (exact-set)** の充足を、P02〜P09 実行者から独立した context で最終判定した記録。文書の主張を鵜呑みにせず、テスト 62 件・静的ゲート 3 種をレビュー側で実走し、実装コード・migration SQL・CI ワークフローを直接確認した。

## 前提確認

- goal-spec (package digest `6ac94e1d…`) の quality_constraints は 10 件ちょうどで、下表の 10 ID と exact 一致 (順序・過不足なし)。
- レビュー側の独立実測: `pnpm --filter @harness-hub/db test` → **13 files / 62 tests pass / 0 fail**。`check:ddl` / `check:tenant-isolation-coverage` / `check:connection-isolation` → いずれも OK。migration SQL の CREATE TABLE = 18 (core 18 と一致)。display_code_counters は core migration に 0 件 (Studio 拡張 owner の維持を確認)。export 経路 (`backup/export.ts`) に decrypt 呼出し 0 件。

## constraint 別判定 (10/10 充足)

| # | constraint id | 判定 | 独立検証の根拠 (要約) |
|---|---|---|---|
| 1 | sqlite-dialect-compat-d1-fallback-connection-layer-d2 | **充足** | schema は `drizzle-orm/sqlite-core` の driver 非依存 API のみ。turso/d1 の 2 ファクトリが同一境界型を返す。DMDB-T01 (2/2) 実走 pass。check:connection-isolation OK |
| 2 | release-immutable-atomic-stable-pointer-i3 | **充足** | releases リポジトリに status 以外の更新関数が存在しない (コード直接確認)。汎用 CRUD 迂回は GENERIC_CRUD_FORBIDDEN で throw。version は package_hash 差分で自動採番。setStableRelease は単一 UPDATE で atomic。DMDB-T02 (6/6) pass |
| 3 | tenant-workspace-scope-row-level-d4 | **充足** | 全リポジトリ操作で WHERE tenant_id 強制注入。TENANT_SCOPE_EXEMPT の機械宣言と実スキーマの突合 OK (scoped=14 / exempt=4)。fixture 網羅 14/14。DMDB-T03 (4/4) pass。CI G4+G7b 必須接続 |
| 4 | ulid-pk-display-code-epoch-server-time-qa032 | **充足** | 26 文字 Crockford Base32 monotonic ULID・epoch ms 単一注入点・id/created_at のサーバ発行 (クライアント入力無視)。DMDB-T04 (4/4) pass。display_code_counters は Studio 拡張 owner で core scope 外 (ADR §2 / P03 承認) |
| 5 | r2-content-addressed-package-registry-c4 | **充足** | registry は putPackage/getPackage の 2 関数のみ。key=`packages/{sha256}` 決定的導出。head 確認で同一 hash 書込スキップ (immutable)。packages テーブルは参照 4 列のみで顧客データ・secret を持たない。DMDB-T05 (4/4) pass |
| 6 | daily-export-quarterly-restore-drill-qa019 | **充足** | backup.yml が日次 cron で fail-closed。restore は行数一致・audit chain 検証・暗号文形式検査を全て満たさないと ok=false (「復元できないバックアップを成功と数えない」の機械化)。export 経路に復号なし = 断面に平文なし (grep 確認)。DMDB-T06/T12 (7/7) pass |
| 7 | single-migration-pipeline-drizzle-repository-package | **充足** | drizzle.config は入力 barrel 単一・出力 out 単一。migrations は 0000 の単一 lineage (journal idx 0)。check:ddl 実走 OK。DMDB-T07/T13 (3/3) pass |
| 8 | repository-layer-db-access-isolation-qa020 | **充足** | check-connection-layer-isolation.ts が packages/db 外からの driver 直接 import (型 import 含む) を fail-closed で禁止する実効的検査であることをコードと実走で確認 (違反 0 件)。型レベル強制 (RepositoryContext 第 1 引数) と併せ機械証明。CI G7b 必須接続 |
| 9 | user-base-table-schema-owner-unresolved-p02 | **充足 (解消済み)** | ADR §1 (P02) が 3 系統証跡で owner=feat-domain-model-db を決定、P03 独立 fork が承認。users 実装は department/salary 含む完全基底定義。feat-user-org-admin 側の矛盾記述は当該 write_scope 配下のため dev-graph follow-up として正しく申し送り済み。DMDB-T09 (3/3) pass |
| 10 | executable-export-restore-ci-fixture | **充足** | export/restore は P05 でコード実装、migration 適用済み 2-tenant fixture が実在、round-trip は P06/P09 で実行 (CLI 経由 exit 0 完走を含む 7/7 pass)。CI G4 で毎 PR 実行。P12 文書を先行条件にしていない |

## 総合判定 — **全 10 件充足** (差し戻し先なし)

成果物文書の参照 + テスト 62 件/静的ゲート 3 種の実走 + 実装コードの直接確認 + migration SQL・CI ワークフローの実測により独立検証し、いずれも充足。P11 (エビデンス収集) へ引き継ぐ。

## 補足 observation (差し戻し事由ではない。いずれも設計上正当と判定)

1. **constraint 4 (display_code_counters)**: 表示用連番カウンタは本 feature core の scope 外であり、Studio 拡張 feature が owner (ADR §2 / P03 観点 2 で独立承認済み)。core migration に display_code_counters が 0 件であることはレビュー側の実測で確認済みで、これは gap ではなく責務境界。本 feature 所管の ULID PK + サーバ epoch 時刻は完全充足。
2. **constraint 6 (四半期 restore drill)**: drill の定期スケジュール運用化は P12 runbook の領域。goal-spec の `executable-export-restore-ci-fixture` が「P12 文書を先行条件にしない」と明示しており、executable な核 (別 DB への restore round-trip と失敗判定の機械化) は実装・実測済みのため受入根拠として成立する。
