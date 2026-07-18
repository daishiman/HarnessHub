---
status: confirmed
layer: feature-design
task: SYS-PUBLISH-PIPELINE-P01
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: .dev-graph/plans/feature-package-feat-publish-pipeline/goal-spec.json
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

作者の自己完結 publish (G1) の中核として、PublishRequest 状態機械 (§7.2)・検査 pipeline (static validation/secret scan/policy)・stable pointer promote/rollback を実装する

## 2. ゴール (goal)

publish → 検査 → Ready → Publishing → Published が atomic に完走し、失敗時は旧 stable が無傷で残る状態

## 3. スコープ

### 3.1 scope_in

1. REST API (zod 単一ソース → OpenAPI)
2. 状態機械 + TargetChannel 直列化
3. 検査 pipeline (共有パッケージ化)
4. R2 保存 + Catalog pointer の atomic 更新
5. promote/rollback + 監査 event

### 3.2 scope_out

1. Publisher クライアント側
2. カタログ UI

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. 状態遷移が §7.2 準拠で property test を通る
2. 検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される
3. 全操作が append-only 監査 event に記録される

## 5. 品質制約 (quality_constraints — goal-spec 8 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| publish-request-state-machine-section7-2-property-test-qa009 | PublishRequest 状態機械は system-spec §7.2 に完全準拠する (docs/backend-spec.md §5.1 詳細正本): Draft → Validating → (Needs Fix → Draft 差戻し / Ready → (Approval Pending → Approved [Stage 2] または Approved [policy 自動承認=Green]) → Publishing → (Failed [既存 stable 維持] / Published [Release 生成 → Promote]))。MVP サブセットでは Yellow/Red 相当は一律 Needs Fix へ差戻し、Approval Pending は Stage 2 まで到達しない。遷移は隣接工程間 (前進/差戻し) のみ許可し、property test で網羅的に検証する。 | system-spec/spec-state.json qa-009 (PublishRequest 状態機械は §7.2 準拠 [Draft→Validating→Needs Fix/Ready→Publishing→Failed/Published]。MVP では Yellow/Red 相当は Needs Fix 差戻し、Approval Pending は Stage 2 まで到達しない); docs/backend-spec.md §5.1 PublishRequest (§7.2 完全準拠, qa-009) の状態遷移図と『同一 TargetChannel の直列化: 先行が終端 [Published/Failed/Draft 差戻し] になるまで後続は Draft に留める』; features/feat-publish-pipeline.md 受入 (『状態遷移が §7.2 準拠で property test を通る』) |
| inspection-pipeline-shared-pure-function-package-qa010-qa020 | 検査 pipeline (owner/公開範囲確認・secret scan・必須メタ検証・skills-only 制約・禁止 Hook/script/binary 検出・高リスク instructions パターン検出時 Yellow 降格・manifest 補完・試験 install・Catalog 生成) は packages/inspection として純関数の共有パッケージに実装し、Publisher (ローカル pre-check) と Hub (公式検査) で同一パッケージを共有し二重実装しない。既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) を仕様の正本 (移植元) として TypeScript へ移植し、挙動同値性をテストで担保する (C3 整合)。 | system-spec/spec-state.json qa-010 (作者側 Publisher: 検査ロジックは Hub 側 [Workers=JS] と共有し二重実装を回避する。既存 Python 資産 [harness-creator の package check / package contract / marketplace catalog] は仕様の正本 [移植元] として参照し、挙動同値性をテストで担保して TypeScript へ移植する [C3 整合]); qa-020 (検査 pipeline の純関数化: Publisher と Hub で検査ロジックを共有パッケージ化、qa-010 の挙動同値移植をテストで担保); docs/backend-spec.md §1 コード構造規約 (『検査 pipeline / 試算エンジン / 通知ディスパッチは純関数の共有パッケージ [Publisher と Hub で二重実装しない]』・monorepo 構成の packages/inspection [harness-creator Python 資産の TS 移植, C3]) および §6.1 検査 pipeline (packages/inspection) の最小検査項目一覧 |
| green-auto-publish-yellow-red-needs-fix-i2 | 検査 (static validation・secret scan・policy 判定) の結果、Green は自動公開 (policy 自動承認 → Publishing へ進む)、Yellow/Red は MVP では一律 Needs Fix へ差し戻す (Approval Pending は Stage 2 まで到達しない)。検査 FAIL 時は旧 stable を無傷のまま維持する。 | system-spec/00-requirements-definition.md I2 (『static validation・secret scan・policy 判定 [Green 自動公開、Yellow/Red は Needs Fix 差し戻し]』資するゴール G1, G4); system-spec/spec-state.json qa-009 (MVP サブセット: Yellow/Red 相当は Needs Fix 差戻し。Approval Pending は Stage 2 まで到達しない); qa-006 (公開時検査 = static validation + secret scan + Green/Yellow/Red policy 判定 [§9。Yellow/Red は MVP では Needs Fix 差戻し]); docs/backend-spec.md §5.1; features/feat-publish-pipeline.md 受入 (『検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される』) |
| immutable-release-targetchannel-stable-pointer-atomic-rollback-i3 | Release は immutable とし、TargetChannel ごとの stable pointer 切替により公開・更新・rollback を atomic に行う。promote/rollback は stable pointer 操作 + 監査 event として実装し、rollback は 2 版目以降のみ rollback 先検査 (§7.2) を行う。Publishing で失敗した場合 (Failed) は既存 stable が無傷のまま残る。 | system-spec/00-requirements-definition.md I3 (『immutable Release + TargetChannel 別 stable pointer による atomic な公開・更新・rollback』資するゴール G1, G4); system-spec/spec-state.json qa-009 (Promote/Rollback は stable pointer 操作 + 監査 event); qa-002 (不変条件: Release は immutable、TargetChannel ごとの stable pointer 切替で更新/rollback); docs/backend-spec.md §4.6 (POST /api/v1/channels/:id/promote — stable pointer 昇格。監査 event / POST /api/v1/channels/:id/rollback — 2 版目以降のみ rollback 先検査 [§7.2]。監査 event / POST /api/v1/publish/:id/submit → 検査後 Publishing ├ Failed [既存 stable 維持] └ Published); features/feat-publish-pipeline.md 受入 |
| r2-content-addressed-package-registry-domain-model-db-consumer | SkillPackage 実体は Cloudflare R2 に immutable content-addressed (content_hash=sha256 を PK) な PackageRegistry として保存し、DB には content hash と reference (r2_key, size_bytes, kind) のみを保持する。packages テーブルのスキーマ所有は feat-domain-model-db 側であり、本 feature は PUT /publish/:id/package で R2 staging + content hash 登録を行う consumer として実装する。 | system-spec/spec-state.json qa-004 (SkillPackage 実体は Cloudflare R2 [無料枠 10GB] を immutable PackageRegistry とし、DB には package の content hash と reference のみ保存); qa-011 (R2 の SkillPackage は immutable content-addressed で自己版管理); docs/backend-spec.md §1 (パッケージ実体: Cloudflare R2 [immutable PackageRegistry]。DB は content hash と参照のみ保持) および §2.1 packages テーブル定義 (content_hash PK[sha256], r2_key, size_bytes, kind[skills-package] — R2 実体への参照 [PackageRegistry]) および §4.6 (PUT /api/v1/publish/:id/package — package upload [multipart] → R2 staging + content hash。サイズ/種別制限 [SEC7]); features/feat-publish-pipeline.context.json scope_in (『R2 保存 + Catalog pointer の atomic 更新』); features/feat-publish-pipeline.md 機能間依存 (feat-domain-model-db) |
| append-only-audit-event-all-publish-operations | PublishRequest に関わる全操作 (submit・approve・promote・rollback・suspend・deployment 登録) は audit_events へ append-only で記録する。監査記録はテナント単位の hash chain (seq/prev_hash/event_hash, UNIQUE(tenant_id, seq)) により改ざん検知可能な構造とする。 | system-spec/spec-state.json qa-006 (監査 = 公開・承認・rollback・公開停止・orphan_candidate の append-only 監査 event); qa-037 (audit_events へ seq/prev_hash/event_hash を追加し UNIQUE(tenant_id, seq) のテナント単位 hash chain とする — Turso/SQLite に DB レベルの append-only 強制機構がないため); docs/backend-spec.md §4.6 (POST /api/v1/channels/:id/promote, /rollback, /api/v1/publish/:id/approve いずれも『監査 event』明記) および §4.12 (GET /api/v1/audit-events — append-only 閲覧 [filter: action/entity/actor/期間, cursor]); features/feat-publish-pipeline.md 受入 (『全操作が append-only 監査 event に記録される』) |
| rest-zod-single-source-authz-middleware-qa009 | Hub API は REST + OpenAPI とし、zod schema (packages/schemas) を単一ソースとして OpenAPI 仕様を生成する。認可は全 API で Tenant/Workspace スコープを強制する単一ミドルウェアに集約する (deny-by-default)。POST /publish は Idempotency-Key 必須で、直列化違反は 409 を返す。 | system-spec/spec-state.json qa-009 (REST + OpenAPI + zod を採用。Next.js Route Handlers で REST API を実装し、zod schema を単一ソースとして OpenAPI 仕様を生成する); qa-020 (認可は単一ミドルウェア層に集約する [散在させない]); qa-033 (認可は単一ミドルウェア deny-by-default の role×リソースマトリクス); docs/backend-spec.md §1 コード構造規約 (『認可は単一ミドルウェアに集約 [deny-by-default・全 API で Tenant/Workspace スコープ強制 = D4]』) および §4.6 endpoint 一覧 (POST /api/v1/publish — Bearer/owner。Idempotency-Key 必須。直列化違反は 409) |
| targetchannel-serialization-single-inflight-publishrequest | 同一 TargetChannel への PublishRequest は直列化する。先行 request が終端状態 (Published/Failed/Draft 差戻し) になるまで、後続 request は Draft に留める。直列化違反は POST /publish で 409 を返す。 | system-spec/spec-state.json qa-002 (不変条件: 同一 TargetChannel への PublishRequest は直列化); qa-009 (同一 TargetChannel への PublishRequest は直列化); docs/backend-spec.md §5.1 (『同一 TargetChannel の直列化: 先行が終端 [Published/Failed/Draft 差戻し] になるまで後続は Draft に留める』) および §4.6 (POST /api/v1/publish — 直列化違反は 409); features/feat-publish-pipeline.context.json scope_in (『状態機械 + TargetChannel 直列化』) |

