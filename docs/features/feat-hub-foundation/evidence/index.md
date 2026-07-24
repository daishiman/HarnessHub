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
| E2 consumer contract test 実行結果 | [test-run.log](test-run.log)（P06 時点）/ [local-verify-2026-07-21.md](local-verify-2026-07-21.md)（最新） | P06/P09 | `pnpm verify` |
| E3 duplicate implementation scan（0 件） | [duplicate-scan.json](duplicate-scan.json) | P09 | `node scripts/ci/check-shared-layer-duplicates.mjs --json <path>` |
| E4 CI（test→deploy 完走） | [ci-run.md](ci-run.md)（test まで success / deploy skip） | P06 | main push 後の同一 run で deploy まで再確認 |
| E5 bundle サイズ計測（0.952 MiB / 3 MiB） | [bundle-report.json](bundle-report.json) | P06 | `pnpm --filter @harness-hub/hub run build:worker && pnpm --filter @harness-hub/hub run check:bundle` |
| E6 SLO 計測 / `/health` 稼働 | [health-response.json](health-response.json)（`/health` は取得済み、SLO 時系列は未取得） | P06/P13 | 外形監視設定後に月次時系列を取得 |
| — pnpm 混入検査 | [pnpm-only-scan.json](pnpm-only-scan.json) | P09 | `node scripts/ci/check-pnpm-only.mjs --json <path>` |
| 再検証 2026-07-24（Secrets 確定 / cron 10072 / G11 CWV 実測 / G9 両系注入） | [recheck-2026-07-24.md](recheck-2026-07-24.md) | P06/P09/P13 | 各節に記載 |

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
| P10 最終独立レビュー Round 1（差し戻し） | [../final-review-notes.md](../final-review-notes.md) |
| P10 最終独立レビュー Round 2（条件付き承認）＋実装フォローアップ | [../final-review-round2-notes.md](../final-review-round2-notes.md) |
| P12 運用手順 | [../runbook.md](../runbook.md) |

## 3. 実測サマリ（2026-07-21）

| 項目 | 値 |
|---|---|
| テスト | 46 test files / **592 tests 全 pass** |
| 型検査 | 全 6 package PASS |
| Worker bundle（gzip） | **998,715 bytes（0.952 MiB）** / 予算 3.000 MiB |
| duplicate / boundary scan | 200 ファイル走査 / **0 件** |
| 登録共通層・運用機構 | 12 層 + 4 機構（owner artifact 未定義 0 件） |
| pnpm 混入 | 0 件 |
| secret scan | 191 ファイル走査 / **0 件** |

## 4. 未取得の証跡（pass に読み替えないこと）

> 2026-07-24 再検証（[recheck-2026-07-24.md](recheck-2026-07-24.md)）で、G11 実 CWV は**取得済み**へ転じ、E4 / cron trigger は**原因が確定**した。

| 証跡 | 理由 | 解除条件 |
|---|---|---|
| E4 CI deploy | main push の run で deploy job は起動するが、**GitHub Secrets/Variables が全て未設定と確定**（2026-07-24）し `CLOUDFLARE_API_TOKEN` 不在で fail | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `HUB_HEALTH_URL` を設定し、main push の同一 run で deploy success |
| E6 月次 SLO | 実 HTTP `/health` は 200 だが、外形監視の時系列が無い（設定正本は `apps/hub/monitoring/better-stack.monitors.json` として整備済み・外部適用が未実施） | Better Stack 3 分間隔監視を開始し 1 か月集計 |
| ~~G11 実 CWV~~ → **取得済み（good 未達）** | 2026-07-24 初回実測: LCP/CLS は good、**TBT 926ms 超過で fail**（recheck-2026-07-24.md §5） | 不要 JS 削減の是正後に good 圏へ（是正は follow-up 起票） |
| restore drill | `backup.yml` と手順は実装済みだが、四半期 drill は未実行（backup 稼働自体も secret 5 件未設定で停止中） | secret 投入 → 初回 backup 成功 → 一時 DB への復元と整合検査を実施 |
| cron trigger | **エラーコード 10072（アカウント単位 cron 上限 Free 5 本超過）と確定**（2026-07-24） | 他プロジェクトの cron 削除 / cron 統合 + 空き枠確保 / 有料プラン のいずれか（ユーザー判断） |

## 5. source integrity

- feature context: `features/feat-hub-foundation.context.json` = `sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`（実測一致）
- published package digest: `sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- 検証コマンド: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502` → `status: pass`
