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

## 2. 根拠

| 観点 | 判定 | 根拠 |
|---|---|---|
| 既存実装のリファクタリング | N/A | feat-hub-foundation は **新規 scaffold feature** であり、P05 以前にリポジトリ内へ `apps/` `packages/` が存在しなかった（P02 で構成を新規確定、P05 で新規作成）。改変対象となる既存実装がない |
| データ移行 (migration) | N/A | 本 feature は DB スキーマ実体を持たない。スキーマは feat-domain-model-db の責務であり、`packages/db` は境界と型のみ（architecture-decision-record.md §3） |
| backfill | N/A | 既存データが存在しないため補填対象がない |
| 互換性維持 | N/A | 公開済み API・既存 consumer が存在しない。共通層の公開 contract は本 feature が初版を定義する |

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