## 6. 上流未解決事項 — cross-feature 境界 (P02 必須解消)

1. **スキーマ owner 境界**: publish_requests・releases・target_channels・packages・deployment_references・audit_events・idempotency_ledger の各テーブルの**スキーマ定義**は feat-domain-model-db が packages/db/schema/core/ で所有する既存確定 (同 feature P02 architecture decision のコアドメイン 18 テーブルの一部)。本 feature はこれらのテーブルへの**利用 (書込/参照ロジック)** と REST endpoint・状態機械・検査 pipeline・promote/rollback ロジックの実装のみを所有する consumer である。P02 でこの owner/consumer 境界を確定する。
2. **単一認可ミドルウェア消費境界**: apps/hub/src/lib/authz/ は feat-auth-tenancy が所有する既存確定であり、本 feature はこれを消費して deny-by-default の role×リソースマトリクス判定を適用するのみで、認可判定ロジック自体を再実装しない。
3. **検査 pipeline の owner/消費境界**: 検査 pipeline パッケージの owner は本 feature である一方、その消費側 — Publisher クライアントのローカル pre-check (feat-publisher-plugin)・承認キュー UI (feat-workspace-governance)・カタログ UI (feat-dual-catalog-web) — は別 feature の責務であることを含めて P02 で確定する。

## 7. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-publish-pipeline/goal-spec.json` (promoted。feature_context_digest = sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 8 件 (§5) が過不足なく転記され、cross-feature 境界 3 項目 (§6) が明記されていること
