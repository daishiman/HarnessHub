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
- `docs/infrastructure-spec.md` はリポジトリのより厳しい 300 行ゲートに合わせ、R2 の責務を `docs/infrastructure-storage-spec.md` へ分離した（293 行 / 22 行）。
- `packages/db/migrations/meta/0005_snapshot.json` と `0006_snapshot.json` は Drizzle が生成する migration snapshot で、それぞれ 2,077 行・2,131 行である。migration lineage が単一 JSON 文書として読込む生成成果物のため分割できず、生成物をそのまま記録する。

## 受領の確定記録

- draft PR: [#650](https://github.com/daishiman/HarnessHub/pull/650) (`base=main`, `head=devgraph/feat-tenant-data-retention`)
- main 統合: CI/コンフリクト是正時に `origin/main` と local `main` が同じ `1c60a47db221c90d7ac453b992766c4f7b1150bd` であることを確認し、同 commit を本 branch へ merge した。
- 最終実行: DB focused 37 件、Hub focused 87 件、Schemas 86 件、DB/Hub/Schemas 型検査、Hub build、artifact placement、doc line limit、task-spec quality gate、dev-graph schema、CI 等価チェック 139 件はいずれも PASS。
- Beads: `HarnessHub-47b` と `HarnessHub-47b.13` に最終判定、PR、残課題を記録した。

## 2026-08-03 CI・main 統合後の仕様反映判定

- **CI 是正**: `restore-control-plane.ts` が tenant_data を含む artifact に tombstone manifest を必須化した一方、domain-model-db runbook の restore 例が manifest を渡していなかった。runbook に manifest 抽出と `--tombstone-manifest` を追加し、CI が実行する手順と運用手順を一致させた。
- **migration 衝突**: `main` の docs-cms 用 `0005` を正本として維持し、未マージだった tenant-data の 2 migration を main 取込後に Drizzle 正規フローで 1 本の `0006_tenant-data-retention.sql` へ再生成した。既に配布済みの migration は変更していない。
- **G7 DDL gate 是正**: 上記 `0006` の global 用 unique index 置換は、未配布 migration 内で global / tenant 用 partial unique index へ移行するための意図的な contract 操作である。該当 `DROP INDEX` の直前に `ddl:contract-approved` 注釈を記録し、G7 の fail-closed 検査を通す。
- **仕様影響**: 無し。外部 API、保持期間、削除保証、鍵スコープ、復元時の非再出現という既存仕様は変えていない。変更は既存の削除保証を実行可能な runbook と一意な migration lineage に整合させるもの。
- **反映先の判断**: `docs/` と `docs/features/` は上記の手順・migration 名へ反映済み。`system-spec/`、`specs/`、`architecture/`、`features/`、`tasks/` は契約・設計判断・content-addressed task package を変更しないため無変更とし、この受領書に判断理由を記録する。

## 残課題

- P13: main merge 後の production deploy、planned の Turso Platform API secret 投入、実環境 smoke／restore drill は外部操作のため未実施。
- C14 macro feature に残る content-addressed R2 という旧方式の文言を、P03 ADR の行ごとに一意な R2 key と整合させる C02 起点の再計画を行う（Beads 親課題の残課題として記録）。
