---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P11
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
compiled_at: 2026-07-24
consumes: [docs/features/feat-domain-model-db/test-run-results.md, docs/features/feat-domain-model-db/acceptance-record.md, docs/features/feat-domain-model-db/quality-assurance-report.md, docs/features/feat-domain-model-db/final-review-record.md]
---

# feat-domain-model-db エビデンスサマリ (P11)

> **位置づけ**: P06/P07/P09/P10 に分散する証跡を単一参照点へ集約し、P12 (runbook) と P13 (リリース) が参照できる状態にする。本文書は新たな検証を行わない (既存証跡の集約のみ)。

## 1. リリース判定に必要な事実の一覧

| 項目 | 値 | 正本 |
|---|---|---|
| テストケース総数 / pass | **13 Test ID (62 tests) / 62 pass / 0 fail** | [test-run-results.md](./test-run-results.md) §1-2 |
| acceptance 3 項目 | **A1/A2/A3 すべて pass** | [acceptance-record.md](./acceptance-record.md) |
| CI 品質ゲート | **全ゲート pass** (分離・網羅・接続層隔離・secret scan・単一 lineage・migration apply・restore round-trip)。G7 有効化 + G7b 新設で ci.yml へ接続済み | [quality-assurance-report.md](./quality-assurance-report.md) |
| quality_constraints 10 件 (exact-set) | **10/10 充足** (独立レビューが実走再検証) | [final-review-record.md](./final-review-record.md) |
| 再実行コマンド | `pnpm --filter @harness-hub/db test` / `run check:ddl` / `run check:tenant-isolation-coverage` / `run check:connection-isolation` | test-run-results.md §1 |
| source digest | feature_context=`sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc` / package=`sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b` (全成果物 frontmatter に固定) | 各成果物 frontmatter |

## 2. 設計判断 2 件の追跡ポインタ

1. **User 基底テーブル owner 決定**: [architecture-decision-record.md](./architecture-decision-record.md) §1 (3 系統証跡) → [design-review-notes.md](./design-review-notes.md) 観点 1 で独立承認 → 実装検証は DMDB-T09。cross-feature follow-up (feat-user-org-admin の plan 記述訂正) は dev-graph へ申し送り済み。
2. **qa-045 (tenant_data_objects) の digest スコープ外確定**: [architecture-decision-record.md](./architecture-decision-record.md) §11 → [design-review-notes.md](./design-review-notes.md) 観点 4 で grep 再現・承認。follow-up は feat-tenant-data-retention (HarnessHub-47b) が追跡。

## 3. P13 (リリース) への引き継ぎ事実 (2026-07-24 読み取り専用で事前確認)

- 本番 Turso `harness-hub-prod`: 実在・**空 (テーブル 0 件)** — 初回 migration 適用は新規作成のみで既存データ影響なし
- R2: `harness-hub-packages` / `harness-hub-backups` の両バケット実在
- D1 hedge: 未プロビジョニング (wrangler.jsonc に d1 binding なし)。hedge 適用は P13 実施時に provisioning から行う
- 適用物: `packages/db/migrations/0000_baseline-core-domain.sql` (単一 lineage・破壊的 DDL 0 件)
- **リリース未実施**: completion policy (linked_pr_merged_all) に従い、PR merge 後に P13 を実行する。実行手順は [runbook.md](./runbook.md) と P13 task spec に従う
