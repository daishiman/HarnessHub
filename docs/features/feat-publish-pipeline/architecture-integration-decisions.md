---
status: confirmed
layer: feature-design
task: SYS-PUBLISH-PIPELINE-P02
parent_feature: feat-publish-pipeline
feature_package_id: feature-package/feat-publish-pipeline
source: docs/features/feat-publish-pipeline/architecture-decision-record.md
feature_context_digest: sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security]
---

# feat-publish-pipeline 境界統合決定

> **位置づけ**: [architecture-decision-record.md](./architecture-decision-record.md)
> の分冊。repository、冪等処理、実装配置、cross-feature レビューの決定を保持する。
> P02 の決定は 2 文書を合わせて読む。

<a id="ad-9"></a>

## 9. AD-9: publish 系 repository は「port 先・スキーマ後」の先例に倣い cross-feature 合意として追加する

### 決定 (実測 gap の解消)

**実測**: 本 task 実行時点で、`packages/db` には次の状態がある。

| 対象 | スキーマ | repository 関数 | `CoreRepositories` への登録 |
|---|---|---|---|
| `publish_requests` | あり | **なし** | なし |
| `releases` | あり | あり (`createReleasesRepo`) | **なし** |
| `target_channels` | あり | あり (`createTargetChannelsRepo`) | **なし** |
| `packages` | あり | あり (`createPackagesRepo`) | **なし** |
| `idempotency_ledger` | あり | あり (`createIdempotencyLedgerRepo`) | **なし** |
| `audit_events` | あり | あり (`createAuditRepo`) | あり |

つまり本 feature が消費すべき repository のうち、**publish_requests 用は未実装**であり、残り 4 種は実装済みだが合成点 (`createCoreRepositories`) から到達できない。

これを次のとおり解消する。

1. 本 feature は `apps/hub/src/lib/publish/ports.ts` に**必要な問い合わせの形 (port)** を宣言する。これは feat-auth-tenancy が `apps/hub/src/lib/auth/ports.ts` で採った「port が先、スキーマが後」と同一の手順であり、同 feature は HarnessHub-b7ng で owner と合意のうえ `packages/db/schema/` へ列を追加した先例を持つ。
2. port を満たすため、`packages/db/repository/publish-requests.ts` (新規) と `CoreRepositories` への 5 種登録を、**feat-domain-model-db への cross-feature 追加**として実施する。スキーマ (列・制約) は一切変更しない — 追加するのは既存スキーマに対する repository 関数と合成配線のみ。
3. 追加する関数は状態遷移を **CAS (compare-and-swap: 期待した現在状態と一致したときだけ更新)** で行う。`transitionStatus(context, id, {from, to, ...})` が更新行数 0 のとき false を返し、呼び出し側が競合を識別できる形にする。「読む → 判定 → 全置換」を許す port を作ると、並行 submit が両方通って状態機械が壊れる。

### なぜ apps/hub 側で drizzle を直接触らないか

docs/backend-spec.md §1 の qa-020 は「DB アクセスは Drizzle リポジトリ層に閉じる」と定め、`packages/db/__tests__/check-db-write-gate.test.ts` と `scripts/ci/check-shared-layer-duplicates.mjs` がこれを機械検査する。apps/hub から直接 drizzle を呼ぶ実装は、Turso→D1 移行をアプリ層へ波及させるうえ、CI で落ちる。

### follow-up

`packages/db` への追加は本 feature の write scope の外縁にあたるため、dev-graph follow-up として記録し、P03 の独立レビューで境界判断の妥当性を確認する。

<a id="ad-10"></a>

## 10. AD-10: Idempotency-Key は endpoint 層の decorator として 1 箇所に閉じる

### 決定

`apps/hub/src/lib/publish/idempotency.ts` に `withIdempotency(handler, {scope})` を実装し、`POST /api/v1/publish` はこれを通す。

- key が無い / 空 → 400。
- `(scope, key)` が既存かつ `request_hash` 一致 → 記録済み応答をそのまま再生 (再実行しない)。
- `(scope, key)` が既存かつ `request_hash` 不一致 → 422。
- 未記録 → handler を実行し、応答 (status + body) を `idempotency_ledger` へ TTL 24h で記録。
- scope は `(tenant_id, endpoint)`。`expires_at` を過ぎた行は照合対象にしない。

### 根拠

