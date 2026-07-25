---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P08
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy P08 リファクタリング/マイグレーション記録

- graph_node_id: `sys-auth-tenancy-p08`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`

## 0. 本 task に DB migration が存在しない理由

本 feature は `packages/db/schema/` を write scope に持たない。
`session_revocations` / `users` / `publisher_tokens` / `device_authorizations` / `idp_connections` のスキーマ owner は
**`feat-domain-model-db`** であり、本 feature はリポジトリ層関数 (port) を呼ぶ側に立つ。

したがって前例 (feat-domain-model-db の P08) における「migration 生成」に相当する処理は存在せず、
task spec の読み替えに従って次の 3 点を実施した。既存データへの後方互換性・backfill は構造的に発生しない。

1. Auth.js adapter 境界の最終リファクタリング (§1)
2. dev 専用 provider 非存在を恒久保証する CI 検査の確立 (§2)
3. Dev tenant の OIDC provider 登録手順の整理 (§3)

---

## 1. Auth.js adapter 境界の是正記録

### 1.1 確定した境界

```
apps/hub/src/lib/auth/adapter/     ← Auth.js 固有 API を扱ってよい唯一の場所
├── index.ts                       ← 唯一の公開入口。外から参照してよいのはここだけ
├── authjs-config.ts
├── callbacks.ts
└── session-provider.ts

