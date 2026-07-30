---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P13
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy P13 リリース記録

- graph_node_id: `sys-auth-tenancy-p13`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`
- **本番デプロイの実施状況: 実施済み（本番スモークR1〜R5完了）**

---

## 0. 結論を先に書く

**HarnessHub 1テナントのGoogle OIDC暗号化DB登録と本番Worker配信は実施済みである。**
Google実ログイン、role認可、Device Flow、session緊急失効を含むR1〜R5が合格した。
§6.1〜§6.4の「未投入」「未実施」は各時点の履歴であり、現状判定には使わない。
現状は§6.5〜§7と[P13仕様反映受領書](./p13-spec-reflection-receipt.md)を正とする。

task spec の Trace rule が定めるとおり、**P13 は文書や計画で実装・証跡の欠落を代替できない。**
以下、実施したこと・実施していないことを分けて記録する。

---

## 1. 本番作業の現状

| # | 作業 | 状態 | 理由 |
| --- | --- | --- | --- |
| R1 | 本番 `idp_connections` へのGoogle OIDC provider設定登録 | ✅ 完了 | HarnessHub 1件をrepository経由で登録し、暗号化往復と再実行を確認 |
| R2 | `apps/hub` の本番Cloudflare Workers環境へのデプロイ | ✅ 完了 | version `2d3841d2...`をpreview検証後に100%配信 |
| R3 | dev専用provider非存在 | ✅ 完了 | 本番登録はHarnessHub 1件だけ。未登録slugは404 |
| R4 | 本番スモークテスト | ✅ 完了 | login/JIT・role 4種・Device Flow・session失効・dev provider非存在が合格 |
| R5 | acceptance 3項目の**本番環境での**再確認 | ✅ 完了 | 分離12件・本番Device Flow・adapter境界130ファイルが合格 |

### 1.1 構造的前提の更新: Auth.js 結線は 2026-07-26 に完了

初回 release 判定時は Auth.js が未導入で route は 501 を返していた。
`HarnessHub-b7ng` で `@auth/core`・session claims bridge・テナント別 route・本番 DB ports は結線済み。
その後R1・R2とログインまで実施した。以下では「コード上のcomposition完了」と
「本番環境で実測済みの項目」を区別して記録する。

---

## 2. 実施した作業 (ローカル core と検証として完了しているもの)

| # | 項目 | 結果 |
| --- | --- | --- |
| A1 | 認証・認可 core (`lib/auth` / `lib/authz` / middleware / Device Flow API 6 経路) | ✅ 完了 (2026-07-26 に本番 composition root も結線) |
| A2 | テスト実行 (test-design.md の全 75 テスト ID) | ✅ 全件 pass / fail 0 件 (P06) |
| A3 | acceptance 3 項目の判定 | ✅ **3 件すべて pass** (2026-07-28 確定。AC-3 の条件は `HarnessHub-b7ng` / `HarnessHub-1f28` closed で解消) |
| A4 | 品質ゲート 6 件の実行 | ✅ 全件 pass。かつ **6 件すべて CI で fail-closed に結線済み** (P09 §4) |
| A5 | quality_constraints 7 件の充足判定 | ✅ **7 件すべて充足**。本番実ログイン確認は免除せず、P13 の独立した完了条件として維持 |
| A6 | 証跡の集約 | ✅ 完了 (P11) |
| A7 | 運用手順の確定 (5 手順) | ✅ 完了 (P12) |
| A8 | Dev tenant / 新規テナントの OIDC 登録手順の文書化 | ✅ 完了 (P08 §3 / P12 §3-4) |

---

## 3. デプロイ手順 (実施時に踏むべき順序)

R1〜R5 を実施できる条件が揃った時点で、次の順序で行う。
**この節は計画であり、実施記録ではない。**
各値の生成・Cloudflare入力・本番DB登録は
[production-auth-manual-setup.md](./production-auth-manual-setup.md)を正本手順として使う。

### Step 1: 前提条件の確認

- [x] `feat-domain-model-db` の P13 が完了し、control-plane DB が確立している (bd `HarnessHub-u6q.13` closed)
- [x] Auth.js が導入され、`adapter/authjs-handler.ts` が実結線されている (`@auth/core` 0.41.3 / `HarnessHub-b7ng` closed)
- [x] 本番 Cloudflare Workers 環境の資格情報が利用可能である
- [ ] 本 feature の変更が commit / merge されている

### Step 2: 本番テナントの OIDC provider 登録 (R1)

P12 runbook-oidc-provider-onboarding.md §1 の手順に従う。テナントごとに繰り返す。
`client_secret` は `idp_connections.client_secret_enc` へ envelope encryption
(暗号鍵で包んで保存する方式) で格納し、リポジトリやログへ平文で置かない。
復号に使う KEK (鍵を暗号化するための鍵) は Workers Secret `ENCRYPTION_KEK` で管理する。

### Step 3: `apps/hub` のデプロイ (R2)

```bash
pnpm verify        # 全ゲート (pnpm / duplicates / auth / lint / typecheck / build / build:worker / test / tenant-isolation / secrets / drift / bundle)
# 2026-07-25 以降、auth 3 ゲートと tenant 分離の名指しゲートは verify に含まれる (§5 参照)。
# 個別に確かめたいときのみ: pnpm check:auth / pnpm check:tenant-isolation
# デプロイは既存の Cloudflare Workers (OpenNext) 手順に従う
```

### Step 4: dev専用providerの非存在確認 (R3)

本番登録はHarnessHub 1件だけとし、未登録slugが404であることと静的検査を確認する。

### Step 5: スモークテスト (R4)

| # | 項目 | 期待 |
| --- | --- | --- |
| S1 | HarnessHubでGoogleログイン | 成功し、初回利用者がactive/memberでJIT作成される |
| S2 | role 4 種の認可判定サンプル | backend-spec §3.3 のマトリクスどおり |
| S3 | Device Flow E2E | code 発行 → approve → token 交換 → API 呼び出し成功 → 失効 |
| S4 | session 緊急失効 | `session_revocations` へ記録後、60 秒以内に 401 |
| S5 | dev 専用 provider 非存在の本番ビルド確認 | `node apps/hub/scripts/check-dev-auth-provider-absence.mjs` が exit 0 |

### Step 6: acceptance 3 項目の本番再確認 (R5)

| 項目 | 本番での確認方法 |
| --- | --- |
| AC-1 テナント越境 0 件 | 単一tenant本番方針のため、S1と`tenant-isolation.test.ts` 12件で分離を確認 |
| AC-2 Device Flow E2E | S3 |
| AC-3 Auth.js adapter 境界隔離 | `node apps/hub/scripts/check-auth-adapter-boundary.mjs` が exit 0 (デプロイ対象コミット上で) |

---

## 4. ロールバック手順 (実施時の備え)

1. **Cloudflare Workers を直前のデプロイへ戻す。** 本 feature は DB スキーマを変更しないため、
   Workers を戻すだけで状態は整合する (migration の巻き戻しは不要)。
2. `idp_connections` へ追加した行は `enabled = false` にする (削除しない。監査追跡のため)。
3. ロールバック後、S1〜S5 を再実行して以前の状態が回復していることを確認する。

**注意**: session 緊急失効 (`session_revocations` への書き込み) は**ロールバックしない**。
失効は「取り消してはいけない操作」であり、戻すと失効させたはずの session が復活する。

---

## 5. リリース判定に影響する既知の未達事項

P10 / P11 から引き継いだもの。**リリース前に解消することが望ましいが、本 feature の write scope 外である。**

| 項目 | 影響 | 引き継ぎ |
| --- | --- | --- |
| ~~`check-auth-gates.mjs` が CI へ未結線~~ | ✅ **解消 (2026-07-25)** | bd `HarnessHub-1f28` closed。`ci.yml` G12 + root `pnpm check:auth` |
| ~~分離テストが CI 必須ゲートとして名指しされていない~~ | ✅ **解消 (2026-07-25)** | bd `HarnessHub-1f28` closed。`scripts/ci/check-tenant-isolation-gate.mjs` + `test:tenant-isolation` |
| ~~`validate-system-plan.py` が `status=fail` (27 件)~~ | ✅ **解消**。2026-07-28 再実行で `status=pass` / violations **0 件** | bd `HarnessHub-mvdc` closed |
| ~~Auth.js 未導入 / 本番 AuthPorts adapter 未結線~~ | ✅ **解消 (2026-07-26)**。`@auth/core`・route・session bridge・DB ports を結線 | bd `HarnessHub-b7ng` / 仕様反映受領書 |
| `test-design.md` の `T-SESS-05` 文言が実装と不一致 | 文書の齟齬のみ (実装は安全側で正しい) | P04 改訂時 |
| ~~実装が確定仕様を 2 点超えている (session claims の `workspace_ids` / polling 上限 60 秒・減衰)~~ | 解消済み。R4-reopen とユーザー確認 `appr-010` を経て `qa-072` / `qa-073` として仕様へ反映 | bd `HarnessHub-l2g9` (closed) |

---

## 6. 2026-07-28 本番 read-only 事前確認

本番状態を変更せず、デプロイ可否の前提だけを確認した。

| 確認 | 実測結果 | 判定 |
| --- | --- | --- |
| `GET /health` | HTTP 200。既存 runtime / DB / R2 は `ok` | ✅ 既存リリースは稼働 |
| `GET /api/auth/nonexistent/session` | HTTP 500、応答本文なし | ❌ 現行本番の auth route は利用不能 |
| `wrangler secret list` | `AUTH_SECRET` / `CRON_HEARTBEAT_URL` / `TURSO_AUTH_TOKEN` / `TURSO_DATABASE_URL` のみ | ❌ 新 runtime の必須 Secret が不足 |
| `wrangler.jsonc` の vars | `HUB_ENV` / `ENVIRONMENT` のみ | ❌ 新 runtime の必須 auth vars が不足 |

新 runtime が要求する未投入項目:

- Secret: `AUTH_SESSION_SECRET` / `AUTH_ACCESS_TOKEN_SECRET` / `ENCRYPTION_KEK`
- Variable: `AUTH_ALLOWED_ORIGINS` / `AUTH_DEVICE_VERIFICATION_URI` / `AUTH_CANONICAL_ORIGIN`
- Data/credential: 2 テナント分の OIDC issuer / client ID / client secret と、本番 `idp_connections` 行

`/health` は既存の基盤依存を確認できるが、上記 auth 設定の完全性までは検査しない。
この状態でデプロイしても P13 のスモーク条件を満たせないため、**本番変更は行わなかった**。

手動投入手順の作成時に確認した運用 UI の不足は、ローカルで解消した。

- `AUTH_DEVICE_VERIFICATION_URI` の想定先である `/device` ページを実装
  (follow-up: bd `HarnessHub-k3n6` closed)
- 対象 28 ケース、型検査、lint、Next.js build、ローカル HTTP 200 を確認
- 本番には未デプロイのため、実環境の Device Flow は未確認

サインイン画面の form action は handler 契約
`/api/auth/<tenant_slug>/signin/tenant-oidc`へ修正し、回帰テストを追加済みである。

入力手順、確認方法、ロールバック、および上記ブロッカーの詳細は
[`production-auth-manual-setup.md`](./production-auth-manual-setup.md) を正本とする。

### 6.1 2026-07-28 main 再取込後の再検証

`origin/main` を 8 commit 取り込んだうえで、P13 の判定材料を実測し直した。**本番は変更していない。**

| 検証 | コマンド | 実測結果 |
| --- | --- | --- |
| main 取込 | `git merge origin/main` | conflict 0 件。取込内容は feat-hub-foundation の backup 検証系で auth への影響なし |
| 全品質ゲート | `pnpm verify` | **exit 0**。13 ゲート全 pass。Worker bundle 1.071 MiB / 予算 3.000 MiB、client bundle は全 route が 120 KiB 予算内 |
| plan 検証 | `validate-system-plan.py --feature-package feature-package/feat-auth-tenancy` | `violations: []` (0 件)。P01–P13 の 13 phase を検出 |
| 本番 Worker Secret | `wrangler secret list` | `AUTH_SECRET` / `CRON_HEARTBEAT_URL` / `TURSO_AUTH_TOKEN` / `TURSO_DATABASE_URL` の **4 件のみ**。§6 の記録から変化なし |

つまり main 取込による回帰はなく、P13 に残るのは §1 の R1〜R5 (本番投入・デプロイ・スモーク) だけである。

#### 本番投入台帳の誤りを 1 件修正 (`HarnessHub-x2x9`)

R1〜R2 を実施する際に参照する **`infrastructure-spec.md` §2 の Worker secret 台帳が実装と矛盾していた**。
本番投入前に発見できたため修正した。放置した場合の影響は次のとおりである。

| 台帳の記載 | 実装の実際 | 台帳どおり投入した場合 |
| --- | --- | --- |
| `ENCRYPTION_KEK` の記載なし | `authz/runtime.ts` が起動時必須として要求 | **Worker が起動時例外で落ちる** (本番障害) |
| `SALARY_ENC_KEY` を要求 | 実装参照 0 件。`ENCRYPTION_KEK` の purpose=`salary` DEK へ統合済み | 不要な鍵を投入し、正本が 2 本に見える |
| `IDP_SECRET_<tenant_slug>` を要求 | 実装参照 0 件。`idp_connections.client_secret_enc` の封筒暗号化へ置換済み | テナント追加のたびに Worker Secret が増える旧運用に戻る |

正本は [`security-spec-data-integrity.md` §4.5](../../security-spec-data-integrity.md) の secret インベントリと定め、
infrastructure-spec §2 はその再掲であることを明記した。§4.5 側も本番投入済みかつ実装が参照している
`TURSO_DATABASE_URL` / `CRON_HEARTBEAT_URL` が欠落していたため追記した (値・振る舞いの変更なし)。

### 6.2 2026-07-28 最新 main 取込後の現セッション再検証

現セッションでは、さらに前進した `origin/main` (`326198f`) を
`git merge --no-commit --no-ff origin/main` で取り込んだ。`MERGE_HEAD` と
`origin/main` は一致し、競合は 0 件である。ユーザー指示に従い merge commit は作成していない。
既存の未 commit 変更 3 ファイルも保持した。

| 検証 | 実測結果 |
| --- | --- |
| Auth.js / Device Flow / DB の直接テスト | schemas 86/86、DB 205/205、Hub 508/508 が pass |
| auth 関連の品質ゲート | tenant isolation 12 ケース、secret scan 363 files / 0 findings、schema drift 4/4 が pass |
| build / bundle | Next.js と OpenNext build が pass。Worker 1,126,194 bytes / 3 MiB、`/device` 107.7 KiB / 120 KiB |
| task plan | digest `98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`、P01–P13、violations 0 |
| `pnpm verify` の集約実行 | 各テスト assertion は pass したが、並列実行時の Vitest worker 通知 (`onTaskUpdate`) が timeout し exit 1。対象 package を file worker 1 で直接実行すると上記全件が pass |
| 本番 read-only 再確認 | `/health` と `/device` は HTTP 200。auth session route は HTTP 500。必須 Secret / Variable / 2 tenant OIDC 情報は未投入 |

したがって、検証対象の機能テストと個別品質ゲートに失敗はないが、現環境では
`pnpm verify` という集約コマンド自体の正常終了を証跡にできない。本番 R1〜R5 も未実施であるため、
どちらも実施済みとは扱わない。

### 6.3 2026-07-29 Secret参照方式と現行deploymentの再確認

GitHub / Cloudflareから秘密値をローカルへ再取得できるかをread-onlyで確認した。

| 確認 | 実測結果 |
| --- | --- |
| GitHub Actions | `check-actions-secrets.mjs --live`がpass。Turso 2件を含む台帳12件と実投入名が一致 |
| Worker Secret | 7件。必須の`AUTH_SESSION_SECRET` / `AUTH_ACCESS_TOKEN_SECRET` / `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `ENCRYPTION_KEK`は存在 |
| 100%配信version | `4e3f6281-e14b-4ce4-84ec-2af9980a79ef`。plain textは`HUB_ENV` / `ENVIRONMENT`だけ |
| auth URL変数 | 現行配信versionに3件とも無い。Dashboard設定が後続deployで消える懸念が実際に再発 |
| 値の再取得 | GitHub APIは名前・更新時刻、Wranglerは名前・種別だけを返す。秘密値は取得不能 |
| ローカル資格 | Turso CLIは未login、1Password CLIは認証待ち。既存値の安全な原本化は未実施 |

