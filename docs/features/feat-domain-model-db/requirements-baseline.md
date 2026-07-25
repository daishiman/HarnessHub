---
status: confirmed
layer: feature-design
task: SYS-DOMAIN-MODEL-DB-P01
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
source: .dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/goal-spec.json
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
architecture_refs: [arch-harness-hub-data, arch-harness-hub-backend]
---

# feat-domain-model-db 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。
>
> **世代注記**: 本文書は現行 canonical feature context `features/feat-domain-model-db.context.json` (`sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc`) / package digest `sha256:6ac94e1d…` に束縛される。旧世代 (`sha256:ed9bbe22…`、quality_constraints 9 件) を参照する記述は本版により置き換えられる (10 件目 `executable-export-restore-ci-fixture` の追加が世代差分)。

## 1. 目的 (purpose)

Tenant→Workspace→Project→TargetChannel→Release(immutable) のドメインモデルを Drizzle スキーマとして確立し、D1 退避経路 (D2 ヘッジ) を保つ接続層を構築する

## 2. ゴール (goal)

全エンティティの CRUD が接続層越しに動作し、R2 immutable PackageRegistry と日次 export が稼働する状態

## 3. スコープ

### 3.1 scope_in (転記原文 5 件)

1. Drizzle スキーマ (SQLite 方言互換)
2. 接続層の隔離 (libSQL/D1 両対応)
3. R2 content-addressed registry
4. 日次 export + restore drill 手順
5. マイグレーション運用

### 3.2 scope_out (転記原文 2 件)

1. 検査 pipeline のビジネスロジック
2. UI

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記)

| # | acceptance (転記原文) | 検証方法 (machine-verifiable) |
|---|---|---|
| A1 | スキーマが SQLite 方言互換で D1 接続テストが通る | 同一 Drizzle スキーマに対し libSQL 接続 (`drizzle-orm/libsql`) と D1 接続 (`drizzle-orm/d1`) の双方で migration 適用と CRUD が成功するテストが pass すること |
| A2 | Release が immutable として強制される | releases への UPDATE が status 列以外で不可能であること (リポジトリ層が `updateReleaseStatus()` 以外の更新関数を公開しない + テストで検証) |
| A3 | バックアップ export と復元手順が検証済み | 日次 export の成果物を別 DB へ restore し、行数・整合検査 (audit chain 検証含む) が通る round-trip テストが pass すること |

