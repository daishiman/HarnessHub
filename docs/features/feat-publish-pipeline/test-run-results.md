---
status: confirmed
layer: feature-quality
task: SYS-PUBLISH-PIPELINE-P06
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/test-design.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline テスト実行結果

> **位置づけ**: P06 の成果物。[test-design.md](./test-design.md) (P04) で設計したテスト系統を P05 の実装に対して実行し、現行 quality_constraints 9 件の充足状況を機械的に確認した記録。

実行日: 2026-07-30 / 実行環境: darwin 25.3.0, Node.js (pnpm workspace), vitest

## 1. 実行コマンドと結果 (実測)

| # | コマンド | 結果 |
|---|---|---|
| C1 | `pnpm --filter hub test` | **68 files / 842 passed** — exit 0 |
| C2 | `pnpm --filter @harness-hub/inspection test` | **9 files / 151 passed** — exit 0 |
| C3 | `pnpm --filter @harness-hub/db test` | **30 files / 231 passed** — exit 0 |
| C4 | `pnpm typecheck` | workspace 6 project — exit 0 |
| C5 | `pnpm lint` | 423 files / error 0 (biome config migration の info 1 件のみ) |
| C6 | `node scripts/ci/check-shared-layer-duplicates.mjs` | 登録共通層 12 件 + 運用機構 4 件 / 走査 501 ファイル / **違反 0 件** |
| C7 | `node apps/hub/scripts/check-publish-inspection-gate.mjs` | 走査 40 ファイル / **違反 0 件** |
| C8 | `node apps/hub/scripts/check-db-schema-boundary.mjs` | 走査 206 ファイル / **違反 0 件** |

C1 のカバレッジ (閾値 80%): Statements 80.52% / Branches 87.90% / Functions 84.50% / Lines 80.52%。

### 本 feature 分の内訳 (`apps/hub/tests/publish-pipeline/`)

| ファイル | 件数 | 主たる検証対象 |
|---|---:|---|
| `state-machine.test.ts` | 19 | 状態機械 (T1) |
| `verdict-mapping.test.ts` | 10 | 検査結果 → verdict 写像 (T3) |
| `service.test.ts` → `service-{request,release}.cases.ts` | 45 | 直列化・promote/rollback・監査 (T4/T6/T9) |
| `routes.test.ts` → `routes-{auth,request,release}.cases.ts` | 52 | REST 契約・認可・レート制限 (T7) |
| `idempotency.test.ts` | 26 | 冪等鍵 (T8) |
| `package-inspection.test.ts` | 13 | ZIP 展開と検査順序 (T5) |
| `rate-limit.test.ts` | 15 | 上限判定 (qa-037) |
| `payload.test.ts` | 14 | payload の符号化 |
| `views.test.ts` | 9 | 応答 view 変換 |
| `production-smoke-script.test.ts` | 2 | P13 smoke entrypoint と fail-closed 証跡契約 |
| **計** | **205** | |

## 2. quality_constraints 9 件の判定

| # | quality_constraint | 判定 | 証跡 |
|---|---|:--:|---|
| Q1 | `publish-request-state-machine-section7-2-property-test-qa009` | **pass** | `state-machine.test.ts` 19 件。9 状態 × 全イベントの直積を全数生成し、遷移表に無い組がすべて `illegal_transition` を返すことを確認 (T1-A)。終端状態の不動性・純関数性 (T1-B)、`draft→published` / `draft→failed` の到達可能性 (T1-C) を含む |
| Q2 | `inspection-pipeline-shared-pure-function-package-qa010-qa020` | **pass** | C2 の 151 件。判定ロジックは `packages/inspection` にのみ存在し、C6 の重複検出器が `inspection-pipeline` 共通層の複製 0 件を確認。Hub 側 (`package-inspection.ts`) は ZIP 展開と順序のみを持ち、ルールを再実装していない |
| Q3 | `green-auto-publish-yellow-red-needs-fix-i2` | **pass** | `verdict-mapping.test.ts` 10 件 + `publish-inspection.test.ts` 9 件。**本 phase で欠落を検出・是正**した (§4 参照)。C7 が「static validation + secret scan + policy の 3 本立て」の結線を静的に固定 |
| Q4 | `immutable-release-targetchannel-stable-pointer-atomic-rollback-i3` | **pass** | `service-release.cases.ts` の promote/rollback 群 + `packages/db/__tests__/release-immutable.test.ts`。Release 行は作成後に更新されず、channel の stable ポインタ差し替えのみで版が移動すること、rollback が 2 版目以降限定であることを確認 |
| Q5 | `r2-content-addressed-package-registry-domain-model-db-consumer` | **pass** | `package-inspection.test.ts` 13 件 + `packages/db/__tests__/r2-registry.test.ts`。content hash をキーとした登録で、Hub は consumer として `@harness-hub/db` の公開入口のみを使う (C8 が境界を固定) |
| Q6 | `append-only-audit-event-all-publish-operations` | **pass** | `service-request.cases.ts` / `service-release.cases.ts` の監査群 + `packages/db/__tests__/audit-chain.test.ts`。全変更操作が `PUBLISH_AUDIT_ACTIONS` のいずれかを 1 件以上記録し、`seq`/`prev_hash`/`event_hash` の連鎖が破綻しないことを確認 |
| Q7 | `rest-zod-single-source-authz-middleware-qa009` | **pass** | `routes-{auth,request,release}.cases.ts` 52 件 + `idempotency.test.ts` 26 件。全 route が `withAuthz` を経由し、本文検証は `@harness-hub/schemas` の zod schema 単一定義から行われる。strict schema により未知キーは 400 |
| Q8 | `targetchannel-serialization-single-inflight-publishrequest` | **pass** | `service-request.cases.ts` の submit 直列化群。テスト土台 (`support/harness.ts`) が DB の partial UNIQUE index 述語 `status NOT IN ('published','failed','draft')` を**直接**再現しており、同一 channel の別 request が非終端の間は後続 Draft の submit が `ChannelBusyError` → 409 になることを確認 |
| Q9 | `publish-api-dual-principal-csrf-boundary-qa059` | **pass** | `routes-auth.cases.ts`、`middleware-entry.test.ts`、`authz-decision-matrix.test.ts` / `authz-entry.test.ts`。session/Bearer parity、session CSRF 欠落 403、Bearer の cookie 非依存、invalid Bearer の cookie fallback 禁止、owner/tenant 境界を確認 |

