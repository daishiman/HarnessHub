---
status: recorded
layer: feature-design
task: SYS-DOMAIN-MODEL-DB (最終レビュー / 仕様反映判定)
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
beads: HarnessHub-u6q
dev_graph_node: feat-domain-model-db
judged_at: 2026-07-24
reviewer: independent-fork (spec-impact 監査。read-only + digest 実測 + 検証コマンド実走)
---

# feat-domain-model-db 仕様反映 受領書

> **位置づけ**: beads `HarnessHub-u6q` (dev-graph node `feat-domain-model-db`) の実装 (packages/db) について、コミット前に「正本 spec (system-spec/・architecture/・features/) への反映が必要か」を独立コンテキストで判定した受領書。判定に用いた根拠と、反映を要さないと判断した理由、および spec 文書間の追従遅れを扱う follow-up の対応関係を記録する。

## 1. 判定結論

**正本 (system-spec/・architecture/・features/) への手編集を要する実質 drift: なし。**

実装は正本 spec および正本が参照する詳細定義 (`docs/backend-spec.md` §2.2/§5.1) と整合する。正本を手編集せず、既存の正規フロー (dev-graph follow-up) で追従を継続する。

## 2. 正本無改変の実測根拠 (fact)

- **正本 3 ファイルの digest 一致**: `system-spec/database.md` の実 sha256 = `0cc8dee5…` は wrapper `architecture/harness-hub-data.md` の記録値と一致。`system-spec/backend.md` の `f6ba2193…` も `architecture/harness-hub-backend.md` と一致。`git status --porcelain system-spec/ architecture/ features/` は空 = 本タスクで正本は未改変。
- **本コミットの変更集合は正本を含まない**: 変更は `packages/db/**`・`docs/features/feat-domain-model-db/**`・`.github/workflows/ci.yml`・`pnpm-lock.yaml` に限定 (74 files)。governed な `system-spec/`・`architecture/`・`features/`・`tasks/` への差分は 0。

## 3. 整合の確認 (実装 ↔ 正本)

| 契約 | 実装 | 正本 | 判定 |
|---|---|---|---|
| コアドメイン 18 テーブル | `schema/index.ts` coreTables = 18 / migration CREATE TABLE = 18 | `docs/backend-spec.md` §2.2 の 18 テーブル | 一致 |
| User 基底 (owner) | `schema/core/identity.ts` users に department/salary/role enum/status enum を含む完全基底 | §2.2 「既存確定・不変」の users 行 | 一致 (owner=feat-domain-model-db は ADR §1 で確定) |
| releases immutable (I3) | `repository/releases.ts` は status 以外の更新関数を非公開。status enum=available/suspended/deprecated | §2.2 immutable・更新は status のみ | 一致 |
| publish_requests 状態機械 | `schema/core/publish.ts` 9 状態 + partial UNIQUE (終端除外) | §5.1 の 9 状態機械 | 完全一致 |
| audit hash chain | `schema/core/security.ts` seq/prev_hash/event_hash + UNIQUE(tenant_id,seq)。repository は append/read のみ | §2.2 append-only hash chain | 一致 |
| 封筒暗号化 DEK | encryption_keys: purpose enum(salary/idp_secret) + UNIQUE(purpose,key_version)・DEK 平文非保存 | §2.2 封筒暗号化 | 一致 |
| 接続層隔離 (qa-020/D2) | `check-connection-layer-isolation.ts` が packages/db 外の driver import を fail-closed 禁止 (違反 0) | qa-020 | 一致 |
| D4 行レベルスコープ | tenant_id 保有 14 + TENANT_SCOPE_EXEMPT 4 = 18。全 repository 操作で WHERE tenant_id 強制 | qa-060 (P0 から必須) | 一致 |
| export マスク保持 (qa-019) | `backup/export.ts` は暗号文を暗号文のまま転写・decrypt 呼出 0 | qa-019「常にマスク」 | 一致 |
| qa-045 tenant_data_objects | schema/migration に不在 (本 digest スコープ外) | database.md qa-045 | scope-out 遵守 |

## 4. 反映を要さない判断理由 (governance)

`system-spec/`・`architecture/`・`features/` は dev-graph が digest 付きで生成する **read-only な正本** である (`requirements-baseline.md` にも「features/ 配下は読み取り専用のため訂正は dev-graph への follow-up として申し送る」と明記)。実装が正本と整合している以上、正本の手編集は不要であり、かつ手編集は wrapper/completeness-report が保持する digest を破壊して validate 失敗 (既知の 27 violations クラス) を誘発するため行わない。spec 文書間に残る追従遅れは、正規フロー (dev-graph 再生成 / 該当 feature の再実行) で解消する。

## 5. spec 文書間の追従遅れと follow-up 対応 (既存 tracker へマップ)

| # | 追従遅れ | 是正経路 | 既存 tracker |
|---|---|---|---|
| G1 | `features/feat-domain-model-db.md` 上流未解決節が User owner「未確定」のまま stale (ADR §1 で確定済み) | dev-graph 再生成での features md 更新 | HarnessHub-4q8 / HarnessHub-8vx (promoted package 遡及契約失効の是正) |
| G2 | `feat-user-org-admin` plan が User 拡張列 (department/salary) を記述し owner 決定と矛盾 | 当該 feature (xwt) の P02 再設計 | HarnessHub-xwt.2 (アーキ設計: User拡張/TenantCoefficient・PIIガード, open) |
| G3 | qa-045 tenant_data_objects (本 digest スコープ外) | 別 feature で実装 | HarnessHub-47b (.1 要件 / .5 実装, open) |
| G4 | releases/target_channels の tenant_id 非正規化・encryption_keys の現行 tenant 非スコープ | 段階設計 (手編集不要。D4/qa-024 と整合) | HarnessHub-47b.8 (per-tenant DEK migration) |

いずれも実装 (packages/db) 側の是正は不要。新規 follow-up の起票は不要 (既存 open tracker が被覆)。

## 6. 環境制約の申し送り

- **beads mutation 不可**: guard hook (`plugins/dev-graph/hooks/guard-graph-schema.py`) が `bd create|update|close` を `scripts/bd-bridge.py` 経由に限定するが、当該チョークポイントスクリプトが本 worktree にも origin/main にも存在しないため、本セッションから beads の更新・クローズは実行できない。u6q ノートへの PR link 追記は blocked として引き継ぐ。
- e9b / x4o は既に closed (受入確認済み・main 反映を merge 祖先確認済み) のため mutation 不要。
