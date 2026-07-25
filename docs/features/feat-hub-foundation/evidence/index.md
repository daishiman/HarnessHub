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
| E4 CI（test→deploy 完走） | [ci-run.md](ci-run.md)（**2026-07-25 に確定**。run 30143422049 で deploy まで success） | P06/P13 | `gh run view 30143422049 --json jobs` |
| E5 bundle サイズ計測 | [bundle-report.json](bundle-report.json)（0.952 MiB / dry-run）／[deploy-2026-07-25.json](deploy-2026-07-25.json)（**1.010 MiB / 本番実デプロイ**） | P06/P13 | `pnpm --filter @harness-hub/hub run build:worker && pnpm --filter @harness-hub/hub run check:bundle` |
| E6 SLO 計測 / `/health` 稼働 | [health-response.json](health-response.json)（2026-07-21 手動計測）／[deploy-2026-07-25.json](deploy-2026-07-25.json)（本番デプロイ直後の CI 内計測）／設定正本 `apps/hub/monitoring/better-stack.monitors.json`・`slo-dashboard.json`（2026-07-25 追記・**未適用**）。**SLO 時系列は未取得** | P06/P13 | 設定の回帰: `pnpm --filter @harness-hub/hub exec vitest run tests/monitoring` / 実測: 外形監視を適用後に月次時系列を取得 |
| E7 本番デプロイ実績（P13） | [deploy-2026-07-25.json](deploy-2026-07-25.json) | P13 | `gh run view 30143422049` ／ [../release-notes.md](../release-notes.md) |
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

| 証跡 | 理由 | 解除条件 |
|---|---|---|
| ~~E4 CI deploy~~ | ~~feature branch CI は test まで success だが deploy は main 限定で skip~~ → **2026-07-25 解除**。run 30143422049（`main` / `ec0f3e45`）で 3 job すべて success（[ci-run.md](ci-run.md) §確定 run） | — |
| E6 月次 SLO | 実 HTTP `/health` は 200、監視・SLO の設定正本も 2026-07-25 に確定したが、**Better Stack への適用が未実施**（`application_state: pending_credentials`）で時系列が無い | 設定正本を適用して `external_id` / `applied_at` を記録し、3 分間隔監視を開始して 1 か月集計（`HarnessHub-37h.15`） |
| G11 実 CWV | workflow はあるが production 実測値を未取得 | `HUB_PUBLIC_URL` 設定後の定期 run |
| restore drill | `backup.yml` と手順は実装済みだが、四半期 drill は未実行 | 一時 DB への復元と整合検査を実施 |
| ~~cron trigger~~ | ~~Worker handler は実装・テスト済みだが本番登録失敗~~ → **2026-07-25 解除**。上限 5 本が**アカウント単位**（エラー `10072`）と判明し、他プロジェクトの cron を削除して枠を解放。`0 15 * * *` / `0 0 * * 1` の 2 本が登録済み（使用 2/5） | — |

## 5. source integrity

- feature context: `features/feat-hub-foundation.context.json` = `sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`（実測一致）
- published package digest: `sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502`
- 検証コマンド（**世代非依存・推奨**）: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hub-foundation` → `violations: []` / exit 0（2026-07-25 実測）
- 検証コマンド（世代 path 直指定）: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502` → `violations: []`（2026-07-25 再実測）
  - 世代 path 直指定は、その世代ディレクトリが残っている間しか再実行できない。**再現性の担保には `--feature-package` 形式を使う**（`.dev-graph/state/current/` の pointer から現行世代を解決するため、promotion 後も解決可能）。P13 task spec の実行契約 `rerun` も同形式を正としている。
