# refactoring-migration-note: feat-build-pipeline-board (P08)

> SYS-BUILD-PIPELINE-BOARD-P08 の確認記録。既存 migration の事実と、ADR の目標設計に対する未実装差分を分けて記録する。

## migration ファイル生成結果

P05 実装 (PR #694/#701) までに、以下の baseline migration が生成・適用済み。

| migration | 内容 |
| --- | --- |
| `packages/db/migrations/0007_feedback-loop-builds.sql` | `builds` テーブル新規作成 (`id`,`tenant_id`,`workspace_id`,`type`,`stage`,`sheet_id`,`feedback_id`,`publish_request_id`,`created_at`,`updated_at`)。`feedback_id` に UNIQUE index、`(tenant_id, workspace_id, stage, updated_at)` に複合 index。 |
| `packages/db/migrations/0008_metrics-tracking-and-build-stage-events.sql` | `build_stage_events` テーブル新規作成 (`build_id`,`from_stage`,`to_stage`,`actor_user_id`,`reason`,`occurred_at` 等) — 工程遷移の監査ログを保持する。 |

`packages/db/schema/builds/schema.ts` と `packages/db/schema/build-pipeline/schema.ts` に、上記 baseline に対応する Drizzle 定義が存在する。ただし、これは ADR §3 の目標スキーマが完了したという意味ではない。

## ADR 目標設計との差分

現行 baseline には、ADR が要求する次の delta migration（既存構造へ追加する差分）がまだ存在しない。

- `sheet_id` と `feedback_id` の厳密な XOR `CHECK`
- tenant 単位の sheet source partial unique index
- `project_id`、表示metadata、risk等の目標列・制約・backfill
- ADR §3.2 の追加制約とscope索引強化

したがって、P08 の「目標スキーマへのmigration生成・適用」は未完了である。既存 `0007` / `0008` は immutable baseline として保持し、必要な変更は新しい feature 専用 delta migration で実装する。

## 後方互換性確認

- **破壊的変更なし**: `builds` / `build_stage_events` はいずれも新規テーブルであり、既存テーブル (`publish_requests` 等) へのカラム追加・削除・型変更は行っていない。
- **`publish_request_id` は新規 FK のみ**: `builds.publish_request_id` は nullable な新規カラムで、既存 `publish_requests` テーブル側にスキーマ変更は発生していない (`builds` → `publish_requests` への単方向参照)。既存の PublishRequest 状態機械 (B4/I2/I3) の挙動・スキーマは無変更。
- **migration lineage テスト**: `packages/db/__tests__/migration-lineage.test.ts` — PASS (5/5)。migration ファイルの journal 順序・snapshot との整合を検証済み (test-run-report.md 参照)。

## scope_in / acceptance 割当チェック

feature context (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`) の migration 要件は追跡できているが、上記 delta migration は実装待ちである。「追跡済み」と「実装済み」を同一視しない。

## 結論

既存 baseline migration のlineage（履歴のつながり）と後方互換性は確認済み。一方、ADR 目標スキーマへ到達する delta migration は未実装のため、P08 全体の判定は **PARTIAL** とする。
