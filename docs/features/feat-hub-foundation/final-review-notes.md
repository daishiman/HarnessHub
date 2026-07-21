---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P10
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
package_digest: sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502
depends_on: [SYS-HUB-FOUNDATION-P09]
reviewed_artifacts:
  - docs/features/feat-hub-foundation/requirements-baseline.md
  - docs/features/feat-hub-foundation/architecture-decision-record.md
  - docs/features/feat-hub-foundation/design-review-notes.md
  - docs/features/feat-hub-foundation/test-design.md
  - docs/features/feat-hub-foundation/acceptance-report.md
  - docs/features/feat-hub-foundation/refactoring-migration-note.md
  - docs/features/feat-hub-foundation/quality-assurance-report.md
  - docs/features/feat-hub-foundation/evidence/
verdict: 条件付き承認 (再レビュー / 初回は「差し戻し (範囲限定)」)
verdict_history:
  - { round: 1, verdict: 差し戻し (範囲限定), section: "§1〜§11" }
  - { round: 2, verdict: 条件付き承認, section: "§13" }
measured_at: "2026-07-21"
architecture_refs: [arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow]
---

# feat-hub-foundation 最終独立レビュー記録 (P10)

> **位置づけ**: P10 (最終独立レビュー) の成果物。P03 が P02 の設計判断だけを、P07 が acceptance 4 件だけを見たのに対し、本書は**実装・テスト・受入・N/A 判定・品質保証まで完了した feature 全体**を対象に、**quality_constraints 9 件**の最終充足を独立して判定する。
>
> **レビュー方法**: 文書の記述を出発点にせず、**実ファイルとコマンド実測**を一次根拠にした。特に「是正した」「実装済み」と書かれている項目について、対応する実体（ファイル・設定値・スクリプトの分岐）が存在するかを 1 件ずつ確認した。ゲート類は「存在するか」ではなく「**違反時に本当に落ちるか**」を実行して確かめた。

---

## 1. 承認可否

### **判定: 差し戻し（範囲限定）**

本 task の rollback 規約（published task spec「Rollout and rollback」）は「quality_constraints が 1 件でも不足なら差し戻す」と定めている。**`cwv-good` と `slo-error-budget` の 2 件が未充足**であり、加えて後述 F-01（デプロイすると `/health` が確実に 503 を返す構造）と F-02（CI の secret scan ゲートが無検査で緑になる）は、A3 と `github-actions-ci` の充足根拠そのものを崩す。よって **P11（evidence）へは引き継げない**。

ただし差し戻しの範囲は限定される。

| 区分 | 判定 |
|---|---|
| pnpm workspace 構成（案 (b)）・単一 Worker の deploy unit | **維持**。P03 が支持し、実装も規約どおり。再評価不要 |
| A2（bundle 予算）の実測証跡と bundle ゲート | **維持**。実測 0.951 MiB / 3.000 MiB、fail-closed も実測済み |
| duplicate detector（A4-2）と 4 package の contract test | **維持**。意図的違反 4 件を実検出。identity 比較まで到達している |
| P08（リファクタ・移行 N/A）判定 | **維持**。回避のための N/A ではない（§4） |
| `/health` の依存プローブ設計と応答契約 | **差し戻し（P05 / P02・P04 の調停を伴う）**。F-01・F-11 |
| CI の G2（lint）・G6（secret scan） | **差し戻し（P05・P09）**。F-02・F-09 |
| `wrangler.jsonc`（環境・binding・cron） | **差し戻し（P05）**。F-04・F-05・F-08・F-10 |
| `cwv-good` の実装物（G11） | **差し戻し（P05）**。F-03 |
| A4-1「全登録層 × consumer 2 系統」の判定範囲 | **差し戻し（P04 → P05、P07 の再裁定）**。F-06 |

> 用語補足: 「fail-closed（フェイルクローズド）」= 検査できない・違反があるときは必ず落ちる作りにすること。反対語の「fail-open」は、壊れていても静かに通ってしまう作り。

---

## 2. quality_constraints 9 件の最終充足判定

判定語: **充足** = 実測証跡があり最終成果物に反映されている / **条件付き** = 反映されているが欠けがある / **未充足** = 実体が無い。

| # | id | 判定 | 根拠となる実ファイル・実測値 |
|---|---|---|---|
| 1 | `C2-zero-cost` | **条件付き** | 追加課金要素を持たない実装は確認できた: `apps/hub/open-next.config.ts`（incremental cache / queue / tag cache を有効化しない）、`apps/hub/wrangler.jsonc`（`observability` のみ、有料 binding なし）、監視は Better Stack Free（ADR §7）。**一方 `wrangler.jsonc` に `env.staging`（`harness-hub-staging`）が残存**し、コメントも「qa-034: production + staging の 2 環境」のまま。C2 を根拠に qa-038（常設 staging なし）へ切り替えた ADR §4 の確定が実装へ落ちていない（F-04） |
| 2 | `C1-solo-ops` | **条件付き** | package 数は `apps/hub` + `packages/{ui,schemas,inspection,estimation,db}` の 6 member に抑制（`pnpm-workspace.yaml`）。detector は名前と参照経路のみの決定的判定（`scripts/ci/check-shared-layer-duplicates.mjs`。AST 類似度を使っていないことをコードで確認）。root に `verify` script あり。**ただし `verify` = `check:pnpm && check:duplicates && typecheck && test && check:bundle` で、CI の G2 相当・`check:drift`・secret scan を含まず**、qa-039【2】「required status checks と同一コマンドの local 実行」を満たしていない（F-14） |
| 3 | `worker-bundle-budget` | **充足** | 実測 **996,920 bytes = 0.951 MiB / 3.000 MiB**（`evidence/bundle-report.json`、`measurementMode: wrangler-dry-run`、fileCount 1 = `worker.js`）。ゲートの fail-closed も実測済み: 閾値 1 KiB で非ゼロ終了、`.open-next/worker.js` 不在時も非ゼロ終了（`apps/hub/scripts/check-bundle.mjs` の early return と `apps/hub/tests/ci/bundle-budget.test.ts` 5 件 pass）。**注記**: CI では `pnpm -r test`（G4）が `build:worker` より前に走るため、`HF-A2-BUNDLE-001` は `it.skipIf` で**スキップされる**（F-15）。実質の担保は後段の G5 |
| 4 | `pnpm-only-no-npm` | **充足** | `node scripts/ci/check-pnpm-only.mjs` を実行し exit 0。違反側も実測済み: `package-lock.json` / `npm-shrinkwrap.json` / `yarn.lock` / `bun.lockb` の 4 種と、`packageManager` 未設定・`npm@` pin の計 6 パターンで非ゼロ終了（`apps/hub/tests/ci/pnpm-only.test.ts` 8 件 pass）。`ci.yml` の test job は `corepack enable`（R-20 の正本機構）。軽微な残件は F-21・F-22 |
| 5 | `slo-error-budget` | **未充足** | `/health` の route handler は実装され契約テスト 8 件 pass。しかし **99.5% を算定する時系列が存在しない**（外形監視未設定・未デプロイ）。算定式に必要な Workers analytics 5xx 率の取得経路も実装物として存在しない。エラーバジェット 70%/100% の 2 段運用は ADR §7 の記述のみ。さらに **F-01 により、現状のままデプロイすると `/health` は常時 503 を返す**ため、計測を開始しても SLO は 0% になる |
| 6 | `cwv-good` | **未充足** | `.github/workflows/` に本 feature 由来のファイルは `ci.yml` のみ（他 6 件は既存の plugin 系 workflow）。**G11（Lighthouse 定期計測）の実装物が存在しない**。リポジトリ内に LCP / INP / CLS を実測する経路は皆無。ADR §6 に G11 の設計記述はあるが、P03 の R-05「CWV は計測・検証経路が皆無」という指摘は**実装段階でも解消されていない**（F-03）。bundle 予算は代理指標であり good 判定の根拠にならない（P03 §2.4 の判定を維持） |
| 7 | `wrangler-deploy` | **条件付き** | `apps/hub/wrangler.jsonc` と `ci.yml` の `deploy` job（`pnpm --filter @harness-hub/hub exec wrangler deploy`）は存在し、ツール系統は wrangler で統一。**ただし `--env production` を渡していないため top-level 環境（`name: harness-hub` / `HUB_ENV: development`）へデプロイされ、定義済みの `env.production`（`harness-hub-production`）が使われない**（F-05）。R2 native binding も未設定（F-10）。実 deploy は未実行（A1 blocked） |
| 8 | `github-actions-ci` | **条件付き** | `ci.yml` に static-gates → test → deploy の 3 job があり、G1/G3/G4/G5/G8/G9/G10 は実体を確認。detector の実効性検証 step も機能する（実測で exit 1）。**未成立が 2 件**: (a) **G6 secret scan は `pnpm --filter @harness-hub/inspection run scan:secrets` が「該当 script なし」で exit 0 になり、何も検査せず緑になる**（実測。F-02）。(b) **G2 lint は全 package で `tsc --noEmit` = G3 typecheck と同一**で、eslint/prettier 等の設定ファイルも存在しない（F-09）。G7 は `packages/db/migrations` 不在で明示スキップ（許容範囲） |
| 9 | `shared-layers-single-implementation-owner` | **条件付き** | duplicate scan **0 件**（登録 12 層 / 走査 174 ファイル）を実行して確認。detector の実効性も実測（意図的違反 fixture で 4 件検出・exit 1）。contract test は `ui` / `schemas` / `inspection` / `estimation` の 4 層で 2 系統を検証し、`expect(consumerA.boundButton).toBe(Button)` のように**同一実装であることを identity で固定**しており実効がある。ドメイン固有ロジックの漏れ込みも確認したが**侵食なし**（§5）。**ただし A4-1 の「§8 登録簿に載る全共通層について consumer 2 系統以上」は 12 層中 4 層でしか成立しておらず、`ownership.test.ts` は「consumer が 1 系統以上」しか検証していない**（F-06）。shared-layers §3 の 4 機構は登録簿に不在（F-13） |