`wrangler.jsonc`へ公開URL 3件を移してGitを通常変数の正本とし、runtime必須Secret 5件は
`secrets.required`へ名前だけを宣言した。1Passwordの`HarnessHub prod infrastructure`を
復元可能な原本として、そこからGitHub / Cloudflareへ標準入力で一方向同期する手順へ改訂した。
既存remote Secretは原本のbootstrapには使えない。特に`ENCRYPTION_KEK`が不明な場合は、
既存暗号文を失うため新規生成せず停止する。

対象テスト2件、Wrangler型生成/check、deploy dry-run、Secret scan、文書/planゲートはpassした。
この時点では未commit・未deployだったが、§6.5で単一tenant方針の本番反映を完了した。

### 6.4 2026-07-30 本番テナントをHarnessHub 1件へ確定

ユーザー判断により、P13で実登録する本番テナントは`HarnessHub` (`slug=harness-hub`) 1件だけとし、
追加テナントは対象外へ変更した。Projectは`harness-hub-503821`、Organization/Workspaceは
`senpai-lab.com`、Audienceは`Internal`、callbackは
`/api/auth/harness-hub/callback/tenant-oidc`で確定した。1Passwordに
`HarnessHub prod OIDC - harness-hub`を作成済みだが、Google Auth PlatformとWeb OAuth clientは
作成済みで、`client_id` / CONCEALED `client_secret`を保存・非表示検証した。

