---
status: confirmed
layer: feature-design
task: SYS-PUBLISH-PIPELINE-P03
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/architecture-decision-record.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline 独立設計レビュー記録

> **位置づけ**: P03 の成果物。[architecture-decision-record.md](./architecture-decision-record.md) (P02) の決定 AD-1〜AD-10 を、**設計文書の記述だけを信じず repo の実測と突き合わせて**検証する。指摘は P02 へ差し戻し、本書自体は設計を変更しない (spec の rollback 規約)。

## 0. レビュー結果サマリ

| 決定 | verdict | 備考 |
|---|---|---|
| AD-1 スキーマ owner = feat-domain-model-db | **pass** | 3 系統証跡が実測と一致 |
| AD-2 認可ミドルウェア owner = feat-auth-tenancy | **pass (指摘 1 件)** | R-01: cancel の認可強度が spec と規則表で不一致 |
| AD-3 検査 pipeline owner 分割 | **pass** | 3 系統証跡が実測と一致 |
| AD-4 状態機械 = 純関数 transition | **pass (指摘 1 件)** | R-02: `ready --submit--> approval_pending` は到達不能経路 |
| AD-5 REST 12 経路 | **pass** | backend-spec §4.6 と 1:1 対応を確認 |
| AD-6 TargetChannel 直列化 | **pass** | index 述語と終端定義の一致を実測確認 |
| AD-7 R2 PackageRegistry | **差し戻し → 是正済み** | R-03: 既存実装の見落とし。P02 を訂正して解消 |
| AD-8 promote/rollback + 監査 | **pass (指摘 1 件)** | R-04: deployment 登録の監査 action 語彙が未定義 |
| AD-9 repository の port-first 追加 | **pass (条件付き)** | R-05: 追加は composition と新規 file に限定すること |
| AD-10 Idempotency decorator | **pass** | 既存 `idempotencyLedger` スキーマで充足可能 |

**総合判定**: R-03 (AD-7) は設計文書と実装実態の食い違いという**重大な指摘**であったため P02 へ差し戻し、P02 側の訂正を確認したうえで pass とした。その他の指摘 R-01/R-02/R-04/R-05 は P05 実装時の遵守事項として引き継ぐ。**P04 (テストファースト設計) への進行を承認する**。

---

## 1. cross-feature 境界判断 3 件の検証

### 1.1 AD-1 (スキーマ owner) の 3 系統証跡の妥当性 — pass

P02 が挙げた 3 系統を、それぞれ独立に確認した。

| 系統 | P02 の主張 | レビュー時の実測 | 判定 |
|---|---|---|---|
| 文書証跡 | feat-domain-model-db P02 がコアドメイン 18 テーブルを owner として確定 | `.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md` に該当記述あり | ○ |
| 実装実測 | 7 テーブルが既に `packages/db/schema/core/` に実在 | `publish.ts` に `publishRequests`/`idempotencyLedger`、`catalog.ts` に `releases`/`targetChannels`/`packages`/`deploymentReferences`、`security.ts` に `auditEvents` を確認 | ○ |
| 責務分離 | スキーマ owner と業務ロジック owner は別責務 | 本 feature の write scope に `packages/db/schema/` が含まれない (phase-05 spec が明示的に「対象外」と記載) | ○ |

**独立検証で追加確認した点**: 3 系統が互いに独立した根拠であること (循環していないこと) を確認した。文書証跡は plan 由来、実装実測は repo 由来、責務分離は原則由来であり、どれか 1 つが誤っても他 2 つが判断を支える。

### 1.2 AD-2 (認可ミドルウェア owner) の妥当性 — pass、指摘 R-01

`apps/hub/src/lib/authz/rules.ts` の `ACTION_RULES` に本 feature が使う 7 action がすべて登録済みであることを実測確認した。本 feature が規則表を編集せず `withAuthz` を消費するだけで足りるという判断は妥当。

