---
status: draft
layer: feature-design
task: issue-auth-tenancy-customer-managed-google-oidc-20260729
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
beads_ids:
  - HarnessHub-uk2i
---

# feat-auth-tenancy 検証証跡: 顧客持ち込み Google OAuth client の管理

- graph_node_id: `issue-auth-tenancy-customer-managed-google-oidc-20260729`
- 実行日: 2026-08-02
- 対象ブランチ: `devgraph/issue-auth-tenancy-customer-managed-google-oidc-20260729`
- 運用手順: [runbook-customer-managed-google-oidc.md](./runbook-customer-managed-google-oidc.md)
- 仕様反映受領書: [customer-managed-google-oidc-spec-reflection-receipt.md](./customer-managed-google-oidc-spec-reflection-receipt.md)

正本仕様 `issues/sys-auth-tenancy-customer-managed-google-oidc-20260729.md` の
「検証方法」に挙がっている項目と、その実行結果を対応させる。

## 1. 品質ゲートの実行結果

| ゲート | 結果 | 内訳 |
| --- | --- | --- |
| `CI=1 pnpm verify` | pass | 全ゲートを同一実行で完走 (exit 0) |
| `pnpm typecheck` | pass | workspace 6 project |
| `pnpm lint` | pass | 482 ファイル / error 0 (残る info は biome schema 2.5.4 と CLI 2.5.5 の版差で既存) |
| `pnpm build` | pass | `/settings/auth` 5.54 kB / First Load 114 kB |
| `pnpm check:auth` | pass | adapter 境界 256 / 単一認可点 263 (route 例外 5 件が期待集合と一致) / dev provider 不在 263 |
| `pnpm check:tenant-isolation` | pass | 12 tests |
| `pnpm check:secrets` | pass | 1 test (538 ファイル走査 / 検出 0) |
| `pnpm check:duplicates` | pass | 574 ファイル / 違反 0 |
| `pnpm check:drift` | pass | 4 tests |
| `pnpm check:pnpm` | pass | lockfile 混入なし |
| `pnpm check:bundle` | pass | worker gzip 1.332 MiB / 予算 3.000 MiB |
| `pnpm check:client-bundle` | pass | `/settings/auth` 113.3 KiB / 予算 120.0 KiB |
| `apps/hub` vitest | pass | **85 files / 1040 tests** |
| `packages/db` vitest | pass | **31 files / 256 tests** |
| `packages/ui` vitest | pass | **12 files / 266 tests** |
| `packages/schemas` vitest | pass | **6 files / 86 tests** |
| `packages/inspection` vitest | pass | **9 files / 151 tests** |
| `packages/estimation` vitest | pass | **3 files / 40 tests** |

Playwright は本リポジトリに導入されていない。UI の検査は
`renderToStaticMarkup` + `axe-core` (jsdom) による結合検査で代替した (下記 §2.5)。
ブラウザ実操作の検査が必要になった時点で、Playwright 導入を別課題として起票する。

## 2. 仕様「検証方法」との対応

### 2.1 provider-admin / workspace-admin / member / 未認証の API 認可テスト

`apps/hub/tests/auth-tenancy/oidc-admin-routes.test.ts`「認可境界」。
`ACTION_RULES` の `idp.connection_read` / `idp.connection_change` はいずれも
`provider-admin` のみ。`apps/hub/tests/auth-tenancy/authz-decision-matrix.test.ts` の
`EXPECTED_MATRIX` に 2 action を追加し、role 4 種 × 全 action の総当たりで固定した。

**この期待表は登録漏れを検出する側で働いた**。action を実装へ足した時点でマトリクス検査が
落ち、期待表への明示的な追記を強制された (実装だけ足して静かに通ることがない)。

### 2.2 tenant A / B の cross-tenant read / write negative test

同 test の「テナント越境」。`findById` / `list` は `WHERE tenant_id = ?` を必ず含み、
他テナントの接続 ID を指定しても **404 `connection_not_found`** に畳む
(「他テナントには存在する」と読み取れる応答を返さない)。
`provider-admin` の意図的な越境は許可するが、`provider.cross_tenant_access` 監査が必ず残る。