### 集計

| 判定 | 件数 | id |
|---|---|---|
| 充足 | 2 | `worker-bundle-budget`, `pnpm-only-no-npm` |
| 条件付き | 5 | `C2-zero-cost`, `C1-solo-ops`, `wrangler-deploy`, `github-actions-ci`, `shared-layers-single-implementation-owner` |
| **未充足** | **2** | `slo-error-budget`, `cwv-good` |

---

## 3. 私が実行したコマンドと実測結果

いずれも `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203311-wt-2` で 2026-07-21 に実行。

| # | コマンド | 終了コード | 出力（要点） |
|---|---|---|---|
| 1 | `node scripts/ci/check-shared-layer-duplicates.mjs` | **0** | `OK: 登録共通層 12 件 / 走査 174 ファイル / 重複 0 件` |
| 2 | `node scripts/ci/check-pnpm-only.mjs` | **0** | `OK: npm/yarn lockfile の混入なし / packageManager は pnpm に pin 済み` |
| 3 | `node scripts/ci/check-shared-layer-duplicates.mjs --include-fixtures --root apps/hub/tests/fixtures/duplicate-violation` | **1** | `NG: 重複実装 4 件`（owner 外 export 2 件 / deep import 2 件）。**detector は実際に落ちる** |
| 4 | `pnpm -r test` | **0** | **37 test files / 495 tests 全 pass**（db 3/17, estimation 3/39, inspection 3/25, schemas 5/82, ui 12/265, hub 11/67） |
| 5 | `pnpm -r typecheck` | **0** | 6 package すべて Done |
| 6 | `pnpm --filter @harness-hub/inspection run scan:secrets -- --root .` | **0** | `None of the selected packages has a "scan:secrets" script` — **何も実行せず成功扱い**（F-02 の一次根拠） |

補足:
- `check:bundle` は単独起動していないが、コマンド 4 の `tests/ci/bundle-budget.test.ts` が `wrangler deploy --dry-run` を実行し `measurementMode === 'wrangler-dry-run'` と 3 MiB 以内を assert して pass している（4.4 秒）。この経路で A2 の実測は再現できている。
- a11y（G9）はコマンド 4 に含まれる（`apps/hub/tests/a11y/` と `packages/ui/src/a11y/`）。`axe.run` を実際に呼んでおり、`hub-screens.spec.ts` は「空ページを緑にしない」ための DOM 存在 assert（`lang`・`title`・`main`・見出し・skip link）を併記しているため、退化していない。
- 実測件数と P07 報告値の差: P07 は「36 test files」「contract test 22 件」と記載しているが、実測は **37 files**、contract test は 6+8+5+4 = **23 件**（F-19）。

---

## 4. P01〜P09 成果物の整合性確認

| 観点 | 結果 |
|---|---|
| feature context digest の一貫性 | **一致**。P01〜P09 の全文書が `sha256:938ecf38…` を宣言。世代ずれなし |
| acceptance 件数 / quality_constraints 件数 | **一致**。全文書が 4 件 / 9 件で統一（旧世代 3 件 / 8 件の混入なし） |
| P02 → P05 の構成決定 | **一致**。`pnpm-workspace.yaml` の member 集合が ADR §2.4 と完全一致。package 名は全て `@harness-hub/*`、`exports` は `"."` 単一入口のみ（R-15 の規約どおり）。`ownership.test.ts` が名前空間規約を機械検証している |
| P04 → P05 → P06 の trace | **概ね一致**。test-design §3 の配置図と `apps/hub/tests/` の実体が一致。test ID は実テスト名へ埋め込まれている |
| **P02 と P04/P05 の `/health` 契約** | **不一致（調停記録なし）**。ADR §7 と `docs/infrastructure-spec.md` §9（ADR §4 R-10 が「内容正本」と宣言）は `{status, db, r2, version}` を確定。実装と P04 test-design は `{status, version, checkedAt, dependencies[]}`。後段が前段の決定を差し替えたが、どの文書にも調停の記録がない（F-11） |
| **P02 の是正宣言と P05 実装** | **不一致 4 件**。R-01（staging 廃止）・R-08（backup.yml）・R-09（scheduled handler）・R-10（R2 binding）は ADR 本文で是正済みとされているが、実ファイルに反映されていない（F-04・F-07・F-08・F-10） |
| **P09 の記述と実体** | **一部不一致**。P09 §3 は G8 OpenAPI/zod drift を「未配線」とするが、`packages/schemas` に `check:drift` script と `src/contract-drift.test.ts` が実在し `ci.yml` から呼ばれている（F-20）。逆に G6 は「未配線」と正しく書きながら、`ci.yml` には step が存在して緑になる状態を是正していない（F-02） |
| P07 の裁定の妥当性 | **甘くない。むしろ正しい**。A1 を「`ci.yml` はあるが run が無い」、A3 を「時系列が無い」として **blocked のまま pass に読み替えていない**。§4 の理由付け（「ローカルで通ったから CI も通るはず」は推測であって証跡ではない）も規約に忠実。**ただし A4 の合格判定は根拠不足**（F-06）。また A3 について「/health の実装とテストは完了している」という前提自体が F-01 により崩れる |
| P08 の N/A 判定 | **妥当**。`packages/db/src/` は `adapter / context / repository / types / drizzle / errors / index` のみでテーブル定義が存在しないことを確認。`apps/` `packages/` が P05 で新規作成されたことも git log（`7889ad5 feat(hub-foundation): P05 scaffold…`）と整合。「作業回避のための N/A」ではない |
| shared-layers 正本との整合 | **未追随（申し送り済み）**。`docs/shared-layers.md` §3 の CI 品質ゲート登録簿は 5 項目のまま、§4 は 4 package 案のまま。ADR §11.4 F-2 が write scope 外として申し送っており、P10 としては差し戻し対象にしない（ただし F-13 と連動） |

---

## 5. P03 の 27 指摘 — 「是正したと書いてあるだけ」の洗い出し

ADR §11 は 27 件中 25 件を是正済みとしている。**実体の有無を 1 件ずつ確認**した結果、文書のみで実装が伴っていないものが 6 件あった。

| ID | ADR の是正宣言 | 実体の確認結果 | 判定 |
|---|---|---|---|
| R-01 | §4「常設 staging は持たない（qa-038 を正とする）」 | `wrangler.jsonc` に `env.staging`（`harness-hub-staging`）が残存。コメントは「qa-034: production + staging の 2 環境」 | **未是正（実装）** |
| R-05 | §6 G11「main 反映後の Lighthouse 定期計測」 | 該当 workflow・script が存在しない | **未是正** |
| R-06 | §11.3-1「index.ts 以外からの import を禁止する静的検査を G10 に含める」 | detector の検出単位 2 は `if (layer.package_name)` の内側にあり、`apps/hub/src/shared/*` の 7 層では実行されない。代替検査も存在しない | **未是正** |
| R-08 | §3・§7「backup.yml を実装物として本 feature が持つ」 | `.github/workflows/backup.yml` が存在しない | **未是正** |
| R-09 | §4「custom entry で fetch handler を包み scheduled を export」 | `wrangler.jsonc` に `triggers.crons` なし。`main` は `.open-next/worker.js` 直指定で custom entry なし | **未是正** |
| R-10 | §4「binding の内容正本は infrastructure-spec §2」 | `wrangler.jsonc` の binding は `ASSETS` のみ。台帳の `PACKAGES_BUCKET` / `BACKUPS_BUCKET`（qa-003「R2 native binding」）が不在 | **部分未是正** |
| R-19 | §11.3-3「未 wrap route handler を検出する静的検査を G10 に含める」 | 未実装（P09 §4 が自認）。ただし `middleware.ts` の matcher を全 path にし、除外を `authz.ts` の `PUBLIC_PATH_PREFIXES` へ一元化した設計は**実効のある緩和策**として確認 | **未是正（緩和策あり）** |
| R-17 | §11.3-6「アプリ層 rate limiting の既定値は本 feature」 | `apps/hub/src` と `packages/*/src` に rate limit 実装なし（grep 0 件） | **未是正** |
| R-03 | §6 でゲートを G1〜G11 へ再構成 | step は揃うが G2 が実質 typecheck、G6 が無検査で緑 | **部分是正** |
| R-07 | §6「inspection の第 2 consumer は CI 自身」 | CI からの呼び出しが無検査で緑（F-02）のため、**CI は実在 consumer として成立していない**。A4-1 は `tests/fixtures/consumer-a` によって別途満たされている | **部分是正** |
| R-18 | `pnpm verify` | 実装済み。ただし内容が required checks と不一致（F-14） | **部分是正** |
| R-20 | corepack を正本機構に | `ci.yml` test job で `corepack enable`。deploy job は `pnpm/action-setup`、root は `preinstall: npx --yes only-allow pnpm` | **部分是正** |
| R-21 | `onlyBuiltDependencies` | `pnpm-workspace.yaml` に `esbuild` / `sharp` / `workerd` を明示 | **是正済み** |
| R-22 | lockfile 検査対象の拡張 | `yarn.lock` / `bun.lockb` / `bun.lock` を追加し、4 種の非ゼロ終了を実測 | **是正済み** |
| R-15 | package 命名・`exports` 規約 | 全 package が `@harness-hub/*` + `exports: {".": "./src/index.ts"}`。`ownership.test.ts` が機械検証 | **是正済み** |
| R-02 / R-04 / R-11 / R-12 / R-13 / R-14 / R-16 / R-23 / R-24 / R-25 / R-26 / R-27 | 文書内の調停・記録で足りるもの | ADR §11 に記載を確認 | **是正済み**（ただし R-11/R-12 は計測実体が無く `slo-error-budget` 未充足と同根） |

