---
status: confirmed
layer: feature-test-design
task: SYS-AUTH-TENANCY-P04
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
test_root: apps/hub/tests/auth-tenancy/
---

# feat-auth-tenancy テスト設計 (P04)

> **位置づけ**: [requirements-baseline.md](./requirements-baseline.md) の acceptance 3 件 + quality_constraints 7 件を、**実行可能な test ID** へ写像する。P05 は本書の test ID の被験体を実装し、P06 は本書の test ID を実行する。P07/P10 は**実行された証跡のみ**を裁定する。

## 0. test ID 体系

| 接頭辞 | 領域 | 主な種別 |
|---|---|---|
| `T-OIDC-*` | テナント別 OIDC 解決と検証契約 | 単体 |
| `T-AUTHZ-*` | role 4 種 / 認可マトリクス / deny-by-default | 単体 |
| `T-ISO-*` | tenant/workspace row-level-scope 分離 | 結合 (CI 必須ゲート) |
| `T-DEV-*` | **Hub 側** Device Authorization Flow (本 package 所有) | 単体・結合 |
| `T-TOKC-*` | **downstream token contract** (consumer が依存する公開契約) | 単体 |
| `T-SESS-*` | session 数値契約 / 緊急失効 | 単体 |
| `T-BND-*` | adapter 境界・単一認可・dev provider 非存在 | CI 静的検査 |

> **T-DEV と T-TOKC を分ける理由 (normative closure 要求)**: 本 package が所有するのは Hub 側の code/approve/token/rotation/revocation (`T-DEV-*`) であり、OS 資格情報域への保存は feat-publisher-plugin が所有する consumer 実装である。本 package は保存 API を実装しない。代わりに consumer が依存する**公開契約の形** (`T-TOKC-*`) を検証し、publisher package の E2E evidence から相互参照可能にする。証跡を混同しないため test ID を分離する。

---

## 1. acceptance 3 件の写像

| acceptance | 直接対応する test ID | 判定条件 |
|---|---|---|
| **AC-1** テナント越境アクセスが分離テストで 0 件 | `T-ISO-01` 〜 `T-ISO-07` | 全件 pass かつ越境成功が 0 件 |
| **AC-2** Device Flow の E2E (承認→token→失効) が成功する | `T-DEV-E2E-01` | 承認→access+refresh 発行→rotation→失効 の一連が pass |
| **AC-3** Auth.js 依存が adapter 境界に隔離されている (D3 caveat) | `T-BND-01` | CI 静的検査が exit 0 |

---

## 2. quality_constraints 7 件の写像

### QC-1 `tenant-oidc-dynamic-resolution-authjs-d3-qa005`

| test ID | 種別 | 検証内容 | 期待 |
|---|---|---|---|
| `T-OIDC-01` | 単体 | 異なる `tenant_slug` で `resolveTenantOidcConfig()` を呼ぶと**異なる** issuer/client_id が返る | 解決結果が tenant ごとに一意 |
| `T-OIDC-02` | 単体 | 未登録 `tenant_slug` | `null` (provider を推測で補完しない) |
| `T-OIDC-03` | 単体 | 無効化された `idp_connections` 行 | `null` |
| `T-OIDC-04` | 単体 | `issuer` 不一致 | 拒否 `issuer_mismatch` |
| `T-OIDC-05` | 単体 | discovery の `issuer` と設定値の不一致 | 拒否 `issuer_mismatch` |
| `T-OIDC-06` | 単体 | `aud` 不一致 | 拒否 `audience_mismatch` |
| `T-OIDC-07` | 単体 | `aud` が配列で `azp` 不一致 | 拒否 `audience_mismatch` |
| `T-OIDC-08` | 単体 | `nonce` **欠落** | 拒否 `nonce_mismatch` (欠落を「検査省略」にしない) |
| `T-OIDC-09` | 単体 | `nonce` 不一致 | 拒否 `nonce_mismatch` |
| `T-OIDC-10` | 単体 | `state` **欠落** | 拒否 `state_mismatch` |
| `T-OIDC-11` | 単体 | PKCE `plain` | 拒否 `pkce_required` |
| `T-OIDC-12` | 単体 | PKCE 未使用 | 拒否 `pkce_required` |
| `T-OIDC-13` | 単体 | `email_verified !== true` | 拒否 `email_unverified` |
| `T-OIDC-14` | 単体 | 全条件充足 | 受理 + claims (`sub`/`tenant_id`) が返る |
| `T-OIDC-15` | 単体 | 別テナントの `sub` が同値でも混線しない (`(tenant_id, idp_subject)` 束縛) | 別 principal として解決 |
| `T-OIDC-16` | 単体 | JIT provisioning 初回作成 | `role='member'` / `status='active'` 固定。**昇格しない** |
| `T-OIDC-17` | 単体 | IdP が `role` claim を送ってきた場合 | **無視**する (IdP に権限を委譲しない) |

