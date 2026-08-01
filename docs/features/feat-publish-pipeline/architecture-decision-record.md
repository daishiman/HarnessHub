---
status: confirmed
layer: feature-design
task: SYS-PUBLISH-PIPELINE-P02
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/requirements-baseline.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline アーキテクチャ決定記録 (ADR)

> **位置づけ**: P02 の成果物。[requirements-baseline.md](./requirements-baseline.md) の現行 quality_constraints 9 件・acceptance 3 件を実装可能な構造へ具体化する。本書で確定した決定は P05 実装の拘束条件であり、実装が本書と矛盾した場合は実装側を是正する (P05 rollback 規約)。

## 0. 決定一覧 (索引)

| id | 決定 | 対応する quality_constraint |
|---|---|---|
| [AD-1](#1-ad-1-publish_requests-等のスキーマ-owner-は-feat-domain-model-db-である) | publish_requests/releases/target_channels/packages/deployment_references/audit_events/idempotency_ledger のスキーマ owner は feat-domain-model-db。本 feature は port 越しの consumer | 全件の前提 |
| [AD-2](#2-ad-2-単一認可ミドルウェアの-owner-は-feat-auth-tenancy-である) | 単一認可ミドルウェア (`apps/hub/src/lib/authz/`) の owner は feat-auth-tenancy。本 feature は `withAuthz` を消費するのみ | rest-zod-single-source-authz-middleware-qa009 |
| [AD-3](#3-ad-3-検査-pipeline-の-owner-は-scaffold-と-ロジック実装-で分割する) | `packages/inspection` は scaffold owner=feat-hub-foundation / ロジック owner=feat-publish-pipeline に分割 | inspection-pipeline-shared-pure-function-package-qa010-qa020 |
| [AD-4](#4-ad-4-publishrequest-状態機械は副作用を持たない純関数-transition-として実装する) | 状態機械は `transition(state, event) -> Result` の純関数。副作用は呼び出し側 | publish-request-state-machine-section7-2-property-test-qa009 / green-auto-publish-yellow-red-needs-fix-i2 |
| [AD-5](#5-ad-5-rest-api-12-経路は-zod-単一ソース--withauthz-の組で実装する) | 12 経路を `packages/schemas/publish-pipeline` の zod 単一ソース + `withAuthz` で実装 | rest-zod-single-source-authz-middleware-qa009 |
| [AD-6](#6-ad-6-targetchannel-直列化は-partial-unique-index-を正本とし-409-へ写像する) | 直列化は partial UNIQUE index が正本。アプリ層は事前確認と 409 写像のみ | targetchannel-serialization-single-inflight-publishrequest |
| [AD-7](#7-ad-7-r2-packageregistry-は-content-addressed-immutable-な-put-once-として消費する) | R2 は content_hash を鍵とする put-once。DB は参照のみ | r2-content-addressed-package-registry-domain-model-db-consumer |
| [AD-8](#8-ad-8-promoterollback-は-stable-pointer-の単一-update-に閉じ-監査-event-を必ず伴う) | promote/rollback/suspend は stable pointer の atomic UPDATE + 監査 event | immutable-release-targetchannel-stable-pointer-atomic-rollback-i3 / append-only-audit-event-all-publish-operations |
| [AD-9](./architecture-integration-decisions.md#ad-9) | 未実装の publish 系 repository を port-first で feat-domain-model-db へ追加合意する | 全件の前提 (実測 gap の解消) |
| [AD-10](./architecture-integration-decisions.md#ad-10) | Idempotency-Key の検査・記録・再生は 1 つの decorator に閉じる | rest-zod-single-source-authz-middleware-qa009 |

---

## 1. AD-1: publish_requests 等のスキーマ owner は feat-domain-model-db である

### 決定

`publish_requests` / `releases` / `target_channels` / `packages` / `deployment_references` / `audit_events` / `idempotency_ledger` の**スキーマ定義 (列・制約・index・migration)** の owner は **feat-domain-model-db** である。本 feature (feat-publish-pipeline) はこれらのテーブルへ **repository 層関数を通じてのみ**アクセスする consumer であり、`packages/db/schema/` 配下を変更しない。

### 根拠 (3 系統)

1. **文書証跡**: `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md` は、コアドメイン 18 テーブルを feat-domain-model-db の Drizzle スキーマ対象として確定し、その一覧に上記 7 テーブルすべてを含む。同文書は `updateReleaseStatus()` のみを公開する immutable 契約、`stable_release_id` の単一トランザクション atomic UPDATE、hash chain 付き `AuditRepo.append()/read()`、`putPackage()/getPackage()` の 2 関数のみを公開する registry サブモジュールまでを確定済み成果物として持つ。
2. **実装実測**: 本 task 実行時点 (2026-07-28) で `packages/db/schema/core/publish.ts` に `publishRequests` (partial UNIQUE index 込み)・`idempotencyLedger`、`packages/db/schema/core/catalog.ts` に `releases`・`targetChannels`・`packages`、`packages/db/schema/core/security.ts` に `auditEvents` が実在する。本 feature が新規に定義する余地は構造上ない。
3. **責務分離**: 「誰がテーブルを定義するか (スキーマ owner)」と「誰が業務ロジックとして読み書きするか (機能 owner)」は別責務である。本 feature は状態機械・検査・promote/rollback という**業務ロジック**の owner にとどまる。

### 帰結

本 feature の write scope は `apps/hub` の API route・状態機械・port/adapter、`packages/inspection/src/` の検査ロジック、`packages/schemas/publish-pipeline/` の zod スキーマに限定される。DDL・migration は発生しない。

---

## 2. AD-2: 単一認可ミドルウェアの owner は feat-auth-tenancy である

### 決定

認可判定は `apps/hub/src/lib/authz/` (owner=feat-auth-tenancy) が公開する `withAuthz()` wrapper に**全面的に委譲**する。本 feature は route handler を `withAuthz` で包み、`action` 文字列と `resolveResource` を渡すだけであり、role 比較・scope 検査・テナント越境判定を自前で書かない。

### 根拠

- docs/backend-spec.md §1 は「認可は単一ミドルウェアに集約 (deny-by-default・全 API で Tenant/Workspace スコープ強制 = D4)」と定める。
- 実測: `apps/hub/src/lib/authz/rules.ts` の `ACTION_RULES` には本 feature が使う `publish.request` / `publish.approve` / `publish.reject` / `channel.promote` / `channel.rollback` / `release.suspend` / `publish.write` が**既に登録済み**であり、role・scope・credential (session/access_token/either) が確定している。本 feature は規則表を書き換えない。
- `apps/hub/scripts/check-single-authz-middleware.mjs` が `ROLE_ORDER` 等のリテラル漏れを機械検査し、`scripts/ci/check-shared-layer-duplicates.mjs` が `withAuthz` を通らない route を `unwrapped-route-handler` として検出する。決定は CI で強制済み。

### 帰結

本 feature が追加する 12 route はすべて `withAuthz` を通す。認証不要 route は作らない (免除登録簿 `scripts/ci/shared-layer-registry.json` に追加しない)。

### 本 feature が使う action の対応表 (規則表からの引き当て。新設しない)

| endpoint | action | 規則表の要求 |
|---|---|---|
| `POST /api/v1/publish` | `publish.request` | owner 以上 / scope `publish:write` / session or Bearer |
| `GET /api/v1/publish` | `publish.request` | 同上 (読取も同一資源クラスの owner 判定に従う) |
| `PUT /api/v1/publish/:id/package` | `publish.write` | owner 以上 / scope `publish:write` / session or Bearer |
| `POST /api/v1/publish/:id/submit` | `publish.write` | 同上 |
| `GET /api/v1/publish/:id` | `publish.write` | 同上 (状態 polling。Publisher/Hub Web 共用) |
| `POST /api/v1/publish/:id/approve` | `publish.approve` | workspace-admin 以上 / session のみ |
| `POST /api/v1/publish/:id/cancel` | `publish.reject` | workspace-admin 以上 / session のみ |
| `GET /api/v1/projects/:id/releases` | `harnesses.read` | member 以上 / session |
| `POST /api/v1/channels/:id/promote` | `channel.promote` | owner 以上 / scope `publish:write` |
| `POST /api/v1/channels/:id/rollback` | `channel.rollback` | owner 以上 / scope `publish:write` |
| `POST /api/v1/releases/:id/suspend` | `release.suspend` | owner 以上 / scope `publish:write` |
| `POST /api/v1/projects/:id/deployment` | `publish.write` | owner 以上 / scope `publish:write` / Bearer 前提 |

> `POST /api/v1/publish/:id/cancel` は backend-spec §4.6 が「Bearer / owner」と書くが、規則表の `publish.reject` は workspace-admin / session である。**規則表を正本とする** (AD-2 の委譲決定により本 feature は規則表を書き換えられない)。差分は P03 の独立レビュー論点として起票し、必要なら feat-auth-tenancy 側の変更として扱う。

---

## 3. AD-3: 検査 pipeline の owner は scaffold と ロジック実装 で分割する

### 決定

- **feat-hub-foundation** = `packages/inspection` の**パッケージ scaffold** owner (`package.json`・`tsconfig.json`・vitest 設定・pnpm-workspace 列挙・CI 配線・ルール登録ヘルパ [`pipeline.ts` / `rules.ts` / `verdict.ts` / `types.ts`])。
- **feat-publish-pipeline (本 feature)** = `packages/inspection/src/` 配下の**検査ロジック実装** owner (owner/公開範囲確認・必須メタ検証・skills-only 制約・禁止 Hook/script/binary 検出・高リスク instructions パターン検出・manifest 補完・試験 install・Catalog 生成の各純関数、および Python 資産との挙動同値テスト)。
- **feat-publisher-plugin** = 消費側 (ローカル pre-check)。**feat-workspace-governance / feat-dual-catalog-web** = 検査結果の UI 消費側。

### 根拠 (3 系統)

1. **feature 定義との整合性**: `features/feat-hub-foundation.md` の scope_out は「業務ドメインロジック」を明記して除外する。Green/Yellow/Red の判定ルールは本 feature 固有の業務ルールであり、同 feature が owner を主張すると自 feature 定義と矛盾する。
2. **published plan 内の実際の成果物範囲**: feat-hub-foundation P02 の write_scope は `docs/features/feat-hub-foundation/architecture-decision-record.md` / `pnpm-workspace.yaml` / `package.json` に限られ、`packages/inspection/` 配下のソースを含まない。**実測**でも既存の `packages/inspection/src/` は登録ヘルパ (`defineStaticValidationRule` / `definePolicyRule` / `defineSecretScanRule`) と畳み込み (`resolveVerdict`)・secret scan preset のみで、**業務判定ルールは 1 件も登録されていない**。scaffold の記述と実態が一致する。
3. **precedent**: `.dev-graph/plans/feature-package-feat-metrics-tracking/plan-findings.json` の info finding "verified/independent-fork" は、shared-layers.md の一元化記述にもかかわらず試算エンジン owner をドメイン feature 側へ確定した判断を妥当と評価済み。ドメインロジックはドメイン feature が持つ、が本システムの先例である。

### 帰結と follow-up

本 feature は `packages/inspection/package.json`・`pnpm-workspace.yaml` に触れない。既存の登録ヘルパの**シグネチャも変更しない** (追加のみ)。

cross-feature follow-up (本 feature の write scope 外・dev-graph へ引き継ぎ):
- (a) `docs/shared-layers.md` §2 の検査 pipeline owner 行を 2 段表記 (scaffold / ロジック) へ訂正する。
- (b) feat-hub-foundation の未実装 phase 実行時に、本決定 (scaffold のみ担当) との整合を確認する。

---

## 4. AD-4: PublishRequest 状態機械は副作用を持たない純関数 transition として実装する

### 決定

`apps/hub/src/lib/publish/state-machine.ts` に、9 状態 × イベントの遷移を**副作用なしの純関数**として実装する。

```text
状態 (DB の publish_requests.status と 1:1):
  draft | validating | needs_fix | ready | approval_pending | approved | publishing | failed | published

イベント:
  submit | inspection_green | inspection_yellow | inspection_red | approve | reject
  | start_publishing | publish_succeeded | publish_failed | cancel
```

遷移表 (docs/backend-spec.md §5.1 の遷移図に厳密一致):

| from | event | to | 備考 |
|---|---|---|---|
| `draft` | `submit` | `validating` | 検査 pipeline を Worker 内同期実行する契機 |
| `validating` | `inspection_green` | `ready` | Green のみが前進する |
| `validating` | `inspection_yellow` | `needs_fix` | MVP サブセット: Yellow も一律差戻し |
| `validating` | `inspection_red` | `needs_fix` | Red も同じ扱い |
| `needs_fix` | `cancel` | `draft` | 差戻しの完了 (作者が再編集できる状態へ) |
| `ready` | `approve` | `approved` | policy 自動承認 (Green) と管理者承認の共通口 |
| `ready` | `submit` | `approval_pending` | **Stage 2 でのみ到達**。policy が auto-approve の間は呼ばれない |
| `approval_pending` | `approve` | `approved` | 管理者承認 |
| `approval_pending` | `reject` | `needs_fix` | 承認拒否は差戻し |
| `approved` | `start_publishing` | `publishing` | R2 昇格 + Release 生成の直前 |
| `publishing` | `publish_succeeded` | `published` | Release 生成 → promote 済み |
| `publishing` | `publish_failed` | `failed` | **既存 stable は触らない** |
| 非終端全般 | `cancel` | `draft` | `POST /publish/:id/cancel`。終端 (`published`/`failed`) からは不可 |

- **終端状態**: `published` / `failed` / `draft`。直列化 (AD-6) の「非終端」判定と DB の partial UNIQUE index の述語 (`status NOT IN ('published','failed','draft')`) を**同一定義から導出**する。2 箇所に別々の終端定義を書かない。
- 表に無い (from, event) の組は `{ ok: false, reason: 'illegal_transition' }` を返す。例外を投げない (呼び出し側が 409/422 へ写像する)。
- 純関数であるため、property test (P04 設計) で「全 9 状態 × 全イベント」の網羅検証ができる。乱数・時刻・I/O をこの module に持ち込まない。

### 根拠

acceptance「状態遷移が §7.2 準拠で property test を通る」は、遷移関数が副作用を持たないことを前提にしないと網羅検証が現実的でない。DB 書込を含む関数は組合せ爆発の各点で実 I/O を要求してしまう。

---

## 5. AD-5: REST API 12 経路は zod 単一ソース + withAuthz の組で実装する

### 決定

- zod スキーマは `packages/schemas/publish-pipeline/` に置き、`packages/schemas/src/index.ts` から re-export する (deep import 禁止の既存規約に従う。`auth-tenancy/` と同じ配置)。
- route handler は `apps/hub/src/app/api/v1/...` に置き、業務処理は `apps/hub/src/lib/publish/service.ts` に集約する。route は「入力の zod 検証 → service 呼び出し → 応答整形」だけを行う。
- エラー応答は RFC 9457 (`application/problem+json`) の既存 `problemDetails` / `problemDetailsFromZodError` を使う (`packages/schemas` が公開済み)。
- 一覧系は既存 `paginationQuerySchema` / `paginatedSchema` の cursor 方式に従う。

### 12 経路の入出力契約

| # | 経路 | 入力 | 応答 |
|---|---|---|---|
| 1 | `POST /api/v1/publish` | `Idempotency-Key` 必須 + `{project_id, target, visibility}` | 201 `{publish_request}` / 422 同一 key 異 payload。Draft は channel を占有しない |
| 2 | `GET /api/v1/publish` | `?project_id&channel_id&status&cursor&limit` | 200 `{items, next_cursor}` |
| 3 | `PUT /api/v1/publish/:id/package` | `multipart/form-data` (package 本体) | 200 `{content_hash, size_bytes}` / 413 サイズ超過 / 415 種別違反 |
| 4 | `POST /api/v1/publish/:id/submit` | body なし | 200 `{status, verdict, findings}` / 409 状態不正または `channel_busy` |
| 5 | `GET /api/v1/publish/:id` | — | 200 `{publish_request}` / 404 |
| 6 | `POST /api/v1/publish/:id/approve` | body なし | 200 `{publish_request}` / 409 状態不正 |
| 7 | `POST /api/v1/publish/:id/cancel` | body なし | 200 `{publish_request}` / 409 終端からの取消 |
| 8 | `GET /api/v1/projects/:id/releases` | `?cursor&limit` | 200 `{items, next_cursor}` |
| 9 | `POST /api/v1/channels/:id/promote` | `{release_id}` | 200 `{channel}` / 409 |
| 10 | `POST /api/v1/channels/:id/rollback` | `{release_id}` | 200 `{channel}` / 409 / 422 検査不合格 |
| 11 | `POST /api/v1/releases/:id/suspend` | body なし | 200 `{release}` |
| 12 | `POST /api/v1/projects/:id/deployment` | `{channel_id, release_id, url, provider, exit_code}` | 201 `{deployment_reference}` |

### 契約上の非対称を明示する

- **rollback の検査**: backend-spec §4.6 は「2 版目以降のみ rollback 先検査」と定める。実装は「対象 channel の release 数が 2 以上のときに限り、rollback 先 release の manifest を検査 pipeline へ通す」とし、1 版目 (= 初回公開しかない channel) では検査を行わない。
- **deployment 登録の orphan_candidate**: HTTP health 確認に失敗した場合、`deployment_references.orphan_candidate = true` で記録し、201 は返す (登録自体は成功させる)。運用手順は P12 で確立する。

---

## 6. AD-6: TargetChannel 直列化は partial UNIQUE index を正本とし 409 へ写像する

### 決定

直列化の**正本は DB の partial UNIQUE index** (`publish_requests_channel_active_uq`: `UNIQUE(channel_id) WHERE status NOT IN ('published','failed','draft')`) とする。アプリ層は次の 2 段で扱う:

1. `POST /api/v1/publish/:id/submit` の入口で「同一 channel に別の非終端 request が既にあるか」を読み取り、あれば 409 `channel_busy` を返す (通常経路)。Draft 作成は channel を占有しない。
2. 読み取りと `Draft→Validating` の CAS UPDATE の間に別要求が割り込んだ場合、UPDATE が partial UNIQUE 違反で失敗する。この違反を捕捉して**同じ 409** へ写像する (競合経路)。

### 根拠

アプリ層の事前チェックだけでは、並行 2 submit が両方「非終端なし」を観測して両方 `Draft→Validating` できてしまう (read-modify-write の古典的な競合)。逆に UNIQUE 違反だけに頼ると、正常系でも例外経路を通ることになり、他の UNIQUE 違反 (別原因) との区別が曖昧になる。2 段構えにして、**通常の競合は読み取りで弾き、同時 submit は制約で弾く**。

`packages/db/repository/conflict.ts` の `errorChainText()` は drizzle が包んだ driver 例外から UNIQUE 違反を判別する既存手段であり、これを使う (message の素朴な正規表現照合では見逃す)。

---

## 7. AD-7: R2 PackageRegistry は content-addressed / immutable な put-once として消費する

### 決定

R2 への書込実装は**本 feature では書かない**。owner=feat-domain-model-db が `packages/db/registry/` に公開済みの `createPackageRegistry(bucket)` (`putPackage` / `getPackage` の 2 関数のみ) を消費する。

`PUT /api/v1/publish/:id/package` の責務は次の 4 手順に限定する。

1. multipart body を `Uint8Array` として読む。
2. **サイズ上限と種別制限 (SEC7) をここで判定する** — R2 へ書いてから消す経路を作らない。
3. `registry.putPackage(buffer)` を呼ぶ。sha256 の計算・`r2_key = packages/<content_hash>` の導出・`head()` による既存確認 (存在すれば `put` しない = put-once) はすべて registry 側が済ませており、本 feature は再実装しない。
4. 返った `{contentHash, r2Key, sizeBytes}` を `PackagesRepo.record()` へ渡す (同一 content_hash の再登録は `onConflictDoNothing` で no-op)。

bucket は `apps/hub/wrangler.jsonc` の `PACKAGES_BUCKET` binding から取る。`R2BucketLike` は構造型で宣言されているため、Workers の実バインディングもテスト fake もそのまま渡せる (workers-types への依存を持ち込まない)。

### 根拠

`packages` テーブルの PK は content_hash であり、内容が同じなら同じ行になる。put-once にしないと、同一 hash に対して別内容を書く経路 (= content-addressed の前提を壊す経路) がコード上に存在してしまう。この不変条件は `putPackage` の 1 実装に閉じているため、消費側が sha256 や key 導出を再実装すると**同じ規則の写しが 2 つ**でき、片方だけ変わる事故が起きる。よって本 feature は再実装せず消費に徹する。

---

## 8. AD-8: promote/rollback は stable pointer の単一 UPDATE に閉じ、監査 event を必ず伴う

### 決定

- promote / rollback / 初回公開は、いずれも `targetChannels.setStableRelease(context, channelId, releaseId)` という**同一の単一 UPDATE** に落とす。操作名の違いは監査 event の `action` 値 (`channel.promote` / `channel.rollback`) と入力の release 選択だけであり、書込経路を分けない。
- `Publishing` 中に失敗した場合は `setStableRelease` を**呼ばない**。これにより「失敗時に旧 stable が無傷で残る」が、追加のロールバック処理ではなく**何もしないこと**によって成立する。
- 監査対象操作 (`publish.request` / `publish.approve` / `publish.reject` / `channel.promote` / `channel.rollback` / `release.suspend`) は、状態遷移の成功後に `AuditRepo.append()` を呼ぶ。summary には値そのもの (secret・token) を書かず、変更の事実 (from/to 状態・release_id・verdict) のみを書く。
- `deployment_references` 登録も監査対象に含める (requirements-baseline §5「submit・approve・promote・rollback・suspend・deployment 登録」)。既存の action 語彙 (backend-spec §3.8) に deployment 用の値が無いため、**`channel.promote` を流用せず**、P03 のレビュー論点として語彙追加の要否を起票する。暫定は `publish.request` を使わず、監査 action 名 `deployment.register` を本 feature の追加語彙として提案する (backend-spec §3.8 は「この列挙を正本にする」と定めるため、語彙追加は cross-feature 合意を要する)。

### 根拠

acceptance「検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される」「全操作が append-only 監査 event に記録される」を、**分岐の少ない構造**で満たす。stable pointer の書込口が 1 つなら、「どこかで別経路が pointer を触った」という事故が構造的に起きない。

---

## 9. Cross-feature 統合決定

repository の consumer 境界 (AD-9)、Idempotency-Key の共通処理 (AD-10)、
P05 の実装配置、P03 のレビュー論点と landing 時の収束結果は
[architecture-integration-decisions.md](./architecture-integration-decisions.md) に分冊した。
本書の AD-1〜AD-8 と合わせて P02 の決定全体を構成する。
