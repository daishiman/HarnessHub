---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P04
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
depends_on: [SYS-HUB-FOUNDATION-P03]
---

# feat-hub-foundation テスト設計 (P04 / test-first 受入契約)

> **位置づけ**: P05 実装に先立ち、「何が検証されれば feature acceptance を満たすか」を確定する。
> **trace rule**: 本書が**実行可能な test ID を定義**し、P05 がその対象を実装し、P06 が実行する。P07/P10 は**実行済みの test ID の結果のみ**を裁定対象とする。本書に無い基準を pass 根拠にしてはならない。

## 1. テスト ID 一覧（acceptance 対応表）

| test ID | 種別 | 対象 acceptance | 合否基準 | 実行場所 |
|---|---|---|---|---|
| HF-A1-CI-001 | integration | A1 | 単一 CI run 内で `test` job が success 後に `deploy` job が success 終了する。deploy が skip / 承認待ちで終わった run は fail 扱い | GitHub Actions |
| HF-A1-CI-002 | security | A1 | `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` をリポジトリに置いた状態で CI が**非ゼロ終了**する（npm 混入検査の実効性） | CI + local |
| HF-A1-CI-003 | unit | A1 | `packageManager` フィールドが `pnpm@` で始まる値に pin されている | local + CI |
| HF-A2-BUNDLE-001 | performance | A2 | `apps/hub` の Worker bundle が gzip 後 **3 MiB 以内** | CI + local |
| HF-A2-BUNDLE-002 | integration | A2 | 予算超過を模した閾値（例: 1 KiB）で bundle チェックが**非ゼロ終了**する（ゲートの実効性検証） | CI + local |
| HF-A3-HEALTH-001 | integration | A3 | `GET /health` が **200** を返す | local + preview |
| HF-A3-HEALTH-002 | contract | A3 | `/health` 応答が `{status, version, checkedAt, dependencies[]}` の契約を満たし、`status` は `ok` / `degraded` / `down` のいずれか | local + CI |
| HF-A3-HEALTH-003 | integration | A3 | 依存先が不通のとき `status` が `ok` 以外になり、HTTP は 200（監視は body で判定）または 503 を返す | local + CI |
| HF-A3-SLO-001 | integration | A3 | 外形監視（Better Stack Free / 3 分間隔）が `/health` を計測し、月次可用性 99.5% を算定できる時系列が取得できる | **外部サービス** |
| HF-A4-OWNER-001 | unit | A4 | shared-layers §1〜§3 の全登録層について、owner package / 公開 API / consumer の一覧が生成でき、owner 未定義の層が 0 件 | local + CI |
| HF-A4-CONTRACT-001 | contract | A4 | `packages/ui` の公開 API を **2 系統以上の consumer** が参照し、同一実装を指していることを検証 | local + CI |
| HF-A4-CONTRACT-002 | contract | A4 | `packages/schemas` について同上 | local + CI |
| HF-A4-CONTRACT-003 | contract | A4 | `packages/inspection` について同上（Hub 正式検査 / Publisher ローカル pre-check の挙動同値を含む） | local + CI |
| HF-A4-CONTRACT-004 | contract | A4 | `packages/estimation` について同上 | local + CI |
| HF-A4-DUP-001 | unit | A4 | duplicate implementation detector の検出件数が **0 件** | local + CI |
| HF-A4-DUP-002 | unit | A4 | owner package 外に同名 export を意図的に置いた fixture で detector が**1 件以上を検出**する（detector 自体の実効性検証） | local + CI |
| HF-QA-A11Y-001 | e2e | qa-018 | `packages/ui` 部品単体の axe 違反が **0 件** | CI |
| HF-QA-A11Y-002 | e2e | qa-018 | `apps/hub` 画面結合の axe 違反が **0 件** | CI |
| HF-QA-TENANT-001 | security | qa-006（枠） | 認可 middleware が未認証・越境スコープ要求を **deny-by-default** で拒否する | local + CI |
| HF-CRON-001 | unit | qa-027 | scheduled handler が cron 式に対応するジョブ列を dispatch する（日次 `0 15 * * *` / 週次 `0 0 * * 1`） | local + CI |
| HF-CRON-002 | unit | qa-027 | 同一 `runKey`（cron + 論理時刻）での再実行が二重実行にならない（冪等 claim） | local + CI |
| HF-CRON-003 | unit | qa-027 | 1 ジョブが失敗しても後続ジョブが継続し、失敗はジョブ単位で記録される | local + CI |
| HF-CRON-004 | unit | qa-027 | **未登録の cron 式を黙って成功にせず失敗として記録する**（配線欠落の検知） | local + CI |
| HF-CRON-005 | integration | qa-027 | 日次が**全ジョブ完走したときだけ** heartbeat へ ping する（未設定時は ping しない） | local + CI |

- `HF-CRON-*` は P10 指摘 F-08 の是正で追加した scheduled handler（`apps/hub/src/worker/cron.ts`）に対応する。配置は `apps/hub/tests/worker/cron.test.ts`（§3 の配置設計に追記済み）。

