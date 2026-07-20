---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P11
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
package_digest: sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502
collected_at: "2026-07-21"
---

# feat-hub-foundation 証跡索引 (P11)

> **P11 の責務**: P06/P07/P09/P10 の実行結果を、**再現可能な形式**で集約する。source digest と再実行コマンドを保全し、後から同じ判定を再現できる状態にする。

## 1. 一次証跡ファイル

| 証跡 | ファイル | 生成元 | 再実行コマンド |
|---|---|---|---|
| E1 全登録共通層の owner / 公開 API / consumer 一覧 | [shared-layer-ownership.json](shared-layer-ownership.json) | P05/P09 | `node scripts/ci/check-shared-layer-duplicates.mjs --report <path> --no-fail` |
| E2 consumer contract test 実行結果 | [test-run.log](test-run.log) | P06 | `pnpm -r test` |
| E3 duplicate implementation scan（0 件） | [duplicate-scan.json](duplicate-scan.json) | P09 | `node scripts/ci/check-shared-layer-duplicates.mjs --json <path>` |
| E4 CI（test→deploy 完走） | **未取得** | P06 | GitHub Actions の run（push 後） |
| E5 bundle サイズ計測（0.951 MiB / 3 MiB） | [bundle-report.json](bundle-report.json) | P06 | `pnpm --filter @harness-hub/hub run build:worker && pnpm --filter @harness-hub/hub run check:bundle` |
| E6 SLO 計測 / `/health` 稼働 | **未取得**（route handler の契約テストのみ） | P06/P13 | デプロイ + 外形監視設定後 |
| — pnpm 混入検査 | [pnpm-only-scan.json](pnpm-only-scan.json) | P09 | `node scripts/ci/check-pnpm-only.mjs --json <path>` |

## 2. 判定文書

| phase | 文書 |
|---|---|
| P01 要件ベースライン | [../requirements-baseline.md](../requirements-baseline.md) |
| P02 アーキテクチャ決定（改訂 2） | [../architecture-decision-record.md](../architecture-decision-record.md) |
| P03 独立設計レビュー（差し戻し → 是正済み） | [../design-review-notes.md](../design-review-notes.md) |
| P04 テスト設計 | [../test-design.md](../test-design.md) |
| P07 受入判定 | [../acceptance-report.md](../acceptance-report.md) |
| P08 リファクタ/移行 N/A 判定 | [../refactoring-migration-note.md](../refactoring-migration-note.md) |
| P09 品質・セキュリティ・運用保証 | [../quality-assurance-report.md](../quality-assurance-report.md) |
| P10 最終独立レビュー | [../final-review-notes.md](../final-review-notes.md) |
| P12 運用手順 | [../runbook.md](../runbook.md) |

## 3. 実測サマリ（2026-07-21）

| 項目 | 値 |
|---|---|
| テスト | 36 test files / **495 tests 全 pass** |
| 型検査 | 全 6 package PASS |
| Worker bundle（gzip） | **0.951 MiB** / 予算 3.000 MiB |
| duplicate scan | 174 ファイル走査 / **0 件** |
| 登録共通層 | 12 件（owner 未定義 0 件） |
| pnpm 混入 | 0 件 |

## 4. 未取得の証跡（pass に読み替えないこと）

| 証跡 | 理由 | 解除条件 |
|---|---|---|
| E4 CI run | push 未実施 | `feat/wt-2` を push |
| E6 SLO / 実 HTTP `/health` | デプロイ・外形監視が未設定 | Cloudflare 認証 + Better Stack 登録 + P13 |
| G6/G7/G8/G11 ゲート | script 未配線 / 対象未作成 / デプロイ後 | quality-assurance-report.md §3 |
| restore drill | `backup.yml` 未実装 | follow-up 起票 |

## 5. source integrity

- feature context: `features/feat-hub-foundation.context.json` = `sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`（実測一致）
- published package digest: `sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- 検証コマンド: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb16.../` → `status: pass`