**指摘 R-01 (中)**: `POST /api/v1/publish/:id/cancel` の認可強度が食い違う。

- docs/backend-spec.md §4.6: 「Bearer / owner」
- `ACTION_RULES['publish.reject']`: `minRole: 'workspace-admin'`, `credential: SESSION`

P02 は「規則表を正本とする」と判断したうえで差分を P03 論点として起票しており、判断手順そのものは適切 (owner でない feature が他 feature の正本を書き換えないという AD-2 の帰結に従っている)。

ただし**意味論としては backend-spec 側が正しい可能性が高い**。cancel は「自分が出した publish request を取り下げる」操作であり、承認 (`publish.approve`) と同格の管理者権限を要求すると、Publisher クライアントが Bearer token で作った request を Bearer token で取り消せなくなる。実際 `POST /api/v1/publish` は `publish.request` (owner / EITHER) で作成できるため、**作成はできるが取消はできない**という非対称が生じる。

**引き継ぎ**: `publish.reject` を「他者の request を却下する管理者操作」、cancel を「自分の request を取り下げる操作」として別 action に分けるのが筋である。本 feature は規則表の owner ではないため、feat-auth-tenancy への cross-feature 変更要求として起票する。P05 では**規則表の現状 (`publish.reject`) に従って実装**し、非対称が残る事実を quality-assurance-report (P09) に記録する。

### 1.3 AD-3 (検査 pipeline owner 分割) の 3 系統証跡の妥当性 — pass

| 系統 | P02 の主張 | レビュー時の実測 | 判定 |
|---|---|---|---|
| feature 定義 | feat-hub-foundation の scope_out が「業務ドメインロジック」を除外 | `features/feat-hub-foundation.md` に該当記述あり | ○ |
| 成果物範囲 | scaffold のみで業務ルールは 0 件 | `packages/inspection/src/` に `pipeline.ts`/`rules.ts`/`verdict.ts`/`types.ts`/`secret-scan-preset.ts` があり、**登録済み業務ルールは 0**。`createDefaultSecretScanRules` は汎用 secret パターンであり skills-package 固有判定を含まない | ○ |
| precedent | 試算エンジン owner 分割の先例 | `feature-package-feat-metrics-tracking/plan-findings.json` の info finding を確認 | ○ |

**独立検証で追加確認した点**: `packages/inspection/package.json` の description が「Hub 正式検査と Publisher ローカル pre-check が同一実装を参照する」と述べており、**scaffold が最初から複数 consumer を想定して置かれた**ことが読み取れる。これは「scaffold owner ≠ ロジック owner」という分割と整合する (単一 feature 専用なら共有 package にする理由がない)。分割判断を支持する 4 つ目の証跡として記録する。

---

## 2. 状態機械設計の検証 (AD-4)

### 2.1 9 状態の §5.1 準拠性 — pass

`PUBLISH_REQUEST_STATUSES` (packages/db/schema/core/publish.ts) の 9 値と、AD-4 の状態集合が完全一致することを実測確認した。DB の enum とアプリの状態型が食い違う余地がない。

```
draft | validating | needs_fix | ready | approval_pending | approved | publishing | failed | published
```

### 2.2 指摘 R-02 (低): `ready --submit--> approval_pending` は現時点で到達不能

AD-4 の遷移表はこの辺を含むが、同じ表に「Stage 2 でのみ到達」と注記されている。MVP では policy が Green を自動承認するため、`ready` からは常に `approve` が発火し、この辺を通る経路が存在しない。

**判断**: 表に残すこと自体は妥当 (§5.1 の状態機械を欠落なく写す方が、後で足すより安全)。ただし **property test でこの辺を「許可された遷移」として検証すると、実際には呼ばれないコードを緑にし続ける**ことになる。

**引き継ぎ**: P04 のテスト設計で、この辺を「定義上は許可 / MVP では未使用」と明示的に分類し、テスト名にその旨を含めること。到達不能経路を沈黙させない。

