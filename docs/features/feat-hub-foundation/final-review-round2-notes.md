---
status: confirmed
layer: feature-design
task: SYS-HUB-FOUNDATION-P10
parent_feature: feat-hub-foundation
feature_package_id: feature-package/feat-hub-foundation
feature_context_digest: sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d
package_digest: sha256:8735bb1680e29f961a3e76fc33b07944368946f486875f20e2ce77007c81b502
depends_on: [SYS-HUB-FOUNDATION-P09]
review_round: 2
verdict: 条件付き承認
round1_notes: docs/features/feat-hub-foundation/final-review-notes.md
measured_at: "2026-07-21"
architecture_refs: [arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow]
---

# feat-hub-foundation 最終独立レビュー記録 — Round 2 (P10)

> **位置づけ**: [Round 1 (差し戻し)](./final-review-notes.md) の指摘 F-01〜F-22 に対する是正を独立再検証した記録と、その後の実装フォローアップ。Round 1 と分離しているのは、レビューが「いつ・どの版を見たか」で完結する単位だから。判定の履歴は Round 1 側の frontmatter `verdict_history` が正本。

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

---

## 14. Round 2 指摘の実装フォローアップ（2026-07-21）

> §13 は当時の独立レビュー記録として保持する。本節は、その後の是正を実装者が再実行した結果であり、新しい GitHub Actions run や月次 SLO の代替ではない。最新のローカル一次証跡は `evidence/local-verify-2026-07-21.md`。

### 14.1 解消した指摘

| 指摘 | 是正 | 実測 |
|---|---|---|
| G-01 | ownership evidence に `app_wiring` / effective consumers / A4 status を出力 | 未結線 5 層が `unmet-fixture-only` |
| F-11 | `/health` 契約を `dependencies[]` 形へ統一 | production HTTP 200、全依存 ok |
| G-02 / F-19 | test 集計を最新値へ同期 | 46 files / 592 tests |
| F-12 | E1 path を実体 `.json` へ修正 | exact lookup 成立 |
| F-13 | shared-layers §3 の CI / deploy / monitoring / backup を登録簿へ追加 | 4 機構、owner artifact 欠落 0 |
| F-14 | root `verify` に build、secret scan、schema drift、bundle を追加 | `pnpm verify` exit 0 |
| F-15 | `build:worker` を G4 test より前へ移動 | bundle test 5 件すべて実行、skip 0 |
| F-17 | 非公開 route の `withAuthz()` 未経由を G10 で検出 | 違反 fixture は非ゼロ、wrapped fixture は pass |
| F-20 | P09 のゲート・backup・health・件数を最新状態へ同期 | quality-assurance-report §7 |
| G-03 | 全 package の `lint` を Biome へ変更 | `pnpm -r lint` exit 0 |
| G-04 | required script の事前存在検査を G6/G7/G8 と root verify に追加 | 欠落・空文字・壊れた JSON は非ゼロ |
| G-07 | bundle gate script を Biome 対象へ追加 | Biome 152 files、diagnostic 0 |

### 14.2 現在の quality_constraints

| id | 判定 | 根拠 / 未充足理由 |
|---|---|---|
| C2-zero-cost | **充足** | 追加の有料サービスなし |
| C1-solo-ops | **充足（ローカル）** | `pnpm verify` 1 コマンドに適用ゲートを集約 |
| worker-bundle-budget | **充足** | 998,715 / 3,145,728 bytes |
| pnpm-only-no-npm | **充足** | 混入 0、pin 検査 pass |
| slo-error-budget | **未充足** | Better Stack の 1 か月時系列なし |
| cwv-good | **未充足** | workflow はあるが production 実測 run なし |
| wrangler-deploy | **条件付き** | 手動 production deploy は稼働中。CI deploy は未完走、cron trigger 未登録 |
| github-actions-ci | **条件付き** | 既存 feature-branch run は success。今回の未コミット変更後の CI run は存在しない |
| shared-layers-single-implementation-owner | **条件付き** | 重複・境界違反 0、owner artifact 欠落 0。ただし 5 層は実 consumer 未結線 |

### 14.3 継続する blocker

1. A1: GitHub production 設定を確認し、main push の単一 CI run で test → deploy を成功させる。現在の `gh` token は失効しており、設定の読み取りも HTTP 401。
2. A3: Better Stack の 3 分間隔監視を開始し、1 か月の時系列で SLO 99.5% を裁定する。
3. P13: Cloudflare アカウント全体の cron quota / token scope を確認し、cron trigger を登録して実発火を検証する。
4. A4: audit / aijob / notification / pii / telemetry の実 consumer が生まれた時点で `app_wiring: pending` を解除する。

### 14.4 acceptance 外も含む残存レビュー項目

| 項目 | 状態 | 理由 / 引継ぎ先 |
|---|---|---|
| F-18 application rate limit | **未実装** | 正本値は security-spec §7.2 に確定済みだが、Cloudflare Rate Limiting binding と middleware 前段の adapter は未配線。production binding 追加を伴うため、feat-auth-tenancy の route 実装と合わせて行う |
| W-2 phantom dependency | **未解消** | hoisted linker の変更は lockfile と全 workspace の依存解決へ波及するため、基盤 acceptance とは分離して追跡する |
| G-05 実 INP | **未取得** | Lighthouse の TBT は lab 代理値。実 INP は RUM が必要 |
| G-06 最新 CI evidence | **未取得** | 今回は commit/push 禁止のため、新しい GitHub Actions run が存在しない |

**現在判定は条件付き承認を維持する。** 今回対象とした CI/evidence のローカル是正は完了したが、外部設定・時間経過・後続 route/consumer を必要とする項目は pass に読み替えない。
