---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P13
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# 本番認証設定の手動投入手順

- 対象: Cloudflare Worker `harness-hub` と本番 Turso control-plane DB
- 実行者: 本番 Cloudflare / Turso / 顧客 IdP の資格情報へアクセスできる運用担当者
- 目的: P13 の本番デプロイ前提を、秘密値をGit・ログ・チャットへ残さず手動で設定する

> 秘密値をこの文書、issue、PR、チャットへ貼らない。値は1Passwordなどの秘密管理へ保存し、
> CloudflareのSecret入力欄またはマスクされたターミナル入力へ直接貼り付ける。

## 1. 入力する情報

| 名前 | 種別 | 作り方・入手元 | 入力先 |
| --- | --- | --- | --- |
| `AUTH_SESSION_SECRET` | Secret | 32 byte以上のランダム値 | Worker |
| `AUTH_ACCESS_TOKEN_SECRET` | Secret | session用とは別の32 byte以上のランダム値 | Worker |
| `ENCRYPTION_KEK` | Secret | **base64化した32 byte**。DB登録時にも同じ値を使う | Cloudflare Worker + 手元の登録処理 |
| `AUTH_CANONICAL_ORIGIN` | 通常変数 | Hubの正規origin。pathと末尾`/`を付けない | Cloudflare Worker |
| `AUTH_ALLOWED_ORIGINS` | 通常変数 | 変更系リクエストを許可するoriginのカンマ区切り | Cloudflare Worker |
| `AUTH_DEVICE_VERIFICATION_URI` | 通常変数 | Device Flow承認画面の絶対URL | Cloudflare Worker |
| OIDC `issuer` | 顧客設定 | IdP discovery documentの`issuer`と完全一致 | 本番DB |
| OIDC `client_id` | 顧客設定 | 顧客IdPで作成したOAuth/OIDCアプリ | 本番DB |
| OIDC `client_secret` | 顧客Secret | 顧客IdPで作成したOAuth/OIDCアプリ | 暗号化して本番DB |

既存の`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`はDB登録処理で必要になる。`AUTH_SECRET`は旧版へのrollbackで使う可能性があるため、新版の動作確認が終わるまで削除しない。

## 2. 作業前の確認

リポジトリルートで実行する。

```bash
pnpm --filter @harness-hub/hub exec wrangler --version
pnpm --filter @harness-hub/hub exec wrangler whoami
pnpm --filter @harness-hub/hub exec wrangler versions list
pnpm --filter @harness-hub/hub exec wrangler secret list
```

- Wranglerは4.xを使う。確認時点のローカル版は`4.113.0`。
- 対象Worker名が`harness-hub`であることをCloudflare Dashboardでも確認する。
- `versions list`の現行version IDを作業記録へ残す。秘密値は残さない。

## 3. URL 3項目を決める

例として正規originを`https://hub.example.com`とする。

| 変数 | 例 | 注意 |
| --- | --- | --- |
| `AUTH_CANONICAL_ORIGIN` | `https://hub.example.com` | scheme + hostのみ |
| `AUTH_ALLOWED_ORIGINS` | `https://hub.example.com` | 複数ならカンマ区切り。ワイルドカード不可 |
| `AUTH_DEVICE_VERIFICATION_URI` | `https://hub.example.com/device` | user code入力・承認画面 |

custom domainが無い間は、Cloudflare Dashboardに表示される実際の`workers.dev` originを使う。
観測済み候補は`https://harness-hub.daishimanju.workers.dev`だが、入力前にDashboardで再確認する。

### 現在の反映状態

`/device`画面はbd `HarnessHub-k3n6`（closed）でローカル実装・検証済みである。ただし、この変更は
まだ本番へデプロイしていないため、現行本番のURLが404でも設定ミスとは限らない。

- runtime起動の予定URLを先に入力でき、現変更のデプロイ後に`/device`のHTTP 200を確認する。
- 実際の承認からtoken取得まで通るまではDevice Flowをpass扱いにしない。
- API自体の承認処理は`POST /api/v1/device/approve`に実装済み。

## 4. 署名鍵とKEKを生成する

macOSで値を画面へ表示せずClipboardへ入れる例。**3回実行し、3つとも別の値にする。**

```bash
openssl rand -base64 32 | tr -d '\n' | pbcopy
```

1. 1回目を1Passwordの`AUTH_SESSION_SECRET`へ保存する。
2. 2回目を`AUTH_ACCESS_TOKEN_SECRET`へ保存する。
3. 3回目を`ENCRYPTION_KEK`へ保存する。
4. 保存後はClipboardを別の無害な文字列で上書きする。

`ENCRYPTION_KEK`は`openssl rand -base64 32`で得た**32 byteのbase64値**でなければならない。
失うと暗号化済みのOIDC secretを復号できない。

