---
status: confirmed
qa_ref: [qa-037, qa-042, qa-045, qa-046, qa-048, qa-050, qa-061, qa-072, qa-073, qa-074, qa-075]
layer: implementation-spec
sources:
  - system-spec/security.md
  - system-spec/auth.md
  - system-spec/00-requirements-definition.md
  - docs/backend-spec.md
  - docs/mockups/harness-studio-v2-analysis.md
doctrine_anchor: OWASP ASVS + Secrets Management Cheat Sheet
serves_goals: [G1, G2, G3, G4, G5]
---

# Authentication — Web session・OIDC・Device Flow

> [security-spec.md](security-spec.md) の分冊。旧節番号を維持し、既存の仕様参照との対応を保つ。

## 2. 認証仕様

### 2.1 Web セッション (Auth.js + テナント別 OIDC)

正本: `backend-spec.md` §3.2。本節は**数値契約と失効の意味論**を確定する。

| 項目 | 確定値 | 根拠 |
|---|---|---|
| strategy | JWT (署名付き cookie) | D3。Hub 独自アカウント基盤を持たない |
| cookie 属性 | `HttpOnly` / `Secure` / `SameSite=Lax` / `Path=/` / `__Host-` prefix | CSRF は同一サイト cookie 前提 (§7.3)。`__Host-` で subdomain 混入を防ぐ |
| session `maxAge` | **8 時間** | 業務日 1 日の連続利用を許し、翌日は再認証 |
| session `updateAge` | **15 分** | JWT 再発行の間隔 |
| **失効許容時間** | **最大 15 分** | JWT は stateless のため role/status 変更は次の再発行まで反映されない |
| JWT claims | `sub`(user_id) / `tenant_id` / `role` / `status` / `workspace_ids` / `iat` / `exp` | 認可 MW が DB 往復なしで判定できる最小集合 (Turso 読取を節約)。`workspace_ids` は edge が Workspace 越境を DB 往復なしで弾くため (qa-072)。代償は cookie が所属数に比例して膨らむことと membership 変更の 15 分遅延 |
| 署名鍵 | `AUTH_SESSION_SECRET` (Workers Secret binding) | §4.5。Publisher access token は別鍵 `AUTH_ACCESS_TOKEN_SECRET` で用途分離 |

**失効の意味論 (重要)**: `updateAge=15分` ごとの JWT 再発行時に、Auth.js の `jwt` callback で `users.role` / `users.status` を DB から再読込して claims を更新する。したがって **role 剥奪・ユーザー無効化の反映は最大 15 分遅延する**。これを受容する代わりに、以下は**即時失効**とする。

| 対象 | 即時性 | 実装 |
|---|---|---|
| Publisher/ingest token 失効 | **即時** | `publisher_tokens.revoked_at` を毎リクエスト参照 (DB) |
| Web セッションの role/status 変更 | 最大 15 分 | JWT 再発行時に反映 (受容) |
| 緊急失効 (退職・侵害) | **即時** | `users.status='inactive'` + `session_revocations` への追加。認可 MW は `iat < revoked_at` の JWT を拒否 (§3.6) |

> `session_revocations` は緊急時のみ書かれる小テーブル。通常の JWT 検証で DB 往復を発生させないよう、**テナント単位の最終失効時刻のみ**を保持し、Workers のメモリ/KV キャッシュ (TTL 60 秒) 経由で参照する。

#### 2.1.1 protected CWV probe（運用専用・人のログインではない）

`/catalog` の実測は未認証を許可せず、通常 session の署名鍵も CI に渡さない。`CWV_PROBE_SECRET` で署名する最大 **5 分**の HS256 ticket は、`typ=cwv_probe` / `aud=harness-hub-cwv` / 正規 HTTPS origin / 固定 tenant_id・workspace_id / iat・exp を全て満たす場合だけ受理する。

- bootstrap は `GET /catalog` だけ。ticket を検証後に URL から除去し、`__Host-harness-hub.cwv-probe`（HttpOnly / Secure / SameSite=Strict / Path=/）へ移す。`Cache-Control: no-store` と `Referrer-Policy: no-referrer` を付ける。
- Cookie は catalog の GET/HEAD と明示した catalog read endpoint にしか使えない。書込み、install、publish、管理 API、別 origin/tenant/workspace、期限切れ・改ざん ticket は拒否する。
- `CWV_PROBE_SECRET` の rotate は既存 ticket を即時に無効化する。利用者 session、OIDC、Device Flow、Publisher token の寿命・失効・外部 API 契約は変更しない。

これは外部 client に発行する authentication method ではなく、GitHub Actions と Worker の運用境界である。投入手順と外部実測の未完了境界は feature runbook §1.1 を参照する。

### 2.2 Publisher / CLI / AI worker (OAuth Device Authorization Flow, RFC 8628)

正本: `backend-spec.md` §4.1 (endpoint)。本節は**数値契約と scope** を確定する。

