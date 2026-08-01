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
>
> **本文は 2026-07-21 の P07 裁定時点の記録である。** 以降に状態が変わった acceptance は §0 に追記する。当時 blocked だった事実を消さないため、本文の判定は書き換えない。

## 0. P07 裁定後の状態変化（追記）

| acceptance | P07 時点 | 現在 | 変化の根拠 |
|---|---|---|---|
| A1 CI が test→deploy を完走 | blocked | **合格（2026-07-25 / P13）** | main への push で run **[30143422049](https://github.com/daishiman/HarnessHub/actions/runs/30143422049)**（`ec0f3e45`）が 3 job すべて success。deploy job は `needs: [static-gates, test]` により両ゲート success を経由しなければ起動しないため、「同一 run 内で test → deploy が success」を満たす。証跡 `evidence/ci-run.md` §確定 run / `evidence/deploy-2026-07-25.json` |
| A2 bundle 3MiB 以内 | 合格 | **合格（維持）** | 本番アップロード時の実測は gzip **1034.27 KiB（約 1.010 MiB）**。P07 時点の dry-run 実測 0.952 MiB より約 6% 大きいが、いずれも 3 MiB 予算内。CI の G5 ゲートも success |
| A3 SLO 99.5% の計測と /health 稼働 | 部分達成（blocked） | **部分達成（観測は稼働・時間ゲート未了）** | `/health` は 2026-08-01 に HTTP 200・依存 3 件 ok を再確認。Better Stack の 4 資源と `CRON_HEARTBEAT_URL` は適用済み。**2026-08-01T12:07:18Z の公開 status page 実測（token 不要）で monitor は `operational` / 30 日 `availability: 0.988579` と確認**し、2026-07-28 の「monitor paused」判断は誤読と確定した（`not_monitored` は無データ日を指し、HTML アイコンは 30 日履歴の代表）。観測済みは **6 日 / 必要 30 日**、`slo-dashboard.json` は `collecting`。30 日到達後も Workers Analytics の 5xx 率が揃うまで pass にしない（§9 / qa-019）。**エラーバジェット運用の適用状況**: 観測済み窓での外形 downtime は `6312.31` 秒 ＝ 30 日許容 `12960` 秒に対し **48.7% 消費**で、警告閾値 70% / 凍結閾値 100% のいずれにも未達のため **発動中の措置なし**（`triggered_actions: []`）。証跡は [evidence/slo-observation.json](evidence/slo-observation.json)。フォローアップ `HarnessHub-37h.15` で追跡する |
| A4 共通層の単一実装 | 条件付き合格 | **条件付き合格（維持）** | 実 consumer 未結線 5 層の状態は変わっていない（§2.1） |

- A1 の証跡には限定条件がある。**deploy job のみ再実行しており、3 job を一度の連続実行で通したわけではない**（同一 sha に対する再実行のため検査対象コードは同一）。詳細は `evidence/ci-run.md` §証跡の性質。
- **A3 が未達である以上、feature の acceptance 4 件は全件充足していない。** P13（デプロイ作業）は完了だが、それは epic `HarnessHub-37h` の完了を意味しない。

## 1. 判定サマリ

| # | acceptance | 判定 | 根拠 |
|---|---|---|---|
| A1 | CI が test→deploy を完走する | **blocked（deploy 未実行）** | CI run **29795485968 が success**（静的ゲート → build & test → bundle まで全通過、clean install の ubuntu-latest で再現）。ただし deploy job は main 限定で **skip**。今回の未コミット変更後はローカル `pnpm verify` のみ再検証済み |
| A2 | Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する | **合格** | CI に G5 ゲートが存在し **CI 上でも success**。実測 **0.952 MiB / 3.000 MiB**（wrangler dry-run 実 bundle） |
| A3 | SLO 99.5% の計測と /health が稼働する | **部分達成（blocked）** | **`/health` の稼働は本番実測で確認**（2026-07-21 / HTTP 200・db・r2 とも ok。証跡 `evidence/health-response.json`）。ただし SLO 99.5% の算定に必要な**外形監視の時系列が未取得**のため blocked |
| A4 | shared-layers 登録済み共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照する | **条件付き合格**（2026-07-21 再裁定） | duplicate scan 0 件・owner 未定義 0 件・contract test は全 12 層へ拡張済み。**ただし 5 層は実 consumer が fixture の 1 系統のみ**（下記 §2.1） |

**総合: 条件付き合格。** A2 は合格、A4 は実 consumer 未結線 5 層のため条件付き合格。A1・A3 は**外部要因（main deploy 未実行 / Better Stack 時系列未取得）により判定不能**であり、pass ではなく blocked として記録する。

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
| HF-A3-HEALTH-001/002/003 | /health 200・契約・異常時 status | pass（8 件）＋**本番実測でも 200 / 全依存 ok** | `evidence/test-run.log` / `evidence/health-response.json` |
| HF-A3-SLO-001/002 | 外形監視で 99.5% 算定 / 適用器契約 | **ローカル 41 件 pass。本番 `/health` と外部資源・secret は確認済み** | `apps/hub/tests/monitoring/*.test.ts` / `apps/hub/monitoring/*.json` / `evidence/monitoring-applied.json` |
| HF-A3-SLO-003 | 観測状態の実測と `verdict` 突合 | **ローカル 24 件 pass。公開 status page の実測で観測済み 6 日 / 30 日、`verdict: collecting` と一致（exit 0）。gate liveness は 3 変異すべてで exit 1 を確認** | `apps/hub/tests/monitoring/verify-slo-observation.test.ts` / `apps/hub/scripts/verify-slo-observation.mjs` / `evidence/slo-observation.json` |
| HF-A4-OWNER-001 | owner 未定義 0 件 | pass | `evidence/shared-layer-ownership.json` |
| HF-A4-CONTRACT-001〜004 ほか | 全 12 層の consumer contract（§2.1 の 5 層は fixture 1 系統のため未達扱い） | pass（実行分は全件） | `evidence/test-run.log` |
| HF-A4-DUP-001 | 重複・境界違反 0 件 | pass（200 ファイル走査、登録 12 層 + 4 運用機構） | `evidence/duplicate-scan.json` |
| HF-A4-DUP-002 | 意図的違反を検出 | pass（2 種とも検出） | `evidence/test-run.log` |
| HF-QA-A11Y-001/002 | axe 違反 0 件（部品・画面） | pass | `evidence/test-run.log` |
| HF-QA-TENANT-001 | deny-by-default | pass（10 件） | `evidence/test-run.log` |
| HF-CRON-001〜005 | scheduled handler の dispatch / 冪等 / 失敗継続 / 未登録 cron 検知 / heartbeat | pass（13 件） | `apps/hub/tests/worker/cron.test.ts` |

## 3. 実測サマリ（2026-07-21）

| 検証 | 結果 |
|---|---|
| `pnpm verify` | **46 test files / 592 tests 全 pass**（db 17 / estimation 39 / inspection 51 / schemas 86 / ui 266 / hub 133） |
| `pnpm -r typecheck` | 全 6 package PASS |
| `biome ci`（G2 lint/format の実体） | **exit 0**（P10 指摘 F-09 を受けて Biome を導入。導入時に実バグ 36 件を検出し是正済み） |
| `next build` | 成功（First Load JS 102 kB / Middleware 34.9 kB） |
| `opennextjs-cloudflare build` | 成功（`.open-next/worker.js` 生成） |
| bundle 予算 | 0.952 MiB / 3.000 MiB |
| duplicate / boundary detector | 200 ファイル走査・登録 12 層 + 4 運用機構・違反 0 件 |
| pnpm 混入検査 | 違反 0 件 |

## 4. A1 / A3 を pass にしない理由（fail-closed の適用）

- **A1**: feature branch の CI は test まで成功しているが、acceptance の判定条件は「**GitHub Actions の単一 workflow run 内で** test job → deploy job が success 終了」。deploy は main push 限定で skip のため、条件を満たした証跡がない。
- **A3**: `/health` の production 稼働、Better Stack の 4 資源、Worker secret は確認済みで、2026-08-01 の実測で外形監視も稼働している。それでも pass にしないのは、判定条件が「外形監視が 3 分間隔で計測し **月次可用性 99.5% を算定できる時系列**が取得できること」であり、観測済みが **6 日 / 必要 30 日**にとどまるため。加えて §9 の算定式は外形 downtime と Workers の 5xx 率の両方を要求するので、30 日が揃っても外形単独では確定しない。**資源の存在も、監視の稼働も、計測の完了に読み替えない**。
  - 2026-07-28 に「個別 resource が `not_monitored` ＝ monitor paused」と記録したのは誤読で、2026-08-01T12:07:18Z の `/index.json` 実測（`status: operational` / `availability: 0.988579`）で否定された。`not_monitored` は無データ日を指し、status page の HTML アイコンは 30 日履歴全体の代表である。以後この判断は散文ではなく `verify:slo-observation` の exit code を正本とする。

いずれも **P13（本番リリース）完了後に再判定が必要**。本報告は P13 前の中間裁定である。

## 5. 解除条件（何が揃えば pass になるか）

| # | 必要な作業 | 実施者 |
|---|---|---|
| 1 | ~~`feat/wt-2` を push し GitHub Actions を起動~~ → **完了**（最新確認済み run 29795485968 success） | 完了 |
| 2 | GitHub Secrets: `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`、variable `HUB_HEALTH_URL` | **ユーザー** |
| 3 | `wrangler login` と Cloudflare アカウント準備 | **ユーザー** |
| 4 | ~~Uptime API token で適用器を再実行し monitor を `paused:false` に戻す~~ → **不要**（2026-08-01 実測で monitor は `operational` と判明。追跡 `HarnessHub-37h.15`） | 完了 |
| 5 | `pnpm --filter @harness-hub/hub run verify:slo-observation` が観測済み 30 日を報告するまで待つ（2026-08-01 時点 6 日、初回判定期日 `2026-08-26T20:46:37.686Z`） | 時間ゲート |
| 6 | Cloudflare Workers Analytics の 5xx 率を収集し §9 の算定式を完成させる（外形監視単独では A3 を確定しない） | **ユーザー** |
| 7 | ~~`BACKUP_HEARTBEAT_URL` の投入と backup の初回成功~~ → **完了**（2026-08-01 `--live` exit 0、backup run 30686023662 success で heartbeat ping 2xx。`HarnessHub-fnzl` / `HarnessHub-dbx6` クローズ） | 完了 |
| 8 | Worker cron (`CRON_HEARTBEAT_URL`) 側の heartbeat 着信実測（heartbeat 資源は公開 status page に露出しないため、確認には Better Stack API token が必要） | **ユーザー** |
| 9 | `apps/hub/monitoring/better-stack.monitors.json` の `backup_heartbeat` へ `external_id` / `applied_at` を書き戻す（外部は適用済みなのに正本は `pending_credentials` のままで drift している。runbook §1 の警告を参照） | **ユーザー** |

## 6. 裁定の限界

- CI 環境（ubuntu-latest / clean install）での再現は **run 29795485968 で確認済み**。今回の未コミット変更後の CI run と CI deploy job は未確認。
- `HF-A3-SLO-001` は仕組み上、**1 ヶ月分の観測期間**を経ないと 99.5% を算定できない。デプロイ直後に A3 を「合格」とすることはできず、計測開始をもって blocked を解除し、初回の月次確定で最終判定とする。
- P10（最終独立レビュー）は、本報告が「blocked を pass に読み替えていないか」を検証すること。