### QC-2 `role4-authorization-matrix-single-middleware-deny-by-default-sec2`

| test ID | 種別 | 検証内容 | 期待 |
|---|---|---|---|
| `T-AUTHZ-01` | 単体 | backend-spec §3.3 認可マトリクス**全行 × role 4 種**を許可・拒否の両方向で網羅 | 表と完全一致 |
| `T-AUTHZ-02` | 単体 | **マトリクス自体の単調性** (member→owner→workspace-admin→provider-admin で許可が減る行が無い) | 単調 |
| `T-AUTHZ-03` | 単体 | 規則表に無い action | `no_rule` で拒否 (deny-by-default) |
| `T-AUTHZ-04` | 単体 | `status='inactive'` の principal | `inactive_user` |
| `T-AUTHZ-05` | 単体 | `owner` 合成: `member` かつ `ownerUserId === userId` | `effectiveRole='owner'` |
| `T-AUTHZ-06` | 単体 | `owner` 合成されない: `member` かつ他人の resource | `member` のまま |
| `T-AUTHZ-07` | 単体 | `selfOnly` action を他人の resource へ | 拒否 |
| `T-AUTHZ-08` | 単体 | token principal の scope 不足、および session/token の用途違い | `missing_scope` / `credential_not_allowed` |
| `T-AUTHZ-09` | 単体 | token principal で scope 充足かつ role 不足 | `insufficient_role` |
| `T-AUTHZ-10` | 単体 | **拒否理由の評価順**: `no_rule` → `inactive_user` → `revoked_session` → credential/scope → role 系 | 契約順どおり |
| `T-AUTHZ-11` | 単体 | `withAuthz` が deny 応答を返し、**業務関数を呼ばない** | 副作用なし |
| `T-AUTHZ-12` | 単体 | `withAuthz` が `crossTenant=true` のとき監査 append を**必ず**実行 | 監査 1 件 |
| `T-AUTHZ-13` | 単体 | 同一テナント内では監査 append **しない** (監査の希釈を避ける) | 監査 0 件 |

### QC-3 `device-flow-os-credential-token-revocation-qa008`

**Hub 側 (本 package 所有)** — `T-DEV-*`

| test ID | 種別 | 検証内容 | 期待 |
|---|---|---|---|
| `T-DEV-01` | 単体 | `device_code` 発行 | 平文返却 + **保存は SHA-256** |
| `T-DEV-02` | 単体 | `user_code` 8 文字 / Crockford Base32 (`0-9A-HJKMNP-TV-Z`) | 混同しやすい `I/L/O/U` を含まない |
| `T-DEV-03` | 単体 | 未承認 polling | `authorization_pending` |
| `T-DEV-04` | 単体 | `interval` 未満での連続 polling | `slow_down` + interval が +5 秒 (上限 60 秒。間隔を守った polling では −5 秒、下限 5 秒。security-spec §2.2 = `qa-073` 確定) |
| `T-DEV-05` | 単体 | TTL 10 分超過 | `expired_token` |
| `T-DEV-06` | 単体 | `user_code` 照合失敗 5 回 | `denied` へ遷移 |
| `T-DEV-07` | 単体 | 承認済み `user_code` の再利用 | 拒否 (照合後即失効) |
| `T-DEV-08` | 単体 | 承認後の token 交換 | access(15 分) + refresh(90 日) |
| `T-DEV-09` | 単体 | 承認後の token 交換を**2 回** | 2 回目は拒否 (device_code 使い捨て) |
| `T-DEV-10` | 単体 | refresh rotation | 新 refresh 発行 + 旧 refresh 失効 |
| `T-DEV-11` | 単体 | **再利用検知**: 失効済み refresh の提示 | 同一 `family_id` **全失効** + 監査 `token.reuse_detected` |
| `T-DEV-12` | 単体 | 本人による失効 | 成功 |
| `T-DEV-13` | 単体 | 他人の token を member が失効 | 拒否 |
| `T-DEV-14` | 単体 | workspace-admin による Workspace 内 token 失効 | 成功 + 監査 |
| `T-DEV-E2E-01` | 結合 | **AC-2**: code 発行 → approve → token 交換 → rotation → 失効 → 失効後の API 拒否 | 全段成功 |

**downstream token contract (consumer が依存する公開契約)** — `T-TOKC-*`

