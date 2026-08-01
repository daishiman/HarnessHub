---
status: confirmed
layer: feature-design
task: issue-auth-tenancy-shared-google-oidc-20260729
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
beads_ids:
  - HarnessHub-fnej
---

# feat-auth-tenancy 運用手順書: 共通 Google OAuth client 方式の段階導入

- graph_node_id: `issue-auth-tenancy-shared-google-oidc-20260729`
- 対象読者: HarnessHub 運用担当者
- 親文書: [runbook.md](./runbook.md) / 設計根拠: [AD-10](./architecture-decision-record-shared-google-oidc.md)
- テナント別 client 方式 (従来) の手順: [runbook-oidc-provider-onboarding.md](./runbook-oidc-provider-onboarding.md)

この文書は、**HarnessHub 所有の共通 Google OAuth client を 1 つだけ作り**、テナントを
共通方式へ乗せるまでと、失敗時に戻すまでを扱う。従来のテナント別 client 方式は廃止しない。
両方式は併存し、テナントごとに `credential_mode` で選ぶ。

> 秘密値を本文・issue・PR・チャット・メール・スクリーンショットへ残さない。
> 各タスクは順番に 1 件ずつ実行し、完了ゲートを満たさないまま次へ進まない。

## 0. 実行タスク一覧

| ID | タスク | 完了時に得られるもの | 次 |
| --- | --- | --- | --- |
| S-01 | 共通 client を 1 度だけ作る | client ID / client secret / 登録済み redirect URI 1 本 | S-02 |
| S-02 | Cloudflare へ credential を投入する | Worker から共有 client が読める状態 | S-03 |
| S-03 | migration 0003 を本番へ適用する | `credential_mode` / `allowed_workspace_domains` 列 | S-04 |
| S-04 | パイロットテナント 1 件を共有方式で登録する | 共有方式の接続 1 件 | S-05 |
| S-05 | 往復と拒否経路を実地で確認する | 合格記録 | S-06 |
| S-06 | 段階的に対象テナントを増やす | 共有方式テナント n 件 | 完了 |

作業記録にはタスク ID・tenant slug・担当者・完了時刻・完了ゲートだけを残す。

---

## S-01. 共通 client を 1 度だけ作る

従来手順 ([runbook-oidc-provider-onboarding.md](./runbook-oidc-provider-onboarding.md)) の
G-02〜G-06 をそのまま実行する。ただし **HarnessHub 所有の Cloud project で 1 回だけ**行い、
テナントごとには繰り返さない。相違点は次の 2 点だけ。

| 項目 | テナント別方式 (従来) | 共通方式 (本手順) |
| --- | --- | --- |
| Cloud project の所有者 | 顧客の Organization | **HarnessHub の Organization** |
| Authorized redirect URI | テナントごとに 1 本ずつ追加 | **下記の 1 本だけ。以後追加しない** |

```text
https://harness-hub.daishimanju.workers.dev/api/auth/shared/callback/tenant-oidc
```

- 末尾 `/`・wildcard・大文字・別 provider 名を加えない。
- `Audience` は `External` になる (複数の顧客 Workspace の利用者が使うため)。
  brand verification / domain verification を求められる場合があり、これは本番 rollout の前提条件である。
  実装完了とは切り離して進める。
- Data Access の scope は従来と同じ `openid` / `email` / `profile` の 3 件だけ。
- client secret は 1Password の concealed field へ保存する。item 名は
  `HarnessHub prod OIDC - shared-google` とする。

**完了ゲート**: 上記 URI が 1 本だけ登録され、client ID / secret が 1Password にある。
**停止条件**: 別 origin (custom domain 等) へ移す予定が確定している。先に origin を確定する。

---

## S-02. Cloudflare へ credential を投入する

| 名前 | 種別 | 値 |
| --- | --- | --- |
| `SHARED_GOOGLE_OAUTH_CLIENT_ID` | Worker Secret | S-01 の client ID |
| `SHARED_GOOGLE_OAUTH_CLIENT_SECRET` | Worker Secret | S-01 の client secret |

名前の正本は `apps/hub/src/lib/auth/shared-credentials.ts` の
`SHARED_GOOGLE_CLIENT_ID_ENV` / `SHARED_GOOGLE_CLIENT_SECRET_ENV` である。
この文書と実装が食い違ったら**実装側が正**。