冪等性 (べきとうせい = 同じ要求を何回送っても結果が同じになる性質) の判定を handler の中に書くと、endpoint が増えるたびに同じ条件分岐が複製され、片方だけ直す事故が起きる。decorator にすることで、`POST /metrics/events` (feat-metrics-tracking) が同じ仕組みを再利用できる形にもなる。

## 11. 実装配置 (P05 の write scope)

```text
packages/schemas/publish-pipeline/     zod 単一ソース (publish-request/release/channel/deployment/package)
packages/inspection/src/               検査ルール実装 (owner/meta/skills-only/forbidden-assets/instructions/manifest/catalog)
packages/db/repository/publish-requests.ts   publish_requests の CAS repository (AD-9 の cross-feature 追加)
packages/db/repository/composition.ts        CoreRepositories へ 5 種登録 (同上)
apps/hub/src/lib/publish/state-machine.ts    純関数 transition (AD-4)
apps/hub/src/lib/publish/ports.ts            consumer-driven contract (AD-9)
apps/hub/src/lib/publish/db-ports.ts         CoreRepositories → port の adapter
                                             (R2 は packages/db/registry の createPackageRegistry を消費。実装しない: AD-7)
apps/hub/src/lib/publish/idempotency.ts      Idempotency decorator (AD-10)
apps/hub/src/lib/publish/service-contract.ts 失敗契約・共通依存・監査
apps/hub/src/lib/publish/service.ts          request 処理 (create/upload/submit/approve/cancel)
apps/hub/src/lib/publish/release-service.ts  Release/channel/deployment 処理
apps/hub/src/lib/publish/index.ts            公開入口
apps/hub/src/app/api/v1/publish/**           REST 12 経路 (AD-5)
apps/hub/src/app/api/v1/channels/**
apps/hub/src/app/api/v1/releases/**
apps/hub/src/app/api/v1/projects/**
```

**触らないもの**: `packages/db/schema/` 配下、`pnpm-workspace.yaml`、`package.json` (ルート・inspection)、`apps/hub/src/lib/authz/` 配下、`scripts/ci/shared-layer-registry.json` の免除登録。

## 12. P03 へ引き継ぐレビュー論点

1. `POST /publish/:id/cancel` の認可強度が backend-spec §4.6 (Bearer/owner) と `ACTION_RULES.publish.reject` (session/workspace-admin) で食い違う (AD-2)。
2. `deployment_references` 登録の監査 action 語彙が backend-spec §3.8 の列挙に存在しない (AD-8)。
3. `packages/db` への repository 追加が feat-domain-model-db の owner 境界に対して妥当か (AD-9)。
4. 検査 pipeline のルール ID 体系を Python 資産 (`plugins/harness-creator/skills/assign-plugin-package-evaluator/scripts/validate-plugin-package.py` の PKG-xxx) とどこまで一致させるか (AD-3)。

## 13. 検証

- P02 acceptance: (1) スキーマ owner 確定が 3 系統証跡付き (本体 §1)、(2) 単一認可ミドルウェア owner 確定 (本体 §2)、(3) 検査 pipeline の scaffold/ロジック owner 分割が 3 系統証跡付き (本体 §3)、(4) 状態機械実装方式 (本体 §4)・REST 12 経路設計 (本体 §5)・直列化実装方式 (本体 §6) の記載。
- 転記元: [requirements-baseline.md](./requirements-baseline.md) (P01 成果物)。

## 14. Landing 時の論点収束 (2026-07-30)

- §12-1 は `qa-059` と Q9 で収束した。`publish.cancel` と
  `deployment.register` を Bearer/owner 専用 action とし、approve は
  session/workspace-admin を維持する。古い `publish.reject` への委譲は採用しない。
- §12-2 は `PUBLISH_AUDIT_ACTIONS.registerDeployment` として監査語彙へ追加し、
  deployment の成功・失敗を同じ記録経路へ載せた。
- §12-3 は schema を変更せず `packages/db` の repository 公開入口だけを追加する
  consumer 境界で収束した。Hub の schema subpath import は静的ゲートで拒否する。
- §12-4 は `packages/inspection` の rule ID を唯一の公開識別子とし、
  Hub は `createPublishInspectionRules()` をそのまま使う。将来 Publisher 実装時の
  descriptor 同値検査は follow-up とする。
- 500 行上限に合わせて service と tests を責務別ファイルへ分離した。
  task package の再実行契約は薄い `service.test.ts` / `routes.test.ts` 収集入口で維持する。