### 6.5 2026-07-30 本番DB登録・Worker配信

本番DBが0件であることを確認後、tenant `01KYREM0H83N4PVENM2491S7XF`とOIDC connection
`01KYREM0T6KD5BA83F6G9SA3HJ`をrepository経由で作成した。issuer・scope・Client ID形式・
secret暗号化往復と、再実行時`already-configured`を確認した。1Password原本と旧Worker Secretの
`ENCRYPTION_KEK`不一致をpreviewの登録済みslugだけが500になる事象から検出し、原本からstdinで同期した。
version `80ec5f1b...`で基盤を配信後、custom formの`MissingCSRF`ループを修正したversion
`2d3841d2-a86a-4d1e-aff3-6a4306936c57`をpreview後に100%配信した。本番でhealth/provider/CSRF/
signin page/device=200、未登録slug=404、Google認可開始=302、callback・scope・state・nonce・PKCE一致を確認した。
Google実ユーザーのcallback後にトップへ戻り、本番DBでactive/memberのJIT利用者1件を確認した。
commit・push・PRは実施していない。後続のR4実測は§6.6へ記録する。

### 6.6 2026-07-30 本番R4・R5スモーク

Workspace `HarnessHub`をscoped repositoryで作成し、JIT利用者1名の所属を確認した。Device Flowは
code→ブラウザapprove→token交換→refresh rotation→旧refresh再利用検知→family全失効が合格し、
要求した2 scopeが付与され、DBの同一family 2行はactive 0件となった。認可は実member承認に加え、
全action×role 4種・分離・失効57件がpassした。緊急失効はDB記録後、同じCookie・tenant・workspaceの
approveが配信version `2d3841d2...`で401となった。運用手順どおり60秒待機後の初回操作が約109秒時点
だったため下限は測っていないが、上限60秒のキャッシュ契約23件と本番遮断を組み合わせて合格とした。
失効後はGoogle再ログインを完了した。dev provider検査135ファイル0件、adapter境界130ファイル0件で、
AC-1〜AC-3を再確認した。

