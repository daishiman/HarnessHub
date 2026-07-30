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
> 秘密値をこの文書、issue、PR、チャットへ貼らない。1Passwordを復元可能な運用原本とし、
> GitHub/Cloudflareは一方向の投入先にする。Workerは1Passwordを読まず、OIDC secretは暗号化してDBへ登録する。
## 1. 入力する情報

| 名前 | 種別 | 作り方・入手元 | 入力先 |
| --- | --- | --- | --- |
| `AUTH_SESSION_SECRET` | Secret | 32 byte以上のランダム値 | Worker |
| `AUTH_ACCESS_TOKEN_SECRET` | Secret | session用とは別の32 byte以上のランダム値 | Worker |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Secret | 1Password本番基盤item | GitHub Actions + Worker + DB登録 |
| `ENCRYPTION_KEK` | Secret | 1Password本番基盤itemの**base64化した32 byte** | Worker + DB登録 |
| `AUTH_CANONICAL_ORIGIN` | 通常変数 | Hubの正規origin。pathと末尾`/`を付けない | Cloudflare Worker |
| `AUTH_ALLOWED_ORIGINS` | 通常変数 | 変更系リクエストを許可するoriginのカンマ区切り | Cloudflare Worker |
| `AUTH_DEVICE_VERIFICATION_URI` | 通常変数 | Device Flow承認画面の絶対URL | Cloudflare Worker |
| OIDC `issuer` | Google設定 | Google discovery documentの`issuer`と完全一致 | 本番DB |
| OIDC `client_id` | Google設定 | Googleで作成したOAuth client | 本番DB |
| OIDC `client_secret` | Google Secret | Googleで作成したOAuth client | 1Passwordから手動投入し、暗号化して本番DB |
`AUTH_SECRET`は旧版へのrollbackで使う可能性があるため、新版の動作確認が終わるまで削除しない。
## 2. 作業前の確認

リポジトリルートで実行する。

```bash
pnpm --filter @harness-hub/hub exec wrangler --version
pnpm --filter @harness-hub/hub exec wrangler whoami
pnpm --filter @harness-hub/hub exec wrangler versions list
pnpm --filter @harness-hub/hub exec wrangler secret list
node scripts/ci/check-actions-secrets.mjs --live
```

- Wranglerは4.xを使う。確認時点のローカル版は`4.113.0`。
- 対象Worker名が`harness-hub`であることをCloudflare Dashboardでも確認する。
- `secret list`と`--live`が確認できるのは名前・種別・更新状態だけで、値ではない。

## 3. URL 3項目を決める

現在の本番origin候補を使う場合は次の3値になる。custom domainへ切り替えるなら3値とIdP callbackを同時に変更する。

| 変数 | 本番値 |
| --- | --- | --- |
| `AUTH_CANONICAL_ORIGIN` | `https://harness-hub.daishimanju.workers.dev` |
| `AUTH_ALLOWED_ORIGINS` | `https://harness-hub.daishimanju.workers.dev` |
| `AUTH_DEVICE_VERIFICATION_URI` | `https://harness-hub.daishimanju.workers.dev/device` |

入力直前にCloudflare DashboardのWorker URLと一致することを再確認する。`/device`のHTTP 200だけでは
Device Flow合格ではなく、code → approve → token → revokeまで実行して判定する。

## 4. GitHub / Cloudflare Secretの原本を確保する
GitHub Actions SecretとCloudflare Worker Secretは、登録後に値を再表示できない。現在は両方に
Turso 2件、Cloudflareに`ENCRYPTION_KEK`が存在するが、そこからローカルへ引用はできない。
本番運用vaultへSecure Note `HarnessHub prod infrastructure`を作り、次を保存する。

| field | 1Password type | 用途 |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | URL | GitHub / Worker / DB登録で共用 |
| `TURSO_AUTH_TOKEN` | Password (`CONCEALED`) | 同上 |
| `ENCRYPTION_KEK` | Password (`CONCEALED`) | Worker / DB登録で共用。GitHubへ置かない |

このitemが無い場合、既存remote Secretから復元しない。URLはTurso CLI/Dashboardで確認する。
tokenは発行直後に1Passwordへ保存してから投入先を更新する。保存失敗したtokenは個別失効できず、
全token無効化を要するため運用記録へ残す。KEK不明かつ暗号化済み行ありならDEK re-wrapを計画する。
暗号化済み行0件の初期構築だけは、DB backupと0件を再確認後、新しい32 byte KEKを原本へ保存し、
WorkerとDB登録で同じ値を使う。