### 2.3 純関数化の妥当性 — pass

副作用を持たない `transition(state, event) -> Result` とする判断は、acceptance「property test を通る」の前提として必要十分である。9 状態 × 10 イベント = 90 通りの全数検証が I/O なしで回せる。

**独立検証で追加確認した点**: AD-4 が「例外を投げず `{ok: false, reason}` を返す」としている点は、`packages/inspection/src/pipeline.ts` の `evaluateRule` が例外を error finding へ封じ込めている設計と同じ方針であり、リポジトリ全体の一貫性がある。

### 2.4 Green/Yellow/Red 判定と quality_constraint の整合 — pass

`resolveVerdict` は `fail` / `warn` / `pass` の 3 値を返す。AD-4 の遷移表はこれを `inspection_red` / `inspection_yellow` / `inspection_green` へ写像し、**Yellow と Red の双方を `needs_fix` へ落とす**。これは quality_constraint `green-auto-publish-yellow-red-needs-fix-i2` の「Green のみ自動公開、Yellow/Red は一律 Needs Fix」と一致する。

**指摘なし**。ただし P05 実装時に `verdict` 列 (`green`/`yellow`/`red`) と inspection の `pass`/`warn`/`fail` の**語彙が異なる**点に注意。写像を 1 箇所に閉じること (2 箇所で写像すると片方だけずれる)。

---

## 3. REST API 設計の検証 (AD-5) — pass

backend-spec §4.6 の 12 経路と AD-5 の一覧が 1:1 で対応することを照合した。過不足なし。

`packages/schemas/publish-pipeline/` への配置と `packages/schemas/src/index.ts` からの re-export という判断は、既存の `export * from '../auth-tenancy/index.js';` と同型であり、deep import 禁止の規約に適合する。

**独立検証で追加確認した点**: contract-registry へ登録しない判断も先例通り。`packages/schemas/src/index.ts` のコメントが「登録簿の責務は共通契約まで」と明記しており、業務ドメイン schema を登録すると OpenAPI drift 検査 (`check:drift`) の対象が肥大する。P05 では `contract-drift.test.ts` のスナップショットを更新しないこと。

---

## 4. TargetChannel 直列化の検証 (AD-6) — pass

### 4.1 index 述語と終端定義の一致

実測した partial UNIQUE index:

```sql
uniqueIndex('publish_requests_channel_active_uq').on(channelId)
  WHERE status NOT IN ('published', 'failed', 'draft')
```

AD-4 が定めた終端 (`published` / `failed` / `draft`) と完全一致する。AD-6 の「終端定義を 2 箇所に書かない」という要求は、DB 側の述語を正としてアプリ側が同じ集合を持つ形で満たせる。

**引き継ぎ**: P05 では終端集合を `TERMINAL_STATUSES` として 1 箇所に定義し、状態機械と直列化チェックの両方がそれを参照すること。加えて **DB の index 述語とこの定数が一致することを検証するテスト**を置くこと (index は migration 側にあるため型では守れない)。

### 4.2 2 段構え (事前読取 + UNIQUE 違反捕捉) の妥当性 — pass

read-modify-write の競合を制約で塞ぐ設計は妥当。`errorChainText()` を使う判断も実測で裏付けられた — `packages/db/repository/releases.ts:43` に「error.message だけでは UNIQUE 違反を見逃す」というコメント付きの先例があり、同じ罠が既に踏まれている。

---

## 5. R2 PackageRegistry の検証 (AD-7) — 差し戻し → 是正確認

### 指摘 R-03 (高): 既存実装の見落とし → **P02 訂正済み**

P02 初版は `apps/hub/src/lib/publish/registry.ts` に R2 の put-once ロジック (sha256 計算・key 導出・既存確認) を**新規実装する**設計だった。

しかし実測により、**同一のロジックが既に `packages/db/registry/index.ts` に `createPackageRegistry` として実装済み**であることが判明した。