---

## 7. 本記録の判定

| 判定項目 | 結果 |
| --- | --- |
| 本番デプロイを実施したか | ✅ version `2d3841d2...`を100%配信 (§6.5) |
| ローカル core・テスト・品質保証・運用手順が完了しているか | ✅ 完了 (§2) |
| Auth.js・本番 DB adapter のコード結線が完了しているか | ✅ 完了 (`HarnessHub-b7ng` closed / `@auth/core` 0.41.3) |
| control-plane DB の本番前提が揃っているか | ✅ `HarnessHub-u6q.13` closed |
| 本番 auth 設定・OIDC 資格情報が揃っているか | ✅ HarnessHub 1テナントを暗号化DB登録 (§6.5) |
| 本番投入時に参照する secret 台帳が実装と一致しているか | ✅ 一致させた (§6.1。`HarnessHub-x2x9`) |
| main 取込後に回帰がないか | ⚠️ 対象テスト・個別ゲートは全 pass / plan violations 0。集約 `pnpm verify` は worker 通知 timeout で exit 1 (§6.2) |
| 本番ログイン導線が成立しているか | ✅ Google実ユーザーのlogin/JITを確認 (§6.5) |
| Device 承認の画面導線が成立しているか | ✅ 本番approveからfamily失効まで完了 (§6.6) |
| 未実施事項を実施済みと混同せず記録したか | ✅ §1 に理由つきで列挙 |
| 文書や計画で実装・証跡の欠落を代替していないか | ✅ 代替していない。§3 は計画であることを明記 |