apps/hub/src/shared/auth/          ← Auth.js を知らない抽象 (Principal / AuthProvider / denyAllAuthProvider)
apps/hub/src/lib/auth/index.ts     ← barrel。adapter へは ./adapter/index.js 経由でのみ触る
```

`apps/hub/src/lib/auth/index.ts` は `./adapter/index.js` / `./config.js` / `./device-flow/index.js` /
`./jwt.js` / `./oidc.js` / `./ports.js` / `./session.js` のみを再輸出し、adapter 内部ファイルを直接輸出しない。

### 1.2 是正した逸脱

P05/P06 の実装完了時点で、境界外からの Auth.js 固有 API 参照は **0 件**であった (`T-BND-01` 検査で確認)。
一方、**検査自体に穴があった**ため、そちらを是正した。

| 是正前 | 問題 | 是正後 |
| --- | --- | --- |
| 公開入口 `adapter/index.ts` の再輸出だけを見ていた | `index.ts` → `callbacks.ts` → `next-auth` の**2 段再輸出**なら、入口に `next-auth` の文字が一度も現れないまま Auth.js 由来型が境界外へ出る | 入口から**到達可能な**再輸出グラフを幅優先で辿り、経路上のどこで Auth.js module が現れても検出する (`reexportLeaks()`) |

是正後、意図的な 2 段再輸出を投入して exit 1 での赤化と検出経路
(`adapter/index.ts -> adapter/__probe.ts`) の出力を確認済み (P06 §3)。

### 1.3 未実施であり、意図的にそうしている事項

**`next-auth` は現時点で未インストールである。**
`apps/hub/src/app/api/auth/[...nextauth]/route.ts` は 501 `auth_provider_not_wired` を返す。

これは実装漏れではなく D3 caveat (Better Auth への乗り換え余地を残す) に沿った状態である。
境界は依存の有無と無関係に成立しており、`T-BND-01`/`T-BND-02` は module 指定子と参照経路だけを見るため、
`next-auth` を導入した瞬間から同じ検査がそのまま効く。

乗り換えが発生した場合に触るファイルは `adapter/` 配下の 4 枚に閉じる。
これが本境界を維持している唯一の理由であり、**入口を増やすと乗り換えコストが即座に膨らむ**。

---

## 2. dev 専用 provider 非存在の CI 検査

### 2.1 なぜ「環境変数で切る」実装を採らないか

qa-036 / I7 の要件は「dev 環境では認証を緩める」ではなく **緩める口をコードに置かない**である。

`if (process.env.SKIP_AUTH) { ... }` のような実装は、その変数が誤って本番環境に入った瞬間に
**設定ミス 1 個で全認可が無効化される**。1 個のミスで全部が開くものは、実装として置かない。
Dev tenant も本番とまったく同じ OIDC 経路を通す (§3)。

したがって検査対象は import ではなく**文字列の出現**になる。コメントも走査対象に含める
(「昔ここに mock login があった」という痕跡ごと消したいため)。

### 2.2 検査スクリプト一覧

いずれも `apps/hub/scripts/` 配下。共有 CI パイプライン本体 (`package.json` / `.github/`) は
不可侵範囲のため触っていない (§2.4)。

| スクリプト | 対応テスト ID | quality_constraint | 内容 |
| --- | --- | --- | --- |
| `check-auth-adapter-boundary.mjs` | `T-BND-01` `T-BND-02` | `auth-adapter-boundary-better-auth-migration-hedge-d3-qa020` | Auth.js module の境界外 import / 入口からの再輸出到達性 / adapter 内部への deep import |
| `check-dev-auth-provider-absence.mjs` | `T-BND-03` `T-BND-04` | `no-hub-native-account-idp-delegation-i7` | 認証バイパス語群 + パスワード資格情報語群 |
| `check-single-authz-middleware.mjs` | (SEC2 補強) | `role4-authorization-matrix-single-middleware-deny-by-default-sec2` | 認可判定の語彙が `lib/authz/` の外に現れない |
| `check-auth-gates.mjs` | — | (上記 3 件を束ねる) | 3 本を 1 コマンドで実行し、1 本でも fail なら非ゼロ終了 |

### 2.3 禁止語と、その射程

禁止語には**必ず射程 (どこで禁止か) が付随する**。射程を書かない禁止語は、
誤検出か検査漏れのどちらかを必ず起こす。そのため語群を 2 つに分け、走査範囲を変えてある。

**認証バイパス語群 (`T-BND-03`) — 射程: `apps/hub/src` + `apps/hub/tests` + `packages/schemas/auth-tenancy`**

抜け道はどこに書かれても抜け道なので、hub 全域を見る。

| パターン | 何を疑うか |
| --- | --- |
| `CredentialsProvider` | Auth.js の Credentials provider (ID/パスワード直受け) |
| `Credentials\s*\(` | Credentials provider の呼び出し |
| `SKIP_AUTH` | 認証スキップの環境変数 |
| `DISABLE_AUTH` | 認証無効化の環境変数 |
| `AUTH_BYPASS` / `BYPASS_AUTH` | 認証バイパスの環境変数 |
| `ALLOW_INSECURE_AUTH` | 検証を緩める環境変数 |
| `mock-login` / `mockUser` / `fakeUser` | mock ログイン / 偽ユーザー |
| `dev-login` / `devUser` | dev 専用ログイン |
| `impersonate` | なりすましログイン |
| `NEXTAUTH_DEV` / `AUTH_DEV_MODE` | dev 専用 Auth モード切替 |

**パスワード資格情報語群 (`T-BND-04`) — 射程: auth 実装 path のみ**

`apps/hub/src/lib/auth` / `lib/authz` / `shared/auth` / `middleware` / `app/api` / `packages/schemas/auth-tenancy`

| パターン | 何を疑うか |
| --- | --- |
| `bcrypt` / `argon2` / `scrypt` / `pbkdf2` | パスワードハッシュ実装 |
| `password` / `passwd` | パスワード資格情報の取り扱い |

射程を auth 実装に閉じているのは、`users` テーブルの `passwordHash` 列が
**別 feature (`feat-domain-model-db`) の所有物**だからである。あの列については
「保持していても Hub の認証には使わない」が正しい状態であり、列の存在自体は本検査の対象ではない。
射程を全域に広げると、その列を PII マスキング対象として検証している別 feature のテストと、
「無いこと」を主張している `oidc-verification.test.ts:330` の正規表現リテラル自身を誤検出する。

### 2.4 走査範囲から外している場所 (明示)

検査結果 JSON の `excluded_from_scan` に記録し、**穴を黙って作らない**。

- `apps/hub/scripts/` — 本検査スクリプト自身が禁止語を定義として保持するため
- パスワード語群は auth 実装 path のみ (`users.passwordHash` 列の owner は `feat-domain-model-db`)

### 2.5 実行結果

```
$ node apps/hub/scripts/check-auth-gates.mjs
[auth-adapter-boundary] OK: 走査 92 ファイル / 違反 0 件
[single-authz-middleware] OK: 走査 97 ファイル / 違反 0 件 / allowlist 3 件 / route 例外 5 件が期待集合と一致
[dev-auth-provider-absence] OK: 走査 97 ファイル / 禁止語 15 種 (T-BND-03+T-BND-04) / 検出 0 件
[auth-gates] OK: 3 ゲート全て pass
```

### 2.6 CI への結線 (未実施 / follow-up)

`check-auth-gates.mjs` は**手動実行では pass しているが、CI パイプラインへは未結線である**。
`apps/hub/package.json` の scripts 追加も、`.github/workflows/` の変更も、
task spec が「共有 CI は不可侵。本 task は feature 固有チェックスクリプトの追加のみ」と定めているため
本 task の write scope 外にあたる。

結線に必要な変更は次の 1 行で、follow-up 課題として起票済み。

```jsonc
// apps/hub/package.json の "scripts" へ追加し、root の `pnpm verify` から呼ぶ
"check:auth-gates": "node scripts/check-auth-gates.mjs"
```

**現状は「検査は存在するが CI では自動実行されない」状態である。** これを
「CI ゲート化済み」と読み替えてはならない (P09 quality-assurance-report.md §4 に同じ注記あり)。

---

## 3. テナント OIDC provider の登録手順

### 3.1 登録先とデータ形

登録先は control-plane DB の `idp_connections` (owner: `feat-domain-model-db`)。
本 feature が認証で参照するのは次の形 (`apps/hub/src/lib/auth/ports.ts` の `TenantOidcConnection`)。

| フィールド | 内容 |
| --- | --- |
| `tenantId` | テナント ID |
| `tenantSlug` | URL の `/{tenant_slug}/signin` に現れる識別子 |
| `issuer` | discovery document の `issuer` と**厳密一致**すべき値 |
| `clientId` | OIDC クライアント ID |
| `displayName` | 「〇〇でログイン」のボタン文言 |
| `enabled` | `false` の接続は解決対象から外れる |

**`client_secret` は port の外へ出さない。** `TenantOidcConnection` に secret フィールドが無いのは意図的で、
アプリケーション層へ渡した値は必ずログ・エラー・シリアライズのどこかから漏れるため。

### 3.2 新規テナントの登録手順 (一般)

1. テナント側の IdP (Google Workspace / Microsoft Entra ID / Okta 等) で OIDC アプリケーションを作成する。
2. リダイレクト URI に `https://<hub-host>/api/auth/callback/<provider-id>` を登録する。
3. IdP から `issuer` / `client_id` / `client_secret` を受け取る。
4. `feat-domain-model-db` が提供するリポジトリ層関数経由で `idp_connections` へ登録する
   (`client_secret` は暗号化列 / Workers Secret へ格納し、平文でリポジトリへ置かない)。
5. `enabled = true` にする。
6. `https://<hub-host>/<tenant_slug>/signin` からログインを 1 回通し、JIT provisioning で
   `users` 行が **role = member 固定**で作られることを確認する
   (`UserDirectoryPort.createFromOidc` の契約。role は呼び出し側が決めない)。
7. 初期の workspace-admin は既存の provider-admin が昇格させる。

> 手順 6 の「member 固定」は、IdP 側の claim を信用して role を決めないための設計である。
> IdP が返す任意の claim で role が決まると、テナント側の IdP 設定変更だけで Hub の権限が動く。

### 3.3 Dev tenant の登録手順 (qa-036)

**開発/デモ環境も本番とまったく同じ経路を通す。** dev 専用の抜け道は作らない (§2.1)。

1. **提供者 (HarnessHub 運営) 自身の Google Workspace** で OIDC アプリケーションを作成する。
   - `issuer`: `https://accounts.google.com`
   - リダイレクト URI: dev 環境の Hub ホストに対する `https://<dev-hub-host>/api/auth/callback/google`
2. Google Cloud Console の OAuth 同意画面を **内部 (Internal)** に設定する。
   提供者ドメインのアカウントだけがログインできる状態にし、外部アカウントを弾く。
3. dev 環境の control-plane DB に Dev tenant (`tenant_slug: dev` など) を作成する。
4. §3.2 と同じ手順で `idp_connections` へ登録する。`client_secret` は
   dev 環境の Workers Secret (`wrangler secret put`) へ入れる。
5. `https://<dev-hub-host>/dev/signin` からログインし、提供者アカウントで通ることを確認する。
6. 提供者アカウントを provider-admin へ昇格させる (初回のみ)。

デモ用アカウントが必要な場合も、**Google Workspace 側でアカウントを作る**。
Hub 側に「デモ用ログイン」を実装しない。これが I7 (Hub ネイティブアカウントを持たず IdP へ委譲する) の帰結であり、
`T-BND-03` の禁止語検査が恒久的に強制する。

---

## 4. 本 task で変更したファイル

| ファイル | 変更 |
| --- | --- |
| `apps/hub/scripts/check-auth-adapter-boundary.mjs` | 新規 + 再輸出到達性解析 (T-BND-02) を追加 |
| `apps/hub/scripts/check-dev-auth-provider-absence.mjs` | 新規 + パスワード語群 (T-BND-04) を射程つきで追加 |
| `apps/hub/scripts/check-single-authz-middleware.mjs` | 新規 |
| `apps/hub/scripts/check-auth-gates.mjs` | 新規 (3 本の束ね役) |
| `apps/hub/src/lib/auth/device-flow/service.ts` | `countFailure` を関数宣言から arrow function へ (巻き上げにより null 絞り込みが閉包へ届かなかった TS18047 の是正) |

`packages/db/schema/` への変更は**なし** (§0)。