```ts
// packages/db/registry/index.ts (既存)
export function packageR2Key(contentHash: string): string { return `packages/${contentHash}`; }
export function createPackageRegistry(bucket: R2BucketLike): PackageRegistry
//   putPackage: sha256 → key 導出 → head() で既存確認 → 無ければ put (put-once)
//   getPackage: key から body を返す
```

これは `packages/db/__tests__/r2-registry.test.ts` でテスト済みであり、`packages/db/scripts/smoke-production.ts` が実バケットに対する疎通確認にも使っている。

**影響**: P02 初版どおり実装すると、content-addressed の不変条件を守るロジックが repo 内に 2 実装できる。片方だけ変更されたときに「R2 のキー体系が 2 通りある」という、テストでは検出しにくい破損が生じる。quality_constraint `r2-content-addressed-package-registry-domain-model-db-consumer` の**「consumer」という語**にも反する。

**是正**: P02 の AD-7 と §11 実装配置を訂正し、「本 feature は R2 書込を実装せず `createPackageRegistry` を消費する」「`PUT :id/package` の責務は body 読取・サイズ/種別検査・`putPackage` 呼出・`PackagesRepo.record()` の 4 手順に限定」とした。訂正後の記述が実装実態と一致することを再確認し、**pass** とする。

**教訓 (P08 へ引き継ぎ)**: 設計文書が「新規実装する」と書いた対象は、着手前に repo 実測で既存有無を確認すること。本件は P02 が `packages/db/repository/` は調べたが `packages/db/registry/` を調べていなかったことに起因する。P08 の「検査ロジック二重実装防止 CI 検査」に、R2 key 体系の二重定義検出も含めるとよい。

---

## 6. promote/rollback と監査の検証 (AD-8)

### 6.1 stable pointer の単一書込口 — pass

`targetChannels.setStableRelease()` が単一 UPDATE で pointer を切り替えることを実測確認した (`packages/db/repository/channels.ts`)。promote/rollback/初回公開を同一関数へ落とす判断は、quality_constraint `immutable-release-targetchannel-stable-pointer-atomic-rollback-i3` を最小の分岐で満たす。

「失敗時に何もしないことで旧 stable が残る」という設計は、**追加のロールバック処理を書かない**という点で優れている。ロールバック処理は失敗時にしか走らないため、テストされにくく壊れやすい。

### 6.2 指摘 R-04 (中): deployment 登録の監査 action 語彙が未定義

`deployment_references` 登録は requirements-baseline §5 の監査対象に含まれるが、backend-spec §3.8 の action 列挙に対応する値がない。P02 は `deployment.register` の新設を提案しつつ、語彙追加が cross-feature 合意を要すると正しく認識している。

**判断**: 提案は妥当。既存 action の流用 (`channel.promote` 等) は監査ログの意味を壊すため避けるべきという P02 の判断を支持する。**監査は「何が起きたか」を後から再構成するための記録であり、別の操作名で記録することは記録しないことより悪い** (誤った再構成を招く)。

**引き継ぎ**: P05 で `deployment.register` を使用し、backend-spec §3.8 への語彙追加要求を P09 の quality-assurance-report に記録する。

### 6.3 hash chain の扱い — pass

`AuditRepo.append()` が seq/prev_hash/event_hash のチェーンを内部で維持することを実測確認した。本 feature は `append()` を呼ぶだけで chain を自前計算しない。この境界は正しい。

---

## 7. repository 追加の検証 (AD-9)

### 7.1 実測 gap の再確認 — pass

P02 が挙げた gap を独立に確認した。

| 対象 | repository 関数 | `CoreRepositories` 登録 |
|---|---|---|
| `publish_requests` | **なし** (`packages/db/repository/` に該当 file なし) | なし |
| `releases` | あり (`releases.ts`) | **なし** |
| `target_channels` | あり (`channels.ts`) | **なし** |
| `packages` | あり (`packages.ts`) | **なし** |
| `idempotency_ledger` | あり | **なし** |
| `audit_events` | あり | あり |