**本番反映とR1〜R5は完了した。** PR #612はmainへmerge済みだが、そのmain pushから始まった
自動deployは§8のR2専用token未登録で失敗し、Workerは直前versionへ自動rollbackされた。
本番の既存R1〜R5証跡は失われていないが、追補PR・token投入・main完走まではP13をopenとする。

---

## 8. PR #612 main反映後の自動deployと追補

| 項目 | 結果 |
| --- | --- |
| PR / merge commit | #612 / `b1009d04234f13083fadf3707183edd7f859fb7c` |
| GitHub Actions | `hub-ci` run `30518334455` |
| build / test | G2〜G13 pass |
| migration / deploy / health | pass |
| DB smoke | S1 schema、S2 ULID、S3 release不変性 pass |
| R2 smoke | `CLOUDFLARE_R2_API_TOKEN`未登録によりWrangler object put前にfail |
| cleanup | 検証tenantの残存行0件 |
| rollback | 成功。Workerは直前versionへ復帰 |

失敗時のenvironmentでは、R2 smoke用にマッピングされた`CLOUDFLARE_API_TOKEN`が空だった。
GitHub repositoryの実設定にはWorkers deploy用tokenは存在したが、別権限に分離した
`CLOUDFLARE_R2_API_TOKEN`は存在しなかった。個人Wrangler OAuth tokenの転用や、
deploy tokenへのR2 write追加は`qa-091`の最小権限境界を壊すため採用しない。

follow-upは次を追加する。

1. migration前にdeploy依存secret/variableを一括検査するpreflight
2. provider/未知tenant/CSRF/Google 302/state/nonce/PKCEの本番OIDC start-flow smoke
3. owner関係role・非owner・cross-tenant拒否を含むG14 auth release contract
4. OIDC smokeを含む各step outcomeのrollback記録

追補CLIをrollback後のproduction originへ実走し、provider/callback、未知tenant 404、
CSRF cookie/token、Google 302、`response_type=code`、identity scope、
`state`・`nonce`・PKCE S256のO1〜O4はすべてpassした。

仕様影響の判断と外部所有者アクションは
[post-merge仕様影響受領書](./p13-postmerge-auth-gate-spec-receipt.md)を正とする。
Cloudflare所有者による専用R2 token発行、GitHub secret投入、main run完走は未完了であり、
repository側の追補だけをもって本番deploy解消とは数えない。
