---
status: recorded
layer: feature-spec-reflection
task: SYS-TENANT-DATA-RETENTION-P12
parent_feature: feat-tenant-data-retention
feature_package_id: feature-package/feat-tenant-data-retention
feature_context_digest: sha256:69dfcdf921e77e21f88ca692b562cad0785381e22f00f1e446c512c0d87ea327
beads_ids: [HarnessHub-47b, HarnessHub-47b.1, HarnessHub-47b.2, HarnessHub-47b.3, HarnessHub-47b.4, HarnessHub-47b.5, HarnessHub-47b.6, HarnessHub-47b.7, HarnessHub-47b.8, HarnessHub-47b.9, HarnessHub-47b.10, HarnessHub-47b.11, HarnessHub-47b.12, HarnessHub-47b.13]
dev_graph_node_id: feat-tenant-data-retention
recorded_at: 2026-08-03
---

# feat-tenant-data-retention 仕様反映受領書

## 結論

今回の最終レビューで検出した AAD 後方互換性と backup tombstone の不足は、既存の C4 / T15 / AD-1 / AD-6
を変更せず、承認済みの安全条件を実装に反映する是正である。したがって system-level の新しい設計判断や
外部 API の追加は無い。一方、既存設計を実行可能にする詳細仕様、運用手順、検証証跡を更新した。

## 反映結果

| 層 | 判定 | 反映または無変更の理由 |
| --- | --- | --- |
| `docs/` | 反映済み | tenant_data の API 契約、rate limit、鍵スコープ、R2 binding／監視、restore manifest 手順、T-15 検証を詳細仕様へ記載 |
| `docs/features/` | 反映済み | ADR、移行記録、runbook、最終レビュー、実装ノート、受領書を更新。全ファイル 500 行未満 |
| `system-spec/` | 無変更 | `qa-045` / `qa-046` は tenant 別暗号化・完全削除・restore drill の非復元を既に確定済み。内容変更ではないため R4-reopen を起こさない |
| `specs/` | 無変更 | 外部公開 API の意味や既存確定データモデルを追加変更していない。詳細 endpoint は `docs/backend-spec-api-state.md` を正本にした |
| `architecture/` | 無変更 | `arch-harness-hub-security` 等は confirmed system-spec の参照型 wrapper。直接編集すると source digest の整合を壊すため、feature ADR に具体実装を記録 |
| `features/` | 残課題を Beads 親課題へ記録 | C14 macro feature には旧 content-addressed 方式の語句が残るが、P03 ADR は行ごとに一意な key へ是正済み。content-addressed な macro 正本を直接書換えず、C02 から再計画して整合させる |
| `tasks/` | 無変更 | promoted exact-13 task package は content-addressed。macro feature の再計画が承認されるまで current package を改変せず、現行 task contract は validator PASS のまま、実行証跡を feature docs と Beads notes に記録 |

## 実装と検証の対応

- `packages/db/backup/export.ts` は全 control-plane table を export し、`tenant_data_tombstones` を欠落させない。
- `packages/db/backup/tenant-data-tombstones.ts` は新しい export から manifest を抽出・検証・適用する。
- `restore-control-plane.ts` は tenant_data を含む restore に新しい tombstone manifest を要求し、古い manifest を拒否する。
- `packages/db/repository/crypto.ts` は global AAD を legacy 形式のまま保持し、tenant_data のみ tenant scope を必須にする。
- DB の restore / deletion / encryption / tenant-isolation テスト、型検査、整形、artifact placement、task-spec quality gate を再実行する。

## ファイル分割の判定

- 手書きの変更ファイルはすべて 500 行未満である。
- `packages/db/migrations/meta/0005_snapshot.json` と `0006_snapshot.json` は Drizzle が生成する migration snapshot で、それぞれ 2,077 行・2,131 行である。migration lineage が単一 JSON 文書として読込む生成成果物のため分割できず、生成物をそのまま記録する。

## 残課題

- P13: main merge 後の production deploy、planned の Turso Platform API secret 投入、実環境 smoke／restore drill は外部操作のため未実施。
- C14 macro feature に残る content-addressed R2 という旧方式の文言を、P03 ADR の行ごとに一意な R2 key と整合させる C02 起点の再計画を行う（Beads 親課題の残課題として記録）。
- 本受領書は PR 作成時の番号・URL、Beads note、最終実行コマンドを追記して確定する。