| test ID | 種別 | 検証内容 | 期待 |
|---|---|---|---|
| `T-TOKC-01` | 単体 | token response の形が RFC 6749 §5.1 の必須項目を満たす (`access_token`/`token_type=Bearer`/`expires_in`/`refresh_token`/`scope`) | schema pass |
| `T-TOKC-02` | 単体 | device 認可エラー応答が RFC 8628 §3.5 の語彙のみを返す | schema pass |
| `T-TOKC-03` | 単体 | 失効済み token での API 呼び出し | 401 |
| `T-TOKC-04` | 単体 | 契約 schema が**平文 refresh を保存経路へ露出しない**ことの表明 (保存は consumer 責務) | 契約に保存 API を持たない |

> `T-TOKC-*` は本 package の公開契約のみを検証する。**OS 資格情報域 (macOS Keychain / Windows Credential Manager) への保存は検証しない** — feat-publisher-plugin の E2E evidence を P11 から相互参照する。

### QC-4 `auth-adapter-boundary-better-auth-migration-hedge-d3-qa020`

| test ID | 種別 | 検証内容 | 期待 |
|---|---|---|---|
| `T-BND-01` | CI 静的検査 | **AC-3**: `lib/auth/adapter/` 以外から Auth.js 固有 API (`next-auth` 系 import) が現れない | exit 0 |
| `T-BND-02` | CI 静的検査 | adapter の公開型に Auth.js 由来の型名が漏れない | exit 0 |

### QC-5 `tenant-workspace-row-level-scope-isolation-test-ci-d4`

| test ID | 種別 | 検証内容 | 期待 |
|---|---|---|---|
| `T-ISO-01` | 結合 | tenant A の principal が tenant B の resource へ | 拒否 `tenant_mismatch` |
| `T-ISO-02` | 結合 | 2 テナント同時稼働で A のクエリ結果に B の行が**1 件も**混入しない | 0 件 |
| `T-ISO-03` | 結合 | workspace 跨ぎ (同一 tenant 内) | 拒否 |
| `T-ISO-04` | 結合 | provider-admin の越境 | **許可** + 監査 `provider.cross_tenant_access` 1 件 |
| `T-ISO-05` | 結合 | provider-admin **以外**の越境 | 全 role で拒否 |
| `T-ISO-06` | 結合 | 他テナントの resource への 404 (存在秘匿) と同一テナント内の 403 の**区別** | 404 / 403 |
| `T-ISO-07` | 結合 | tenant を跨いだ device_code / refresh token の流用 | 拒否 |

### QC-6 `no-hub-native-account-idp-delegation-i7`

| test ID | 種別 | 検証内容 | 期待 |
|---|---|---|---|
| `T-BND-03` | CI 静的検査 | `Credentials` provider / mock login / `SKIP_AUTH` / `NEXTAUTH_DEV` 等の禁止語がコードに存在しない | exit 0 |
| `T-BND-04` | CI 静的検査 | パスワードハッシュ関連 API (`bcrypt`/`argon2`/`scrypt`/`password`) が auth 実装に現れない | exit 0 |
| `T-OIDC-18` | 単体 | Hub 固有のパスワード認証経路が公開面に存在しない | 公開 API に該当関数なし |

### QC-7 `session-jwt-staleness-emergency-revocation-qa036`

| test ID | 種別 | 検証内容 | 期待 |
|---|---|---|---|
| `T-SESS-01` | 単体 | 数値契約: maxAge 8h / updateAge 15 分 / access 15 分 / refresh 90 日 / device TTL 10 分 / interval 5 秒 / backoff 5 秒 / interval 上限 60 秒 / user_code 8 文字 / 試行 5 回 / 失効キャッシュ TTL 60 秒 | **リテラル期待値**と一致 |
| `T-SESS-02` | 単体 | cookie 名 `__Host-harness-hub.session` と属性 `HttpOnly`/`Secure`/`SameSite=Lax`/`Path=/` | 一致 |
| `T-SESS-03` | 単体 | claims が `sub`/`tenant_id`/`role`/`status`/`workspace_ids`/`iat`/`exp` を持つ (qa-072 確定の 7 種) | 一致 |
| `T-SESS-04` | 単体 | **緊急失効**: `iat < revoked_at` の JWT | `revoked_session` で拒否 |
| `T-SESS-05` | 単体 | `iat >= revoked_at` の JWT | 通過 |
| `T-SESS-06` | 単体 | 失効情報はテナント単位で分離 (A の失効が B に波及しない) | B は通過 |
| `T-SESS-07` | 単体 | キャッシュ TTL 60 秒以内は port を再呼び出ししない | port 呼び出し 1 回 |
| `T-SESS-08` | 単体 | TTL 経過後は再取得 | port 呼び出し 2 回 |
| `T-SESS-09` | 単体 | **fail-closed**: port が例外を投げる | 拒否 (通さない) |
| `T-SESS-10` | 単体 | `exp` 超過 | 拒否 |
| `T-SESS-11` | 単体 | 署名不正 | 拒否 |
| `T-SESS-12` | 単体 | state-changing リクエストで `Origin` 不一致 | 拒否 |
| `T-SESS-13` | 単体 | state-changing リクエストで `Origin` **欠落** | 拒否 |
| `T-SESS-14` | 単体 | GET は `Origin` 検査の対象外 | 通過 |