| 項目 | 確定値 | 根拠 |
|---|---|---|
| `device_code` TTL | **10 分** | RFC 8628 の一般的慣行。作者がブラウザで承認するのに十分 |
| `device_code` 保存 | **SHA-256 ハッシュのみ** (`device_authorizations.device_code_hash`) | DB 流出時に device_code を復元させない |
| `user_code` | **8 文字 / Crockford Base32** (`0-9A-HJKMNP-TV-Z`、`I/L/O/U` 除外) ≒ 40 bit | 人が読み上げ・打鍵できる範囲で総当たりに耐える |
| `user_code` 試行制限 | **5 回失敗で当該 authorization を `denied`** + rate limit (§7.2) | 40 bit でもオンライン総当たりを許さない |
| `user_code` 有効期間 | device_code と同一 (10 分)。**照合後即失効** | 再利用不可 |
| polling `interval` | **5 秒** (`slow_down` 受信時は **+5 秒**、server 強制の上限 **60 秒**。interval を守った polling では **−5 秒** 減衰・下限 5 秒) | RFC 8628 §3.5 + qa-073。上限なしでは interval が単調増加して `device_code` TTL 600 秒を追い越し server 側から flow を詰ませる (60 秒なら最悪でも 10 回叩ける)。減衰幅を加算と同幅にして交互 polling の罰逃れを防ぐ |
| access token TTL | **15 分** | 窃取時の悪用窓を最小化 |
| access token 保存 | **保存しない** (短命 JWT として発行のみ) | `backend-spec.md` §2.2 の既存確定を維持 |
| refresh token TTL | **90 日** (`publisher_tokens.expires_at`) | 作者に再認証を頻繁に求めない (G1: 非エンジニアの自走) |
| refresh token 保存 | **SHA-256 ハッシュのみ** (`refresh_token_hash`) | DB 流出時に token を復元させない |
| refresh rotation | **使い捨て (rotation 必須)** | OAuth 2.1 / BCP |
| **再利用検知** | 失効済み refresh token の提示で **同一 family を全失効** + 監査 event `token.reuse_detected` | 窃取検知の唯一の手段 |
| クライアント保存先 | macOS Keychain / Windows Credential Manager | qa-008 (既存確定) |

#### 2.2.1 scope (S-D7 確定)

`publisher_tokens.scopes_json` に保持し、access token の `scope` claim へ写す。**発行時に最小権限を選ぶ**。

| scope | 許可される操作 | 発行対象 |
|---|---|---|
| `publish:write` | package upload / publish 要求 / promote / rollback | Publisher (作者) |
| `metrics:write` | `POST /api/v1/metrics/events` のみ | ハーネス実行環境 (ingest) |
| `feedback:write` | `POST /api/v1/feedback` (source=harness) | ハーネス実行環境 |
| `aijob:process` | AI job の pull / complete | AI worker (qa-048 改訂: workspace-admin = 自テナントのみ / provider-admin = 全テナント・監査付き) |

- **scope は加算的に付与しない**: ingest 用 token に `publish:write` を含めない。ハーネス配布時に埋め込まれる token は `metrics:write` + `feedback:write` のみ。
- 認可 MW は `principal.kind === 'token'` のとき **role 判定に加えて scope 判定を行う** (両方の合格が必要 — §3.5)。

### 2.3 OIDC の検証契約 (T1 対策)

Auth.js に委譲する部分も含め、**テナント束縛**を明示する。

| 検証 | 内容 |
|---|---|
| `issuer` | `idp_connections.issuer_url` と厳密一致。discovery document の `issuer` とも一致すること |
| `aud` | 当該テナントの `client_id` と一致 |
| `nonce` | 認可要求時に生成した値と一致 (リプレイ防止) |
| `state` | CSRF 防止。Auth.js 既定を使用 |
| PKCE | `S256` を使用 (confidential client でも併用) |
| **tenant 束縛** | ログイン URL は `/{tenant_slug}/signin` 由来で **tenant を先に確定**し、その tenant の `idp_connections` のみを候補にする。IdP が返す `sub` は `UNIQUE(tenant_id, idp_subject)` で束縛する |
| email 信頼 | `email_verified=true` のみ受理。email はテナント跨ぎの識別子に**使わない** (`idp_subject` が識別子) |
| JIT provisioning | 初回ログイン時に `users` を `role='member'` / `status='active'` で作成。**role の自動昇格はしない** |

> **なぜ email を識別子にしないか**: 同一 email が複数テナントに存在しうる (業務委託・グループ会社)。email を鍵にすると T3 (テナント跨ぎ情報漏洩) の経路になる。

### 2.4 パスワード / MFA (非実装の明示)

- **パスワード認証・2FA・パスワードリセットは実装しない** (D3 / scope out)。`users` にパスワード列を持たず、`user_settings` に 2FA 列を持たない (`backend-spec.md` §2.2 既存確定)。
- mockup の `login` 画面 (メール+パスワード) は **IdP redirect 画面へ置換**する。mockup の `account` 画面の「セキュリティ」節は **IdP 側の設定への導線 (外部リンク) + アクティブな Publisher token 一覧 + 失効ボタン**へ置換する。
- MFA の強度・パスワードポリシー・リセット手順は顧客 IdP の責務。**Hub はこれを検証しない** (N4)。

### 2.5 開発・デモ環境の認証 (S-D4 確定)

| 項目 | 確定 |
|---|---|
| 方式 | **提供者の Google Workspace を dev tenant の OIDC provider として登録**し、本番と同一経路 (Auth.js + OIDC redirect) で認証する |
| dev 専用 provider | **持たない**。Credentials provider・mock login・`SKIP_AUTH` 等の分岐を**コードに存在させない** |
| 根拠 | 認証経路を 1 本に保てば、dev 専用コードの本番混入という事故クラスが**構造的に発生しない** |
| 前提条件 | 開発にはネット接続と dev tenant の IdP 設定が必要 (受容) |
| E2E テスト | IdP を stub せず、**認可 MW の単体テスト (§8.3) で role × action を網羅**する。E2E は dev tenant の実 IdP で最小経路のみ |
| CI ゲート | `Credentials`・`SKIP_AUTH`・`NEXTAUTH_DEV` 等の文字列出現を **CI で禁止検査** (§8.2) |