- `HF-QA-TENANT-001` は本 feature では**共通境界の deny-by-default 挙動のみ**を検証する枠であり、テナント固有 policy の網羅検証は feat-auth-tenancy の責務。
- `HF-A3-SLO-001` のみ外部サービス設定に依存する。**未設定の間は A3 を pass にできない**（fail-closed）。

## 2. 種別ごとの受入契約

### 2.1 unit

- 対象: `packages/*` の純関数・公開 API 表面、detector スクリプト、`packageManager` pin 検査
- 合否: 全 test が pass。カバレッジ閾値は本 feature では課さない（C1: 過剰な品質管理を持ち込まない）。ただし**公開 API は全て 1 件以上の test を持つ**こと

### 2.2 contract（A4 の中核）

- 対象: 共通層の公開 API × consumer の組
- **pass 条件**（requirements-baseline §4.2 A4-1 の確定条件）:
  - 判定時点で**実在する** consumer のみを数える。未実装 feature は数えない
  - 実在 consumer が 1 系統の共通層は、`apps/hub` の利用箇所 + `apps/hub/tests/fixtures/` の独立 consumer fixture を第 2 系統とし、**public API 経由のみ**で成立させる
  - 実在 consumer が public API を経由せず独自実装・相対 path 直接参照で同じ責務を満たしていたら **fail**
- 記録単位: `共通層 × consumer` ごとに test ID を持つ

### 2.3 integration

- 対象: `/health` route handler、CI job 連鎖、bundle 予算ゲートの実効性
- 合否: 実際の HTTP 応答・実際の CI run の終了コードで判定する。**モックでの代替を pass 根拠にしない**

### 2.4 e2e

- 対象: axe による a11y 検査（部品単体 + 画面結合の 2 段）
- 合否: 違反 0 件（qa-018 のリリース条件）

### 2.5 security

- 対象: npm 混入検査の実効性、認可 middleware の deny-by-default
- 合否: **意図的に違反状態を作って fail することを確認**する（ゲートが素通りしないことの証明）

### 2.6 performance

- 対象: Worker bundle サイズ
- 合否: gzip 後 3 MiB 以内（qa-003 / worker-bundle-budget）。実測値を証跡に残す

## 3. `apps/hub/tests/` 配置設計

```
apps/hub/tests/
  health/
    health.route.test.ts        # HF-A3-HEALTH-001/002/003
  ci/
    pnpm-only.test.ts           # HF-A1-CI-002/003
    bundle-budget.test.ts       # HF-A2-BUNDLE-001/002
  shared-layers/
    ownership.test.ts           # HF-A4-OWNER-001
    duplicate-detector.test.ts  # HF-A4-DUP-001/002
    contract.ui.test.ts         # HF-A4-CONTRACT-001
    contract.schemas.test.ts    # HF-A4-CONTRACT-002
    contract.inspection.test.ts # HF-A4-CONTRACT-003
    contract.estimation.test.ts # HF-A4-CONTRACT-004
  security/
    authz-deny-by-default.test.ts # HF-QA-TENANT-001
  fixtures/
    consumer-a/                 # contract test 用の独立 consumer (第2系統)
    duplicate-violation/        # HF-A4-DUP-002 用の意図的違反 fixture
  a11y/
    ui-components.spec.ts       # HF-QA-A11Y-001
    hub-screens.spec.ts         # HF-QA-A11Y-002
  worker/
    cron.test.ts                # HF-CRON-001〜005 (P10 指摘 F-08 の是正で追加)
```

- テストコード実体の作成は **P05**、実行は **P06**。本書は配置と ID の確定まで。

## 4. 実行コマンド（P06 が使う正本）

| 目的 | コマンド |
|---|---|
| 全 unit / contract / integration | `pnpm test` |
| pnpm 混入検査 | `pnpm check:pnpm` |
| duplicate detector | `pnpm check:duplicates` |
| bundle 予算 | `pnpm check:bundle` |
| a11y | `pnpm --filter @harness-hub/hub run test:a11y` |
| CI 一括 | `.github/workflows/ci.yml` の push トリガ |

## 5. fail-closed 規約

- 本書の test ID のうち、**実行されなかったものを pass と見なさない**。未実行は「未実行」として P07 へ報告する。
- 外部サービス依存（`HF-A3-SLO-001`）が未設定の間、A3 は **blocked** であり pass ではない。
- detector・ゲート類は「検出できること」（HF-A1-CI-002 / HF-A2-BUNDLE-002 / HF-A4-DUP-002）を必ず併せて検証する。ゲートが常時緑になる故障（Goodhart 化）を防ぐため。

## 6. 転記元と検証

- 上位入力: `requirements-baseline.md`（P01・acceptance 4 件 / quality_constraints 9 件）、`design-review-notes.md`（P03）、`architecture-decision-record.md`（P02）
- published task spec: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-04-test-design.md`
- P04 acceptance: acceptance 4 件それぞれに対応するテスト種別と合否基準が明記されていること（§1・§2）