`<infra-vault-id>`の山括弧を含む文字列は説明用であり、そのまま実行しない。`<`は1Passwordの
secret referenceで不正な文字になる。CLIをunlockし、実在IDを一覧から選んでfieldの正規参照を取得する。

```bash
OP_ACCOUNT='manju.1password.com'; op account list
OP_INFRA_VAULT_ID="$(op vault get 'HarnessHub Production OIDC' --account "$OP_ACCOUNT" --format json | jq -er .id)"
OP_INFRA_ITEM_ID="$(op item list --account "$OP_ACCOUNT" --vault "$OP_INFRA_VAULT_ID" --format json |
  jq -er '[.[]|select(.title=="HarnessHub prod infrastructure")] |
    if length==1 then .[0].id else error("infrastructure item missing or duplicated") end')"
op_field_ref() {
  op item get "$2" --account "$OP_ACCOUNT" --vault "$1" --format json |
    jq -er --arg label "$3" '[.fields[]|select(.label==$label)] |
      if length==1 then .[0].reference else error("field missing or duplicated") end'
}
TURSO_URL_REF="$(op_field_ref "$OP_INFRA_VAULT_ID" "$OP_INFRA_ITEM_ID" TURSO_DATABASE_URL)"
TURSO_TOKEN_REF="$(op_field_ref "$OP_INFRA_VAULT_ID" "$OP_INFRA_ITEM_ID" TURSO_AUTH_TOKEN)"
KEK_REF="$(op_field_ref "$OP_INFRA_VAULT_ID" "$OP_INFRA_ITEM_ID" ENCRYPTION_KEK)"
```

## 5. Cloudflare Workerへ入力する
公開URL 3件は`apps/hub/wrangler.jsonc`の`vars`を正本とする。必須Secret 5件も同ファイルの
`secrets.required`へ名前だけを宣言したため、不足時はdeployを停止できる。値はGitへ入らない。
既存値を再入力しない。初回投入またはrotation時だけ、次の失敗時停止helperでGitHubへ同期する。
`op read ... | コマンド`という直結は、読取失敗後も空入力で後段が起動するため使わない。

```bash
from_op() {
  local ref="$1"; shift; local value
  value="$(op read --account "$OP_ACCOUNT" "$ref")" || { print -u2 '1Password読取失敗: 後段は未実行'; return 1; }
  [[ -n "$value" ]] || { print -u2 '空のsecret: 後段は未実行'; return 1; }
  printf '%s' "$value" | "$@"
}
from_op "$TURSO_URL_REF" gh secret set TURSO_DATABASE_URL
from_op "$TURSO_TOKEN_REF" gh secret set TURSO_AUTH_TOKEN
```

Workerへの投入前に、100%配信versionとlatest versionが同じか確認する。違う場合は停止する。
`wrangler secret put`は即時配信を伴い、`versions secret put`はlatestを元に未配信versionを作る。
したがって失敗versionがlatestの状態で、どちらも実行・deployしてはいけない。

```bash
ACTIVE_ID="$(pnpm --filter @harness-hub/hub exec wrangler deployments status --json |
  jq -er '.versions[]|select(.percentage==100)|.version_id')"
LATEST_ID="$(pnpm --filter @harness-hub/hub exec wrangler versions list --json |
  jq -er 'max_by(.number).id')"
[[ "$ACTIVE_ID" == "$LATEST_ID" ]] ||
  { print -u2 "停止: active=$ACTIVE_ID latest=$LATEST_ID"; return 1 2>/dev/null || exit 1; }
from_op "$KEK_REF" pnpm --filter @harness-hub/hub exec wrangler versions secret put \
  ENCRYPTION_KEK --message 'production ENCRYPTION_KEK rotation'
```

作成versionは`wrangler versions view <ID>`でbindingを確認し、品質ゲート後にだけ
`wrangler versions deploy <ID>`で明示配信する。今回のようにactiveとlatestが違う場合は、
検証済みコードを新しいlatestとしてuploadするリリース工程まで待ち、その工程内でSecretを付ける。

## 6. テナントごとのOIDCアプリを作る
[OIDC provider登録手順](./runbook-oidc-provider-onboarding.md) G-01〜G-08を順番に完了する。
G-08の相互確認が不合格、または次の実行表が空なら本番DB登録へ進まない。

| 確認 | HarnessHub本番値 |
| --- | --- |
| 正式名称 / slug | `HarnessHub` / `harness-hub` |
| IdP / Audience | Google / Internal |
| callback | `https://harness-hub.daishimanju.workers.dev/api/auth/harness-hub/callback/tenant-oidc` |
| 1Password item | `HarnessHub prod OIDC - harness-hub` |
| Project / Workspace | `harness-hub-503821` / `senpai-lab.com` |
| 初回利用者 | `manjumoto.daishi@senpai-lab.com` |