```bash
# 値は標準入力で渡す。コマンドライン引数に置くとシェル履歴へ残る
op run --account "$OP_ACCOUNT" -- sh -c '
  printf %s "$SHARED_CLIENT_ID" | pnpm --filter @harness-hub/hub exec wrangler secret put SHARED_GOOGLE_OAUTH_CLIENT_ID
  printf %s "$SHARED_CLIENT_SECRET" | pnpm --filter @harness-hub/hub exec wrangler secret put SHARED_GOOGLE_OAUTH_CLIENT_SECRET
'
```

`client_id` は秘密ではないので Variable でもよいが、**2 つを同じ種別に揃える**ほうが
rotation 時に片方だけ更新し忘れる事故が減る。両方 Secret にする。

### `wrangler.jsonc` の必須台帳へ追記するタイミング

`apps/hub/wrangler.jsonc` の `secrets.required` への追記は、**この S-02 を実施する段で**行う。
実装の land 時点では追記しない — 共有方式のテナントが 0 件の環境で「必須」と宣言すると、
未投入がデプロイ前検査の恒常的な赤になり、本当に足りない Secret の検知を鈍らせる。

**完了ゲート**: `wrangler secret list` に 2 件が現れる (値は表示しない)。
**停止条件**: 片方しか投入できない。片方だけの状態はアプリ側が `null` (共有方式は解決不能) に倒すので
安全ではあるが、中途半端な状態を放置しない。

---

## S-03. migration 0003 を本番へ適用する

```bash
pnpm --filter @harness-hub/db exec tsx scripts/migrate-deploy.ts --url "$TURSO_DATABASE_URL" --dry-run
pnpm --filter @harness-hub/db exec tsx scripts/migrate-deploy.ts --url "$TURSO_DATABASE_URL"
```

`0003_auth-tenancy-shared-google-oidc.sql` は **ADD COLUMN 2 本のみ**で、既存行の意味を変えない
(AD-10.4)。`credential_mode` の DEFAULT は `customer_google` で、列を足す前に存在した行は
実際に顧客持ち込み client なので既定値がそのまま正しい。

**完了ゲート**: 2 回目の実行が `appliedBefore == appliedAfter` になる (冪等＝何回実行しても結果が同じ)。
**停止条件**: dry-run の `journal` が 4 でない。台帳に載っていない DDL が適用されている疑いがある。

---

## S-04. パイロットテナント 1 件を共有方式で登録する

最初は**社内テナント 1 件**に限定する。顧客テナントを先に乗せない。

| 入力 | 値 |
| --- | --- |
| `TENANT_SLUG` | パイロットテナントの slug (`shared` は予約語なので使えない) |
| `OIDC_ISSUER` | `https://accounts.google.com` 固定 |
| `ALLOWED_WORKSPACE_DOMAINS` | 受理する Google Workspace ドメインの JSON 配列 (`["senpai-lab.com"]`) |