## 3. goal-spec acceptance 3 件の一次確認

P07 で最終判定するが、本 phase の実行結果から見た状況を先に記録する。

| # | acceptance | 状況 |
|---|---|---|
| A1 | 状態遷移が §7.2 準拠で property test を通る | Q1 pass により充足 |
| A2 | 検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される | Q3 + Q4 pass により充足。検査 fail 時に channel の stable ポインタを触らない経路であることを `service-request.cases.ts` / `service-release.cases.ts` で確認 |
| A3 | 全操作が append-only 監査 event に記録される | Q6 pass により充足 |

## 4. 本 phase で検出した欠落と是正

### 4-1. secret scan が公開検査に結線されていなかった (Q3 に対する実質的な違反)

**事象**: Hub の検査入口 `apps/hub/src/lib/publish/package-inspection.ts` が `createPackageInspectionRules()` (= 構造ルール 10 本のみ) を pipeline へ渡しており、`createDefaultSecretScanRules()` が公開検査に一度も渡されていなかった。I2 が定める 3 本立てのうち secret scan が欠けた状態だった。

**検出できなかった理由**: ルール個別のテストは「書いた振る舞い」を守るが、「書き忘れた合成」は守らない。当時の 142 件はすべて緑だった。

**是正** (P05 の実装へ差し戻して修正):

1. `packages/inspection/src/publish-inspection.ts` を新設し、`createPublishInspectionRules()` として 3 本立てを **1 箇所で束ねた**。Publisher (feat-publisher-plugin) のローカル pre-check も同じ関数を呼ぶ前提。
2. Hub の検査入口をこの合成へ差し替えた。
3. `publish-inspection.test.ts` (9 件) で、束が 3 stage を覆うこと・資格情報を含むパッケージが fail になることを**振る舞い**として固定した。同じ入力が構造ルールだけでは pass する対照も併せて assert している。
4. `apps/hub/scripts/check-publish-inspection-gate.mjs` (C7) で、合成の入口が 1 本しかないことを**静的に**固定した。

> 振る舞いのテストと静的検査の両方が要る。束が正しくても Hub 側が束を使わず自前で組み直せば secret scan は再び消えるため。

### 4-2. 冪等ラッパが本文を持てない status を扱えなかった

`withIdempotency` の応答再構成が `204`/`304` 等 (`NULL_BODY_STATUSES`) で `TypeError` になる経路があったため修正済み。現行の publish 経路は本文付き応答しか返さないため実害は出ていなかったが、将来 `204` を返す endpoint を足した時点で 500 になる形だった。

## 5. test-design.md との差異 (責務別ファイル構成)

初回実装では `service.test.ts` と `routes.test.ts` へ統合していたが、landing
レビューで 500 行を超えたため、共有 harness を維持したまま責務単位に分離した。

| 設計上のファイル | 実際の配置 | 理由 |
|---|---|---|
| `serialization.test.ts` | `service-request.cases.ts` | request 作成・upload・submit と同じ harness を共有する |
| `promote-rollback.test.ts` | `service-release.cases.ts` | immutable Release と stable pointer 操作を同じ責務に集める |
| `audit.test.ts` | `service-request.cases.ts` / `service-release.cases.ts` | 監査を各操作の副作用として操作側の test に置く |
| `package-upload.test.ts` | `package-inspection.test.ts` | ZIP 展開と検査は 1 本の手順で、分けると境界のどちら側の失敗か読めなくなる |

route は `routes-auth` / `routes-request` / `routes-release` の 3 cases へ分け、
mock と Request builder は `support/route-context.ts` に共有する。テスト系統の欠落はない。

## 6. 未実行のもの

| 項目 | 理由 |
|---|---|
| system-plan v1.2 runner による本番再 smoke | P13 の既存 S1〜S6 実測後に runner を追加したため、短命 token を再発行しての再 deploy は行っていない。既存実測は `release-record.md` に保存 |
| Publisher クライアント側のテスト | owner=feat-publisher-plugin (スコープ外) |
| Python 資産との出力差分の実測 | 移植元の Python 資産は本リポジトリに存在しない。移植の同値性は `packages/inspection` 側のルール単体テストで担保する (P08 §2 参照) |

## 7. 判定

**全 quality_constraints 9 件 pass。P07 (受入) へ引き継ぐ。**

差し戻しは §4 の 2 件で、いずれも本 phase 内で是正・再実行済み。
