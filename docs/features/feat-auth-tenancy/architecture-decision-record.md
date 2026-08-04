---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P02
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
source: docs/features/feat-auth-tenancy/requirements-baseline.md
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
architecture_refs: [arch-harness-hub-security, arch-harness-hub-backend]
---

# feat-auth-tenancy アーキテクチャ決定記録 (ADR)

> **位置づけ**: P02 の成果物。[requirements-baseline.md](./requirements-baseline.md) の quality_constraints 7 件・acceptance 3 件を実装可能な構造へ具体化する。本書で確定した決定は P05 実装の拘束条件であり、実装が本書と矛盾した場合は実装側を是正する (P05 rollback 規約)。

## 0. 決定一覧 (索引)

| id | 決定 | 対応する quality_constraint |
|---|---|---|
| [AD-1](#1-ad-1-スキーマ-owner-は-feat-domain-model-db-であり本-feature-は-port-越しにのみ触る) | session_revocations/users/publisher_tokens/device_authorizations のスキーマ owner は feat-domain-model-db。本 feature は port 越しに消費する | 全件の前提 |
| [AD-2](#2-ad-2-authjs-依存は-libauthadapter-の-1-ディレクトリに閉じる-d3) | Auth.js 依存は `apps/hub/src/lib/auth/adapter/` に閉じる | auth-adapter-boundary-…-d3-qa020 |
| [AD-3](#3-ad-3-role-は-列-3-値--関係-1-値-で-4-種を合成する) | `users.role` は 3 値。`owner` は `projects.owner_user_id` との関係から判定時に合成する | role4-authorization-matrix-…-sec2 |
| [AD-4](#4-ad-4-認可判定の単一集約点は-libauthz-であり-edge-middleware-は-その前段の-scope-gate-に限定する) | 認可判定の単一集約点は `apps/hub/src/lib/authz/`。edge middleware は scope gate に限定 | role4-…-sec2 / tenant-workspace-row-level-scope-…-d4 |
| [AD-5](#5-ad-5-テナント別-oidc-はログイン-url-でテナントを先に確定してから解決する) | テナント別 OIDC は `/{tenant_slug}/signin` でテナント先行確定 → 当該テナントの idp_connections のみを候補にする | tenant-oidc-dynamic-resolution-…-qa005 |
| [AD-6](#6-ad-6-device-flow-は-hub-側の-code--approve--token--rotation--revocation-までを所有する) | Device Flow は Hub 側の code/approve/token/rotation/revocation までを所有し、OS 資格情報保存は所有しない | device-flow-…-qa008 |
| [AD-7](#7-ad-7-session-は-jwt-stateless--session_revocations-による即時失効の-2-段で構成する) | session は JWT stateless + session_revocations 即時失効の 2 段 | session-jwt-staleness-…-qa036 |
| [AD-8](#8-ad-8-dev-専用-provider-を構造的に存在させない) | dev 専用 provider を構造的に存在させない (CI 禁止検査で恒久化) | no-hub-native-account-…-i7 |
| [AD-9](./architecture-implementation-notes.md#9-ad-9-数値契約は-libauthconfigts-の-1-箇所を正本にする) | 数値契約は `apps/hub/src/lib/auth/config.ts` の 1 箇所を正本にする | 全件の検証可能性 |
| [AD-10](./architecture-decision-record-shared-google-oidc.md) | 共通 Google OAuth client 方式: 環境単位の共有 secret + 共通 callback 1 本 + 署名付き `state` + `hd` 照合。AD-5 の代替ではなく併存 | issue-auth-tenancy-shared-google-oidc-20260729 |

> [実装追補](./architecture-implementation-notes.md) に AD-9 と P05〜P09 で確定した詳細がある。
> AD-1〜AD-9 を覆すものではなく、粒度を実装レベルまで下ろしたもの。
> AD-10 は P13 完了後に追加した 2 本目の方式で、[別文書](./architecture-decision-record-shared-google-oidc.md)に分離してある。

---

## 1. AD-1: スキーマ owner は feat-domain-model-db であり、本 feature は port 越しにのみ触る

### 判断

`session_revocations` / `users` / `publisher_tokens` / `device_authorizations` / `idp_connections` の**スキーマ定義・migration の owner は feat-domain-model-db** とする。本 feature は `packages/db/schema/` を一切変更せず、これらのテーブルへは**本 feature が定義する port インタフェース**を通してのみ到達する。

### 根拠 (3 系統)

| # | 証跡 | 内容 |
|---|---|---|
| ① | [docs/backend-spec.md](../../backend-spec.md) §2.2 | 上記 5 テーブルはいずれも「コアドメイン (公開基盤)」の行として定義されている。この節全体が feat-domain-model-db の write scope |
| ② | `.dev-graph/plans/.../feature-package-feat-domain-model-db/` phase-02 | 先行 architecture decision がコアドメイン 18 テーブル全体の owner を feat-domain-model-db と確定済み |
| ③ | 本 feature の published task spec (P05) | Write scope に `(packages/db/schema/ 配下は対象外)` と明示。構造的制約として owner 主張が不可能 |

### 帰結: port と adapter の関係

feat-domain-model-db の repository は現在の main に land 済みである。ただし、認証 port が要求する
Device Flow の `attempts` / `lastPolledAtSeconds` / `workspaceId` 等と、現行 DB schema/repository の形は
一致していない。スキーマ owner の境界を越えて場当たり的に補完せず、次の構造を維持する。

```
apps/hub/src/lib/auth/ports.ts     ← 本 feature が「必要とする問い合わせの形」を宣言する (consumer-driven contract)
        ↑ 実装を注入
   ├── テスト:  in-memory 実装 (本 feature 所有・テストダブル)
   └── 本番:    feat-domain-model-db の repository 実装 (land 後に 1 箇所で束ねる)
```

- port は**本 feature が所有する**。スキーマは所有しない。両者は別物であり、port の所有はスキーマ owner 主張ではない。
- port の各メソッドは第 1 引数に tenant scope を要求する (security-spec §3.6 の「tenant を受け取らない関数を作らない」を consumer 側でも守る)。
- **honest gap**: DB 層は存在するが、port と永続化契約の差が解消されるまで本番 adapter は結線しない。
  P11 evidence-summary と P13 release-record に既知ギャップとして記録し、「稼働済み」と偽らない。

## 2. AD-2: Auth.js 依存は `lib/auth/adapter/` の 1 ディレクトリに閉じる (D3)

### 判断

Auth.js (旧 NextAuth) の**型・関数・設定オブジェクトの語彙は `apps/hub/src/lib/auth/adapter/` の内側にのみ存在してよい**。この境界の外 (`app/`, `middleware.ts`, `lib/authz/`, `packages/`) は adapter が公開する自前の型 (`TenantOidcConfig` / `SessionClaims` / `AuthProvider`) だけを参照する。

### 境界の形

```
apps/hub/src/lib/auth/
├── adapter/                     ← Auth.js 語彙が許される唯一の領域
│   ├── authjs-config.ts         ← NextAuth(config) にそのまま渡せる config を組み立てる
│   ├── callbacks.ts             ← jwt / signIn callback (claims 構成・OIDC 受理判定)
│   └── index.ts                 ← 公開面。ここから出る型に Auth.js 由来の型を混ぜない
├── ports.ts                     ← AD-1 の consumer-driven contract
├── config.ts                    ← AD-9 の数値契約
├── oidc.ts                      ← AD-5 の検証契約 (Auth.js 非依存の純関数)
├── session.ts                   ← AD-7 の cookie/claims 契約
├── device-flow/                 ← AD-6 の RFC 8628 コア (Auth.js 非依存)
└── index.ts                     ← lib/auth 層の公開入口
```

### 移行トリガー (D3 caveat の明文化)

| トリガー | 対応 |
|---|---|
| Auth.js のセキュリティ修正が停止した (公式アナウンス or 90 日以上 CVE 未対応) | Better Auth への移行を起票する |
| Better Auth の移行ガイドが安定版になった | 移行コストを再見積もりする (即時移行はしない) |

移行時に書き換える対象は `adapter/` 配下のみであることを、P09 の静的検査 (`check-auth-adapter-boundary.mjs`) が機械的に保証する。

### 本 feature 時点の実装形態 (honest scope)

> **解消追記 (2026-07-26 / `HarnessHub-b7ng`)**: 以下は本 feature 初回完了時点の履歴である。
> 現在は `@auth/core`、session claims bridge、テナント別 route、本番 DB `AuthPorts` を実結線済み。
> 現行契約と検証は [spec-reflection-receipt.md](./spec-reflection-receipt.md) を参照。

初回完了時点では依存を追加できず、adapter は Auth.js 用 config の組立までを実装し、
`/api/auth/[...nextauth]` は未結線を明示する 501 を返していた。

## 3. AD-3: role は「列 3 値 + 関係 1 値」で 4 種を合成する

### 判断

| 概念 | 実体 | 値域 |
|---|---|---|
| `users.role` (DB 列) | feat-domain-model-db 所有の列 | `provider-admin` / `workspace-admin` / `member` の **3 値** |
| 実効 role (認可判定の単位) | 判定時に合成される値 | `provider-admin` / `workspace-admin` / `owner` / `member` の **4 値** |

`owner` は列ではなく `projects.owner_user_id === principal.userId` という**関係**である ([backend-spec.md](../../backend-spec.md) §2.2 / [security-spec.md](../../security-spec.md) §3.1)。同一利用者が Project A では owner、Project B では member になりうるため、認可判定は `(principal, action, resource)` の 3 項を要する。

### 全順序と単調性

```
member < owner < workspace-admin < provider-admin
```

- backend-spec §3.3 の許可表は**単調** (左から右へ許可が増えるだけ) である。この事実により実効 role を単一値へ還元でき、判定は `atLeast(effective, rule.minRole)` に落ちる。
- **単調性は仕様上の前提であり暗黙の仮定ではない**。テスト T-1b が許可表の単調性そのものを検査し、非単調な行が追加された瞬間に fail する。

### 合成が必要なのは member のみ

全順序の下で `workspace-admin` 以上は既に `owner` の許可を包含する。したがって owner 合成は `role === 'member'` のときだけ行えばよい (「適用しうる role の最大を返す」の最小実装)。

## 4. AD-4: 認可判定の単一集約点は `lib/authz/` であり、edge middleware は「その前段の scope gate」に限定する

### 問題

foundation (feat-hub-foundation) は既に `apps/hub/src/middleware/authz.ts` に `authorize()` を持ち、shared-layer registry は当該ディレクトリを `authz-middleware` 層の owner としている。ここへ role 判定を足すと、本 feature の write scope 外を書き換えることになる。一方 security-spec §3.5 は判定契約を単一モジュールへ集約せよと要求する。**二重実装を作らずに両立させる必要がある。**

### 判断: 責務を「境界」と「行為」に切って重ねる

| 層 | 所有 | 判定するもの | 判定しないもの |
|---|---|---|---|
| `src/middleware/` (edge) | feat-hub-foundation | **要求スコープの整合**: 認証済みか / path・header のスコープ申告が一意か / 申告テナントが principal のテナントと一致するか | action・role・scope |
| `src/lib/authz/` (decision) | **feat-auth-tenancy** | **行為の可否**: action → 最小 role、owner 合成、token scope、失効、越境の可否と監査要否 | HTTP の形 |

- edge は「**誰の要求として扱うか**」を確定する層 (D4 row-level-scope の第 1 段)。ここに role 比較は 1 行も書かない。
- `lib/authz` は「**その行為をしてよいか**」を決める唯一の層。role 比較・scope 比較・owner 合成はここにしか存在しない。
- 両者は入れ子であって並列ではない。edge を通った要求だけが `withAuthz()` に到達する。

### deny-by-default の二重化

| 層 | 既定 | 破り方 |
|---|---|---|
| edge | 明示 allowlist (`PUBLIC_PATH_PREFIXES`) に無い path は認証必須 | allowlist への追記のみ |
| decision | `ACTION_RULES` に規則が無い action は `no_rule` で拒否 | 規則表への追記のみ |

どちらも「書き忘れたら通る」ではなく「書き忘れたら落ちる」側に倒れている。

### 唯一の入口としての `withAuthz()`

`decide()` の戻り値を route handler に直接使わせない。`withAuthz(principal, action, resource, fn)` を唯一の入口とし、`crossTenant === true` のとき監査 append を**関数内で必ず実行**する (security-spec §3.1.3)。呼び出し側の善意に依存しない。

route handler が `withAuthz()` を経由していることは、foundation の duplicate detector (`unwrapped-route-handler`) が既に機械検査している。本 feature が追加する route はこの検査に適合させる。

### 例外扱いする route (RFC 8628 の構造的要請)

| route | 理由 | 統制 |
|---|---|---|
| `GET /health` | 外形監視用の公開 endpoint (feat-hub-foundation 所有。本 feature 以前から例外) | 認証情報を一切返さない |
| `/api/auth/[...nextauth]` | サインイン経路そのもの。認証**前**に到達するため wrapper を通せない (AD-2) | OIDC 検証契約 (AD-5) が実質の統制 |
| `POST /api/v1/device/code` | RFC 8628 §3.1: device がまだ principal を持たない段階の要求 | rate limit + 発行値がハッシュ保存 |
| `POST /api/v1/device/token` | RFC 8628 §3.4: polling は未承認状態で始まる | device_code ハッシュ照合 + interval 強制 |
| `POST /api/v1/token/refresh` | principal は refresh token の検証**結果**として得られる。検証前に principal は存在しない | rotation + 再利用検知 |

これらは `scripts/ci/shared-layer-registry.json` の `route_handler_policy.exemptions` へ理由付きで登録する (detector 自身が「登録簿の変更のみを正式経路とする」と定めている経路)。**さらに** 本 feature の CI 検査 (`check-single-authz-middleware.mjs`) が exemption 一覧を期待集合と厳密一致で照合し、将来 exemption が黙って増えることを防ぐ (実装と赤化確認は §10.1)。

## 5. AD-5: テナント別 OIDC は「ログイン URL でテナントを先に確定」してから解決する

### 判断

ログイン導線は `/{tenant_slug}/signin` を唯一の入口とする。tenant を先に確定し、**当該テナントの `idp_connections` のみ**を provider 候補にする。テナント跨ぎの候補提示は行わない。

### 検証契約 (T1 対策)

| 検証 | 実装上の扱い | 失敗時 |
|---|---|---|
| `issuer` | `idp_connections.issuer_url` と**厳密一致**。discovery document の `issuer` とも一致 | 拒否 |
| `aud` | 当該テナントの `client_id` と一致 (配列 aud は全要素一致を要求しない = 含むこと + `azp` 一致) | 拒否 |
| `nonce` | 認可要求時に生成した値と一致。**欠落は拒否** (存在しない = 不一致として扱う) | 拒否 |
| `state` | CSRF 防止。**欠落は拒否** | 拒否 |
| PKCE | `S256` のみ受理。`plain`・未使用は拒否 | 拒否 |
| tenant 束縛 | `sub` は `UNIQUE(tenant_id, idp_subject)` で束縛。他テナントの `sub` と衝突しても混線しない | 拒否 |
| email 信頼 | `email_verified === true` のみ受理。email は**識別子に使わない** | 拒否 |
| JIT provisioning | 初回ログインで `users` を `role='member'` / `status='active'` で作成。**role の自動昇格をしない** | — |

> **なぜ email を識別子にしないか**: 同一 email が複数テナントに存在しうる (業務委託・グループ会社)。email を鍵にすると T3 (テナント跨ぎ情報漏洩) の経路そのものになる。

### 検証の置き場所

検証契約は Auth.js に委譲される部分を含むが、**判定そのものは Auth.js 非依存の純関数** (`lib/auth/oidc.ts`) として実装する。理由は 2 つ。

1. 単体テストで全分岐を網羅できる (IdP を立てずに検証契約を検査できる = security-spec §2.5 の「E2E は最小経路のみ、網羅は単体テストで」と整合)。
2. Better Auth へ移行しても検証契約が失われない (AD-2 の移行コストを下げる)。

## 6. AD-6: Device Flow は Hub 側の code → approve → token → rotation → revocation までを所有する

### 所有境界 (normative closure より)

| 責務 | owner |
|---|---|
| device code 発行 / user_code 照合 / approve / token 交換 / refresh rotation / 再利用検知 / 失効 | **本 feature (Hub)** |
| OS 資格情報域 (macOS Keychain / Windows Credential Manager) への保存 | feat-publisher-plugin (consumer 実装) |

本 feature は**保存 API を実装したと偽らない**。提供するのは token response / rotation / revocation の公開 contract と downstream evidence key であり、Device Flow の acceptance は Hub E2E (承認→発行→rotation→失効) で判定する。循環依存は作らない。

### エンドポイント設計

| Method Path | principal | 責務 |
|---|---|---|
| `POST /api/v1/device/code` | なし | `device_code` (返却は平文・保存は SHA-256) + `user_code` (8 文字 Crockford Base32) + `verification_uri` + `interval` |
| `POST /api/v1/device/token` | なし (polling) | `authorization_pending` / `slow_down` / `expired_token` / `access_denied` → 承認後に access+refresh 発行 |
| `POST /api/v1/device/approve` | session | ブラウザ側承認。`user_code` を照合し**照合後即失効** |
| `POST /api/v1/token/refresh` | refresh token | rotation。**再利用検知で family 全失効** |
| `GET /api/v1/tokens` | session | 自分の token 一覧 (admin は Workspace 全体) |
| `DELETE /api/v1/tokens/:id` | session | 失効 (本人 or admin)。監査 event |

### 保存形

| 値 | 保存 | 理由 |
|---|---|---|
| `device_code` | SHA-256 ハッシュのみ | DB 流出時に復元させない |
| `user_code` | 平文 (照合キー) + 照合後即失効 + 5 回失敗で `denied` | 人が読み上げる値。TTL 10 分・試行 5 回で 40bit 総当たりを封じる |
| access token | **保存しない** | 短命 (15 分) JWT として発行のみ |
| refresh token | SHA-256 ハッシュのみ + `family_id` | 流出時に復元させない / 再利用検知の単位 |

### 再利用検知 (rotation の要)

refresh token は使い捨てとし、交換のたびに新しい値を発行する。**既に失効済みの refresh token が提示された場合、同一 `family_id` の全 token を失効**させ、監査 event `token.reuse_detected` を記録する。窃取を検知できる唯一の手段であり、rotation 単独では検知にならない。

---

## 7. AD-7: session は JWT stateless + session_revocations による即時失効の 2 段で構成する

### 数値契約と cookie 属性

| 項目 | 確定値 |
|---|---|
| strategy | JWT (署名付き cookie) |
| cookie 名 | `__Host-harness-hub.session` |
| cookie 属性 | `HttpOnly` / `Secure` / `SameSite=Lax` / `Path=/` |
| `maxAge` | 8 時間 |
| `updateAge` | 15 分 |
| claims | `sub` / `tenant_id` / `role` / `status` / **`workspace_ids`** / `iat` / `exp` (認可 MW が DB 往復なしで判定できる最小集合。`workspace_ids` は edge の Workspace 越境判定のため追加し、R4-reopen で `qa-072` として確定済み — 追補 §10.2 / bd `HarnessHub-l2g9`) |
| 署名鍵 | session: `AUTH_SESSION_SECRET` / Publisher access token: `AUTH_ACCESS_TOKEN_SECRET` (Workers Secret binding、用途分離) |

### 失効の 2 段構え

| 対象 | 即時性 | 実装 |
|---|---|---|
| role/status 変更 | 最大 15 分 | `updateAge` ごとの JWT 再発行時に `users.role`/`status` を再読込 (**受容**) |
| 緊急失効 (退職・侵害) | **即時** | `session_revocations` に `revoked_at` を書き、認可 MW が `iat < revoked_at` の JWT を拒否 |

### キャッシュ設計 (通常経路で DB 往復を起こさない)

`session_revocations` はテナント単位の最終失効時刻のみを持つ小テーブル。認可判定のたびに DB を引くと Turso 読取が session 検証と同数になるため、**TTL 60 秒のメモリ/KV キャッシュ**経由で参照する。

- **60 秒の意味**: 緊急失効の反映が最大 60 秒遅れる。15 分 (JWT 再発行) に比べて十分小さく、「即時失効」の運用上の意味を保つ。
- **fail-closed**: キャッシュ miss かつ port 呼び出しが失敗した場合、**拒否側へ倒す**。失効情報を確認できない状態で通すと、緊急失効が「DB 障害時に無効化される」という最悪の失敗モードになる。

### CSRF

`SameSite=Lax` (同一サイト cookie 前提) に加え、**全 state-changing リクエスト (POST/PUT/PATCH/DELETE) で `Origin` ヘッダを検査**する。`Origin` 欠落も拒否する (古い UA を通すと検査が骨抜きになる)。

---

## 8. AD-8: dev 専用 provider を構造的に存在させない

### 判断

`Credentials` provider・mock login・`SKIP_AUTH`・`NEXTAUTH_DEV` 等の分岐を**コードに存在させない**。開発・デモは提供者の Google Workspace を dev tenant の OIDC provider として登録し、**本番と同一経路** (OIDC redirect) で認証する。

### 根拠

認証経路を 1 本に保てば、「dev 専用コードの本番混入」という事故クラスが**構造的に発生しない**。分岐を持ったうえで環境変数で守る方式は、環境変数の設定ミス 1 つで防御が消える。

### 恒久化

CI で禁止文字列の出現を検査する (P08/P09)。検査対象文字列と除外規則は `apps/hub/scripts/check-dev-auth-provider-absence.mjs` に集約し、**検査スクリプト自身は自分の文字列リテラルを検査対象から除く** (自己言及で常に fail する退化を避ける)。

---

## 実装追補・未解決事項・参照

AD-9、P05〜P09 で確定した実装詳細、未解決事項、参照先は
[architecture-implementation-notes.md](./architecture-implementation-notes.md) に分割した。
これは文書 300 行上限を守るための分割であり、決定の効力や所有境界は変えない。