### 2.3 secret が response / structured log / audit payload / error / snapshot へ出ないこと

- API 応答: `oidc-admin-routes.test.ts`「secret の非返却」で応答本文全体に対し
  `not.toContain(SEED_SECRET)` / `not.toContain(NEW_SECRET)`。
- 監査 payload: 同テストで監査 sink の全 event を JSON 化して同じ検査。
  metadata に載るのは `client_secret_last4` / `pending_client_secret_last4` だけ。
- error: `ERROR_MESSAGES` は列挙エラーから固定文言を引くだけで、入力値も例外オブジェクトも
  文言へ混ぜない。`catch` 節は例外を握り潰して固定文言を出す。
- UI/DOM: `oidc-admin-a11y.test.tsx` で SSR 済み HTML に対し `not.toContain(FULL_SECRET)`。
  secret 入力欄は `type="password"` / `autocomplete="new-password"` / 初期値なし。
- リポジトリ全体: `pnpm check:secrets` (538 ファイル / 検出 0)。
  fixture の secret は 24 文字未満に抑え、抑制マーカーでゲートを黙らせていない。

### 2.4 rotation の正常系・接続テスト失敗・CAS 競合・rollback

`oidc-admin-routes.test.ts`「初回登録と有効化の順序」「既存接続への登録
(credential 載せ替え)」および `oidc-admin-rotation-routes.test.ts`「rotation」。

- 正常系: 登録 → テスト → 有効化で、`createDbClientSecretResolver` が解決する secret が
  `SEED_SECRET` → `NEW_SECRET` へ切り替わることを **ログイン解決の側から**確認する
  (`credential_status` 列の値だけを見ない)。
- 接続テスト失敗: 200 + `passed: false` で返り、状態は `pending` のまま。監査 `test_failed`。
- CAS 競合: `programmableConnectionTester.setOnCall()` で
  「テスト中に別の更新を差し込む」を再現し、409 `state_conflict` を確認。
  この隙間へ割り込めるのはテスターの中だけなので、`setTimeout` による不安定な検査にしていない。
- rollback: `DELETE .../rotation` で staging を捨てると、解決される secret が
  元のままであることを確認。

**実 DB (libSQL) を使う**。CAS・封筒暗号化・`WHERE tenant_id = ?` は永続化側にしか無く、
in-memory ダブルへ置き換えると全部「そう書いたつもり」になるため。

### 2.5 UI 操作とアクセシビリティ検査

`apps/hub/tests/auth-tenancy/oidc-admin-a11y.test.tsx` (5 tests / axe 違反 0)。
`SetupPanel` と `ConnectionCard` を実画面と同じ見出し階層 (h1 → h2 → h3) に置いて検査する。
部品を裸で描画すると実配信では起きない `heading-order` が出るため、
その違反を「既知の差分」として抑制する運用が始まらないよう骨格ごと再現した。

空ページを緑にしない主張も併せて置いてある (callback URL が実際に出ている、
`article[aria-label]` が存在する、rotation 中は「現在のログインは今までの設定で継続しています」が読める)。

## 3. 受入条件との対応

| # | 受入条件 | 満たした場所 |
| --- | --- | --- |
| 1 | provider-admin だけが登録・更新・無効化でき、監査が残る | `rules.ts` (2 action とも `provider-admin`) / `recordChange` は成立した変更のみ記録 |
| 2 | 保存後の UI/API/ログ/監査/エラーに secret 全値が出ない | §2.3 |
| 3 | `ENCRYPTION_KEK` を使う既存 repository primitive で暗号化保存 | `packages/db/repository/idp.ts` の `cipher.encryptColumn('idp_secret', …, SECRET_REF(id))` |
| 4 | 新 secret 保存 → 接続テスト → active 切替 → 旧 secret 無効化で無停止 rotation | §2.4 / runbook R-01 |
| 5 | 途中失敗時は旧 credential でログインを継続できる | rollback テスト。昇格前は現行 credential を一切触らない |
| 6 | 顧客方式の失敗時に共有方式へ暗黙 fallback しない | 「無効化するとログイン解決が止まる (共有方式へ暗黙 fallback しない)」 |
| 7 | tenant A の管理者が tenant B の credential を参照・更新できない | §2.2 |
| 8 | UI/API、auth、tenant isolation、secret scan、typecheck、lint、build が pass | §1 |