1. 本番では`dev`専用providerや追加テナントを作らず、上表のHarnessHubだけを登録する。
2. Google OAuth clientを1件作り、同じproject/slug/itemへ保存する。
3. Application typeはWeb、flowはAuthorization Code、scopeは`openid email profile`。
4. callbackは表の値と完全一致させ、末尾`/`やwildcardを加えない。
5. discovery documentの`.issuer`を加工せず1Passwordへ保存する。
6. client secretは1Passwordのconcealed fieldへ保存し、メールやGitHub Secretsへ置かない。
   テナント別Cloudflare Worker Secretにも置かず、§7で暗号化して本番DBへ登録する。
7. 1Password itemの値を表示せず、item名だけを作業記録へ残す。

旧callback `/api/auth/callback/google`や`/api/auth/callback/<provider-id>`は使わない。
provider IDは常に`tenant-oidc`である。

## 7. OIDC接続を本番DBへ登録する
直接SQLは使わず、`@harness-hub/db`のrepositoryへ暗号化、tenant scope、暗号鍵台帳を委譲する。
保存経路は次のとおり。

```text
Google作成画面
  → 1Password（運用保管・受け渡し）
  → op run（登録処理の実行中だけ値を展開・出力をマスク）
  → 本番DB idp_connections.client_secret_enc（暗号文）
  → Workerが必要時だけENCRYPTION_KEKで復号
```

GitHub ActionsはOIDC client secretを使わないため、GitHub Secretsへの登録は不要である。
Cloudflareには共通の`ENCRYPTION_KEK`だけを登録し、Workerは1PasswordやローカルPCを参照しない。

### 7.1 1Passwordの参照を環境変数へ設定する
G-05と§4で確定した実在IDを使う。値自体ではなくfieldの正規`op://`参照だけをexportし、
TursoとKEKは同じOIDC itemへ混ぜない。

| 環境変数 | 中に入る情報 / 取得元 |
| --- | --- |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | 本番DBの接続URL / DB token。§4の本番基盤item |
| `ENCRYPTION_KEK` | DB内の暗号鍵を復号する共通鍵。§4の本番基盤item |
| `TENANT_SLUG` / `TENANT_NAME` | G-01で確定した識別子 / 表示名。テナントOIDC item |
| `TENANT_PLAN` | 現行は`standard` |
| `OIDC_ISSUER` | Google固定の`https://accounts.google.com` |
| `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` | G-06で作成したGoogle OAuth client。テナントOIDC item |

```bash
: "${OP_VAULT_ID:?G-05で実在vault IDを設定}" "${ITEM_ID:?G-05で実在item IDを設定}"
: "${OP_INFRA_VAULT_ID:?§4で実在vault IDを設定}" "${OP_INFRA_ITEM_ID:?§4で実在item IDを設定}"
export TENANT_SLUG="$(op_field_ref "$OP_VAULT_ID" "$ITEM_ID" tenant_slug)"
export TENANT_NAME="$(op_field_ref "$OP_VAULT_ID" "$ITEM_ID" tenant_name)"
export TENANT_PLAN='standard'
export OIDC_ISSUER="$(op_field_ref "$OP_VAULT_ID" "$ITEM_ID" issuer)"
export OIDC_CLIENT_ID="$(op_field_ref "$OP_VAULT_ID" "$ITEM_ID" client_id)"
export OIDC_CLIENT_SECRET="$(op_field_ref "$OP_VAULT_ID" "$ITEM_ID" client_secret)"
export TURSO_DATABASE_URL="$TURSO_URL_REF"
export TURSO_AUTH_TOKEN="$TURSO_TOKEN_REF"
export ENCRYPTION_KEK="$KEK_REF"
```

