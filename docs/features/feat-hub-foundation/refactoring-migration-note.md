---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P08
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
judgement: not-applicable
---

# feat-hub-foundation リファクタリング・データ移行 判定 (P08)

## 1. 判定

**N/A（対象なし）。** 本 phase で実施すべきリファクタリング・データ移行・backfill は存在しない。

## 2. 根拠（9 workstream 全件の個別判定）

> task 仕様 (phase-08) の Required evidence「9 workstream すべての N/A 判定理由が記録されていること」に対応する。判定の観点は 4 つ（既存実装リファクタ / データ移行 / backfill / 互換性維持）で、workstream ごとに N/A の理由を記す。全 workstream に共通する前提: feat-hub-foundation は**新規 scaffold feature** であり、P05 以前に `apps/` `packages/` は存在しなかった（P02 で構成を新規確定、P05 で新規作成）。

| # | workstream | 判定 | N/A の理由 |
|---|---|---|---|
| 1 | Frontend | N/A | `apps/hub/src/app/`（App Router）と `packages/ui` は本 feature が初版を新規作成。改変対象の既存 UI 実装・移行元の画面資産が存在しない |
| 2 | Backend | N/A | `/health` route handler・scheduled handler は新規実装。置き換え対象の既存 backend が存在しない |
| 3 | API | N/A | `packages/schemas` の zod 契約は本 feature が初版を定義。公開済み API・既存 consumer が存在しないため互換性維持の対象がない |
| 4 | Data | N/A | 本 feature は DB スキーマ実体を持たない（スキーマは feat-domain-model-db の責務、`packages/db` は境界と型のみ。architecture-decision-record.md §3）。migration・backfill の対象データが存在しない |
| 5 | Infrastructure | N/A | pnpm-workspace / wrangler.jsonc / open-next.config.ts は新規作成。移行元のインフラ構成（旧ホスティング・旧 CI）が存在しない |
| 6 | Security | N/A | 認可 middleware（deny-by-default）と auth adapter は新規実装。既存の認証・認可機構からの移行ではない。テナント固有 policy は feat-auth-tenancy の scope |
| 7 | Quality | N/A | CI 品質ゲート（G1〜G11）は新規構築。置き換え・段階移行の対象となる既存ゲートが存在しない |
| 8 | Documentation | N/A | runbook・設計文書群は本 feature が初版を作成。旧文書からの移行・統合の対象がない |
| 9 | Operations | N/A | 監視（/health + 外形監視設定）・backup.yml・SLO 運用は新規構築。運用移行（旧監視からの切替等）の対象が存在しない |

## 3. 「N/A」を将来の免罪符にしないための申し送り

本判定は **P08 時点で対象が存在しない**ことのみを述べる。以下は将来の変更時に P08 相当の判断が必要になる条件であり、あらかじめ記録する。

| 将来の契機 | 必要になる作業 | 参照 |
|---|---|---|
| Worker bundle が 3 MiB 予算を超過した場合 | コード分割・依存削減のリファクタリング。予算超過は quality_constraint `worker-bundle-budget` の違反であり、機能追加より優先する | requirements-baseline.md §6 |
| Turso → D1 への退避（D2 ヘッジ）が発動した場合 | `packages/db` の repository 層で吸収し、アプリ層へ波及させない。波及した場合は境界設計の失敗として P02 へ差し戻す | architecture-decision-record.md §3, shared-layers §2 |
| Auth.js → Better Auth 移行（D3 caveat）が発動した場合 | `apps/hub/src/shared/auth/` の adapter 境界内で吸収する | shared-layers §2 |
| 共通層に第 3 の consumer が現れた場合 | shared-layers 登録簿と `scripts/ci/shared-layer-registry.json` を更新し、duplicate detector の対象へ加える | requirements-baseline.md §4.2 A4-2 |

## 4. 検証

- 本判定の確認方法: `apps/` `packages/` の全ファイルが本 feature の P05 で新規作成されたものであること（git 履歴で確認可能）、および `packages/db` にテーブル定義が存在しないこと
- P10（最終独立レビュー）は、本判定が「作業を回避するための N/A」ではないことを §2 の根拠に照らして検証すること