## 5. Cloudflare Workerへ入力する

### 5.1 推奨: Dashboardで6項目をまとめて入力

1. Cloudflare Dashboardを開く。
2. `Workers & Pages` → `harness-hub` → `Settings`を開く。
3. `Variables and Secrets` → `Add`を選ぶ。
4. 次の3件はTypeを`Secret`にする。

   - `AUTH_SESSION_SECRET`
   - `AUTH_ACCESS_TOKEN_SECRET`
   - `ENCRYPTION_KEK`

5. 次の3件はTypeを通常のtext variableにする。

   - `AUTH_CANONICAL_ORIGIN`
   - `AUTH_ALLOWED_ORIGINS`
   - `AUTH_DEVICE_VERIFICATION_URI`

6. 入力名の大文字・underscoreを再確認し、`Deploy`を選ぶ。
7. Secretは保存後に値を再表示できないため、名前が存在することだけ確認する。

### 5.2 CLIを使う場合

`wrangler secret put`は入力のたびに新しいWorker versionを作り、即時反映する。
一括反映したい場合はDashboardを使う。CLIでは値をコマンド引数へ書かず、対話プロンプトへ貼る。

```bash
pnpm --filter @harness-hub/hub exec wrangler secret put AUTH_SESSION_SECRET
pnpm --filter @harness-hub/hub exec wrangler secret put AUTH_ACCESS_TOKEN_SECRET
pnpm --filter @harness-hub/hub exec wrangler secret put ENCRYPTION_KEK
pnpm --filter @harness-hub/hub exec wrangler secret list
```

通常変数はDashboardまたは`apps/hub/wrangler.jsonc`の`vars`へ設定する。
現在のCIは`wrangler deploy`に`--keep-vars`を付けていないため、Dashboardだけに置いた通常変数は
次回のCI deployで消える可能性がある。次回deploy前に次のどちらかを必ず行う。

1. 3変数を`wrangler.jsonc`へ反映して、設定ファイルを正本にする。
2. 手動deployに限り`wrangler deploy --keep-vars`を使う。CIは別途修正が必要。

## 6. テナントごとのOIDCアプリを作る

2テナントそれぞれについて、IdP側で別々に作業する。

| 項目 | 入力例 |
| --- | --- |
| tenant slug | `acme` |
| issuer | IdP discovery documentの`issuer` |
| callback URL | `https://<hub-host>/api/auth/acme/callback/tenant-oidc` |
| scopes | `openid email profile` |

callback URLの`acme`部分は対象tenant slugへ置き換える。provider IDは常に`tenant-oidc`。
旧手順の`/api/auth/callback/google`や`/api/auth/callback/<provider-id>`は使わない。

IdPから`issuer` / `client_id` / `client_secret`を受け取る。

`client_secret`は平文メールで受け取らず、顧客の秘密共有機能から1Password等へ移す。

## 7. OIDC接続を本番DBへ登録する

直接SQLは使わない。次の処理は`@harness-hub/db`のrepositoryを使うため、
`client_secret_enc`の暗号化、tenant scope、暗号鍵台帳を既存実装へ委譲できる。

### 7.1 1テナント分の値をマスク入力する

zshで実行する。2テナント目は値を入れ替えて同じ手順を繰り返す。

```bash
read -r -s 'TURSO_DATABASE_URL?Turso database URL: '; printf '\n'
read -r -s 'TURSO_AUTH_TOKEN?Turso auth token: '; printf '\n'
read -r -s 'ENCRYPTION_KEK?ENCRYPTION_KEK: '; printf '\n'
read -r 'TENANT_SLUG?Tenant slug: '
read -r 'TENANT_NAME?Tenant display name: '
read -r 'TENANT_PLAN?Tenant plan (例 standard): '
read -r 'OIDC_ISSUER?OIDC issuer: '
read -r 'OIDC_CLIENT_ID?OIDC client ID: '
read -r -s 'OIDC_CLIENT_SECRET?OIDC client secret: '; printf '\n'
export TURSO_DATABASE_URL TURSO_AUTH_TOKEN ENCRYPTION_KEK
export TENANT_SLUG TENANT_NAME TENANT_PLAN OIDC_ISSUER OIDC_CLIENT_ID OIDC_CLIENT_SECRET
```

### 7.2 repository経由で登録する