`client_id` と `client_secret` は**渡さない**。共有方式の登録入力にはそもそも書く場所が無く、
渡そうとすると型検査で落ちる (AD-10.1)。

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
    const tenant = await repositories.tenants.findBySlug(required("TENANT_SLUG"));
    if (tenant === null) throw new Error("tenant not found");
    if (tenant.status !== "active") throw new Error("tenant is not active");
    const context = createRepositoryContext({ tenantId: tenant.id });
    const issuerUrl = required("OIDC_ISSUER");
    const existing = (await repositories.idpConnections.list(context)).find(
      (row) => row.issuerUrl === issuerUrl);
    if (existing) throw new Error("connection already exists; rotation は別手順");
    const created = await repositories.idpConnections.insert(context, {
      credentialMode: "shared_google",
      issuerUrl,
      scopes: "openid email profile",
      allowedWorkspaceDomains: JSON.parse(required("ALLOWED_WORKSPACE_DOMAINS")),
    });
    if (created.clientSecretEnc !== "") throw new Error("共有方式の行へ secret が入っている");
    console.log(JSON.stringify({ result: "created", connectionId: created.id }));
  } finally { adapter.close(); }
})().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
'
```

**完了ゲート**: 出力が `created` で、`client_secret_enc` が空文字である
(= 共有 secret がテナント行へ複製されていない / 受入条件 4)。
**停止条件**: 許可ドメインが空配列。実装が書き込み前に拒否するが、
「後で入れる」で空のまま登録しようとしていること自体が設計の誤解を示す。

---

## S-05. 往復と拒否経路を実地で確認する

| # | 手順 | 期待 |
| --- | --- | --- |
| 1 | `/{slug}/signin` から Google ログイン | 成功。session cookie が発行される |
| 2 | 認可 URL の `redirect_uri` を目視 | S-01 で登録した 1 本と完全一致 |
| 3 | 許可ドメイン**外**の Google アカウントで 1 を実行 | 拒否。session cookie が発行されない |
| 4 | 個人 Google アカウント (`hd` なし) で 1 を実行 | 拒否 |
| 5 | 別テナントの認可を開始し、その `state` を 1 の callback へ差し替えて提示 | 400。理由文言を返さない |
| 6 | 顧客持ち込み方式の既存テナントでログイン | 従来どおり成功 (非回帰) |

3・4・5 は**拒否されたこと**だけでなく、**session cookie が発行されていないこと**を
ブラウザの開発者ツールで確認する。「エラー画面が出た」だけでは、その裏で
利用者行が作られていないことの証拠にならない。

**完了ゲート**: 6 件すべてが期待どおり。／**停止条件**: 1 件でも外れたら S-06 へ進まず §4 へ。

---

## S-06. 段階的に対象テナントを増やす

1 度に増やすのは **1 テナントずつ**。各テナントで S-04 → S-05 を繰り返す。

- 既存の顧客持ち込み方式テナントを共有方式へ**移行しない**。新規テナントだけを共有方式で作る。
  移行は「動いている認証を止めるかもしれない変更」であり、この手順の対象外。
- 共有方式テナントが増えるほど、S-01 の client 1 つの侵害が及ぶ範囲が広がる。
  §5 の失効手順を実行できる状態を保ったまま増やす。

---

## 4. ロールバック

### 4.1 アプリだけ戻す (migration は戻さない)

列を追加しただけなので、旧版のアプリは列を無視する。**共有方式のテナント行が残ったまま
旧版へ戻すと、そのテナントは認証できなくなる** (旧版に共有 credential の読取が無いため)。

```bash
# 1. 共有方式の接続を削除する (テナント単位)
#    deleteById は自テナントの行しか消さない
# 2. 旧版の Worker を再デプロイする
```

削除したテナントは、必要なら従来のテナント別 client 方式で登録し直す
([runbook-oidc-provider-onboarding.md](./runbook-oidc-provider-onboarding.md) G-02 から)。

### 4.2 列は落とさない

`credential_mode` / `allowed_workspace_domains` の DROP COLUMN は行わない。SQLite では
表再作成 = 破壊的 DDL になり、`idp_connections` 全行を書き換えるリスクが、
残しておく列 2 本のコストを上回る。列は残したまま `customer_google` の行だけが存在する状態へ戻す。

**完了ゲート**: `credential_mode='shared_google'` の行が 0 件。／
**停止条件**: 削除対象テナントに稼働中の利用者がいる。先に周知する。

---

## 5. 共有 secret の rotation と全テナント失効

共有 client の secret が漏えいした場合、影響は**全共有テナント**に及ぶ。

| # | 手順 | 備考 |
| --- | --- | --- |
| 1 | Google Cloud Console で client secret を rotate (新規発行 → 旧を無効化) | client ID は変わらない |
| 2 | 1Password の item を新しい値へ更新 | 旧値は履歴に残る |
| 3 | S-02 の手順で Worker Secret を上書き投入 | `client_id` 側は変更不要 |
| 4 | 進行中の認可を打ち切る場合は `session_revocations` へ書く | AD-7 の即時失効経路。最大 60 秒で反映 |

- **テナント行の更新は不要**。共有 secret は環境単位に 1 組しかないので、rotation は 1 箇所で終わる。
  これが AD-10.1 で行へ複製しないと決めた実利である。
- 署名付き `state` の鍵 (`AUTH_SESSION_SECRET`) を rotate すると、進行中の共有方式の認可は
  すべて `bad_signature` で落ちる。TTL は 600 秒なので、10 分待てば新規分だけになる。

**完了ゲート**: 新 secret で S-05 の 1 が成功し、旧 secret での token 交換が失敗する。

---

## 6. 参照

- 設計根拠: [AD-10](./architecture-decision-record-shared-google-oidc.md)
- 検証証跡: [test-run-results-shared-google-oidc.md](./test-run-results-shared-google-oidc.md)
- 仕様書: [issues/sys-auth-tenancy-shared-google-oidc-20260729.md](../../../issues/sys-auth-tenancy-shared-google-oidc-20260729.md)
- 本番投入の共通手順: [production-auth-manual-setup.md](./production-auth-manual-setup.md)