## 5. 品質制約 (quality_constraints — goal-spec 10 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| sqlite-dialect-compat-d1-fallback-connection-layer-d2 | Turso Free (libSQL) を Drizzle ORM (SQLite dialect) 経由で採用しつつ、SQLite 方言互換を維持して Cloudflare D1 への退避経路を温存する (D2 ヘッジ)。DB アクセスは Drizzle リポジトリ層に閉じ、Turso→D1 移行をアプリ層へ波及させない。 | system-spec/00-requirements-definition.md D2 (Hub control-plane DB の決定: turso-free 採用。d1-drizzle との SQLite 互換性を退避経路のヘッジ根拠として明記。注意事項: 『D1 の同時書込特性と read replica の成熟度を実装着手時に再確認する』); system-spec/spec-state.json qa-004 (Turso Free 採用、Drizzle ORM の SQLite dialect でスキーマ・マイグレーション管理、スキーマ・クエリを SQLite 方言互換に保ち D1 への移行経路を温存); system-spec/spec-state.json qa-019 (database/infrastructure には qa-017 のコード構造規約 = 接続層隔離による D2 Turso→D1 退避経路の維持を適用); docs/backend-spec.md §1 (DB: Turso Free (libSQL)。Drizzle ORM (SQLite dialect)、@libsql/client (HTTP)。D1 退避経路を温存するため SQLite 方言互換を維持する (D2 ヘッジ)。コード構造規約 qa-020: DB アクセスは Drizzle リポジトリ層に閉じる) |
| release-immutable-atomic-stable-pointer-i3 | releases テーブルは immutable とし更新は status 列 (available/suspended/deprecated) のみに限定する。version は差分+content hash から自動採番し、target_channels.stable_release_id の切替により TargetChannel ごとの atomic な公開・更新・rollback を実現する。 | system-spec/00-requirements-definition.md I3 (immutable Release + TargetChannel 別 stable pointer による atomic な公開・更新・rollback。資するゴール G1, G4); docs/backend-spec.md §2.2 releases テーブル定義 (immutable。更新は status のみ。version は差分+content hash から自動採番 §7.1) および target_channels テーブル定義 (stable pointer の正本); features/feat-domain-model-db.md 受入 (『Release が immutable として強制される』) |
| tenant-workspace-scope-row-level-d4 | documents.scope='common' を除く全テーブルに tenant_id (必要に応じ workspace_id) スコープ列を必須とし、リポジトリ層で常時 WHERE 句へ強制注入する row-level-scope 方式でテナント論理分離を実装する。分離テストを CI 必須とする。 | system-spec/00-requirements-definition.md D4 (マルチテナント論理分離の決定: row-level-scope 確定。単一 DB + tenant_id/workspace_id スコープ列 + アプリ層強制。revisit 条件: テナント数が 10 を超える、または分離テストの失敗が頻発した場合は DB-per-tenant を再評価); system-spec/spec-state.json qa-024 (Studio 追加エンティティを含め全新規テーブルへ tenant_id/workspace_id スコープ列必須 = D4); docs/backend-spec.md §2.1 共通規約 (テナント分離 D4/SEC3: documents.scope='common' を除く全テーブルに tenant_id を必須とし、リポジトリ層で常時 WHERE 句へ強制注入。分離テストを CI 必須とする) |
| ulid-pk-display-code-epoch-server-time-qa032 | 全テーブルの PK は ULID 文字列とし、表示用コード (HS-xxxx/FR-xxx/DOC-xx 等) は display_code_counters によるテナント別連番の別列とする。時刻列は INTEGER (epoch ms) でサーバ時刻のみを採用し、クライアント申告時刻は保存しない。 | system-spec/spec-state.json qa-032 (共通規約: PK は ULID 文字列 (時系列ソート可・衝突なし) + 表示用コード列。時刻は INTEGER epoch ms でサーバ時刻のみ採用。ID 形式は UUIDv7 案との比較のうえ ULID 維持を再確認); docs/backend-spec.md §2.1 共通規約 (PK: id TEXT — ULID。表示用コードは別列。時刻: INTEGER epoch ms、サーバ時刻のみ採用 SEC5) および §2.3 display_code_counters テーブル定義 (tenant_id, kind(HS/FR/DOC), next_value。表示用コード採番はトランザクション内 increment) |
| r2-content-addressed-package-registry-c4 | SkillPackage 実体は Cloudflare R2 上に content hash (sha256) を key とする immutable PackageRegistry として保持する。control-plane DB (packages テーブル) には content_hash / r2_key / size_bytes / kind のみを保存し、顧客の業務データ・secret は保持しない。 | system-spec/spec-state.json qa-004 (SkillPackage 実体は Cloudflare R2 (無料枠 10GB) を immutable PackageRegistry とし、DB には package の content hash と reference のみ保存。顧客の業務データ・secret は保持しない = C4); docs/backend-spec.md §1 (パッケージ実体: Cloudflare R2 immutable PackageRegistry。DB は content hash と参照のみ保持 C4) および §2.2 packages テーブル定義 (content_hash PK(sha256), r2_key, size_bytes, kind。R2 実体への参照 = PackageRegistry) |
| daily-export-quarterly-restore-drill-qa019 | control-plane DB のバックアップは日次 export を R2 へ保存し、四半期ごとの restore drill で復元手順を検証する (復元できないバックアップを成功と数えない)。salary 列は暗号化状態を日次 export・R2 バックアップの断面でも維持し常にマスクする。 | system-spec/spec-state.json qa-019 (バックアップ検証: qa-011 の DB 日次 export (R2 保存) に復元手順の定期検証 = 四半期ごとの restore drill を追加し、復元できないバックアップを成功と数えない); docs/backend-spec.md §7 cron 表 (DB backup: 日次、export → R2 (qa-019 既定)。四半期 restore drill。salary は常にマスク security-spec §4.2) および §2.1 (salary の保存はアプリ層カラム暗号化とし、日次 export・R2 バックアップの断面にも平文を残さない qa-032 確定) |
| single-migration-pipeline-drizzle-repository-package | スキーマ変更は Drizzle ORM の migration を単一系統で運用し、packages/db にスキーマ定義とリポジトリ層を集約する (monorepo 内で他パッケージからの直接 DB アクセスを行わない)。 | features/feat-domain-model-db.context.json / .md scope_in (『マイグレーション運用』); system-spec/spec-state.json qa-004 (Drizzle ORM の SQLite dialect でスキーマとマイグレーションを管理); docs/backend-spec.md §1 monorepo 構成 (packages/db: Drizzle スキーマ + リポジトリ層) および qa-020 コード構造規約 |
| repository-layer-db-access-isolation-qa020 | DB アクセスは Drizzle リポジトリ層に閉じ、API ハンドラや純関数共有パッケージ (inspection/estimation/schemas) から DB へ直接アクセスしない。認可判定は単一ミドルウェアに集約し DB アクセス層とは責務分離する。 | system-spec/spec-state.json qa-020 (backend のコード構造規約: 接続層の隔離。Drizzle リポジトリ層に DB アクセスを閉じ、Turso→D1 退避 D2 ヘッジをアプリ層に波及させない。過剰な層分割は C1 に反するため採らない); docs/backend-spec.md §1 コード構造規約 (qa-020: DB アクセスは Drizzle リポジトリ層に閉じる。認可は単一ミドルウェアに集約 deny-by-default・全 API で Tenant/Workspace スコープ強制 = D4。検査 pipeline/試算エンジン/通知ディスパッチは純関数の共有パッケージ) |
| user-base-table-schema-owner-unresolved-p02 | **未解決 (P02 必須解消事項)**: User 基底テーブル (tenant_id, idp_subject, email, name, department, salary, role, status, last_login_at 等) の owner feature が未確定。feat-domain-model-db.md の上流未解決節は『既存不変エンティティ一覧にも User が無い』とするが、docs/backend-spec.md §2.2 の現行版は users を『コアドメイン (公開基盤 — §4.2 + qa-002。既存確定・不変)』テーブルに含めており、この記述との整合が P02 で未検証。feat-user-org-admin は安全側で write_scope を追加分 (packages/db/schema/user-org-admin/) に限定済みであり、本 feature が users 基底スキーマの owner であるか、feat-user-org-admin が別途 owner となるかを P02 で確定し、矛盾する記述 (feat-domain-model-db.md 上流未解決節か docs/backend-spec.md §2.2 のいずれか) を訂正する必要がある。 | features/feat-domain-model-db.md 上流未解決節 (『User 基底テーブルの owner feature が未明記 (qa-024 は User 拡張列 department/salary のみ確定、既存不変エンティティ一覧にも User が無い)。P02 で本 feature が User 基底スキーマの owner かを確定する。feat-user-org-admin は安全側で write_scope を追加分 (packages/db/schema/user-org-admin/) に限定済み』、出典: feat-user-org-admin plan 設計判断 2026-07-17); .dev-graph/plans/feature-package-feat-user-org-admin/plan-findings.json (独立 fork context での確認記録に architect 設計判断として『User 基底テーブル write_scope 限定』が含まれることを本 agent が Read で確認); system-spec/spec-state.json qa-024 (Studio 反映で追加確定するエンティティ一覧は『User 拡張 (department・salary)』のみを明記し、『既存エンティティ (Tenant/Workspace/Project/Release/TargetChannel/CatalogEntry/PublishRequest/監査 event) は不変』の対象に users を明記しない); docs/backend-spec.md §2.2 (users テーブルを『コアドメイン (公開基盤 — §4.2 + qa-002。既存確定・不変)』表に列挙 — 本 agent が Read で直接確認した現行記述であり、上記 feature md の上流未解決節の前提記述と食い違う可能性がある。本 goal-spec ではこの食い違いを解消せず P02 送りとして記録する) |
| executable-export-restore-ci-fixture | 日次exportとrestoreはP05で実装し、migration済み2-tenant fixtureとround-tripをP06/P09で実行する。P12文書を先行条件にしない。 | features/feat-domain-model-db.context.json; docs/infrastructure-spec.md; docs/security-spec.md |