---

## 6. ゲートの Goodhart 化の検証（実際に中身を読んで判定）

「緑になるように書かれたテスト・ゲート」がないかを、スクリプトとテストの実装を読んで判定した。

| 対象 | 判定 | 根拠 |
|---|---|---|
| duplicate detector | **退化なし** | 登録 12 層に対し公開 API を `index.ts` から再エクスポート追跡で収集し、owner 外の同名 export と deep import / 相対越境を検出。実効性を fixture で実測（4 件検出・exit 1）。`--include-fixtures` を付けない限り fixture が本番ゲートを汚染しない設計も確認 |
| bundle 予算 | **退化なし** | `wrangler deploy --dry-run` の実 bundle のみを計測し、`measurementMode` をレポートへ固定。テストが `measurementMode === 'wrangler-dry-run'` を assert しているため「無関係な path を測って緑」を封じている。未ビルド時・計測対象 0 件時は非ゼロ終了 |
| a11y | **退化なし** | `axe.run` を実 DOM に対して実行。`packages/ui` は 27 部品を個別検査、`apps/hub` は layout + page を SSR して検査。「空ページなら違反 0 件」を防ぐ DOM 存在 assert を併記 |
| contract test | **退化なし** | import 経路の静的走査（`publicApiImports` / `deepImports` / `boundaryBypassImports`）に加え、`expect(consumerA.boundButton).toBe(Button)` で**同一オブジェクトであること**を固定している。再実装を「参照している」と誤認しない |
| pnpm 混入検査 | **退化なし** | 6 パターンの違反で非ゼロ終了を実測。走査範囲を Hub monorepo に限定した理由も妥当（plugin の vendor 資産は本制約の対象外） |
| **G6 secret scan** | **退化あり（fail-open）** | `pnpm --filter … run scan:secrets` は script 不在時に **exit 0** で終わる（実測）。`continue-on-error: false` は無効化を防いでいるだけで、この経路には効かない。**P09 が §2 の落とし穴として自ら指摘した `pnpm -r run` の沈黙スキップと同じ故障が、G6 で再発している** |
| **G2 lint** | **退化あり** | 6 package すべて `lint: tsc --noEmit` で G3 と同一コマンド。lint / format の設定ファイルも存在せず、qa-038【2】が独立ゲートとして要求した検査が実質存在しない |
| **`ownership.test.ts`** | **要件より弱い** | A4-1 は「consumer 2 系統以上」を要求するのに、テストは `consumers.length === 0` のみを違反としている（1 系統で緑）。緑が要件充足を意味しない |
| **`/health` テスト** | **退化あり** | `process.env.DB = 'stub-binding'` を設定して 200 を得ている。production では `DB` binding が存在しない（F-01）ため、この緑は本番の挙動を保証しない |

---

## 7. ドメイン固有ロジックの基盤への集約（境界侵食）の検証

shared-layers 前文が名指しする 4 件を実装レベルで確認した。**侵食は検出されなかった。**

| ドメイン固有ロジック | 実装の確認 | 判定 |
|---|---|---|
| 試算式 | `apps/hub/src/shared/estimation/index.ts` は「計算式は持たず、テナント設定の係数を渡すだけ」とコメントし、`estimateSavings` へ委譲するのみ。`packages/estimation/src/` は `estimate` / `seats` / `validation` / `types` で、単位換算・丸め・入力検証の骨格に留まる（R-04 の責務分界どおり） | **侵食なし** |
| 認証 policy | `apps/hub/src/shared/auth/index.ts` は provider 未注入時 deny-all。OIDC provider 実体は未実装で feat-auth-tenancy へ委譲されている | **侵食なし** |
| DB schema | `packages/db/src/` にテーブル定義なし。`RepositoryContext` などの境界型のみ | **侵食なし** |
| publish 判定 | `packages/inspection/src/` は `rules` / `pipeline` / `verdict` の骨格。判定ルール実体は consumer 側 | **侵食なし** |
| 監査 event | `audit/index.ts` の `action` は文字列で、コメントに「語彙は consumer feature が定義する」と明記。ハードコードされた業務イベント一覧なし | **侵食なし** |
| PII ガード | `pii/index.ts` は機構のみ。要保護属性の具体名は持たない | **侵食なし** |

---

## 8. 指摘事項一覧

重大度: **重大** = P11 へ引き継ぐ前に是正必須 / **高** = 是正必須だが並行可 / **中** = 該当 phase で是正 / **低** = 記録のみで可。

### 8.1 重大 — 3 件

| ID | 指摘 | 是正要否 | 是正先 |
|---|---|---|---|
| **F-01** | **`/health` が本番で確実に 503 を返す構造になっている。** `apps/hub/src/app/health/probes.ts` の `defaultProbes` は `db` を `critical: true` とし、`env.DB` が未定義なら `db_binding_missing` を throw する。しかし `apps/hub/wrangler.jsonc` に `DB` binding は無く、かつ `docs/infrastructure-spec.md` §4 は「Turso は `@libsql/client`（HTTP）のみ。**native binding はない**」と確定している。つまり `env.DB` は本番で永久に undefined → `status: down` → `healthHttpStatus` が **503** を返す。テストが緑なのは `health.route.test.ts` が `process.env.DB = 'stub-binding'` を置いているため。A3（`/health` 稼働・SLO 99.5%）は blocked どころか、**現状のままデプロイすると外形監視が 100% down を計測する** | **要** | **P05**（probe を Turso HTTP 疎通へ変更、または `DB` binding を wrangler.jsonc へ追加）。あわせて P02 との契約調停（F-11） |
| **F-02** | **CI の G6 secret scan が無検査で緑になる（fail-open）。** `ci.yml` の `pnpm --filter @harness-hub/inspection run scan:secrets -- --root .` を実行したところ、`None of the selected packages has a "scan:secrets" script` と表示して **exit 0**（実測）。`packages/inspection/package.json` に該当 script が存在しない。qa-038【2】の required status check が成立しておらず、P09 の責務（適用対象の検査を fail-closed にする）が未達。P09 §2 が「`pnpm -r run` は script 不在の package を沈黙スキップする」と自ら書いた故障が、同じ workflow 内で再発している | **要** | **P05**（`scan:secrets` を実装）**+ P09**（未配線ゲートを CI から呼ぶなら「script 不在なら fail」を明示する） |
| **F-03** | **quality_constraint `cwv-good` に実装物が 1 つも無い。** `.github/workflows/` に Lighthouse / CWV 計測の workflow は存在せず、リポジトリ内に LCP / INP / CLS を実測する経路が皆無。P03 の R-05（重大）に対する是正は ADR §6 への G11 記述のみで、P05 が実装していない。9 件中この 1 件だけが「設計にも実装にも計測経路が無い」状態のまま最終成果物へ到達している | **要** | **P05**（G11 の実装物を作る、または scope 外として上位へエスカレーションし quality_constraint の扱いを再確定する） |

### 8.2 高 — 6 件

| ID | 指摘 | 是正要否 | 是正先 |
|---|---|---|---|
| **F-04** | `wrangler.jsonc` が qa-038 確定（常設 staging を持たない）に反して `env.staging`（`harness-hub-staging`）を保持し、コメントも「qa-034: production + staging の 2 環境」のまま。ADR §4 の R-01 是正が実装へ反映されていない。放置すると無料枠の二重消費（C2）と運用導線の二重化（C1）を招く | 要 | P05 |
| **F-05** | `ci.yml` の deploy step が `wrangler deploy` を `--env production` なしで実行するため、**top-level 環境（`name: harness-hub` / `vars.HUB_ENV: development`）へデプロイされる**。定義済みの `env.production`（`harness-hub-production`）が使われず、`/health` が返す環境情報も `development` になる | 要 | P05 |
| **F-06** | **A4-1 の判定範囲が要件の 1/3 しかない。** requirements-baseline §4.2 A4-1 は「§8 登録簿に載る**全**共通層について consumer 2 系統以上」を要求するが、contract test は `ui` / `schemas` / `inspection` / `estimation` の 4 層のみ。残り 8 層（`db` / `authz-middleware` / `auth` / `audit` / `aijob` / `notification` / `pii` / `telemetry`）は registry 上も consumer 1 系統で、`ownership.test.ts` は「1 系統以上」しか検証していない。P07 の A4「合格」はこの差分を検討していない | 要 | P04（test ID 追加）→ P05（fixture consumer 追加）→ **P07 の再裁定** |
| **F-07** | `.github/workflows/backup.yml` が存在しない。ADR §3・§7 は R-08 の是正として「文書ではなく実装物として本 feature が持つ」と宣言している。requirements-baseline §9.5「P12/P13 は不足している実装を文書で代替できない」に抵触する状態が残っている | 要 | P05 |
| **F-08** | scheduled handler（cron 2 系統: 日次 `0 15 * * *` / 週次 `0 0 * * 1`）が未実装。`wrangler.jsonc` に `triggers.crons` が無く、`main` は `.open-next/worker.js` 直指定で custom entry も無い。ADR §4 の R-09 是正が設計記述のみで終わっている。cron heartbeat（qa-027）による失敗検知も成立しない | 要 | P05 |
| **F-09** | G2 lint が全 package で `tsc --noEmit`（= G3 typecheck と同一）。eslint / prettier / biome いずれの設定ファイルも存在しない。qa-038【2】が required status checks の独立項目として確定した lint / format 検査が実質存在しない。P09 §2 #5 は「`apps/hub` に `lint` を追加して exit 0 を実測」と記録しているが、追加された中身が typecheck の重複であることを検証していない | 要 | P05 |

