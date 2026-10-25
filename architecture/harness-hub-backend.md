---
graph_node_id: "arch-harness-hub-backend"
artifact_kind: "architecture"
artifact_subtypes: ["backend"]
project_id: "harness-hub"
domain: "backend"
tags: ["system-spec-import","backend"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub backend アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-08-02T09:35:39.090388Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-infrastructure","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-backend.md"]
purpose: "REST + OpenAPI + zod 単一ソース・PublishRequest 状態機械・コード構造規約 (接続層/認証アダプタ隔離) の正本参照"
goal: "qa-009/qa-010/qa-020 の確定要件に適合する backend 実装の指針を提供する"
scope_in: ["system-spec/backend.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-backend.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"bda6fe3fb33ce9aaa79d6b29701c63e0b5803917b9bfcf797c72409fe365de36","evaluator":"validate-coverage-matrix.py --require-complete","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-02T09:32:20Z","origin_kind":"system-spec-harness","source_digest":"a8ca02bed90d95d3646428342d09fd92c7bf813b3d166873cfdcd22d168c1aa5","source_path":"system-spec/backend.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-backend.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-17T00:35:59Z","missing_sections":[],"status":"complete"}
---

# Harness Hub backend アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/backend.md](../system-spec/backend.md) (sha256: `a8ca02bed90d95d…`)

- confirmation: `confirmed` / evaluator: `validate-coverage-matrix.py` → **PASS** (`system-spec/spec-state.json`)
- 再取込日時: 2026-08-02T08:12:28Z / plugin: system-spec-harness v0.1.0

## 要件定義書 (上位概念)

この wrapper は backend の設計判断を上位要件へ追跡する索引であり、要件本文の正本は `system-spec/backend.md` に置く。

### U1 本質的目的 (essential_purpose)

利用者の操作を、予測可能で検証可能な API と状態遷移として安全に実行する。

### U2 背景 (background)

入力検証、API 定義、状態機械が分散すると、クライアント間の不一致と回復不能な更新が生じる。

### U3 ゴール (goals)

zod を単一ソースとする REST/OpenAPI 契約と、明示的な PublishRequest 状態機械を維持する。

### U4 目標 (objectives)

接続層、認証アダプタ、ドメインロジックを分離し、同じ検証規則を全入口で共有する。

### U5 成功基準 (success_criteria)

API 契約試験、状態遷移試験、認可境界試験が通り、不正入力が一貫したエラーとして拒否されることを成功とする。

### U6 ステークホルダー (stakeholders)

Web/CLI 利用者、backend 開発者、連携先、セキュリティおよび運用担当者を対象とする。

### U7 スコープ (scope)

Route Handler、入力検証、OpenAPI、状態遷移、共通エラー契約を扱う。

### U8 制約 (constraints)

認証情報の直書き、入口ごとの検証重複、定義と実装が分離した API 契約を禁止する。

### U9 具体的にやりたいこと (concrete_intents)

同じ要求がどのクライアントから届いても、同じ検証・認可・状態遷移を再現できるようにする。

### 意思決定支援 (decisions)

短期的な実装速度と契約の一貫性が競合するときは、単一ソースと回復可能な状態遷移を優先する。

## Architecture overview

正本: system-spec/backend.md。Route Handlers + zod → OpenAPI 生成、PublishRequest 状態機械 (§7.2)、検査ロジック共有パッケージ、qa-020 のコード構造規約。doctrine anchor: Clean Architecture。

## Context and drivers

正本章 (system-spec/backend.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/backend.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/backend.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/backend.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/backend.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: backend — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/backend.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-26 / HarnessHub-b7ng)**:

- `/api/auth/{tenant_slug}/{action}` を Auth.js handler へ結線し、Auth.js 型は `lib/auth/adapter/` から外へ出さない。
- production の AuthPorts・監査・Device Flow は `packages/db` の同じ CoreRepositories へ合成し、in-memory fallback を持たない。
- 詳細な変更と検証は [仕様反映受領書](../docs/features/feat-auth-tenancy/spec-reflection-receipt.md) を参照する。

**差分追記 (2026-07-30 / SYS-AUTH-TENANCY-P13)**:

- サインインUIは`GET /api/auth/{tenant_slug}/csrf`でcookie/tokenを取得し、
  `POST /api/auth/{tenant_slug}/signin/tenant-oidc`へnative form送信する。
- client側fetchはCSRF取得だけに限定し、Googleへの302を追わない。これによりCORS依存を避け、
  Auth.jsの外部redirectを通常のブラウザnavigationとして扱う。
- Google client secretの保存はCoreRepositoriesを通し、DB暗号化・tenant scope・鍵台帳を
  直接SQLやUIへ重複実装しない。runtimeはDBから接続を解決する。
- 失敗時はform送信を止め、再試行可能な表示へ戻す。API path、DB schema、role契約は変更しない。

**差分追記 (2026-07-30 / SYS-PUBLISH-PIPELINE-P13)**:

- Publisher の短命 Bearer は edge middleware で署名・期限・tenant/workspace claims を検証し、
  route の `withAuthz` で scope・Project 所有者・credential 種別・失効を最終判定する。
- 不正な Bearer が存在する要求は session cookie へ fallback せず 401 とする。middleware と
  route が別々の認証実装を持たないよう、JWT 検証器を共有する。
- Draft PublishRequest は編集待ちとして複数作成でき、channel の占有は
  `POST /publish/:id/submit` の `Draft→Validating` で開始する。同一 TargetChannel の別 request が
  非終端なら submit を 409 `channel_busy` で拒否し、後続 Draft と旧 stable を維持する。
- 本番 smoke でこの二段境界を実測し、cancel は session/Bearer の双方で同じ owner・
  tenant/workspace・resource ownership、deployment は owner Bearer、cross-tenant は拒否、
  invalid Bearer は session へ fallback しないことをリリース証跡へ固定する。

## Delivery, migration and rollback

正本章 (system-spec/backend.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/backend.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-08-01 / `HarnessHub-fnej` / qa-110)**:

- tenant path で認可を開始し、共有方式だけ Auth.js の basePath を
  `/api/auth/shared` へ切り替える。共通 callback は自前 state を先に検証して tenant を
  復元し、tenant id/slug と接続 mode の一致後に Auth.js を実行する。
- shared tenant の tenant 別 callback、customer tenant の共通 callback、予約 slug
  `shared` は別々に fail-closed とし、汎用 route fallback を作らない。
- credential resolver は `customer_google` だけ DB 暗号文を復号し、
  `shared_google` だけ環境 credential を返す。mode/issuer/設定不一致は認可開始前に閉じる。
- callback 順序は state/tenant → code・PKCE・nonce・署名 → `hd` → JIT → session。
  Workspace 拒否を user insert より前に置き、同じ Google `sub` も
  `(tenant_id, sub)` で別 principal とする。
- 顧客方式の basePath、Auth.js state cookie、secret 復号、session claims は非回帰とする。

**差分追記 (2026-08-02 / `HarnessHub-uk2i` / qa-125)**:

- `/api/v1/admin/oidc-connections/*` は既存 `withAuthz` の provider-admin 判定と
  同一 origin 検査を通し、資源側 tenant を repository context へ渡す。
- 一覧・ID 指定操作を Google issuer に限定し、同一 tenant の別 IdP を管理対象へ混ぜない。
- 現行テストは現行暗号文+期待状態、pending テスト/昇格は pending 暗号文を CAS 条件にし、
  同時差し替え時は 409 `state_conflict` で読み直しを要求する。
- token probe は client credential の疎通確認に限定し、redirect URI は実 login で確認する。
  応答・監査には列挙値と last4 だけを渡す。

## 2026-08-10 Metrics / Build Pipeline MVP 差分

**Metrics (`HarnessHub-lm7` / feat-metrics-tracking)**:

- `POST /api/v1/metrics/events` は Device Flow 短命 Bearer・workspace header・
  `Idempotency-Key` を必須とし、body は `harnessId` と整数 `runCount` のみ。
- `GET /api/v1/metrics/summary` と `GET /api/v1/metrics/rollups` は確定済み rollup の
  読取専用。dim=user の金額は `users.read_salary` 保持者に限定する。
- Workers cron が日次・週次で rollup を確定し、金額換算は `packages/estimation` と
  `tenant_coefficients` だけで行う。

**Build Pipeline (`HarnessHub-9am` / feat-build-pipeline-board)**:

- `GET /api/v1/builds` / `GET /api/v1/builds/:id` / `POST /api/v1/builds/:id/stage`。
- 工程は 7 値の隣接遷移のみ。stage 変更は workspace-admin 以上 + audit +
  `build_stage_events` を同一 transaction で確定する。
- `publish` への遷移は同一 scope の PublishRequest が `published` のときだけ許す。
- **MVP 面 (2026-08-16)**: 上記 3 endpoint に加え `POST /api/v1/builds` と
  `PATCH /api/v1/builds/:id` を追加。認可は `builds.create` / `builds.update`。
  検証パッケージ: [P04–P12 受領書](../docs/features/feat-build-pipeline-board/p04-p12-final-review-spec-reflection-receipt.md)。
  運用: [runbook](../docs/features/feat-build-pipeline-board/runbook.md)。

正本は [backend](../system-spec/backend.md)。詳細 ADR は各 feature の
`docs/features/*/architecture-decision-record.md`。

## 2026-08-17 画面内改善要望 I15（仕様のみ）

出口は D10 GitHub Issue。画像は D11 専用 R2。Workers からの GitHub 操作は D12 の
fetch 薄 client。token は Workers Secret、Issues + Contents の read-write、対象 1 repo。
起票は本文ハッシュで新規/更新/変更なしを導出する。診断は 32KB 上限。実装は未着手。
正本は `system-spec/backend.md` と
[I15 追補](../docs/features/feat-feedback-loop/i15-in-app-improvement-request-addendum.md)。

## 2026-08-12 hearing-intake 用途プロファイル / 共有トークン (MVP)

**Beads**: `HarnessHub-370h` / graph node `issue-hearing-intake-pr705-elegant-review-20260812` / PR #705

- FormData を 30 項目へ拡張し (保存 snapshot は `salary` を除く 29 項目)、`POST /api/v1/sheets` は用途プロファイル・依頼パターン・参考 URL を受け付ける。
- 認証付き追加 API: `.../screenshots` (CRUD 最小) と `.../handoff-tokens` (発行/一覧/revoke)。
- 公開 API: `GET /api/hearing/:token` と screenshot 中継。session なし。無効トークンは undifferentiated 404。
- 認可: 公開経路は middleware 例外として exact path のみ。token_hash 照合後の sheet scope を正本とする。
- 公開経路の rate limit は 2 段。token 解決より前に IP 単位 240 req/min
  (`checkHearingSharePreResolveRateLimit`)、解決後に token row ID 単位で payload 120 /
  screenshot 60 req/min。1 段目の鍵に token を含めない (429 を存否 oracle にしない)。
- 添付は allowlist 8 種・25 MiB。経路名 `screenshots` は歴史的経緯。
- 詳細正本: `docs/backend-spec-api-state.md` §4.3 / §4.3.1。feature ADR 追補は
  `docs/features/feat-hearing-intake/architecture-decision-record.md` AD-2。

## 2026-08-12 Docs CMS rich editing / scheduled publish / external sync

- 既存 `draft/published` を維持し、予約中は `draft + future publish_at` から導出する。未来でない日時・
  不正形式・`published`との同時指定は422、future指定時はdraftへ導出する。手動の`status`指定（同値再送を含む）、
  title/bodyの実変更、AI書戻し、force sync、cron公開は予約をclearする。
- 一覧/APIはcategory/tag、safe thumbnail、auto/manual excerpt、asset summaryを保持する。内部画像は
  document/tenant認可付き同一origin routeでR2を中継し、raw object URLを公開しない。
- 外部Markdown同期はDevice Flowの`docs:write`、自然キー、ETag/If-Match、単調revision CASを使う。
  Hub側のmanual分類・thumbnail・excerptを外部本文で上書きしない。
- 日次予約公開はdefault/max 100件、`publish_at ASC,id ASC`、各行CASで
  `{publishedCount,hasMore,publishedDocuments}`を返す。repositoryが状態・revisionを更新した後、Hubは返却文書ごとに
  actor=`system`の監査を順次追記する。監査失敗はジョブ失敗として記録するが、DB更新との原子性は主張しない。
- 詳細正本: `docs/backend-spec-api-state.md` §4.8/§4.8.1、
  `docs/features/feat-docs-cms/architecture-decision-record.md` §8.1。

## 2026-08-15 カード編集の安全化 writeback (feat-card-mutation-safety)

- 通常 Docs / Sheets CRUD は共通 HTTP helper (`apps/hub/src/lib/http/mutation-safety.ts`)
  と repository の原子 claim / CAS に閉じる。handler 後段で台帳を書く形にはしない。
- 既存 create/edit caller はフォーム開始時の UUID v4 を再送で維持し、412 後も未保存 draft を保つ。
- 詳細正本: `features/feat-card-mutation-safety.md` と
  `docs/features/feat-card-mutation-safety/spec-reflection-receipt.md`。