### 7.2 repository経由で登録する
```bash
OIDC_REGISTER=(pnpm --filter @harness-hub/db exec tsx -e)
op run --account "$OP_ACCOUNT" -- "${OIDC_REGISTER[@]}" '
import { createCoreRepositories, createRepositoryContext, createTursoClient } from "@harness-hub/db";
const required = (name) => process.env[name]?.trim() ||
  (() => { throw new Error(`${name} is required`); })();
void (async () => {
  const adapter = createTursoClient(
    { url: required("TURSO_DATABASE_URL"), authToken: required("TURSO_AUTH_TOKEN") });
  try {
    const repositories = createCoreRepositories(
      { adapter, kekBase64: required("ENCRYPTION_KEK") });
    const slug = required("TENANT_SLUG");
    const issuerUrl = required("OIDC_ISSUER");
    const clientId = required("OIDC_CLIENT_ID");
    const clientSecret = required("OIDC_CLIENT_SECRET");
    const tenant = (await repositories.tenants.findBySlug(slug)) ??
      (await repositories.tenants.create(
        { slug, name: required("TENANT_NAME"), plan: required("TENANT_PLAN") }));
    if (tenant.status !== "active") throw new Error("tenant is not active");
    const context = createRepositoryContext({ tenantId: tenant.id });
    const current = (await repositories.idpConnections.list(context)).find(
      (row) => row.issuerUrl === issuerUrl);
    if (current) {
      if (current.clientId !== clientId) throw new Error("existing client_id differs");
      const stored = await repositories.idpConnections.decryptClientSecret(context, current.id);
      if (stored !== clientSecret) throw new Error("existing client_secret differs");
      console.log(JSON.stringify({ result: "already-configured", tenantId: tenant.id, connectionId: current.id }));
    } else {
      const created = await repositories.idpConnections.insert(
        context, { issuerUrl, clientId, clientSecret, scopes: "openid email profile" });
      const stored = await repositories.idpConnections.decryptClientSecret(context, created.id);
      if (stored !== clientSecret) throw new Error("encrypted secret round-trip failed");
      console.log(JSON.stringify({ result: "created", tenantId: tenant.id, connectionId: created.id }));
    }
  } finally { adapter.close(); }
})().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
'
```
成功時に出力するのはtenant ID / connection IDだけで、secretは出力しない。
既存行と`client_id`または`client_secret`が違う場合は停止する。直接削除や上書きをせず、
rotation手順を別途判断する。`op run`へ`--no-masking`を付けない。
作業後、ターミナルの値を消す。

```bash
unset OP_VAULT_ID ITEM_ID OP_INFRA_VAULT_ID OP_INFRA_ITEM_ID TURSO_DATABASE_URL TURSO_AUTH_TOKEN ENCRYPTION_KEK
unset TENANT_SLUG TENANT_NAME TENANT_PLAN OIDC_ISSUER OIDC_CLIENT_ID OIDC_CLIENT_SECRET
```

## 8. 入力後の確認
まず秘密値を表示しない確認を行う。

```bash
pnpm --filter @harness-hub/hub exec wrangler secret list
curl -fsS https://<hub-host>/health
curl -i https://<hub-host>/api/auth/<tenant-slug>/providers
```

期待結果は、必須Secret 5名の存在、`/health`のHTTP 200、HarnessHub provider endpointのHTTP 200、
callback URLの`/api/auth/<slug>/callback/tenant-oidc`一致、未登録slugの404である。
その後、HarnessHubでブラウザログインを1回行う。

```text
https://<hub-host>/<tenant-slug>/signin
```

初回利用者は`role=member`固定で作られる。role昇格はログイン後に別のprovider-admin操作で行う。
### ログイン導線の確認
Auth.js handlerの正しいsign-in endpointは
`/api/auth/<tenant-slug>/signin/tenant-oidc`であり、画面は同じtenantのCSRF cookie/token取得後にPOSTする。
同じ画面へ戻る場合は`?error=MissingCSRF`を確認し、設定値で回避せずP13を保留する。

## 9. 失敗時
- Secret/変数投入後に障害が出たら`wrangler versions list`で作業前versionを確認する。
- Workerを戻す場合は`wrangler rollback <VERSION_ID>`を使う。
- `ENCRYPTION_KEK`は安易に以前と違う値へ戻さない。DB暗号文との組み合わせが必要。
- OIDC接続行は直接SQLで削除しない。対象tenantを`suspended`にすると認証解決は停止する。
- `/device`が404、またはHarnessHub loginが通らない場合はP13をcloseしない。

## 10. 完了チェック
- [x] Secret 3件を入力した
- [x] 通常変数 3件を入力した
- [x] 通常変数を次回deployで保持する方法を決めた
- [x] HarnessHubのIdPへ正しいcallback URLを登録した
- [x] HarnessHubのOIDC接続をrepository経由でDBへ登録した
- [x] HarnessHubのprovider endpointが200
- [x] HarnessHubのブラウザloginが成功
- [x] role 4種の認可サンプルが期待どおり
- [x] Device Flow code → approve → token → revokeが成功
- [x] session緊急失効が60秒以内に反映
- [x] dev専用認証providerが存在しない

チェックが1つでも残る場合、`HarnessHub-15h.13`は`in_progress`のままにする。
## 参照
- [Cloudflare Workers: Environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Cloudflare Workers: Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
- [OIDC provider登録手順](./runbook-oidc-provider-onboarding.md)
- [リリース記録](./release-record.md)