## 4. 設計上の判断と、その根拠

### 4.1 1 テナント 1 Google 行へ寄せた

`0000_baseline-core-domain.sql:83` の `idp_connections_tenant_issuer_uq`
(`UNIQUE (tenant_id, issuer_url)`) により、**1 テナントが持てる Google 接続は 1 行だけ**である。

当初は「登録 = 新しい行を作り、古い行を supersede する」で実装しかけたが、
既存接続を持つテナントで `SQLITE_CONSTRAINT_UNIQUE` になった。制約を緩める選択もあったが、
緩めると「同じテナントに Google 接続が 2 行ある」状態を全ての読み取り経路が
考慮しなければならなくなる。

制約側にモデルを合わせ、**登録・方式切替・secret rotation を「この 1 行の credential を
差し替える」1 つの操作へ統合した**。特別扱いを増やすのではなく、特別扱いを消す方向の修正になった。
その結果、共有方式 → 顧客方式の切替も staging + CAS の上に乗り、無停止かつ rollback 可能になった。

このために staging 列を secret だけでなく `pending_client_id` /
`pending_credential_mode` / `pending_allowed_workspace_domains` まで広げている
(migration `0004_auth-tenancy-customer-managed-oidc-lifecycle.sql`)。

### 4.2 昇格は 1 回の UPDATE

`activatePendingSecret` は client ID / secret / 方式 / 許可ドメインを同じ UPDATE で入れ替える。
分けると「新しい secret と古い client_id」の組で Google へ行く瞬間ができる。

### 4.3 `SECRET_REF(rowId)` は live / pending で同じ列名を使う

封筒暗号化の AAD は `{table}:{column}:{row_id}` で作る。pending 用に別の列名を与えると、
昇格のたびに復号 → 再暗号化が必要になり、平文が一瞬メモリへ出る経路が増える。
同じ列名にしてあるので、**暗号文をそのまま移動するだけで昇格できる**。

### 4.4 接続テストは「不正な認可コードでわざと 1 回失敗させる」

Google の token endpoint へ意図的に不正な code で交換要求を出し、
`invalid_grant` (= client は正しい) と `invalid_client` (= client ID/secret が違う) を
RFC 6749 §5.2 に従って読み分ける。この probe は discovery と client ID / secret の
組合せを利用者なしで確認するためのものだが、redirect URI の一致は証明しない。
Google の認可要求では登録済み URI との完全一致が必要なので、実ブラウザ login を別ゲートにする。

### 4.5 500 行を超える手書きファイルは責務で分けた

repository の状態機械を `idp-lifecycle.ts`、wire 要約を `summary.ts`、画面表示を
`oidc-connection-panels.tsx`、rotation route test を `oidc-admin-rotation-routes.test.ts`、
DB lifecycle test を `idp-lifecycle-repo.test.ts` へ分離した。対象の手書きファイルは全て
500 行以内である。`0004_snapshot.json` は Drizzle が migration 系譜から決定論的に生成する
機械生成物なので、手分割すると schema drift を生むため例外として保持する。

### 4.6 `createUnavailableOidcAdminService` を合成点から実体 module へ移した

`AuthRuntime` に `oidcAdmin` を必須で足したため、device flow / token 系の既存 harness も
実体を埋める必要が出た。当初はこれを `authz/runtime.ts` に置いたが、
device 系 route テストは `vi.mock('authz/runtime.js')` でモジュールごと差し替えるため、
harness から実体が取れず 33 件が落ちた。

mock factory 側へ「呼ばれたら落ちる」実体を複製する直し方は採らなかった。
複製した瞬間、本物と mock がずれても誰も気付けなくなる。
`lib/auth/oidc-admin/unavailable.ts` へ移し、mock 境界の外に出した。

## 5. 残作業

- Google 実環境に対する接続テストの実施 (顧客の OAuth client が要る)。
- Playwright によるブラウザ実操作の検査 (本リポジトリ未導入)。
- 本番テナントへの適用は、migration `0004` の本番適用と併せて別途計画する。