### 8.3 中 — 9 件

| ID | 指摘 | 是正要否 | 是正先 |
|---|---|---|---|
| **F-10** | `wrangler.jsonc` の binding が `ASSETS` のみ。infrastructure-spec §2 の binding 台帳（`PACKAGES_BUCKET` / `BACKUPS_BUCKET`）と qa-003「R2 を native binding で参照」が未反映。ADR §4 の R-10 是正は参照関係の宣言に留まっている | 要 | P05 |
| **F-11** | `/health` 応答契約が二重定義のまま食い違っている。ADR §7 と infrastructure-spec §9（ADR が「内容正本」と宣言）は `{status, db, r2, version}`、実装と P04 test-design は `{status, version, checkedAt, dependencies[]}`。後段が前段の決定を調停記録なく差し替えている。外形監視の判定条件に直結する | 要 | P02 / P04 の調停 → 正本を 1 本にする |
| **F-12** | E1 証跡の path が requirements-baseline §4.2 A4-3 の `evidence/shared-layer-ownership.md` ではなく `.json`。同 §は「P07 / P10 は実ファイルを exact lookup で確認できるまで A4 を pass にできない」と規定しており、規約上は不一致。内容は充足しているため実害は小さいが、baseline 側の path 修正か生成側の追随が必要 | 要 | P01 の path 修正 or P05 |
| **F-13** | `scripts/ci/shared-layer-registry.json` の登録層が 12 件で、requirements-baseline §8.3（shared-layers §3）の 4 機構（CI 品質ゲート / デプロイ / 監視 / バックアップ）が含まれていない。task spec の必須証跡「**全**登録共通層の owner / public API / consumer 一覧」を厳密には満たしていない。コード成果物でない層をどう登録簿へ載せるかの方針が未確定 | 要 | P05（方針を決めて登録 or 明示除外の根拠を registry に記録） |
| **F-14** | root の `verify` が required status checks と不一致（G2 相当・`check:drift`・secret scan を含まない）。qa-039【2】「同一コマンドの local 実行」が部分未達 | 要 | P05 |
| **F-15** | CI のジョブ順（G4 `pnpm -r test` → `build:worker` → G5）により、`HF-A2-BUNDLE-001` が `it.skipIf(!existsSync(WORKER_ENTRY))` で **CI 上は常にスキップ**される。実質の担保は G5 が行うため acceptance は崩れないが、test-design §5「実行されなかったものを pass と見なさない」に照らすと test ID 単位の証跡が CI で再現しない | 要 | P05（build:worker を test の前に移す等） |
| **F-16** | ADR §11.3-1（R-06）が約束した「`apps/hub/src/shared/*` は公開 contract を `index.ts` に集約し、それ以外からの import を禁止する静的検査」が detector に未実装。現状は各層が `index.ts` 単独ファイルのため実害が顕在化していないが、ファイルが増えた時点で 7 層の境界検証が空振りする | 要 | P05 |
| **F-17** | ADR §11.3-3（R-19）の「未 wrap route handler を検出する静的検査」が未実装（P09 §4 が自認）。ただし `middleware.ts` の matcher を全 path にし除外を `authz.ts` の allowlist へ一元化した設計は実効のある緩和策であり、fail-open のリスクは初版時点では限定的 | 要（follow-up） | P05 / follow-up |
| **F-18** | アプリ層 rate limiting の既定値実装が無い（`apps/hub/src` / `packages/*/src` に該当コード 0 件）。ADR §11.3-6 は「既定値のみ本 feature」と分担を確定している | 要 | P05 |

### 8.4 低 — 4 件

| ID | 指摘 | 是正要否 |
|---|---|---|
| **F-19** | P07 §3 の集計値が実測とずれる（test files 36 → 実測 37、contract test 22 件 → 実測 23 件）。裁定結論には影響しない | 要（記録の訂正） |
| **F-20** | P09 §3 が G8 OpenAPI/zod drift を「未配線」としているが、`packages/schemas` の `check:drift` と `src/contract-drift.test.ts` は実在し `ci.yml` から呼ばれている。P09 の記述が実体より古い | 要（記録の訂正） |
| **F-21** | root の `preinstall: npx --yes only-allow pnpm` が npm 由来コマンドとネットワーク取得に依存。R-20 で「corepack を正・only-allow は補助」と整理済みのため許容範囲だが記録する | 否 |
| **F-22** | `ci.yml` の deploy job のみ `pnpm/action-setup` を使い、test job の corepack と機構が不統一 | 否（記録のみ） |

### 8.5 集計

| 重大度 | 件数 | 是正要 |
|---|---|---|
| 重大 | 3 | 3 |
| 高 | 6 | 6 |
| 中 | 9 | 9 |
| 低 | 4 | 2 |
| **合計** | **22** | **20** |

---

## 9. 積極的に妥当と判断した点（追認ではなく検証の結果）

差し戻し判定だが、以下は独立検証の結果として妥当と確認した。再実行時に維持すべき。

1. **duplicate detector の実効性**。意図的違反 fixture に対し 4 件を実検出して非ゼロ終了することを自分で実行して確認した。確率的手法を避け名前と参照経路のみで判定する設計（C1 との接続）も、コードを読んで確認した。
2. **contract test が identity 比較まで到達している**こと。import 経路の静的走査だけなら「同名の別実装」を見逃すが、`toBe(Button)` で同一オブジェクトを固定しており、A4 の「同じ実装を参照する」を実質検証している。
3. **bundle ゲートの計測対象の絞り込み**。`.open-next` 全体ではなく wrangler dry-run の実 bundle のみを測り、`measurementMode` をテストで固定した点は、P09 が発見した「常時赤 / 誤って緑」の両故障を正しく塞いでいる。
4. **P07 が blocked を pass に読み替えていない**こと。A1・A3 を外部要因で判定不能と記録し、解除条件を列挙している。裁定規約に忠実で、過剰に厳しくもない。
5. **ドメイン固有ロジックの非集約**。`packages/estimation` が計算の骨格に留まり、`audit` の action 語彙を consumer へ委ねるなど、shared-layers 前文の 4 件すべてで境界が守られている。
6. **P08 の N/A 判定**が実体（`packages/db` にテーブル定義が無い・git 履歴で新規作成）に裏付けられている。
7. **a11y テストが空ページで緑にならない**よう DOM 存在 assert を併記している設計。

---

## 10. レビューの限界（何を見ていないか）

本書の結論は以下の範囲でのみ有効であり、「ここに書かれていない問題が無い」ことは意味しない。

| # | 未検証事項 | 理由 |
|---|---|---|
| L-1 | **GitHub Actions 上での実行** | CI run が 1 度も存在しない。`ci.yml` の各 step は静的読解と、同等コマンドのローカル実行で判定した。ubuntu-latest / clean install での再現性、`environment: production` の承認ルール有無、`actions/setup-node` の `cache: pnpm` が corepack 経由で機能するかは未確認 |
| L-2 | **実デプロイと外形監視** | Cloudflare / Better Stack が未設定。F-01（本番 503）は実装と確定仕様の照合による論証であり、実 HTTP で確認したものではない |
| L-3 | **`@opennextjs/cloudflare` の挙動** | scheduled handler 同居可否、Next.js middleware のサポート範囲を公式ドキュメントで一次確認していない（P03 の L-4 が未解消のまま） |
| L-4 | **CWV の実測** | 計測経路自体が存在しないため、good を満たすかどうかは判定していない。判定したのは「計測経路が無い」ことのみ |
| L-5 | **他 feature との相互整合** | feat-domain-model-db / feat-auth-tenancy / feat-publisher-plugin 側から見た共通層 contract の妥当性は scope 外 |
| L-6 | **`packages/ui` 27 部品の実装品質** | axe 違反 0 件と単体テスト 265 件 pass は確認したが、各部品の API 設計・視覚的品質・実利用時の CLS は評価していない |
| L-7 | **上流 system-spec 自体の妥当性** | qa-034 と qa-038 の矛盾は P02 で調停済みとして扱った。他の qa 間矛盾の全数点検は行っていない |
| L-8 | **セキュリティの網羅検証** | `HF-QA-TENANT-001` 10 件 pass と `authz.ts` の判定順を読んだのみ。ペネトレーション的な検証や、`withAuthz()` 未 wrap route の網羅探索は行っていない |
| L-9 | **P11〜P13 の成果物** | dependency rule により参照していない |

