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
- 対象読者: HarnessHub の運用担当者 (provider-admin 権限を持つ人)
- 親文書: [runbook.md](./runbook.md)

[runbook.md](./runbook.md) から**オンボーディング系の 2 手順**を分離した文書。
失効・棚卸し・監視といった「事故対応と定期監視」は親文書が扱う。
こちらは「テナントを新しく受け入れるとき」と「開発/デモ環境を初期構築するとき」に読む。

> **前提**: 本 feature は `packages/db/schema/` を所有しない。手順中の DB 操作はすべて
> `feat-domain-model-db` が提供するリポジトリ層関数を経由する。テーブルへ直接 SQL を打たない
> (直打ちは監査を残さず、キャッシュ整合も壊す)。

| # | 手順 | 使う場面 |
| --- | --- | --- |
| 1 | 新規テナントの OIDC provider 登録 | 新規顧客のオンボーディング |
| 2 | Dev tenant の OIDC provider 登録 | 開発/デモ環境の初期構築 |

---

## 1. 新規テナントの OIDC provider 登録

### 1.1 いつ使うか

新規顧客のオンボーディング時。テナントごとに IdP (Identity Provider＝ログインを預ける外部サービス) が異なる。

### 1.2 手順

1. **テナント側の IdP で OIDC アプリケーションを作成してもらう**
   (Google Workspace / Microsoft Entra ID / Okta など)。
2. **リダイレクト URI を登録してもらう**: `https://<hub-host>/api/auth/callback/<provider-id>`
3. **`issuer` / `client_id` / `client_secret` を受け取る**。
   - `client_secret` はメール等の平文経路で受け取らない。
4. **`idp_connections` へ登録する** (`feat-domain-model-db` のリポジトリ層関数経由)。

   | フィールド | 内容 |
   | --- | --- |
   | `tenant_id` | テナント ID |
   | `tenant_slug` | ログイン URL に現れる識別子 (`/{tenant_slug}/signin`) |
   | `issuer` | discovery document の `issuer` と**厳密一致**する値 |
   | `client_id` | OIDC クライアント ID |
   | `display_name` | 「〇〇でログイン」のボタン文言 |
   | `enabled` | `true` |

   `client_secret` は暗号化列 / Cloudflare Workers Secret へ格納する。
   **リポジトリへ平文で置かない** (`pnpm check:secrets` が検出して CI が落ちる)。

5. **`enabled = true` にする。**
6. **ログインを 1 回通す**: `https://<hub-host>/<tenant_slug>/signin`
   初回ログインで `users` 行が **role = member 固定**で自動作成される (JIT provisioning)。
7. **初期の workspace-admin を昇格させる**: 既存の provider-admin が対象利用者の role を変更する。
   反映は最大 15 分 (即時にしたい場合は [runbook.md](./runbook.md) §1 で session を失効させる)。

### 1.3 なぜ初回ログインの role が member 固定なのか

IdP が返す claim (グループ名や属性) を信用して role を決めると、
**テナント側の IdP 設定を変えるだけで Hub の権限が動いてしまう**。
Hub の権限は Hub 側でしか変えられない、という状態を保つために role は member 固定で作られ、
昇格は Hub 側の明示操作のみで行う (`UserDirectoryPort.createFromOidc` の契約)。

### 1.4 登録後の確認

- 別テナントの利用者が、この新規テナントの資源へ到達できないこと (越境が 404 になること)
- 監査に `provider.cross_tenant_access` が意図せず大量に出ていないこと

---

## 2. Dev tenant の OIDC provider 登録 (開発 / デモ環境)

### 2.1 原則: dev 環境も本番とまったく同じ経路を通す

**Hub には「dev 専用ログイン」も「デモ用アカウント」も存在しない。**
`SKIP_AUTH` のような環境変数で認証を緩める実装も置かない。

理由: 環境変数で切る実装は、その変数が誤って本番に入った瞬間に
**設定ミス 1 個で全認可が無効化される**。1 個のミスで全部が開くものは実装として置かない。

この原則は `apps/hub/scripts/check-dev-auth-provider-absence.mjs` が
禁止語検査として恒久的に強制している (`T-BND-03` / `T-BND-04`)。

### 2.2 手順

1. **提供者 (HarnessHub 運営) 自身の Google Workspace** で OIDC アプリケーションを作成する。
   - `issuer`: `https://accounts.google.com`
   - リダイレクト URI: `https://<dev-hub-host>/api/auth/callback/google`
2. **Google Cloud Console の OAuth 同意画面を「内部 (Internal)」に設定する。**
   提供者ドメインのアカウントだけがログインでき、外部アカウントは弾かれる。
3. dev 環境の control-plane DB に Dev tenant を作成する (`tenant_slug: dev` など)。
4. §1.2 の手順 4〜5 と同じ形で `idp_connections` へ登録する。
   `client_secret` は `wrangler secret put` で dev 環境の Workers Secret へ入れる。
5. `https://<dev-hub-host>/dev/signin` からログインし、提供者アカウントで通ることを確認する。
6. 提供者アカウントを provider-admin へ昇格させる (初回のみ)。

### 2.3 デモ用アカウントが必要になったら

**Google Workspace 側でアカウントを作る。** Hub 側に作らない。
Hub にデモ用ログインを実装すると、それは本番にも存在する認証バイパスになる。
