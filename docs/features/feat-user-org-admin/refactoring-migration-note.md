---
status: pass
layer: feature-migration
task: SYS-USER-ORG-ADMIN-P08
feature_package_id: feature-package/feat-user-org-admin
source_digest: sha256:2b8b98b7ea12e01a3628583051d98647558e7cae652c5e38aee39a4e87046b14
---

# feat-user-org-admin リファクタリング・migration記録

## 判定: 新規 migration 適用は不要 (N/A、根拠あり)

published task spec (phase-08) は「User テーブルへの department/salary 列追加」「TenantCoefficient 新規テーブル」の migration 適用を前提としていたが、これは P02 (アーキテクチャ設計) 初版の申告であり、[architecture-decision-record.md AD-1](./architecture-decision-record.md#1-ad-1-users-テーブルのカラム-owner-は-feat-domain-model-db-であり本-feature-は-port-越しにのみ消費する)・[AD-4](./architecture-decision-record.md#4-ad-4-tenant_coefficients-の-owner-は-feat-hearing-intake-であり本-feature-は読取専用で消費する) が P03 独立レビューでの重複指摘を受けて訂正済みである。

- `users.department`/`users.salary`: `packages/db/migrations/0000_baseline-core-domain.sql:112-113` で既に列定義済み (owner = feat-domain-model-db)。本 feature はカラムを追加しない。
- `tenant_coefficients`: `packages/db/migrations/0002_hearing-intake-ai-queue.sql:51` で既に新規テーブルとして適用済み (owner = feat-hearing-intake)。本 feature は `HearingIntakeRepository.getCoefficients()` を port として読取専用で消費するのみ。

## 変更

なし。`packages/db/migrations/` へのファイル追加・`packages/db/schema/core/`・`packages/db/schema/hearing-intake/` への列変更を一切行わない (write_scope に含めない、AD-1/AD-4 と同型のパターン)。

## 互換性

- 既存 `users` 行への `ALTER`・削除・列変更はない (列は既に本番相当の migration 0000 で確定済み)。
- `tenant_coefficients` は本 feature が書込むテーブルではないため既存データへの影響はない。
- P06 のテスト実行 (98 files / 1144 passed / 0 failed) で既存の認証・role 認可機能に回帰が無いことを実測確認済み。今回 migration を適用しないため、この結果がそのまま P08 完了後の回帰確認としても有効。

## 再確認

新規 migration が無いため dry-run/再適用テストは対象外。既存 migration 0000/0002 がそのまま有効であることを `packages/db/__tests__/migration-lineage.test.ts` の既存契約でカバーしている (本 feature 側での追加テストは不要)。本番適用自体は P13 の責務であり未実施。