**手法上の限界**: 単一レビュアによる静的読解 + ローカル実行であり、指摘 22 件は「本気で探した結果見つかったもの」だが、見落としが 0 件であることは保証しない。

---

## 11. 差し戻し後の推奨手順

1. **F-01 を最優先**で是正する。`/health` は A3・SLO・外形監視・CI の post-deploy 確認すべての土台であり、ここが壊れたままデプロイすると以降の計測が全て無意味になる。あわせて F-11（応答契約の正本一本化）を P02 / P04 間で調停する。
2. **F-02 / F-09** を是正し、CI の緑が「全ゲートを通った」を意味する状態に戻す。特に F-02 は P09 自身が言語化した故障パターンの再発であり、「`pnpm --filter … run <script>` は script 不在で exit 0」を workflow 全体で点検する。
3. **F-03** は実装するか scope 外へ出すかの判断を要する（上位エスカレーション）。quality_constraint を「未充足のまま P11 へ」は規約上できない。
4. **F-04 / F-05 / F-07 / F-08 / F-10** は `wrangler.jsonc` と `.github/workflows/` への追記で完結する P05 の作業。
5. **F-06** は P04 で test ID を追加 → P05 で fixture consumer を追加 → **P07 を再実行して A4 を再裁定**する。
6. 是正後に P10 を再実行し、quality_constraints 9 件を再判定する。

---

## 12. 参照元と検証

- **レビュー対象**: `docs/features/feat-hub-foundation/` 配下の P01〜P09 全成果物と `evidence/` 5 ファイル、`apps/hub/`、`packages/{ui,schemas,inspection,estimation,db}/`、`scripts/ci/`、`.github/workflows/ci.yml`、`package.json`、`pnpm-workspace.yaml`
- **照合した上流**: `docs/shared-layers.md` §1〜§5、`docs/infrastructure-spec.md` §2/§4/§5/§7/§9/§10、`docs/system-design-overview.md`
- **正本タスク仕様**: `.dev-graph/plans/generations/feature-package-feat-hub-foundation/8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502/task-specs/phase-10-final-review.md`
- **実行コマンドと実測結果**: §3（6 コマンド。うち 3 件が本書の指摘の一次根拠）
- **P10 acceptance との対応**: 「final-review-notes.md に quality_constraints 9 件それぞれの充足状況（充足 / 不足）と根拠が明記されていること」→ §2 で 9 件を 1 件ずつ判定。必須証跡（全登録共通層の owner / public API / consumer 一覧、consumer contract tests、duplicate scan = 0、CI / bundle / SLO / health の 4 acceptance 証跡）の確認結果は §2・§4・§6 に記載。
- **Rollback trigger 発動**: `cwv-good` / `slo-error-budget` の未充足により、§8 の是正先 phase（主に P05、一部 P02 / P04 / P07 / P09）を再実行対象として dev-graph へ差し戻す。

---

## 13. 再レビュー (2026-07-21 / round 2)

> **位置づけ**: §1〜§11 の差し戻し（F-01〜F-22）に対する是正が行われたと申告されたため、**是正の実体を独立に再検証**した記録。前回同様、文書の「是正済み」という記述は根拠として採らず、**実ファイルの中身とコマンドの実測値**のみを一次根拠にした。
>
> 前回のこのレビューが最も価値を出したのは「ADR に是正済みと書いてあるが実装が無い」の検出だった。今回も同じ目で、特に **(a) テストのスタブが実環境の制約を隠していないか**、**(b) 件数の水増しで緑にしていないか**、**(c) 設定での一律無効化で lint 件数を減らしていないか** を重点的に見た。

---

### 13.1 承認可否

### **判定: 条件付き承認**

前回差し戻しの根拠だった **3 件の重大指摘（F-01・F-02・F-03）は、いずれも実体を伴って是正されている**ことを確認した。「文書だけ直して実装が無い」パターンは、今回は 1 件も検出されなかった。是正のついでに壊れた退行も、認可・a11y・duplicate detector・bundle 計測のいずれにも検出されなかった。

加えて、前回のレビュー限界 **L-1（GitHub Actions 上での実行が 1 度も無い）が解消**された。CI run **29795485968** が success で、全 15 step が clean install の ubuntu-latest で通っている（実測）。これは前回「ローカルで通ったから CI も通るはず、は推測であって証跡ではない」と書いた点が、証跡に変わったことを意味する。

**それでも「承認」ではなく「条件付き承認」とする理由は 3 つ。**

1. `slo-error-budget` が依然 **未充足**。ただし今回の未充足は前回とは性質が違う。前回は「F-01 により計測を始めても SLO が 0% になる」という**実装の欠陥**だったが、今回は**ユーザー作業（Cloudflare / Better Stack のアカウント設定と main merge）待ち**であり、再実行すべき P0x phase が存在しない。差し戻しても生成される成果物が無いため、rollback ではなく「デプロイ後に P10 を再実行して確定する」条件を付す。
2. **F-11（`/health` 応答契約の二重定義）が未是正のまま残っている**。ADR §7 と infrastructure-spec §9 は今も `{status, db, r2, version}` と書いており、実装・schemas・test-design の `{status, version, checkedAt, dependencies[]}` と食い違う。infrastructure-spec §9 は critical 区分の追記はされたが、**応答の形そのものは調停されていない**。外形監視の判定条件に直結するため、放置できない。
3. **新規指摘 G-01（高）**: A4 の必須証跡である `evidence/shared-layer-ownership.json` が、**全 12 層について consumer 2 系統と読める内容**になっている。registry と acceptance-report は「5 層は fixture 1 系統のみ」と正直に書いているのに、**機械生成された証跡だけが過大申告**している。P11 が evidence を引き継ぐ前に是正が要る。

### 条件（P11 へ引き継ぐ前に是正すべきもの）

| # | 条件 | 対応する指摘 | 是正先 |
|---|---|---|---|
| 1 | `evidence/shared-layer-ownership.json` に `app_wiring` を出力し、宣言 consumer と実測 consumer を区別できる形にする | G-01 | P05（`scripts/ci/check-shared-layer-duplicates.mjs` の report 生成部） |
| 2 | `/health` 応答契約の正本を 1 本にする（ADR §7 / infrastructure-spec §9 を `dependencies[]` 形へ改訂するか、実装を戻すかを明記して調停） | F-11 | P02（正本の改訂）→ ADR §11 へ調停記録 |
| 3 | `acceptance-report.md` §3 の「37 test files」を実測値へ訂正（実測 **44**） | G-02 | P07 |

上記 3 件はいずれも **数行〜十数行の修正で完結**し、phase の再実行を要しない。だから差し戻しではなく条件付き承認とした。

### 前回差し戻し範囲の解除状況

| 前回の差し戻し区分 | 今回 |
|---|---|
| `/health` の依存プローブ設計と応答契約 | **プローブ設計は解除**（F-01）。**応答契約は未解除**（F-11） |
| CI の G2（lint）・G6（secret scan） | **解除**（F-02・F-09） |
| `wrangler.jsonc`（環境・binding・cron） | **解除**（F-04・F-05・F-08・F-10） |
| `cwv-good` の実装物（G11） | **解除**（F-03） |
| A4-1 の判定範囲 | **解除**（F-06。判定範囲は全 12 層へ拡張され、未達も未達として記録された）。ただし証跡側に G-01 |

---

### 13.2 F-01〜F-11 の是正状況（1 件ずつ）

判定語: **是正済み** = 実体を確認し実測で裏付けた / **部分** = 一部のみ / **未是正** = 実体が無い。