```bash
pnpm --filter @harness-hub/db exec tsx -e '
import { createCoreRepositories, createRepositoryContext, createTursoClient } from "@harness-hub/db";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

void (async () => {
  const adapter = createTursoClient({
    url: required("TURSO_DATABASE_URL"),
    authToken: required("TURSO_AUTH_TOKEN"),
  });
  try {
    const repositories = createCoreRepositories({
      adapter,
      kekBase64: required("ENCRYPTION_KEK"),
    });
    const slug = required("TENANT_SLUG");
    const issuerUrl = required("OIDC_ISSUER");
    const clientId = required("OIDC_CLIENT_ID");
    const clientSecret = required("OIDC_CLIENT_SECRET");
    const tenant = (await repositories.tenants.findBySlug(slug)) ??
      (await repositories.tenants.create({
        slug,
        name: required("TENANT_NAME"),
        plan: required("TENANT_PLAN"),
      }));
    if (tenant.status !== "active") throw new Error("tenant is not active");
    const context = createRepositoryContext({ tenantId: tenant.id });
    const current = (await repositories.idpConnections.list(context))
      .find((row) => row.issuerUrl === issuerUrl);
    if (current) {
      if (current.clientId !== clientId) throw new Error("existing client_id differs");
      const stored = await repositories.idpConnections.decryptClientSecret(context, current.id);
      if (stored !== clientSecret) throw new Error("existing client_secret differs");
      console.log(JSON.stringify({ result: "already-configured", tenantId: tenant.id, connectionId: current.id }));
    } else {
      const created = await repositories.idpConnections.insert(context, {
        issuerUrl,
        clientId,
        clientSecret,
        scopes: "openid email profile",
      });
      const stored = await repositories.idpConnections.decryptClientSecret(context, created.id);
      if (stored !== clientSecret) throw new Error("encrypted secret round-trip failed");
      console.log(JSON.stringify({ result: "created", tenantId: tenant.id, connectionId: created.id }));
    }
  } finally {
    adapter.close();
  }
})().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
'
```

成功時に出力するのはtenant ID / connection IDだけで、secretは出力しない。
既存行と`client_id`または`client_secret`が違う場合は停止する。直接削除や上書きをせず、
rotation手順を別途判断する。

作業後、ターミナルの値を消す。

```bash
unset TURSO_DATABASE_URL TURSO_AUTH_TOKEN ENCRYPTION_KEK
unset TENANT_SLUG TENANT_NAME TENANT_PLAN OIDC_ISSUER OIDC_CLIENT_ID OIDC_CLIENT_SECRET
```

## 8. 入力後の確認

まず秘密値を表示しない確認を行う。

```bash
pnpm --filter @harness-hub/hub exec wrangler secret list
curl -fsS https://<hub-host>/health
curl -i https://<hub-host>/api/auth/<tenant-slug>/providers
```

期待結果は、Secret 3名の存在、`/health`のHTTP 200、2テナントのprovider endpointのHTTP 200、
callback URLの`/api/auth/<slug>/callback/tenant-oidc`一致、未登録slugの404である。

その後、各テナントでブラウザログインを1回ずつ行う。

```text
https://<hub-host>/<tenant-slug>/signin
```

初回利用者は`role=member`固定で作られる。role昇格はログイン後に別のprovider-admin操作で行う。

### ログイン導線の確認

Auth.js handlerの正しいsign-in endpointは
`/api/auth/<tenant-slug>/signin/tenant-oidc`であり、sign-in画面も同じpathへ送信する。
遷移できない場合は設定値で回避せず、P13を保留する。

## 9. 失敗時

- Secret/変数投入後に障害が出たら`wrangler versions list`で作業前versionを確認する。
- Workerを戻す場合は`wrangler rollback <VERSION_ID>`を使う。
- `ENCRYPTION_KEK`は安易に以前と違う値へ戻さない。DB暗号文との組み合わせが必要。
- OIDC接続行は直接SQLで削除しない。対象tenantを`suspended`にすると認証解決は停止する。
- `/device`が404、または2テナントloginが通らない場合はP13をcloseしない。

## 10. 完了チェック

- [ ] Secret 3件を入力した
- [ ] 通常変数 3件を入力した
- [ ] 通常変数を次回deployで保持する方法を決めた
- [ ] 2テナントのIdPへ正しいcallback URLを登録した
- [ ] 2テナントのOIDC接続をrepository経由でDBへ登録した
- [ ] 2テナントのprovider endpointが200
- [ ] 2テナントのブラウザloginが成功
- [ ] role 4種の認可サンプルが期待どおり
- [ ] Device Flow code → approve → token → revokeが成功
- [ ] session緊急失効が60秒以内に反映
- [ ] dev専用認証providerが存在しない

チェックが1つでも残る場合、`HarnessHub-15h.13`は`in_progress`のままにする。

## 参照

- [Cloudflare Workers: Environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Cloudflare Workers: Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
- [OIDC provider登録手順](./runbook-oidc-provider-onboarding.md)
- [リリース記録](./release-record.md)
