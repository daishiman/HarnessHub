---
status: in_progress
layer: feature-release
task: SYS-HEARING-INTAKE-P13
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
source_digest: sha256:61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5
production_deployed_at: "2026-07-29T00:57:54Z"
---

# feat-hearing-intake 本番リリース・検証記録 (P13)

> **状態**: S10-S12 と AI キュー API は **2026-07-29 00:57:54 UTC に CI 経由で本番反映済み**。migration
> `0002_hearing-intake-ai-queue` の適用、本番 Worker への 9 ルート同梱、`/health` 200、本番 DB のテーブル実在を
> 実測で確認した。一方、runbook が要求する**実データ E2E smoke（提出 → pull → complete → S12 表示）と
> SEC8 の本番実挙動確認は未実施**である。P13 の完了判定は §7 を参照。

本書に記載する値はすべて GitHub Actions の実行ログから回収した実測値であり、「そう起動したはず」という
申告値は含まない。回収元 run は §1 と §5 に run id で示す。

## 1. 本番反映の確定値（CI 経由）

反映経路は **main への push で起動する CI の `deploy` job** であり、手元からの `wrangler deploy` ではない
(`.github/workflows/ci.yml` job `wrangler deploy (Cloudflare Workers)`、`if: github.ref == 'refs/heads/main'`)。

