---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P12
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---
# feat-auth-tenancy 運用手順書: OIDC provider 登録
- graph_node_id: `sys-auth-tenancy-p12`
- 対象読者: HarnessHub運用担当者と、顧客IdPの管理者
- 親文書: [runbook.md](./runbook.md)
- 本番DB・Cloudflareへの投入: [production-auth-manual-setup.md](./production-auth-manual-setup.md)
この文書は、HarnessHub本番テナントのGoogle OIDC資格情報を作り、1Passwordへ保管し、
本番DB登録タスクへ安全に引き渡すまでを扱う。現行の本番IdPはGoogleだけである。
> 各タスクは順番に1件ずつ実行する。完了ゲートを満たさないまま次へ進まない。
> 秘密値を本文、issue、PR、チャット、メール、スクリーンショットへ残さない。
## 0. 実行タスク一覧

| ID | タスク | 完了時に得られるもの | 次 |
| --- | --- | --- | --- |
| G-01 | HarnessHubの入力値を確定 | 入力表とcallback | G-02 |
| G-02 | 顧客所有Cloud projectと権限を確定 | project ID / Organization / operator | G-03 |
| G-03 | Google Auth Platformを初期登録 | Branding / Audience /連絡先 | G-04 |
| G-04 | Data Accessをidentity scopeだけに限定 | scope 3件 | G-05 |
| G-05 | 1Password itemを先に準備 | secret受取先 | G-06 |
| G-06 | Web OAuth clientを作成 | client ID / client secret | G-07 |
| G-07 | Google設定とdiscoveryを検証 | 1テナント分の合格記録 | 次テナントのG-02 |
| G-08 | 設定値を最終確認 | 取り違えなしの引渡し記録 | G-09 |
| G-09 | 本番DB登録へ引き渡す | P13の次作業が開始可能 | 本番手順§7 |

作業記録にはタスクID、tenant slug、担当者、完了時刻、完了ゲートだけを残す。
## G-01. HarnessHub本番テナントの入力値を確定する
次の確定値を秘密値を扱わない運用記録へ複製する。

| 入力 | 本番値 |
| --- | --- |
| 正式名称 / tenant slug | `HarnessHub` / `harness-hub` |
| Google Workspace domain | `senpai-lab.com` |
| Google Cloud project name / ID | `harness-hub` / `harness-hub-503821` |
| project owner / OAuth設定担当者 | `manjumoto.daishi@senpai-lab.com` |
| user support / contact email | `manjumoto.daishi@senpai-lab.com` |
| Audience / initial user | `Internal` / `manjumoto.daishi@senpai-lab.com` |
| callback URL | 下記で確定 |
| 1Password item | `HarnessHub prod OIDC - harness-hub` |
slugは1〜63文字の小文字英数字と`-`だけを使い、先頭・末尾を`-`にしない。
`dev`、`test`、`sample`のような用途不明な仮名は禁止する。

```text
https://harness-hub.daishimanju.workers.dev/api/auth/harness-hub/callback/tenant-oidc
```

末尾`/`、wildcard、大文字、別provider名を加えない。
custom domainを使う場合は、このタスクでoriginを決定してから先へ進む。
**完了ゲート**: project/slug/callback/itemが上表と一致。／**停止条件**: Workspace、管理者、初回利用者のいずれかが変更された。