---

## 3. テストダブル方針

### 原則: port には in-memory 実装、暗号には実装

| 対象 | 方針 | 理由 |
|---|---|---|
| repository port (`ports.ts`) | **in-memory 実装**をテスト内に持つ | DB は land 済みだが port と永続化契約に差がある。core 契約は in-memory で検査し、本番 adapter 統合は `HarnessHub-b7ng` で追跡する |
| 時刻 | `now: () => number` を**注入** | TTL・rotation・失効の時間依存を決定論的に検査するため。`Date.now()` の直接使用はテスト不能になる |
| 乱数 (device_code / user_code) | 生成器を注入。既定は `crypto.getRandomValues` | 生成値の形 (文字集合・長さ) は検査したいが、値そのものの固定は不要 |
| ハッシュ / JWT 署名 | **実装をそのまま使う** (`crypto.subtle`) | ここをモックすると「検証が通ること」の意味が消える。検証契約テストは本物の暗号に対して行う |
| IdP (discovery / token endpoint) | **モックしない**。検証契約を**純関数**として切り出し、claims オブジェクトを直接入力する | IdP を立てずに全分岐を網羅できる (ADR AD-5) |

### 決定論 (毎回同じ結果になること) の確保

- 時刻は全て注入した `now` から得る。テスト内で `now` を進めることで TTL 境界を検査する。
- 乱数は形のみ検査し、値には依存しない。
- 並行実行の順序に依存するテストは書かない。

---

## 4. テスト配置

```
apps/hub/tests/auth-tenancy/
├── support/
│   └── in-memory-ports.ts    ← 制御可能な時刻 + repository port の in-memory 実装
├── oidc-verification.test.ts       ← T-OIDC-*
├── authz-matrix.test.ts            ← T-AUTHZ-*
├── tenant-isolation.test.ts        ← T-ISO-*
├── device-flow.test.ts             ← T-DEV-*
├── device-flow-e2e.test.ts         ← T-DEV-E2E-01
├── token-contract.test.ts          ← T-TOKC-*
└── session-revocation.test.ts      ← T-SESS-*
```

> **配置の訂正 (P06 で確定)**: 本節は当初 `apps/hub/src/__tests__/auth-tenancy/` を予定していたが、`apps/hub/vitest.config.ts` の `include` は `tests/**` のみを走査する。設定を本 feature が書き換えると foundation 所有のテスト規約を動かすことになるため、**リポジトリの既存規約に合わせて `apps/hub/tests/` 配下へ置く**。`support/clock.ts` は実体が数行のため `in-memory-ports.ts` へ同居させた。

CI 静的検査 (`T-BND-*`) はテストランナーではなく `apps/hub/scripts/` のスクリプトとして実行する (P09 が実装)。

---

## 5. カバレッジ表 (全件写像の証明)

| 要件 | test ID 数 | 最低 1 件 |
|---|---|---|
| AC-1 テナント越境 0 件 | 7 | ✅ |
| AC-2 Device Flow E2E | 1 (+ 単体 14) | ✅ |
| AC-3 adapter 境界 | 2 | ✅ |
| QC-1 tenant OIDC 動的解決 | 18 | ✅ |
| QC-2 role 4 種 / 単一 MW / deny-by-default | 13 | ✅ |
| QC-3 Device Flow / 失効 | 15 + 4 (契約) | ✅ |
| QC-4 adapter 境界 | 2 | ✅ |
| QC-5 row-level-scope 分離 | 7 | ✅ |
| QC-6 Hub 固有アカウント非存在 | 3 | ✅ |
| QC-7 session staleness / 緊急失効 | 14 | ✅ |

**未写像 0 件。**

## 参照

- 要件: [requirements-baseline.md](./requirements-baseline.md)
- 設計: [architecture-decision-record.md](./architecture-decision-record.md) / [design-review-notes.md](./design-review-notes.md)
- 正本: [docs/backend-spec.md](../../backend-spec.md) §3.2 / §3.3 / §4.1、[docs/security-spec.md](../../security-spec.md) §2.5 / §3.5 / §3.7