## 6. Normative closure (フェーズ間契約の確定転記)

現行 quality_constraints は 10 件である。P05 は schema/repository/R2 registry に加え、日次 control-plane export job、暗号化/マスク保持、検証可能な restore command/library をコード成果物として実装する。P06 は P05 実装を schema test harness と 2 テナント fixture で検証し、まだ生成されていない P08 migration artifact を前提にしない。P08 は単一 migration lineage を生成して 2 テナント fixture へ適用する。P09 は migration apply、tenant isolation、export artifact integrity、別 DB restore round-trip を実行する CI gate を .github/workflows/ci.yml へ接続する。P05/P06/P09 は後続 P12 runbook へ逆依存しない。P10 は 10 constraint ID を exact-set で判定する。

- Evidence 義務: P05 実装パス、P08 migration apply、2-tenant fixture、export→別 DB restore round-trip、salary 暗号化/マスク断面、単一 lineage 検査を証跡化する。
- 実装/証跡パス: `packages/db/backup/`、`packages/db/scripts/export-control-plane.ts`、`packages/db/scripts/restore-control-plane.ts`、`packages/db/__tests__/fixtures/two-tenants.ts`、`packages/db/__tests__/backup-restore.test.ts`、`.github/workflows/ci.yml`

## 7. 上流未解決事項 (P02 必須解消)

1. **User 基底テーブルの owner feature 未確定**: quality_constraints の `user-base-table-schema-owner-unresolved-p02` を参照。P02 で本 feature が users 基底スキーマの owner かを確定し、矛盾する記述 (feat-domain-model-db.md 上流未解決節か docs/backend-spec.md §2.2) のいずれかを訂正する (features/ 配下は読み取り専用のため訂正自体は dev-graph への follow-up として申し送る)。
2. **qa-045 (tenant_data_objects / C4 改訂) は本 digest スコープ外**: system-spec/database.md qa-045 (2026-07-18 確定。C4 データ保持境界改訂による tenant_data_objects テーブル新設と業務ナレッジ/実行入出力データの R2 テナント別封筒暗号化保存) は、本 feature の feature_context_digest (`sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc`) が拘束する goal-spec の quality_constraints/lineage のいずれにも含まれず、grounding qa エントリ (qa-004/qa-017/qa-019/qa-020/qa-024/qa-032) にも含まれない後発確定事項のため、本 baseline のスコープに含めない。P02 で改めて「本 digest スコープ外」と確定させ、dev-graph への follow-up feature candidate (feat-tenant-data-retention 相当) として返す。

## 8. 転記元と検証

- 転記元: `.dev-graph/plans/generations/feature-package-feat-domain-model-db/6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b/goal-spec.json` (promoted。feature_context_digest = `sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc`)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 10 件 (§5) が過不足なく転記され、Normative closure (§6) と上流未解決 2 項目 (§7) が明記されていること
