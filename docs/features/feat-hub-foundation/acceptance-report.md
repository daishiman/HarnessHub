---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P07
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
verdict: 条件付き合格 (A1/A3 は blocked)
measured_at: "2026-07-21"
---

# feat-hub-foundation 受入判定 (P07)

> **裁定規約**: requirements-baseline.md §9.3 に従い、**実行済み証跡のみ**を裁定対象とする。「実装予定」「文書化済み」は pass 根拠にしない。未実行は「未実行」として報告する（test-design.md §5 fail-closed）。

## 1. 判定サマリ

| # | acceptance | 判定 | 根拠 |
|---|---|---|---|
| A1 | CI が test→deploy を完走する | **blocked（deploy 未実行）** | CI run **29795236896 が success**（静的ゲート → build & test → bundle まで全通過、clean install の ubuntu-latest で再現）。ただし deploy job は main 限定で **skip**。skip は success ではないため未達（証跡: `evidence/ci-run.md`） |
| A2 | Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する | **合格** | CI に G5 ゲートが存在し **CI 上でも success**。実測 **0.952 MiB / 3.000 MiB**（wrangler dry-run 実 bundle） |
| A3 | SLO 99.5% の計測と /health が稼働する | **不合格（blocked）** | `/health` route handler は実装され契約テスト 8 件 pass。しかし**外形監視の設定と実デプロイが未実施**のため SLO 計測の時系列が存在しない |
| A4 | shared-layers 登録済み共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照する | **条件付き合格**（2026-07-21 再裁定） | duplicate scan 0 件・owner 未定義 0 件・contract test は全 12 層へ拡張済み。**ただし 5 層は実 consumer が fixture の 1 系統のみ**（下記 §2.1） |

**総合: 条件付き合格。** A2・A4 は実測証跡をもって合格。A1・A3 は**外部要因（push 未実施 / Cloudflare・Better Stack 未設定）により判定不能**であり、pass ではなく blocked として記録する。

## 2.1 A4 を「合格」から「条件付き合格」へ再裁定した理由（P10 指摘 F-06）

初版では contract test が `ui` / `schemas` / `inspection` / `estimation` の **4 層のみ**を対象にしており、要件（requirements-baseline §4.2 A4-1「§8 登録簿の**全**共通層」= 12 層）の 1/3 しか判定していなかった。P10 の指摘を受けて全 12 層へ拡張したうえで、以下を**未達として記録する**。

| 層 | 実 consumer | 判定 |
|---|---|---|
| `ui` / `schemas` / `inspection` / `estimation` / `db` / `authz-middleware` / `auth` | `apps/hub` 本体 + fixture の **2 系統** | 充足 |
| `audit` / `aijob` / `notification` / `pii` / `telemetry` | **fixture の 1 系統のみ**（`apps/hub` 本体に呼び出し元が無い） | **未達** |

- 5 層は公開 contract の実体を持つが、**基盤側に使う側がまだ存在しない**。結線は各ドメイン feature（feat-domain-model-db / feat-auth-tenancy ほか）の責務である。
- これを「fixture があるので 2 系統」と数えない。要件は「**消費 feature が同じ実装を参照する**」ことであり、fixture は consumer の代替であって consumer 本体ではない。
- 状態は `scripts/ci/shared-layer-registry.json` の `app_wiring: pending` として機械可読に固定し、`ownership.test.ts` が**登録簿の宣言ではなく fixture ソースの実参照**を数えることで、宣言だけ増やして緑にする空洞化を防いでいる。
- **解除条件**: 各層に `apps/hub` 本体（または他の実 feature）の呼び出し元が生まれた時点で `app_wiring` を外し、A4 を全層充足として再裁定する。

## 2. test ID 別の実行結果