## G-02. 顧客所有Cloud projectと権限を確定する
1. 対象顧客のGoogle Workspace管理者で[Google Cloud Console](https://console.cloud.google.com/)へログインする。
2. 上部project pickerで対象projectを選ぶ。無ければ`New Project`を選ぶ。
3. `Project name`へG-01の値を入力し、`Organization`は対象顧客の組織を選ぶ。
4. `No organization`しか選べない場合は作成せず、顧客のGoogle管理者へ戻す。
5. `PROJECT_ID`という仮文字を入力せず、実Project IDをコピーして`gcloud projects describe '<実ID>'`で照合する。
6. `IAM & Admin` → `IAM`で顧客側の人間のOwnerまたはEditorが1名以上いることを確認する。
7. OAuth設定担当者へ`OAuth Config Editor (roles/oauthconfig.editor)`を付与する。

本番は1テナント1projectを原則とし、個人所有projectやHarnessHub開発用projectを流用しない。
OAuth設定担当者にproject自体の作成権限がない場合、G-02のproject作成だけ顧客管理者が行う。
**完了ゲート**: project ID、project number、Organization、project owner、OAuth設定担当者を記録済み。／**停止条件**: projectのOrganizationが顧客Workspaceと違う、または顧客側ownerが0名。

## G-03. Google Auth Platformを初期登録する
1. 対象projectを選択したまま`Google Auth Platform` → `Overview`を開く。
   `gcloud iap oauth-brands`や`iap.googleapis.com`は廃止済みIAP専用経路なので使わない。
2. 未登録なら`GET STARTED`を選ぶ。登録済みなら`Branding`を開いて既存値を確認する。
3. `App name`へ`HarnessHub - <正式テナント名>`を入力する。
4. `User support email`へG-01の監視されているメールまたはGoogle Groupを選ぶ。
5. `Audience`は次の条件で1つだけ選ぶ。

   - `Internal`: projectが顧客Organization配下で、利用者全員が同じOrganizationに所属する。
   - `External`: 上記を満たさない。初回は`Testing`のままにし、G-01のpilot userを追加する。

6. `Contact Information`へ障害・ポリシー通知を受け取る担当メールを入力する。
7. `CREATE`または`SAVE`を選び、`Branding`と`Audience`を開き直して保存値を確認する。
8. logoは顧客承認とGoogle審査方針が決まるまで追加しない。

Externalを`In production`へ変える場合、顧客の公開方針、プライバシーポリシー、
利用規約、所有確認可能なcustom domainが必要かを顧客管理者が判断する。
共有`workers.dev`ドメインを顧客所有ドメインとして申告しない。
**完了ゲート**: App name、support email、Audience、contact emailがG-01と一致。／**停止条件**: `Internal`なのにpilot userが別Organization、またはExternal公開方針が未承認。

## G-04. Data Accessをidentity scopeだけに限定する
1. `Google Auth Platform` → `Data Access` → `ADD OR REMOVE SCOPES`を選ぶ。
   見当たらなければ`https://console.cloud.google.com/auth/scopes?project=harness-hub-503821`を直接開く。
   日本語UIの「データアクセス」または「スコープ」も同じ画面で、Overviewへ戻る場合はG-03未完了である。
2. 次の3件だけを選ぶ。候補に無ければ`Manually add scopes`へ完全な文字列を入力する。

```text
openid
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

3. `UPDATE`を選び、Data Accessの一覧を再表示する。
4. Gmail、Drive、Calendar、Admin SDKなどのscopeが無いことを確認する。
**完了ゲート**: HarnessHubが要求するscopeが上記3件だけで、追加scopeが0件。／**停止条件**: 顧客が追加scopeを要求した。P13へ混ぜず別のセキュリティレビューへ戻す。

## G-05. 1Passwordの受取itemを準備する
1Passwordは本番Workerが実行時に読む場所ではなく、作成時の安全な受取、障害対応、
rotation時に運用担当者が参照する保管庫である。最初に1Passwordデスクトップアプリの
`Settings` → `Developer` → `Integrate with 1Password CLI`を有効にする。

### G-05-1. CLIと実在vaultを確認する
```bash
op --version; op account list
OP_ACCOUNT='manju.1password.com'
op vault list --account "$OP_ACCOUNT" --format json | jq -r '.[] | [.id, .name] | @tsv'
```

複数accountでは本番正本のsign-in addressを`OP_ACCOUNT`へ固定し、全`op`操作へ`--account`を付ける。
`HarnessHub Production OIDC`は例示名であり、自動作成済みとは限らない。今回の
`isn't a vault in this account`は、指定名に完全一致する閲覧可能なvaultが無いという意味である。
一覧に表示された実在名を設定し、同名が1件だけであることを検証してIDへ固定する。
```bash
OP_VAULT_NAME='HarnessHub Production OIDC'
OP_VAULT_ID="$(
  op vault list --account "$OP_ACCOUNT" --format json |
    jq -er --arg name "$OP_VAULT_NAME" '
      [.[] | select(.name == $name)] |
      if length == 1 then .[0].id elif length == 0 then error("vault not found")
      else error("vault name is not unique") end'
)"
op vault get "$OP_VAULT_ID" --account "$OP_ACCOUNT" --format json | jq '{id, name}'
```
適切なvaultが無い場合は作業を止める。運用責任者が共有範囲と管理者権限を承認した場合だけ、
1Password管理者がUIまたは次のCLIで作成し、上の一覧・ID確定を再実行する。
```bash
op vault create 'HarnessHub Production OIDC' \
  --description 'HarnessHub production Google OIDC operator custody' --allow-admins-to-manage=true \
  --account "$OP_ACCOUNT" --format json | jq '{id, name}'
```
既存vaultのアクセスを確認する。社内運用者とはitemリンクではなく専用groupでvaultを共有する。
```bash
op vault user list "$OP_VAULT_ID" --account "$OP_ACCOUNT"
op vault group list "$OP_VAULT_ID" --account "$OP_ACCOUNT"
```
Business契約でgroupへ権限を付ける場合の例は次のとおり。`OP_GROUP`を実在groupへ置換し、
`manage_vault`、削除、export、item共有、印刷権限は運用上必要な場合だけ別承認で付ける。
```bash
OP_GROUP='<HarnessHub本番運用group>'
op vault group grant --account "$OP_ACCOUNT" --vault "$OP_VAULT_ID" --group "$OP_GROUP" \
  --permissions allow_viewing,view_items,view_and_copy_passwords,view_item_history,create_items,edit_items --no-input
```
Teams契約は権限が粗いため、`allow_viewing,allow_editing`を持つOIDC専用vaultに分離する。

### G-05-2. Secure Noteを作る
UIでは`New Item` → `Secure Note`、CLIでは下の手順を使う。item名は
`HarnessHub prod OIDC - <tenant-slug>`とし、同名itemが既にあれば作成せず内容を照合する。

| field | 1Password type | G-06前の値 |
| --- | --- | --- |
| `tenant_slug` / `tenant_name` / `provider` | Text | 実値 / 実値 / `google` |
| `google_project_id` / `audience` | Text | G-01の値 |
| `issuer` | Text | `https://accounts.google.com` |
| `client_id` | Text | 空欄 |
| `client_secret` | Password | 空欄 |
| `callback_url` / `discovery_url` | URL | 実callback / discovery URL |
| `pilot_user_email` / `credential_owner` | Email | G-01の値 / 運用責任者 |
| `created_at` / `rotation_review_at` / `expires_at` | Date | 当日 / 定期確認日 / 実期限だけ |
実際の有効期限がある場合だけ`expires_at`を追加する。無期限のsecretに確認日を入れず、
定期確認日は`rotation_review_at`で管理する。CLI作成例では秘密でない値だけを引数に渡す。
```bash
TENANT_SLUG='<実slug>'; TENANT_NAME='<正式名>'; GOOGLE_PROJECT_ID='<project-id>'
AUDIENCE='<InternalまたはExternal>'; CALLBACK_URL='<G-01のcallback>'
PILOT_USER_EMAIL='<pilot-user>'; CREDENTIAL_OWNER='<運用責任者email>'
ROTATION_REVIEW_AT='<YYYY-MM-DD>'; ITEM_TITLE="HarnessHub prod OIDC - $TENANT_SLUG"
MATCHES="$(op item list --account "$OP_ACCOUNT" --vault "$OP_VAULT_ID" --format json |
  jq -r --arg title "$ITEM_TITLE" '[.[] | select(.title == $title)] | length')"
[[ "$MATCHES" == 0 ]] || { print -u2 '同名itemを確認してください'; exit 1; }
ITEM_ID="$(op item create --account "$OP_ACCOUNT" --category 'Secure Note' --vault "$OP_VAULT_ID" --title "$ITEM_TITLE" \
  "tenant_slug[text]=$TENANT_SLUG" "tenant_name[text]=$TENANT_NAME" 'provider[text]=google' \
  "google_project_id[text]=$GOOGLE_PROJECT_ID" "audience[text]=$AUDIENCE" \
  'issuer[text]=https://accounts.google.com' 'client_id[text]=' 'client_secret[password]=' \
  "callback_url[url]=$CALLBACK_URL" \
  'discovery_url[url]=https://accounts.google.com/.well-known/openid-configuration' \
  "pilot_user_email[email]=$PILOT_USER_EMAIL" "credential_owner[email]=$CREDENTIAL_OWNER" \
  "created_at[date]=$(date +%F)" "rotation_review_at[date]=$ROTATION_REVIEW_AT" \
  --format json | jq -er '.id')"
```
**完了ゲート**: vault ID、item ID、groupアクセスを確認し、secret以外が入力済み。／**停止条件**: vaultが一覧に無い、同名vault/itemが複数ある、対象外メンバーが閲覧できる。

## G-06. Web OAuth clientを作成してsecretを保存する
1. Google Cloudの対象project名と1Password itemのslugを声に出さず目視で照合する。
2. `Google Auth Platform` → `Clients` → `CREATE CLIENT`を選ぶ。
3. `Application type`は`Web application`、`Name`は`HarnessHub production - <tenant-slug>`。
4. `Authorized JavaScript origins`は空のままにする。
5. `Authorized redirect URIs`へG-01のcallbackを1件だけ追加する。
6. `CREATE`を選び、結果画面を閉じない。
7. client IDは秘密でないため、次で1Passwordへ登録する。
   ```bash
   read -r 'OIDC_CLIENT_ID?Google client ID: '
   op item edit "$ITEM_ID" --account "$OP_ACCOUNT" --vault "$OP_VAULT_ID" "client_id[text]=$OIDC_CLIENT_ID" >/dev/null
   ```

8. client secretは履歴やprocess listへ出るためassignment引数へ書かない。次のJSONパイプで
   マスク入力し、既存のPassword型がCLI上の`CONCEALED`型であることも同時に検証する。
   ```bash
   (
     set -euo pipefail
     set +x
     read -r -s 'OIDC_CLIENT_SECRET?Google client secret: '; printf '\n'
     [[ -n "$OIDC_CLIENT_SECRET" ]] || { print -u2 'secretは空にできません'; exit 1; }
     export OIDC_CLIENT_SECRET
     op item get "$ITEM_ID" --account "$OP_ACCOUNT" --vault "$OP_VAULT_ID" --format json |
       jq -e '
         ([.fields[] | select(.label == "client_secret" and .type == "CONCEALED")] | length) as $n |
         if $n == 1 then
           (.fields[] | select(.label == "client_secret" and .type == "CONCEALED") | .value) =
             env.OIDC_CLIENT_SECRET
         else error("client_secret must be exactly one CONCEALED field") end' |
       op item edit "$ITEM_ID" --account "$OP_ACCOUNT" --vault "$OP_VAULT_ID" >/dev/null
   )
   ```
9. 値を表示せず、field型と入力有無だけを確認する。`--reveal`は付けない。
   ```bash
   op item get "$ITEM_ID" --account "$OP_ACCOUNT" --vault "$OP_VAULT_ID" --format json |
     jq '{id,title,fields:[.fields[] |
       {label,type,has_value:((.value // "") | length > 0)}]}'
   printf 'clipboard cleared' | pbcopy
   ```
10. 1Password itemを開き直し、client IDが末尾`.apps.googleusercontent.com`であることを確認する。
11. Googleのclient詳細でclient IDとsecret末尾4文字を1Password表示と照合し、画面を閉じる。
client secretの全値を確認できるのは作成時だけである。JSONをGitやDownloadsへ保存しない。
取り逃した場合は推測せず`Add Secret`で新しいsecretを作り、失ったsecretを無効化する。
`set -x`、secretを含むCLI引数、`op read`の単独実行、`op item get --reveal`、平文ファイル、
メール添付、チャット、issue、GitHub Secrets、テナント別Worker Secretsへの保存は禁止する。
**完了ゲート**: Web client、redirect 1件、client ID、Password型secretが同じtenant itemに存在。／**停止条件**: secretを保存できなかった、callbackが違う、別tenant itemへ貼った可能性がある。

## G-07. 1テナント分を検証する
```bash
curl -fsS https://accounts.google.com/.well-known/openid-configuration \
  | jq -er '.issuer == "https://accounts.google.com"'
```
1. 上のコマンドが`true`を出してexit 0になることを確認する。
2. Google `Clients`でtype=`Web application`、JavaScript origins=0件、redirect=実callback 1件を確認する。
3. `Audience`でInternal/ExternalがG-01と一致することを確認する。
4. External/Testingならpilot userが登録済みであることを確認する。
5. `Data Access`がG-04の3 scopeだけであることを確認する。
6. 作業記録へproject ID、client名、client ID末尾6文字、Audience、callback、1Password item名を残す。

**完了ゲート**: 6項目が一致し、秘密値を含まない合格記録が1件ある。／**停止条件**: 反映待ちはclientを再作成せず、数分待って再確認する。

## G-08. HarnessHub設定値を最終確認する
HarnessHub本番テナントについて次を確認する。
- project ID、tenant slug、callback、1Password item名がG-01と一致する。
- issuerは`https://accounts.google.com`である。
- client secretをGitHub Secretsやテナント別Cloudflare Worker Secretsへ登録していない。
- G-07合格記録があり、秘密値やclient ID全値が記録へ漏れていない。
**完了ゲート**: 4項目すべて一致。違いが不明な場合はDB登録へ進まない。

## G-09. 本番DB登録タスクへ引き渡す
HarnessHub運用担当者へ渡すのは、tenant slug、1Password item名、Google project ID、
callback、G-07合格記録だけである。client secretをチャットやメールで渡さない。
社内運用者はvaultアクセスを使い、`op item share`を使わない。顧客から資格情報を受け取る場合だけ、
顧客側が受取人emailを制限した1時間・閲覧1回のコピーを作り、受取後に本番vaultへ保存する。
```bash
op item share '<顧客側item ID>' --vault '<顧客側vault>' \
  --emails 'harnesshub-operator@example.com' --expires-in 1h --view-once
```

共有linkは作成時点のコピーで、元itemの更新は反映されない。保存・照合後に失効を確認する。
次は[本番認証設定の手動投入手順](./production-auth-manual-setup.md) §7でHarnessHubを登録し、
§8のprovider endpointとブラウザloginを確認する。
runtimeの正本は暗号化済みDB行、復号鍵はCloudflare Worker Secret `ENCRYPTION_KEK`である。
`op://<vault-id>/<item-id>/<field>`の`<...>`は説明用であり、山括弧を含めて実行しない。
`<`を含む参照は`invalid character in secret reference`になる。手入力で参照を組み立てず、
`op item get "$ITEM_ID" --account "$OP_ACCOUNT" --vault "$OP_VAULT_ID" --format json`の対象fieldにある
`.reference`を本番手順§4の関数で取得する。`op read`と投入コマンドを直接pipe接続せず、
読取成功と空値でないことを先に検証する。§7.2は`pnpm`引数を配列化して`op run`で実行し、
`--no-masking`は付けず、実行後に参照変数を`unset`する。
これは運用担当者による登録時だけの処理であり、デプロイ後のWorkerは1Passwordへ接続しない。

## エラー時の戻り先

`org_internal`はG-02/G-03、`redirect_uri_mismatch`はG-01/G-06、
`invalid_client`はG-06、`access_denied`はG-03、`MissingCSRF`は本番手順§8、provider 404は§7へ戻る。callback URLは
Googleが付ける`code`/`state`と開始時cookieが必要なため直接開かない。provider/CSRFも500なら本番手順§2/§8で配信versionと認証環境変数を確認する。

## 公式資料

- [Google Auth Platform: 初期登録](https://support.google.com/cloud/answer/15544987) /
  [client](https://support.google.com/cloud/answer/15549257) /
  [Audience](https://support.google.com/cloud/answer/15549945) /
  [Data Access](https://support.google.com/cloud/answer/15549135)
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google OAuthConfig IAM roles](https://cloud.google.com/iam/docs/roles-permissions/oauthconfig)
- [1Password: custom field](https://support.1password.com/custom-fields/) /
  [CLI](https://developer.1password.com/docs/cli/get-started/) /
  [secret reference](https://developer.1password.com/docs/cli/secret-references/)
- [1Password共有: vault](https://support.1password.com/create-share-vaults-teams/) /
  [item](https://support.1password.com/share-items/)
