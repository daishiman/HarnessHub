---
status: pass
layer: feature-migration
task: SYS-HEARING-INTAKE-P08
feature_package_id: feature-package/feat-hearing-intake
---

# feat-hearing-intake リファクタリング・migration記録

## 変更

- `packages/db/migrations/0002_hearing-intake-ai-queue.sql`
- `packages/db/migrations/meta/0002_snapshot.json`
- `packages/db/migrations/meta/_journal.json`
- `packages/db/schema/hearing-intake/schema.ts`

追加したのは `hearing_sheets`、`ai_jobs`、`display_code_counters`、
`tenant_coefficients` の4テーブルと、検索・一意性・claim用indexである。
FormDataは独立テーブルを作らず `hearing_sheets.form_json` のsnapshotとした。

## 互換性

- 既存19テーブルへの `ALTER`・削除・列変更はない。
- migration全体は23テーブルとなり、dry-run→初回適用→再適用の冪等テストがpassした。
- 新規テーブルのみなので既存データのbackfillは不要。
- `ai_jobs` は3つの共通kindを持ち、feature固有 `kind=hearing` や固有列は追加していない。
- `salary` はrequest境界だけで使い、DB snapshot・API応答・AI payloadへ保存しない。

## 再確認

P08後にHub 609件、DB 213件、Schemas 86件、ヒアリング専用101件を再実行し、全ゲートが
greenであることを確認した。適用失敗時は本migrationの適用を止め、既存Workerを維持して
schemaとsnapshotを修正後にdry-runから再実行する。本番適用自体はP13の責務であり未実施。