| ID | 前回の要求 | 実体の確認結果（一次根拠） | 判定 |
|---|---|---|---|
| **F-01** | `/health` が本番で確実に 503 を返す構造を直す | `apps/hub/src/app/health/probes.ts` を全文精読。`defaultProbes` は `runtime-config` / `db` / `r2` の 3 件で、**`env.DB` binding への依存が消えている**。`db` は Turso HTTP API（`POST {url}/v2/pipeline` に `SELECT 1`）で疎通確認する実装（同 file `selectOne`）に置き換わり、infrastructure-spec §4「Turso は HTTP のみ・native binding なし」と整合。`r2` は `PACKAGES_BUCKET` / `BACKUPS_BUCKET` の `head()` を叩くが **`critical: false`** で degraded（HTTP 200）止まり。両 binding は `wrangler.jsonc` の `r2_buckets` に実在する。**スタブが制約を隠していないことも確認**: `health.route.test.ts` は「secret も binding も無い素の Node 環境で `GET()` が **503** を返す」を assert しており（同 file 219–228 行）、前回の `process.env.DB = 'stub-binding'` は消えている。さらに「probe 名に `binding` を含むものが無い」ことを assert して F-01 の再発自体を封じている | **是正済み** |
| **F-02** | G6 secret scan が無検査で緑になる（fail-open） | `packages/inspection/scripts/scan-secrets.mjs` が実在。**実行して実測**: `files=187 findings=0 verdict=pass` / exit 0。空振り防止も実装済み（`scan/secret-scan.scan.ts` が `expect(files.length).toBeGreaterThanOrEqual(minimumFiles)`）。CI run 29795485968 の G6 step も success。**ただし故障の“型”は残存** → G-04 | **是正済み** |
| **F-03** | `cwv-good` に実装物が 1 つも無い | `.github/workflows/cwv.yml` が実在（85 行）。**fail-closed を実装レベルで確認**: (a) `vars.HUB_PUBLIC_URL` 未設定なら `exit 1`（「未計測を good と見なさないため、ここで失敗させています」）、(b) metric が数値で取れなければ `failed = true`（「計測失敗を good と見なさない」）、(c) 閾値 LCP 2500 / CLS 0.1 / TBT 200 を 1 つでも外れたら `process.exit(1)`。警告どまりにしていない。INP を TBT で代理している点のみ注記 → G-05 | **是正済み** |
| **F-04** | `env.staging` の残存（qa-038 確定に反する） | `apps/hub/wrangler.jsonc` から `env.staging` が消滅。コメントも「qa-038 確定 (2026-07-21) により常設 staging を持たないため、**top-level 定義そのものが production**」へ改訂。`vars.HUB_ENV` は `production` | **是正済み** |
| **F-05** | `wrangler deploy` に `--env production` が無く development へ deploy される | 環境定義を分割せず **top-level = production** に統一することで解決。設計意図もコメントに明記（「env を分けると `--env` 指定漏れがそのまま意図しない環境への deploy になる」）。`ci.yml` の deploy step は `--env` なしのままで整合が取れている。**フラグ追加より構造で潰す解法で、こちらのほうが良い** | **是正済み** |
| **F-06** | A4-1 の判定範囲が要件の 1/3（4 層のみ） | `apps/hub/tests/shared-layers/contract.in-app-layers.test.ts`（253 行・新規）が in-app 7 層を追加し、`contract.db.test.ts` も新規。**「5 層を fixture があるので 2 系統」と数えていないことを実測で確認**: 同 file の `WIRED_IN_APP_LAYERS = ['authz-middleware', 'auth-adapter']` に対し、私が独立に `grep -rn "shared/" apps/hub/src` を実行した結果も **`middleware.ts` → `shared/auth`、`middleware/authz.ts` → `shared/auth` の 2 件のみ**で完全一致。registry の `app_wiring: pending` 5 件（audit / aijob / notification / pii / telemetry）と、ソース走査による未結線集合が一致することをテストが突き合わせており（同 file 90–95 行）、**宣言だけ増やして緑にする空洞化を機械的に封じている**。acceptance-report も A4 を「条件付き合格」へ再裁定済み | **是正済み**（ただし証跡側に G-01） |
| **F-07** | `.github/workflows/backup.yml` が存在しない | 実在（98 行）。**失敗時に静かに成功しない構造を確認**: (a) 必要 secret 5 種が 1 つでも欠ければ `exit 1`、(b) dump が 100 bytes 未満なら「バックアップとして採用しない」で `exit 1`、(c) upload 後に `head-object` の ContentLength と local size を突き合わせ、(d) **全て成功したときだけ heartbeat を打つ**（`if: success()`）。「upload しただけでは復元できる根拠にならない」という理由もコメントにある | **是正済み** |
| **F-08** | scheduled handler（cron 2 系統）が未実装 | `apps/hub/src/worker.ts`（44 行・custom entry）と `apps/hub/src/worker/cron.ts`（180 行）が実在。`wrangler.jsonc` に `triggers.crons: ["0 15 * * *", "0 0 * * 1"]`、`main: src/worker.ts`。**静かに成功しない構造を確認**: (a) 未登録 cron 式は `status: 'failed', detail: 'unregistered_cron'`（「設定と実装の食い違いなので黙って成功にしない」）、(b) heartbeat は**全ジョブ成功時のみ** ping、(c) 未実装ジョブは `pendingJob('...')` として id から未実装と読める命名で dispatch 対象に残す。テスト 13 件（`tests/worker/cron.test.ts`）と test ID `HF-CRON-001〜005` も test-design へ追加済み | **是正済み** |
| **F-09** | G2 lint が `tsc --noEmit` で G3 と同一。lint 設定ファイルが無い | `biome.json` が実在し、`ci.yml` の G2 は `pnpm exec biome ci`。**設定での一律無効化が無いことを確認**: `linter.rules` は `{"recommended": true}` のみで、無効化した rule は 1 件も無い。`files.includes` も `apps/**` `packages/**` `scripts/ci/**` を対象にしており、除外は `node_modules` / `.next` / `.open-next` / `artifacts` / duplicate-violation fixture のみ（いずれも lint 対象にする意味が無いもの）。**`biome-ignore` を全件 grep して理由を判定**（下表）。実測で `pnpm exec biome ci` は **exit 0 / Checked 147 files / 1 warning / 12 infos**。CI 上でも success | **是正済み**（package-level の残件 → G-03） |
| **F-10** | `wrangler.jsonc` の binding が `ASSETS` のみ | `r2_buckets` に `PACKAGES_BUCKET`（`harness-hub-packages`）と `BACKUPS_BUCKET`（`harness-hub-backups`）を追加。infrastructure-spec §2 台帳と一致。`CRON_HEARTBEAT_URL` は secret 台帳へ追記され、runbook の `wrangler secret put` 手順にも反映 | **是正済み** |
| **F-11** | `/health` 応答契約が二重定義のまま食い違う | **未是正**。`docs/infrastructure-spec.md` §9 は今も「`{ status, db, r2, version }` を返す」（critical 区分の追記はあるが**形は変わっていない**）。`architecture-decision-record.md` §7（159 行）も `{status, db, r2, version}` のまま。一方 `packages/schemas/src/health.ts` の `healthResponseSchema` は `{status, version, checkedAt, dependencies[]}`、`test-design.md` HF-A3-HEALTH-002 も同じ。**正本と実装が違う状態が残っている**。前回「後段が前段の決定を調停記録なく差し替えた」と指摘した構図がそのまま | **未是正** |

### `biome-ignore` の全件監査（件数を減らすための抑制が無いかの確認）

`grep -rn "biome-ignore" apps packages scripts` の結果はソース 3 件のみ（他はビルドキャッシュのバイナリヒット）。

| 箇所 | 抑制した rule | 付された理由 | 判定 |
|---|---|---|---|
| `packages/ui/src/components/Tabs.tsx:117` | `lint/a11y/noNoninteractiveTabindex` | WAI-ARIA APG の Tabs pattern が tabpanel を焦点可能にすることを求めており、操作要素の無いタブでもキーボードだけで本文へ到達させるため | **妥当**。仕様に基づく具体的根拠があり、むしろ a11y を高める方向の抑制 |
| `packages/ui/src/components/Progress.tsx:71` | `lint/suspicious/noArrayIndexKey` | 行数固定の装飾要素で識別子を持たず、並べ替えも差し込みも起きない | **妥当**。rule が防ごうとしている再描画の不整合が原理的に起きない条件を述べている |
| `packages/ui/src/components/DataTable.tsx:179` | `lint/suspicious/noArrayIndexKey` | 骨組み（skeleton）行で上に同じ | **妥当** |

**「理由なき `biome-ignore`」は 0 件。件数を減らすための抑制も 0 件。** むしろ Biome 導入時に 36 件の実バグを是正したと acceptance-report が記録しており、`git diff` 上も `packages/ui` / `packages/schemas` 等に広く実修正が入っている（表面的な設定追加ではない）。

---

### 13.3 F-12〜F-22（中・低）の是正状況

| ID | 判定 | 根拠 |
|---|---|---|
| F-12（E1 証跡の path が `.md` / 実体 `.json`） | **未是正** | `requirements-baseline.md:96` は今も `evidence/shared-layer-ownership.md`。実体は `.json` |
| F-13（registry に shared-layers §3 の 4 機構が不在） | **未是正** | `shared-layer-registry.json` は 12 層のまま。CI 品質ゲート / デプロイ / 監視 / バックアップの扱い方針も、明示除外の根拠も記載されていない |
| F-14（`verify` が required checks と不一致） | **部分** | `pnpm lint`（= `biome check`）が追加され G2 相当は解消。**`check:drift` と `scan:secrets` は依然含まれない** |
| F-15（`HF-A2-BUNDLE-001` が CI で常時 skip） | **未是正** | **CI ログで実測**: `apps/hub test: tests/ci/bundle-budget.test.ts (5 tests / 1 skipped)` / `Tests 119 passed / 1 skipped (120)`。`pnpm -r build` は `next build` までで `.open-next` を作らず、`build:worker` は G4 の後段のまま。実質担保は G5（CI 上 success）が行っている |
| F-16（in-app 7 層の `index.ts` 迂回検査が未実装） | **是正済み（別経路）** | detector 側の検出 2 は今も `if (layer.package_name)` の内側で、in-app 層では動かない。**代わりに** `contract.in-app-layers.test.ts` が 7 層すべてに対し `inAppDeepImports(APP_SRC, dir)` と `inAppDeepImports(CONSUMER_A, dir)` を空配列 assert しており、要求された検査は成立している。走査ヘルパ（`tests/shared-layers/source-scan.ts`）も精読し、`isOwnedBy` で owner 自身の内部 import を除外する処理が正しいことを確認 |
| F-17（未 wrap route handler の静的検出） | **未是正（follow-up 明示）** | runbook §「未実装」表の U-4 として残置。U-1〜U-3 は取り消し線で是正済みへ更新されている |
| F-18（アプリ層 rate limiting の既定値） | **未是正** | `grep -rln "rateLimit / rate_limit / RateLimit" apps/hub/src packages/*/src` が **0 件**（実測） |
| F-19（P07 の集計値ずれ） | **部分／新たなずれが発生** | tests 495→578、contract 件数、bundle 0.951→0.952、走査 174→197 は訂正済み。**しかし「37 test files」は実測 44 と不一致**（→ G-02） |
| F-20（P09 §3 の G8「未配線」記述が古い） | **未是正** | `quality-assurance-report.md` は**この是正ラウンドで 1 文字も変更されていない**（`git diff 0b2377a..HEAD` で差分 0）。§88「未配線 4 種（G6/G7/G8/G11）と backup.yml は未充足」等の記述が実体より古いまま残存 |
| F-21 / F-22（`only-allow` 依存 / deploy job のみ `pnpm/action-setup`） | **記録のみ（変更なし）** | 前回「否」判定のため追跡のみ |

