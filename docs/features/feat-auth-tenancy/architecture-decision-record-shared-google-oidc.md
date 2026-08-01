---
status: confirmed
layer: feature-design
task: issue-auth-tenancy-shared-google-oidc-20260729
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
source: issues/sys-auth-tenancy-shared-google-oidc-20260729.md
architecture_refs: [arch-harness-hub-security, arch-harness-hub-backend]
beads_ids:
  - HarnessHub-fnej
---

# AD-10: 共通 Google OAuth client 方式

> **位置づけ**: [architecture-decision-record.md](./architecture-decision-record.md) の追補。
> 仕様書 [issues/sys-auth-tenancy-shared-google-oidc-20260729.md](../../../issues/sys-auth-tenancy-shared-google-oidc-20260729.md)
> の「実装順序 1: ADR で共有 credential の保管場所、共通 callback、mode owner、migration 境界を確定する」に対応する。
> AD-1〜AD-9 を覆さない。AD-5 (テナント別 OIDC) の**代替ではなく併存**する 2 本目の方式である。

## 0. 何を解くのか

テナントを増やすたびに、Google Cloud Console で OAuth client を作り、redirect URI
`/api/auth/{tenant_slug}/callback/tenant-oidc` を登録する作業が発生していた。Google は一般の
Google ログイン用 OAuth client を不正利用防止のためプログラムから作成・変更できないとしている
([Google 公式](https://developers.google.com/identity/protocols/oauth2/resources/best-practices))。
つまり「自動化する」は選べない。選べるのは **HarnessHub 所有の client を 1 つだけ作り、
テナントの束縛をアプリ側で担保する**方式を足すことである。

### 代償: `aud` がテナント識別子でなくなる

AD-5 の検証契約では `aud` がテナント固有の `client_id` と一致することが、テナント束縛の一部を担っていた。
共通 client では `aud` は全テナントで同じ値になる。**この 1 点が本 ADR の全決定の起点**であり、
失われた束縛を次の 2 つで置き換える。

| 失われたもの | 置換 | 単独では不十分な理由 |
|---|---|---|
| `aud` によるテナント束縛 | 署名付き `state` (AD-10.2) | state だけ通す実装は、テナント A の state で B の Workspace 利用者を通す |
| Google Cloud project による組織の分離 | ID token の `hd` claim 照合 (AD-10.3) | `hd` だけ見る実装は、同じ Workspace を許可した別テナントへ利用者を通す |

**両方を同時に満たしたときだけ受理する**。片側だけの実装は受入条件を満たさない。

---

## 1. AD-10.1: 共有 credential は環境単位の Secret に 1 組だけ置く

### 判断

共有 client の `client_id` / `client_secret` は **環境変数 (Cloudflare Workers Secret) に 1 組だけ**置く。
テナント行 (`idp_connections`) へは複製しない。

| 値 | 保管場所 | 環境変数名 |
|---|---|---|
| 共有 client の client_id | Workers Secret | `SHARED_GOOGLE_OAUTH_CLIENT_ID` |
| 共有 client の client_secret | Workers Secret | `SHARED_GOOGLE_OAUTH_CLIENT_SECRET` |
| 顧客持ち込み client の secret | `idp_connections.client_secret_enc` (封筒暗号化) | — (従来どおり) |

環境変数名は `apps/hub/src/lib/auth/shared-credentials.ts` の定数を正本とする。runbook と実装が
文字列リテラルで二重管理になると、片方だけ変えたときに「設定したのに読まれない」が起きる。

`client_id` は本来 secret ではない (認可 URL に平文で載る) が、**投入経路を Secret 1 本に揃える**。
2 系統に分けると、片方が Variable・片方が Secret という理由で「secret だけ入れて id を入れ忘れた」
半端な状態が作りやすくなる。読取側は片方欠落で `null` を返すので事故は入口で止まるが、
止まる回数自体を減らす方を採る。

### 根拠

- **爆発半径**: テナント行へ複製すると、DB 1 行の漏えいが全共有テナントの侵害になる。
  1 箇所に置けば rotation も 1 箇所で済む (§4 の失効手順)。
- **受入条件 4 の検査可能性**: 「行に無い」は `client_secret_enc = ''` として機械的に検査できる
  (`packages/db/__tests__/idp-repo.test.ts`)。「行にあるが暗号化されている」では
  複製の有無をテストで区別できない。

### 露出防止を規約でなく型の振る舞いで担保する

`SharedGoogleCredentials` は `toJSON()` を持ち、`JSON.stringify` で `clientSecret` を `'[redacted]'` に
差し替える。構造化ログや API 応答が誤ってこのオブジェクトを直列化しても平文が出ない。
`clientId` は秘密ではないのでそのまま出す (障害調査でどの client を見ているかは分かるべき)。

**片方でも欠けたら `null`**。「client_id はあるが secret が無い」を部分的に有効として扱うと、
認可要求だけ組み立てられて token 交換で必ず失敗する状態が生まれる。設定不備は入口で 1 度だけ検出する。

### mode owner (分岐を 1 箇所に閉じる)

`createOidcCredentialResolver` が `(connection) => Promise<string | null>` を返し、
呼び出し側 (Auth.js 設定の組立・handler・runtime) には `credentialMode` の分岐を**一切見せない**。

```
lib/auth/shared-credentials.ts   ← credentialMode の switch はここにしか無い
        ↑ 注入
   lib/authz/runtime.ts          ← 合成点。環境から credential を読んで resolver を作る
```

分岐を上位へ漏らすと、方式を足すたびに同じ `if (mode === ...)` が 3 箇所へ増える。
そのどれか 1 つが「不明なら共有」に倒れた瞬間、既存テナントの認証境界が変わる。
**既定へ落ちる枝を作らない** — 共有 credential 未設定・issuer 不一致・未知 mode はすべて `null`
(= このテナントでは認証できない) にする。

---

## 2. AD-10.2: 共通 callback は 1 本、テナントは署名付き `state` で復元する

### 判断

| 項目 | 確定値 |
|---|---|
| 共通 callback path | `/api/auth/shared/callback/tenant-oidc` (**Console へ登録するのはこの 1 本だけ**) |
| Auth.js basePath | `/api/auth/shared` |
| provider id | `tenant-oidc` (顧客方式と共通) |
| 予約 slug | `shared` — この slug でのテナント経路の解決を route が 400 で拒否する (下記) |
| `state` の形 | HS256 JWT。claims は `typ` / `tid` / `slug` / `csrf` / `iat` / `exp` |
| `state` の TTL | 600 秒 (`AUTH_NUMERIC_CONTRACT.sharedOidcStateTtlSeconds`。device_code と同値) |
| binding cookie | `__Host-harness-hub.shared-oidc-csrf.{slug}` / `HttpOnly` `Secure` `SameSite=Lax` |
| Auth.js `checks` | 共有方式 `['pkce','nonce']` / 顧客方式 `['pkce','state','nonce']` |

path はすべて `apps/hub/src/lib/auth/config.ts` の定数から組み立てる。形は Auth.js の規約
`{basePath}/callback/{providerId}` に従う — 逆に言えば**この path を変えると全共有テナントが一斉に落ちる**。

### なぜ Auth.js から `state` を取り上げるのか

共通 callback には slug が無いので、callback を受けた時点でテナントを知る手掛かりは `state` しかない。
Auth.js が自前生成する state は不透明値で `tid` を運べない。よって署名付き state を
`authorization.params.state` に載せ、`checks` からは `state` を外す。外さないと Auth.js 側の state と
こちらの state が二重に載り、片方が上書きされる。

**検査が弱くなったわけではない。** Auth.js の state は「cookie の値と一致するか」しか見ない。
こちらは HMAC 署名 + 期限 + CSRF binding cookie の 3 点で同じ役割を果たす。
`pkce` と `nonce` は cookie ベースで動くので Auth.js に残す (S256 のみ・nonce 欠落は拒否は AD-5 のまま)。

### double-submit binding が必要な理由

state は URL に載るので、それ**だけ**では「攻撃者が用意した認可要求を被害者のブラウザで完了させる」
ログイン CSRF を防げない。同じ値の平文を `HttpOnly` cookie に置き、callback で
「cookie の平文 → SHA-256」が state 内の `csrf` と一致することを要求する。
cookie は攻撃者のブラウザにしかないので、被害者のブラウザでは一致しない。

- **hash を state 側・平文を cookie 側**に置くのは、URL (履歴・Referer・アクセスログに残る) へ
  秘密の平文を出さないため。
- **cookie 名にテナント slug を後置する**のは、複数テナントへ並行にログインしようとしたとき
  片方の binding がもう片方を上書きして無言で失敗するのを避けるため。`__Host-` 接頭辞は `Path=/` を
  強制するので、path でテナントを分ける手は使えない。
- **`SameSite=Lax` は必須**。`Strict` にすると Google からの redirect (別サイト起点の top-level GET) で
  cookie が送られず、正当な callback が必ず binding 不一致で落ちる。
- `typ: 'shared_oidc_state'` を literal で固定し、同じ鍵で署名された session token を state として
  提示する経路を塞ぐ。

### 拒否時に理由を返さない

state 検証の失敗はすべて 400 + 汎用文言に畳む。`csrf_mismatch` / `expired` / `bad_signature` を
呼び出し側へ返すと、攻撃者が「どこまで正しかったか」を測れるオラクルになる。
理由はサーバー側の監査ログにだけ残す。

---

## 3. AD-10.3: Workspace 帰属は ID token の `hd` claim で判定し、判定関数は 1 つに統一する

### 判断

`hd` の照合は `verifyWorkspaceDomain(hd, connection)` **1 関数**に閉じ、純関数の検証経路
(`verifyOidcIdToken`) と Auth.js 実行経路 (`authjs-handler.ts`) の両方が同じ関数を呼ぶ。

| 状態 | 共有方式 | 顧客方式 |
|---|---|---|
| 許可ドメイン未設定 | **拒否** (`workspace_domain_unconfigured`) | 許可 (従来どおり `hd` を見ない = 後方互換) |
| `hd` 欠落 (個人 Google アカウント) | 拒否 (`workspace_domain_missing`) | 同左 (許可ドメイン設定時) |
| `hd` 不一致 | 拒否 (`workspace_domain_mismatch`) | 同左 |
| `hd` 一致 (大小文字無視) | 受理 | 受理 |

### 判定は JIT provisioning の**前**

`authjs-handler.ts` の `signInOnce` — `signIn` callback と `jwt` callback が共有する唯一の入口 — で
`verifyWorkspaceDomain` を呼び、`resolveSignIn` (利用者の作成・確認) より**先**に拒否する。
順序を逆にすると、拒否するはずの利用者が JIT provisioning で先に作られ、行だけが残る。

### 認可要求の `hd` パラメータは境界ではない

許可ドメインがちょうど 1 件のときだけ `authorization.params.hd` を載せるが、これは Google の
アカウント選択画面を寄せる**表示ヒント**である。要求パラメータは利用者が書き換えられるので、
実際の帰属判定は必ず ID token 側の claim で行う
([hd 仕様](https://developers.google.com/identity/openid-connect/reference))。
許可ドメインが複数のテナントで先頭だけ載せると、2 番目以降のドメインの利用者が
「選べないアカウント」を見せられて詰まるため、複数件のときは載せない。

---

## 4. AD-10.4: migration 境界 — expand のみ、既存行の意味を変えない

### 判断

migration `0003_auth-tenancy-shared-google-oidc.sql` は **ADD COLUMN 2 本のみ**。
既存列の型変更・NOT NULL 化・表再作成を行わない (expand/contract の expand 相当)。

| 列 | 型 | 既定 | 意味 |
|---|---|---|---|
| `credential_mode` | TEXT NOT NULL | `'customer_google'` | credential の出所 |
| `allowed_workspace_domains` | TEXT NULL | NULL | 許可ドメインの JSON 配列。NULL = 未設定 |

- **既定値 `customer_google` は緩和ではない**。この列を足す前に存在した行は実際に顧客持ち込み client
  なので、既定値がそのまま正しい値になる。「不明なら顧客方式」ではない — 不明値・未知値の扱いは
  アプリ層で fail-closed (§1)。
- **`client_secret_enc` は NOT NULL のまま**。SQLite で NULL 許容へ緩めると表再作成 = 破壊的 DDL になる。
  共有方式の行は空文字を入れ、「テナント行へ共有 secret を複製していない」を検査可能にする。
  空文字を secret として読み出す経路は `SharedCredentialSecretAccessError` で塞ぐ。
- **schema owner は feat-domain-model-db のまま** (AD-1)。本 issue は当該 owner の領域
  (`packages/db/schema/core/identity.ts` / `packages/db/repository/` / `packages/db/migrations/`) を
  仕様書の `resource_scope` で明示的に許可されて変更している。owner 主張の変更ではない。

### rollback 境界

列を追加しただけなので、アプリを旧版へ戻せば列は無視される (contract は行わない)。
共有方式のテナント行が残っている状態で旧版へ戻すと、そのテナントは認証できなくなる。
戻す前に共有方式テナントを 0 件にする手順は
[runbook-shared-google-oidc-rollout.md](./runbook-shared-google-oidc-rollout.md) §4。

---

## 5. 後方互換の担保 (受入条件 5)

`credentialMode` は**省略可能**にした。既存の呼び出し (`repo.insert` / port の実装 / テスト) を
1 行も書き換えずに済む形にしてある。これが逆向きの証拠になっている — 必須にしていたら、
既存テストが全件書き換えになり「既存経路が変わっていない」ことを示せなかった。

| 検査 | 場所 |
|---|---|
| 顧客方式の redirect URI が従来のテナント path のまま | `shared-google-oidc-policy-flow.test.ts` |
| 顧客方式は Auth.js の `state` cookie を従来どおり使う | 同上 |
| 未知 mode が共有にも顧客にも落ちない | `shared-google-oidc-credentials-domain.test.ts` |
| 共有 credential 未設定でも顧客方式は動く | 同上 |
| 既存の idp repository テスト 7 件が無改変で通る | `packages/db/__tests__/idp-repo.test.ts` |
| 0003 以前の形 (2 列を書かない生 INSERT) の行が `customer_google` で読める | 同上「migration 0003 の後方互換 (rollback 安全性)」 |

## 6. 参照

- 仕様書: [issues/sys-auth-tenancy-shared-google-oidc-20260729.md](../../../issues/sys-auth-tenancy-shared-google-oidc-20260729.md)
- 段階導入と失効手順: [runbook-shared-google-oidc-rollout.md](./runbook-shared-google-oidc-rollout.md)
- 検証証跡: [test-run-results-shared-google-oidc.md](./test-run-results-shared-google-oidc.md)
- Google 制約: <https://developers.google.com/identity/protocols/oauth2/resources/best-practices>
- `hd` 仕様: <https://developers.google.com/identity/openid-connect/reference>