`composition.ts` の `CoreRepositories` interface に 8 種のみが並んでいることを実測確認。gap は P02 の記述どおり実在する。

### 7.2 指摘 R-05 (中): 追加範囲を最小に限定すること

`composition.ts` の冒頭コメントは「追加するときは必ずここへ足す — 合成点が leaf factory を直接呼ぶ経路を作らないため」と明記しており、**5 種の登録は同 file の設計意図に沿った追加**である。owner 境界を越えるが、意図に反する変更ではない。

ただし、同 file は「**値域 enum は公開しない**」という強い制約を持つ。`publishRequests` の repository を追加する際に `PublishRequestStatus` のような値域型を `composition.ts` から公開すると、`packages/schemas` (zod) との二重定義になり `scripts/ci/check-shared-layer-duplicates.mjs` が落ちる。

**引き継ぎ (P05 遵守事項)**:
- 追加してよいもの: `packages/db/repository/publish-requests.ts` (新規 file)、`composition.ts` への 5 種の import/interface/factory 追加、行の型 (`PublishRequestRow`) の alias。
- 追加してはいけないもの: 値域 enum の公開、既存 repository のシグネチャ変更、`packages/db/schema/` 配下の変更。
- CAS (`transitionStatus`) を必ず通すこと。「読む → 判定 → 全置換」を許す port を作らないという AD-9 の要求は、状態機械の正しさを DB 層で担保する唯一の手段である。

---

## 8. Idempotency の検証 (AD-10) — pass

`idempotencyLedger` スキーマ (`primaryKey({columns: [scope, key]})`, `requestHash`, `responseStatus`, `responseBodyJson`, `expiresAt`) が AD-10 の要求 (同一 key 異 payload → 422、記録済み応答の再生、TTL 24h) をすべて表現できることを確認した。スキーマ変更は不要。

**引き継ぎ**: `expiresAt` の判定に使う「現在時刻」は `packages/db/repository/time.ts` の `serverNow()` を使うこと。route 側で `Date.now()` を直接呼ぶと、テストで時刻を固定できない箇所が増える。

---

## 9. P04 へ引き継ぐテスト設計上の要求

本レビューで確定した、テスト設計に必ず含めるべき項目:

1. 状態機械: 9 状態 × 全イベントの全数 property test。到達不能経路 (R-02) は「定義上許可 / MVP 未使用」と明示分類する。
2. 終端集合: `TERMINAL_STATUSES` と DB の partial index 述語が一致することの検証テスト (R-06 相当。型では守れないため)。
3. verdict 写像: `pass/warn/fail` → `green/yellow/red` の写像が 1 箇所であることの検証。
4. 直列化: 事前読取経路 (通常 409) と UNIQUE 違反経路 (競合 409) の**両方**を独立にテストする。片方だけだと 2 段構えの意味がない。
5. R2: 本 feature は `putPackage` を再実装しないため、**registry 自体のテストは書かない** (owner 側に既存)。書くのは「サイズ/種別検査が put の前に走ること」と「`PackagesRepo.record()` が呼ばれること」。
6. 監査: 6 操作すべてが `append()` を呼ぶことの検証。hash chain の整合性検証は owner 側に既存のため重複させない。
7. Idempotency: 未記録 / 記録済み同一 payload / 記録済み異 payload / TTL 超過 の 4 分岐。

## 10. 検証

- 本書の受入条件 (P03 acceptance): 3 系統の cross-feature 境界判断根拠の検証結果 (§1)、状態機械 (§2)・検査 pipeline (§1.3)・単一認可ミドルウェア消費 (§1.2)・TargetChannel 直列化 (§4) の各設計の妥当性確認結果を記載。
- 重大な指摘 R-03 は P02 へ差し戻し、訂正を確認済み (§5)。
- 判定: **P04 へ進行を承認する**。