---

### 13.4 quality_constraints 9 件の再判定

| # | id | 前回 | 今回 | 根拠となる実ファイル・実測値 |
|---|---|---|---|---|
| 1 | `C2-zero-cost` | 条件付き | **充足** | 前回の唯一の欠けだった `env.staging` が消滅（F-04）。`wrangler.jsonc` の追加 binding は R2 のみ（無料枠内）、`open-next.config.ts` は課金要素を有効化しない。新規 workflow は backup（日次・数分）と cwv（**週次**）で、cwv.yml のコメントに「PR ごとの Lighthouse は無料枠 2,000 分/月 を圧迫するため定期計測にした」と C2 を意識した設計理由が明記されている |
| 2 | `C1-solo-ops` | 条件付き | **条件付き** | member 6 のまま。`verify` に `pnpm lint` が入り G2 相当は揃ったが、**`check:drift` と `scan:secrets` を含まず** qa-039【2】が部分未達（F-14） |
| 3 | `worker-bundle-budget` | 充足 | **充足** | 実測 **998,707 bytes = 0.952 MiB / 3.000 MiB**（`measurementMode: wrangler-dry-run`、fileCount 1）。**custom entry（`main: src/worker.ts`）へ変えた後も wrangler dry-run が成立することを自分で実行して確認**。CI 上でも G5 success。注記は F-15 のみ |
| 4 | `pnpm-only-no-npm` | 充足 | **充足** | `node scripts/ci/check-pnpm-only.mjs` exit 0（実測）。CI の静的ゲート job も success |
| 5 | `slo-error-budget` | 未充足 | **未充足（性質が変化）** | 前回の「F-01 により計測を始めても 0% になる」は解消。`/health` は本番構成で 200 を返せる構造になり、runbook に**初回 bootstrap の順序制約**（Worker が無いと `wrangler secret put` できないため deploy→secret の順になり、その間 503。だから初回は手動で、外形監視の有効化は 200 確認の**後**）まで書かれている。**しかし 99.5% を算定する時系列は依然存在しない**（未デプロイ・外形監視未設定）。是正先 phase は無く、ユーザー作業待ち |
| 6 | `cwv-good` | 未充足 | **条件付き** | 計測経路（`cwv.yml`）が実装され fail-closed であることをコード読解で確認。**ただし good かどうかの実測値は 1 件も無い**（計測対象 URL が存在しないため）。「計測経路が無い」から「計測経路はあるが未計測」へ前進したが、good 判定は成立していない。`slo-error-budget` と同じくデプロイ待ち |
| 7 | `wrangler-deploy` | 条件付き | **条件付き** | 環境定義が production 単一へ統一され（F-04/F-05）、R2 binding と cron trigger も台帳どおり（F-08/F-10）。**deploy job は CI 上で skip（実測）**のため実行証跡は無い |
| 8 | `github-actions-ci` | 条件付き | **充足** | 前回の未成立 2 件がいずれも解消: G6 は実走査 187 ファイル、G2 は Biome 実体。**CI run 29795485968 で 3 job・全 step の結果を確認**（静的ゲート success / build & test success / deploy skipped）。残る懸念は G-04（`pnpm --filter` の fail-open が構造として残る）だが、現時点で該当 script は全て実在する |
| 9 | `shared-layers-single-implementation-owner` | 条件付き | **条件付き** | duplicate scan **0 件（登録 12 層 / 走査 197 ファイル）**を実行して確認。contract test が全 12 層へ拡張され、in-app 7 層も identity 比較（`expect(usesPii.boundMaskPii).toBe(maskPii)` 等）まで到達。**5 層が fixture 1 系統のみである事実を、registry・contract test・acceptance-report の 3 箇所が一致して記録している**（水増しなし）。未充足のまま残るのはこの 5 層と F-13。加えて証跡ファイルの過大申告 G-01 |

### 集計（前回比）

| 判定 | 前回 | 今回 | id |
|---|---|---|---|
| 充足 | 2 | **4** | `C2-zero-cost`, `worker-bundle-budget`, `pnpm-only-no-npm`, `github-actions-ci` |
| 条件付き | 5 | **4** | `C1-solo-ops`, `cwv-good`, `wrangler-deploy`, `shared-layers-single-implementation-owner` |
| **未充足** | **2** | **1** | `slo-error-budget` |

---

### 13.5 新規指摘（是正のついでに生じたもの・今回発見したもの）

| ID | 重大度 | 指摘 | 是正先 |
|---|---|---|---|
| **G-01** | **高** | **A4 の必須証跡が実態より良く見える。** `evidence/shared-layer-ownership.json` を全 12 層について読み出したところ、**すべての層が `consumers: ["apps/hub", "apps/hub/tests/fixtures/consumer-a"]`（= 2 系統）** となっており、`app_wiring: pending` フィールドが**出力されていない**。生成元 `scripts/ci/check-shared-layer-duplicates.mjs` の report 生成部が registry の `consumers` を**そのまま複写**し、`app_wiring` を落としているため。registry・contract test・acceptance-report は「5 層は fixture 1 系統のみ」と正直に書いているのに、**P11 が引き継ぐ機械生成証跡だけが A4-1 完全充足と読める**。この証跡を単体で見た読み手は誤った結論に至る。なお `consumers` は宣言値であり実測値ではない点も、フィールド名からは読み取れない | **P05**（report に `app_wiring` を含める。可能なら `declared_consumers` / `measured_consumers` に分ける） |
| **G-02** | 中 | `acceptance-report.md` §3 が「**37** test files / 578 tests」と記載。**実測は 44 test files**（db 3 / estimation 3 / inspection 6 / schemas 6 / ui 12 / hub 14）。CI ログの内訳とも一致。tests 数だけ更新して files 数を更新し忘れている。前回 F-19 と同型のずれの再発 | P07 |
| **G-03** | 中 | 各 package の `lint` script が**依然 `tsc --noEmit`**（6 package すべて）。G2 の実体は root の `biome ci` になったので CI は正しいが、`pnpm -r lint` を叩くと**typecheck に化ける**罠が残っている。F-09 が指摘した「lint という名前の typecheck」が package 層に残存しており、将来 `pnpm -r lint` を required check に足すと同じ穴が再発する | P05（各 package の `lint` を削除するか `biome check <dir>` にする） |
| **G-04** | 中 | **`pnpm --filter <pkg> run <不在 script>` が exit 0 になる故障は構造として残っている。** 実測: `pnpm --filter @harness-hub/inspection run scan:nonexistent` → **exit 0**。F-02 は「`scan:secrets` を実装する」ことで**その 1 箇所を塞いだだけ**で、同型の呼び出しである G7（`check:ddl`）・G8（`check:drift`）は script が消えた瞬間に無検査で緑になる。前回「workflow 全体で点検する」と推奨した点が個別対応で終わっている | P09（`ci.yml` の `pnpm --filter ... run` 呼び出しに script 存在確認を付ける、または方針を明文化する） |
| **G-05** | 低 | `cwv.yml` は **INP を TBT（Total Blocking Time）で代理**している（コード内に「INP の lab 代理指標」と明記あり）。qa-018(2) が要求するのは INP そのもの。Lighthouse の lab 実行では INP を測れないため技術的にはやむを得ないが、**代理指標で quality_constraint を充足と判定してはいけない**点は F-03 で「bundle 予算は代理指標だから good の根拠にならない」と述べたのと同じ論理が当てはまる。実 INP は RUM（実ユーザー計測）でしか取れないため、扱いを明記すべき | P02（ADR §6 に代理指標である旨と限界を追記） |
| **G-06** | 低 | 証跡の run id が不一致。`evidence/ci-run.md` は run **29793052030**、`acceptance-report.md` は run **29795236896** を引用。どちらも success で結論は変わらないが、E4 証跡が最新 run（29795485968）を指していない | P11（証跡更新時に最新 run へ揃える） |
| **G-07** | 低 | `biome.json` の `files.includes` が `scripts/ci/**/*.mjs` のみで、**`apps/hub/scripts/check-bundle.mjs` が lint 対象外**。bundle ゲートの実装本体が G2 の検査を受けていない | P05 |

**退行の検査結果（新規欠陥が入っていないか）**