| 項目 | 値 |
|---|---|
| Worker 名 | `harness-hub` |
| 公開 URL | https://harness-hub.daishimanju.workers.dev |
| **本番反映日時** | **2026-07-29 00:57:54 UTC** |
| 実行者 | GitHub Actions `hub-ci` / job `wrangler deploy (Cloudflare Workers)` |
| workflow run | [30412438605](https://github.com/daishiman/HarnessHub/actions/runs/30412438605)（branch `main` / sha `4638b97cba57d1d1c837afb1de7ba9588f35eec4` / PR [#596](https://github.com/daishiman/HarnessHub/pull/596) の merge commit） |
| Worker version | **`4e3f6281-e14b-4ce4-84ec-2af9980a79ef`** |
| bundle | Total Upload 6117.84 KiB / **gzip 1251.02 KiB**（予算 3 MiB 以内） |
| cron トリガー | `0 15 * * *` / `0 0 * * 1` の 2 本を再登録（本 feature は cron を追加しない） |
| 失敗時ロールバック step | **skipped** = post-deploy 検証がすべて success で復旧が起動していない |

この run は 3 job（静的ゲート / build & test / wrangler deploy）すべて success である。`deploy` は
`needs: [static-gates, test]` のため、両ゲートを通らなければ起動しない。

## 2. 本番 migration の適用（qa-038【5】）

CI は **migration → deploy の順序を固定**している。新コードが先に出ると未作成の表を参照して落ちるためである。

```
00:57:01  {"ok":true,"dryRun":true, "journal":3,"applied":2,"pending":1}
00:57:03  {"ok":true,"dryRun":false,"journal":3,"appliedBefore":2,"appliedAfter":3,
           "tags":["0000_baseline-core-domain","0001_auth-tenancy-device-flow-contract",
                   "0002_hearing-intake-ai-queue"]}
```

dry-run 時点の `pending: 1` が本 feature の `0002_hearing-intake-ai-queue` であり、適用後に
`appliedAfter: 3` と `tags` への出現で本番台帳へ載ったことが確定している。runbook の
「本番 migration を先に dry-run し、新規 4 テーブルが適用対象であることを確認する」はこの 2 行で充足する。

`0002` が作成する 4 テーブル（`packages/db/migrations/0002_hearing-intake-ai-queue.sql`）:

| テーブル | 用途 |
|---|---|
| `hearing_sheets` | S10 で受け付けたヒアリングシート本体 |
| `display_code_counters` | 受付番号 `HS-xxxx` の tenant 別連番 |
| `ai_jobs` | AI 生成キュー（`kind = 'sheet_generation'`）。汎用テーブル |
| `tenant_coefficients` | サーバ側試算の tenant 別係数（SEC5: 年収は保存しない） |

## 3. 本番 Worker に S10-S12 が含まれることの実測

最新の本番ビルド（§5 の run 30684710098、現在配信中の version `4d9840b2`）の route 一覧に、
本 feature の 9 ルートがすべて出力されている。

| ルート | 対応画面 / API | route 固有サイズ |
|---|---|---|
| `/sheets/new` | **S10** ヒアリング受付ウィザード（4 ステップ） | 4.62 kB |
| `/sheets` | **S11** シート一覧（検索・絞り込み・cursor ページング） | 4.25 kB |
| `/sheets/[id]` | **S12** sanitize 済み Markdown 詳細・管理者操作 | 4.29 kB |
| `/api/v1/sheets` | 提出（受付番号採番 + enqueue の単一 transaction） | 179 B |
| `/api/v1/sheets/[id]` | 詳細取得 / status 変更 | 179 B |
| `/api/v1/sheets/[id]/regenerate` | 再生成（workspace-admin 以上） | 179 B |
| `/api/v1/ai-jobs/pull` | worker による job claim（SEC8） | 179 B |
| `/api/v1/ai-jobs/[id]/complete` | 生成結果の書き戻し | 179 B |
| `/api/v1/ai-jobs/[id]/fail` | 失敗記録 | 179 B |

`ƒ` 記法のとおり 9 ルートすべて動的（Server 実行）である。表の値は Next.js build 出力の route 固有分であり、
**client JS 予算（qa-018）の判定には用いない**。予算判定は計測方式を揃えた `check:client-bundle` の実測に
一本化する（§6）。Next.js の表示は丸めが粗く 3 画面が同値に見えるため、両者の数値は一致しない。

## 4. デプロイ後検証（CI の deploy job 内で実行）

### 4.1 `/health` 疎通

```
health: 200
{"status":"ok","version":"4e3f6281-e14b-4ce4-84ec-2af9980a79ef","checkedAt":"2026-07-29T00:57:55.629Z",
 "dependencies":[{"name":"runtime-config","status":"ok","latencyMs":0},
                 {"name":"db","status":"ok","latencyMs":497},
                 {"name":"r2","status":"ok","latencyMs":450}]}
```

応答の `version` が同 run でアップロードした `4e3f6281-…` と一致しており、**この確認時点で新版がエッジに
出ている**ことまで確定できる（feat-hub-foundation の P13 では 1 つ前の版を返した事例があり、一致は自明ではない）。

### 4.2 本番スモークテスト 6 項目（`packages/db/scripts/smoke-production.ts`）

`ok: true` で完走。本 feature に関係する実測は次のとおり。

| 検査 | 実測 | 本 feature との関係 |
|---|---|---|
| S1 DB 接続 / スキーマ実在 | `domainTables: 23` / `requiredBaselineTables: 18` / `missingBaselineTables: []` / `migrationLedger: true` | `sqlite_master` を実クエリした値。feat-hub-foundation P13 時点の 19 テーブルに `0002` の 4 テーブルが加わった数と一致する |
| tenant 分離 | `allTenantsOk: true` | 新規 4 テーブルを含む本番 DB で分離が保たれている |
| audit hash chain | `chainOk: true` / `restoreOk: true` | 監査ログ連鎖が新スキーマ追加後も継続している |
| releases immutable | `dedupeOk: true` / `invariantOk: true` | 既存不変条件の非回帰 |

**この 6 項目は共有 Hub 基盤（feat-hub-foundation P13）の受入条件であり、hearing-intake の機能 smoke ではない。**
本 feature の機能が本番で意図どおり動くことは、この 6 項目では測っていない。機能 smoke の状況は §7 に分離して記載する。

## 5. ロールアウト継続の確認（2026-08-01 時点）

反映から 3 日後の最新 main run [30684710098](https://github.com/daishiman/HarnessHub/actions/runs/30684710098)
（sha `21339342`、2026-08-01 04:56 UTC）で、本 feature の本番状態が維持されていることを実測した。

| 観測項目 | 2026-07-29（反映時） | 2026-08-01（現在） | 判定 |
|---|---|---|---|
| migration 台帳 | `appliedAfter: 3` | `journal: 3` / `applied: 3` / **`pending: 0`** | 巻き戻り・未適用なし |
| `0002` の在籍 | tags に出現 | tags に出現 | 維持 |
| `domainTables` | 23 | **23** | テーブル欠落なし |
| `/health` | 200（db 497ms / r2 450ms） | **200**（db 614ms / r2 648ms） | 継続稼働 |
| Worker version | `4e3f6281-…` | `4d9840b2-a4e6-4fd9-a412-fc0d186e7d72` | 後続 PR で前進（ロールバック痕跡なし） |
| S10-S12 の 9 ルート | — | §3 のとおり同梱 | 配信継続 |

version が前進しているのは 2026-07-29 以降に他 feature の PR が main へ merge されたためであり、
`wrangler rollback` による巻き戻しではない（rollback step は当該 run でも起動していない）。

## 6. リリース前ゲートの再実行（2026-08-01・ローカル）

main を本ブランチへ取り込んだ状態で再実行した。

`pnpm verify` は最終ゲートの `check:client-bundle` まで `&&` チェーンを完走した。

| ゲート | 実測 |
|---|---|
| `validate-system-plan.py --feature-package feature-package/feat-hearing-intake` | **pass** / `violations: []` / `validated_digest` が task 仕様の `dev_graph_source_digest`（`sha256:61fac79f…`）と一致 |
| Biome lint | **423 ファイル検査 / エラー 0**（info 1 件は `biome.json` の `$schema` が 2.5.4、CLI が 2.5.5 という表記差のみ） |
| typecheck（6 パッケージ） | pass |
| build / build:worker | pass |
| test（全パッケージ） | **128 files / 1619 tests 全 pass**（hub 845 / ui 266 / db 231 / inspection 151 / schemas 86 / estimation 40） |
| test（本 feature 名指し） | **8 files / 101 tests 全 pass**（`apps/hub/tests/hearing-intake`） |
| tenant 分離 / secret scan / OpenAPI・zod drift | pass |
| Worker bundle 予算 | **gzip 1.225 MiB** / 3.000 MiB（wrangler dry-run 計測） |
| client bundle 予算（本 feature の 3 画面） | `/sheets/new` **116.2 KiB** / `/sheets/[id]` **115.9 KiB** / `/sheets` **111.7 KiB**（予算 120.0 KiB） |

client bundle は 3 画面とも予算内だが、`/sheets/new` は残り 3.8 KiB（約 3%）である。S10 に client component を
追加する変更では、この余裕が先に尽きる点を留意する。

> **ローカル実行時の注意**: 既定の `node` が x64（Rosetta）で解決されるため、`@biomejs/cli-darwin-x64` /
> `@libsql/darwin-x64` / `@next/swc-darwin-x64` が見つからず lint・build が落ちる。これは環境要因であり
> コードの欠陥ではない。arm64 の Node（`/opt/homebrew/bin/node`、同一 v22.21.1）を PATH 先頭に置いて
> 実行すること。CI は ubuntu-latest のため影響を受けない。

### 6.1 CI 側のゲート実績（同一コードに対する正本）

本番へ出た sha `4638b97c` に対する run 30412438605 の `build & test` job は、G2 lint / G3 typecheck /
build / G4 unit・integration・contract test / G4 tenant 分離 / G6 secret scan / G7 破壊的 DDL 検査 /
G7b テナント分離網羅 / G8 OpenAPI・zod drift / G9 axe a11y / G5 bundle 予算 / G13 client JS 予算 の
**全ゲート success** である。ローカル再実行はこの正本を補強するものであり、置き換えるものではない。

## 7. 未実施項目と P13 の完了判定

### 7.1 未実施項目

| # | 項目 | 要求元 | 状態 |
|---|---|---|---|
| 1 | 実データ E2E smoke（テスト tenant で提出 → `HS-xxxx` 発番 → pull → complete → S12 表示） | runbook.md「リリース前後の確認」、task spec Workstream/Quality | **未実施** |
| 2 | SEC8 の本番実挙動確認（他 tenant の job が pull で見えない / 別 claim token で complete できない） | task spec Workstream/Security | **未実施** |
| 3 | 反映後 15 分の 5xx・queue 滞留・認可拒否率の観測 | runbook.md「AI キュー滞留監視 (qa-027)」 | **未実施** |

**この commit 時点で未実施の理由**: 3 項目とも本番エンドポイントへのアクセスまたは本番 tenant への
実データ書き込みを伴うため、先に本変更を main へ反映し、CI の本番反映を再実行する必要がある。今回の
最終レビューでは commit・push・PR・main merge が承認されている。main 反映と CI 完走後に §7.2 の順で
検査し、同じ P13 の追補として実測値を記録する。したがって、これは失敗ではなく順序制約による一時的な未実施である。

### 7.2 実施手順と判定基準（引き継ぎ用）

項目 1（実データ E2E smoke）:

1. テスト tenant / workspace を用意し、member ロールで `/sheets/new` の 4 ステップ 12 項目を送信する。
2. 応答に `HS-xxxx` 形式の受付番号が含まれ、一覧の状態が `generating` であることを確認する。
   年収は試算にのみ使われ `hearing_sheets` に保存されていないこと（SEC5）を DB 側でも確認する。
3. `aijob:process` scope を持つ Device Flow token で `POST /api/v1/ai-jobs/pull` を呼び、job を claim する。
   `x-harness-workspace-id` ヘッダーが必須である（未指定は 400）。
4. 同じ claim token で `POST /api/v1/ai-jobs/[id]/complete` へ Markdown を書き戻す。
5. `/sheets/[id]`（S12）で sanitize 済み Markdown が表示され、sheet の状態が `review` になることを確認する。
6. 検査後、作成したテスト tenant のデータを削除する。

判定基準: 1〜5 がすべて期待どおりなら pass。3 で 204 が返り続ける場合は job が enqueue されていないため fail。

項目 2（SEC8）: 別 tenant の token で `pull` を呼んで対象 job が返らないこと、および項目 1 の job に対して
別 claim token で `complete` を呼んで拒否されることを確認する。いずれかが通ってしまう場合は
**セキュリティ事象として新規受付を停止**する（runbook「AI キュー滞留監視」§アラート対応 6）。

項目 3（観測）: runbook の SQL で tenant 別の `queued` 最古 `created_at` を確認する。
warning は 15 分超、critical は 60 分超 / lease 期限超過の `processing` 反復 / `dead` 増加。

### 7.3 完了判定

**判定: P13 は未完了とする。**

| task spec の要求 | 充足 |
|---|---|
| §Rollout「本番反映」 | **達成**（§1・§2・§3・§5 が実測） |
| §Verification「本番反映日時が記載されている」 | **達成**（§1） |
| §Verification「ロールアウト確認結果が記載されている」 | **達成**（§5） |
| §Verification「smoke test 結果が記載されている」 | **部分**（基盤 6 項目は §4.2 で pass。機能 smoke は §7.1-1 が未実施） |
| §Workstream/Security「本番で SEC8 が機能していることの最終確認」 | **未達**（§7.1-2） |
| §Workstream/Quality「ロールアウト後の smoke test 結果を release-notes へ記録」 | **未達**（§7.1-1） |

feat-hub-foundation P13 では未達項目（SLO 30 日観測）を別 issue へ切り出して完了と判定したが、
本 task の未達 2 項目は**時間ゲートではなく一度実行すれば済む検査**であり、切り出す正当性が無い。
本番反映という主目的は達成しているものの、機能が本番で意図どおり動くことを一度も測っていない状態で
P13 を完了と申告すると、「デプロイした」と「動くことを確認した」を同一視することになる。したがって
§7.1 の 1・2 を実施し、その結果を §4 相当の実測として本書へ追記した時点で P13 を完了とする。

項目 3 は継続観測であり、1・2 の完了を妨げない。

## 8. ロールバック

Worker の巻き戻しは CI の「失敗時ロールバック」step が担う。手動で行う場合は次のとおり。

```bash
pnpm --filter @harness-hub/hub exec wrangler rollback --message "<理由>" -y
```

**DB は自動でも手動でも巻き戻さない。** `0002` は `CREATE TABLE` のみの expand-only であり、旧 Worker は
新規 4 テーブルを参照しないため、DB を前進させたままでも本番は整合する。巻き戻しは実データの喪失を伴う。

新規受付を止める必要が生じた場合は、runbook「アラート対応」に従い原因を記録したうえで直前の Worker
version へ戻し、未完了 job は削除せず lease 再取得または管理者による再生成で回復させる。