| test ID | 対象 | 結果 | 証跡 |
|---|---|---|---|
| HF-A1-CI-001 | 単一 run 内で test→deploy | **未達**（test まで success / deploy は skip） | `evidence/ci-run.md` |
| HF-A1-CI-002 | lockfile 混入で非ゼロ終了 | pass（4 種すべて） | `evidence/test-run.log` |
| HF-A1-CI-003 | packageManager の pnpm pin | pass | `evidence/pnpm-only-scan.json` |
| HF-A2-BUNDLE-001 | 実 bundle ≤ 3 MiB | pass（0.952 MiB） | `evidence/bundle-report.json` |
| HF-A2-BUNDLE-002 | 予算超過で非ゼロ終了 | pass | `evidence/test-run.log` |
| HF-A3-HEALTH-001/002/003 | /health 200・契約・異常時 status | pass（8 件） | `evidence/test-run.log` |
| HF-A3-SLO-001 | 外形監視で 99.5% 算定 | **未実行（外部依存）** | — |
| HF-A4-OWNER-001 | owner 未定義 0 件 | pass | `evidence/shared-layer-ownership.json` |
| HF-A4-CONTRACT-001〜004 ほか | 全 12 層の consumer contract（§2.1 の 5 層は fixture 1 系統のため未達扱い） | pass（実行分は全件） | `evidence/test-run.log` |
| HF-A4-DUP-001 | 重複 0 件 | pass（197 ファイル走査） | `evidence/duplicate-scan.json` |
| HF-A4-DUP-002 | 意図的違反を検出 | pass（2 種とも検出） | `evidence/test-run.log` |
| HF-QA-A11Y-001/002 | axe 違反 0 件（部品・画面） | pass | `evidence/test-run.log` |
| HF-QA-TENANT-001 | deny-by-default | pass（10 件） | `evidence/test-run.log` |
| HF-CRON-001〜005 | scheduled handler の dispatch / 冪等 / 失敗継続 / 未登録 cron 検知 / heartbeat | pass（13 件） | `apps/hub/tests/worker/cron.test.ts` |

## 3. 実測サマリ（2026-07-21）

| 検証 | 結果 |
|---|---|
| `pnpm -r test` | **37 test files / 578 tests 全 pass**（db 17 / estimation 39 / inspection 51 / schemas 86 / ui 265 / hub 120） |
| `pnpm -r typecheck` | 全 6 package PASS |
| `biome ci`（G2 lint/format の実体） | **exit 0**（P10 指摘 F-09 を受けて Biome を導入。導入時に実バグ 36 件を検出し是正済み） |
| `next build` | 成功（First Load JS 102 kB / Middleware 34.9 kB） |
| `opennextjs-cloudflare build` | 成功（`.open-next/worker.js` 生成） |
| bundle 予算 | 0.952 MiB / 3.000 MiB |
| duplicate detector | 197 ファイル走査・重複 0 件 |
| pnpm 混入検査 | 違反 0 件 |

## 4. A1 / A3 を pass にしない理由（fail-closed の適用）

- **A1**: `ci.yml` は実装済みで、ローカルでは全ゲート相当のコマンドが pass する。しかし acceptance の判定条件は「**GitHub Actions の単一 workflow run 内で** test job → deploy job が success 終了」であり、run が存在しない以上、条件を満たした証跡がない。「ローカルで通ったから CI も通るはず」は推測であり証跡ではない。
- **A3**: `/health` の実装とテストは完了しているが、判定条件は「外形監視が 3 分間隔で計測し **月次可用性 99.5% を算定できる時系列**が取得できること」。Cloudflare へのデプロイと Better Stack の設定が未了のため、時系列が存在しない。

いずれも **P13（本番リリース）完了後に再判定が必要**。本報告は P13 前の中間裁定である。

## 5. 解除条件（何が揃えば pass になるか）

| # | 必要な作業 | 実施者 |
|---|---|---|
| 1 | ~~`feat/wt-2` を push し GitHub Actions を起動~~ → **完了**（run 29795236896 success） | 完了 |
| 2 | GitHub Secrets: `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`、variable `HUB_HEALTH_URL` | **ユーザー** |
| 3 | `wrangler login` と Cloudflare アカウント準備 | **ユーザー** |
| 4 | Better Stack Free で production `/health` の 3 分間隔監視 + cron heartbeat を登録 | **ユーザー** |
| 5 | 上記完了後に P13 デプロイ → 1 ヶ月分の可用性時系列で A3 を確定 | 実施可能 |

## 6. 裁定の限界

- CI 環境（ubuntu-latest / clean install）での再現は **run 29795236896 で確認済み**。残る未確認は実デプロイ環境（Cloudflare Workers 実行時）の挙動のみ。
- `HF-A3-SLO-001` は仕組み上、**1 ヶ月分の観測期間**を経ないと 99.5% を算定できない。デプロイ直後に A3 を「合格」とすることはできず、計測開始をもって blocked を解除し、初回の月次確定で最終判定とする。
- P10（最終独立レビュー）は、本報告が「blocked を pass に読み替えていないか」を検証すること。