| 対象 | 結果 |
|---|---|
| 認可（`middleware.ts` / `authz.ts` / `scope.ts`） | **退行なし**。差分は import 順の整形と、`./middleware/authz.js` 直参照 → `./middleware/index.js`（公開入口）経由への変更のみ。判定ロジックは無変更。`HF-QA-TENANT-001` 10 件も pass |
| a11y | **退行なし**。`packages/ui` 27 部品 + `apps/hub` 画面結合とも axe 違反 0 件。空ページ対策の DOM 存在 assert も維持 |
| duplicate detector | **退行なし**。検出 1（owner 外同名 export）・検出 2（deep import / 相対越境）とも論理は無変更。走査 174→197 ファイルへ増加（fixture 追加分）。CI の実効性検証 step も success |
| bundle 計測 | **退行なし**。custom entry 化後も `wrangler-dry-run` で 0.952 MiB を実測。`measurementMode` の assert も維持 |
| `pnpm -r test` / `typecheck` | **退行なし**。578 tests 全 pass / 6 package すべて Done（実測） |

---

### 13.6 A1 が blocked / A4 が条件付き合格という現在の裁定は妥当か

**両方とも妥当。甘くも辛くもない。**

- **A1 = blocked（deploy 未実行）**: `ci.yml` の deploy job は `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` で、feature branch では skip される。私が `gh run view 29795485968` で job 結果を直接確認したところ **`wrangler deploy (Cloudflare Workers) => skipped`**。acceptance-report と `evidence/ci-run.md` はこれを「**skip は success ではない**」として blocked のまま据え置いている。CI が緑になったことを A1 合格に読み替えていない点は正しい。しかも `evidence/ci-run.md` は**失敗 run 29789168757 を「なかったことにしないため」記録**しており、都合の良い run だけを引用していない。
- **A4 = 条件付き合格**: 「fixture は consumer の代替であって consumer 本体ではない」という acceptance-report の判断は、要件文（「消費 feature が同じ実装を参照する」）に忠実。私が独立に `grep` で数えた結線層（authz-middleware / auth-adapter の 2 層）と、テストが固定している `WIRED_IN_APP_LAYERS` が**完全一致**したことから、水増しは無いと判定した。
- 唯一の齟齬は G-01 で、**判定文書は正直だが機械生成証跡が過大申告**という形になっている。裁定そのものではなく証跡の問題。

---

### 13.7 私が実行したコマンドと実測結果（再レビュー分）

いずれも `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203311-wt-2` で 2026-07-21 に実行。

| # | コマンド | 終了コード | 出力（要点） |
|---|---|---|---|
| 1 | `node scripts/ci/check-shared-layer-duplicates.mjs` | **0** | `OK: 登録共通層 12 件 / 走査 197 ファイル / 重複 0 件` |
| 2 | `node scripts/ci/check-pnpm-only.mjs` | **0** | `OK: npm/yarn lockfile の混入なし / packageManager は pnpm に pin 済み` |
| 3 | `pnpm exec biome ci` | **0** | `Checked 147 files in 676ms. No fixes applied.` / `1 warning` / `12 infos`（error 0 件） |
| 4 | `pnpm -r typecheck` | **0** | 6 package すべて Done |
| 5 | `pnpm -r test` | **0** | **44 test files / 578 tests 全 pass**（db 3/17・estimation 3/39・inspection 6/51・schemas 6/86・ui 12/265・hub 14/120） |
| 6 | `pnpm --filter @harness-hub/hub run check:bundle` | **0** | `計測方式: wrangler-dry-run` / `gzip 後合計: 0.952 MiB (998,707 bytes)` / `予算: 3.000 MiB` / 対象 1 file |
| 7 | `pnpm --filter @harness-hub/inspection run scan:secrets` | **0** | `[secret-scan] files=187 findings=0 verdict=pass`（**F-02 の是正確認の一次根拠**） |
| 8 | `pnpm --filter @harness-hub/inspection run scan:nonexistent` | **0** | 何も実行せず成功扱い（**G-04 の一次根拠**。fail-open の“型”が残存） |
| 9 | `gh run list --branch feat/wt-2 --limit 5` | — | 29795485968 **success** / 29795236896 **success** / 29793052030 **success** / 29789168757 **failure** |
| 10 | `gh run view 29795485968 --json jobs` | — | 静的ゲート **success** / build & test **success**（全 15 step success）/ wrangler deploy **skipped**（**A1 判定の一次根拠**） |
| 11 | `gh run view 29795485968 --log` の skip 抽出 | — | `bundle-budget.test.ts (5 tests / 1 skipped)` / `Tests 119 passed / 1 skipped (120)`（**F-15 未是正の一次根拠**） |
| 12 | `grep -rn "biome-ignore" apps packages scripts` | — | ソース 3 件のみ。全件の理由を精査（§13.2 の表） |
| 13 | `grep -rn "shared/" apps/hub/src`（owner 自身を除外） | — | `middleware.ts` と `middleware/authz.ts` の 2 件のみ = 結線層は auth と authz-middleware（**F-06 の独立検証**） |
| 14 | rate limit 実装の全文検索（`apps/hub/src` / `packages/*/src`） | — | **0 件**（F-18 未是正の一次根拠） |
| 15 | `git diff --stat 0b2377a..HEAD` | — | 124 files changed / +2,785 / −1,203。うち `quality-assurance-report.md` は **差分 0**（F-20 未是正の一次根拠） |
| 16 | `evidence/shared-layer-ownership.json` の全層読み出し | — | 全 12 層が `consumers` 2 件・`app_wiring` フィールド無し（**G-01 の一次根拠**） |

---

### 13.8 再レビューの限界（何を見ていないか）

前回の L-1〜L-9 のうち **L-1 は解消**（CI run が実在し job/step 単位で確認した）。以下は依然として未検証であり、「ここに書かれていない問題が無い」ことは意味しない。

| # | 未検証事項 | 理由 |
|---|---|---|
| L-1'（更新） | **CI の deploy job の実行** | main 限定で skip。`environment: production` の承認ルール有無、`CLOUDFLARE_API_TOKEN` の権限範囲、`wrangler rollback` の実効性は未確認 |
| L-2 | **実デプロイと外形監視** | 未実施。F-01 の是正が「本番で 200 を返す」ことは、実 HTTP ではなく実装 + 台帳の照合による論証。特に **Workers 上で `getCloudflareContext()` が secret を返す経路**（`runtime-env.ts` の動的 import）は実行環境でしか確認できない |
| L-3 | **`@opennextjs/cloudflare` と custom entry の同居** | `main: src/worker.ts` が `.open-next/worker.js` を import し Durable Object を再 export する構成は、**wrangler dry-run が通ること・CI で `build:worker` が success すること**までは実測したが、**実行時に scheduled handler が実際に発火するか**は未確認。公式ドキュメントでの一次確認も行っていない（前回 L-3 が未解消のまま） |
| L-4 | **CWV の実測** | 計測対象 URL が無いため `cwv.yml` を実行していない。判定したのは「fail-closed に書かれている」ことのみ。Lighthouse の npx 取得が CI 環境で成功するかも未確認 |
| L-5 | **backup.yml の実行** | secret 未設定のため未実行。判定したのは「失敗時に静かに成功しない構造になっている」ことのみ。`turso db shell ".dump"` の実挙動、`aws` CLI が runner に存在するかは未確認 |
| L-6 | **cron の実発火と冪等性** | `createInMemoryCronRunLedger` は **isolate をまたぐ重複を防げない**とコード自身が明記。実 Workers での二重起動耐性は未検証 |
| L-7〜L-9 | 前回と同じ（他 feature 相互整合 / `packages/ui` の実利用品質 / 上流 system-spec の全数点検 / P11〜P13） | 変化なし |

**手法上の限界**: 単一レビュアによる静的読解 + ローカル実行 + CI ログ参照。前回 22 件・今回 7 件の新規指摘は「本気で探した結果見つかったもの」だが、見落としが 0 件であることは保証しない。特に**実行環境（Cloudflare Workers ランタイム）でしか現れない欠陥は、原理的にこのレビューでは検出できない**。

---

### 13.9 承認後の推奨手順

1. **§13.1 の条件 3 件（G-01 / F-11 / G-02）を先に潰す。** いずれも小さく、P11 の evidence 収集より前に終わる。特に **G-01 は「証跡が実態より良く見える」という、このレビューが一貫して最も警戒してきた類型**なので優先する。
2. F-12 / F-13 / F-14 / F-20 を P11 前後で整理する。F-20（`quality-assurance-report.md` が古いまま）は、**是正ラウンドで唯一まったく更新されなかった判定文書**であり、読み手が古い情報を掴む。
3. **デプロイ後に P10 を再々実行**し、`slo-error-budget`（初回の月次確定まで）と `cwv-good`（初回 Lighthouse 実測）を確定する。A1 は main merge 後の run で test → deploy が success したことを `evidence/ci-run.md` へ追記して解除する。
4. G-04（`pnpm --filter` の fail-open）は、今は該当 script が全て実在するため顕在化していないが、**script 名の変更 1 回で無検査に戻る**。P09 で workflow 全体を点検しておくと将来の同型再発を防げる。
5. F-15 は `build:worker` を `pnpm -r test` の前へ移すだけで解消する。CI 上で `HF-A2-BUNDLE-001` が test ID 単位の証跡として再現するようになる。
