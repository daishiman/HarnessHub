---
status: confirmed
qa_ref: [qa-036, qa-037, qa-041, qa-042, qa-045, qa-046, qa-048, qa-050, qa-061]
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

# Harness Hub security 実装仕様書 (脅威モデル・データ構造・API 詳細正本)

> **位置づけ**: `system-spec/security.md` / `system-spec/auth.md` (確定章) が参照する **security の詳細正本**。`docs/backend-spec.md` (データ構造・API の詳細正本)、`docs/infrastructure-spec.md` と対称の関係にある。
>
> **重複回避の原則**: テーブル定義・endpoint 一覧の**正本は backend-spec.md** 側にあり、本書はそれを**参照**する。本書が正本を持つのは security 固有の関心 — 脅威モデル・認証/認可の判定契約と数値・鍵管理・監査の完全性・入力検査・Web 基本防御・検証手順 — に限る。両者が同じ事実を二重に書かない。
>
> **確定根拠**: 2026-07-17 ユーザー確認 (`/spec-hearing-start` 往復ヒアリング)。8 件の設計判断を確定 (§0.3)。

## 0. 前提と確定根拠

### 0.1 不変制約 (要件定義書より)

| id | 制約 | security への含意 |
|---|---|---|
| C1 | 実装・運用は提供者 1 名 + AI | 検証・運用の負荷が 1 名で回る範囲に control を絞る。security theater を避ける |
| C2 | 固定費を極小化・顧客数に固定費が比例しない | テナント追加が提供者の手作業を要する設計を採らない (→ §4.3 の IdP secret 方式の根拠) |
| C4 | Hub は顧客業務データを保護条件付きで保持できるが、顧客業務システムへの接続 credential と Web App runtime は保持しない | `tenant_data` はテナント別封筒暗号化・認可後復号・即時完全削除を必須とする。`users.salary` も保持例外ではなく要保護 PII として §4.2 で保護する |

### 0.2 上流指針 (doctrine anchor)

OWASP ASVS + Secrets Management Cheat Sheet (`https://owasp.org/www-project-application-security-verification-standard/`)。到達目標は §8.1。

### 0.3 本書で確定した設計判断 (2026-07-17 ユーザー確認)

| # | 論点 | 確定 | 主根拠 |
|---|---|---|---|
| S-D1 | security 詳細正本の配置 | `docs/security-spec.md` を新設し `system-spec/security.md` から参照 | backend-spec / infrastructure-spec と対称 |
| S-D2 | 検証の到達目標 | **ASVS L1 全面 + 重点領域のみ L2 相当** | C1 下で運用可能な範囲に検証投資を集中 |
| S-D3 | rate limit / TTL の数値 | **本書で確定値として定める** (feature P02 は実測に基づく調整のみ) | 「security 仕様をすべて記述」の要求 |
| S-D4 | 開発・デモ時の認証 | **提供者の Google Workspace を dev tenant の OIDC として使用** | 認証経路を 1 本に保ち dev 専用コードの本番混入をゼロにする |
| S-D5 | テナント別 IdP client_secret | **DB へ封筒暗号化保存 (KEK は Workers Secret 1 本)** | テナント追加が DB 書込だけで完結 (C1/C2) |
| S-D6 | audit_events の改竄防止 | **アプリ層 append-only + hash chain** | 低コストで改竄検知性を得る。提供者自身の再計算は残余リスクとして明示 (§5.4) |
| S-D7 | 実行ログ ingest の認証 | **Device Flow token を scope 分離して利用** (`metrics:write`) | token 発行・失効導線を 1 本に保つ |
| S-D8 | 暗号鍵のローテーション | **封筒暗号化 (KEK/DEK)** | KEK 更新が DEK 再暗号化だけで済み、全行再暗号化が不要 |
| S-D9 | provider-admin のテナント越境 | **許可 + `crossTenant` 監査強制** (§3.1.3) | break-glass は自己承認になり統制として機能しない (C1)。透明性で統制する |
| S-D10 | workspace-admin の実効範囲 | **tenant 単位** (§3.1.2) | `users` に workspace 所属列が無く、認可判定で突合する対象が存在しない |

> S-D9/S-D10 は本書の執筆中に、`resolveEffectiveRole` (§3.5) の実装を通じて確定した。特に **S-D10 は既存確定どうしの矛盾** (`workspaces` = 「共有・権限の境界」 vs `users` に workspace 所属列なし) を露呈させたもので、本書で「workspace は権限の境界ではない」と解決した。

## 1. 脅威モデル

### 1.1 信頼境界

```
[作者/利用者ブラウザ] --(1)--> [Hub Web/API (Cloudflare Workers)] --(2)--> [Turso (control plane DB)]
                                        |                                 --(3)--> [R2 (package/backup)]
[Publisher CLI / AI worker] --(4)------>|
[顧客 IdP (Google/Entra)] --(5)-------->|
                                        |--(6)--> [Resend (メール)]
[ハーネス実行環境 (顧客端末)] --(7)---->|  (metrics ingest / feedback)
```

| 境界 | 内容 | 主要 control |
|---|---|---|
| (1) | ブラウザ ↔ Hub | OIDC session (§2.1)・CSP (§7.1)・CSRF (§7.3)・認可 MW (§3) |
| (2) | Hub ↔ DB | tenant scope 強制注入 (§3.6)・封筒暗号化 (§4)・append-only (§5) |
| (3) | Hub ↔ R2 | immutable package (content hash)・監査断面 |
| (4) | CLI/AI worker ↔ Hub | Device Flow token + scope (§2.2) |
| (5) | Hub ↔ 顧客 IdP | issuer 固定検証 (§2.3)・client_secret 封筒暗号化 (§4.3) |
| (6) | Hub ↔ Resend | API key は Workers Secret binding のみ・PII 非送信 (§4.5) |
| (7) | 顧客端末 ↔ Hub | サーバ時刻採用・冪等キー・回数のみ受理 (§6.4) |

### 1.2 保護資産と影響

| 資産 | 機密性 | 完全性 | 可用性 | 侵害時の影響 |
|---|---|---|---|---|
| `users.salary` (年収 PII) | **高** | 中 | 低 | 個人情報漏洩。顧客との信頼喪失・法的責任 (G4 毀損) |
| テナント IdP client_secret | **高** | 高 | 中 | 顧客 IdP へのなりすまし。被害が顧客側へ波及 |
| control plane データ (Project/Release/Catalog) | 中 | **高** | 中 | 不正な業務ツール配布 (供給チェーン攻撃の起点) |
| audit_events | 中 | **高** | 中 | 統制点の否認可能性。G4 (統制点の一元化) が成立しなくなる |
| metrics_events / rollups | 低 | **高** | 低 | 削減効果の捏造。G5 (効果の可視化) が意思決定を誤らせる |
| Publisher/ingest token | **高** | 高 | 中 | なりすまし publish・偽メトリクス投入 |
| 顧客業務ナレッジ / ドキュメント (`tenant_data`) | **最高** | 高 | 中 | 顧客の内部業務情報の漏洩。C4 改訂 (qa-045〜048・appr-007) で保持対象となった最高機密区分 |
| ハーネス実行の入出力データ (`tenant_data`) | **最高** | 高 | 中 | 顧客業務の生データ漏洩。同上 (C4 改訂で保持対象・最高機密区分) |

### 1.3 STRIDE × abuse case (対策と検証先)

| id | 脅威 (STRIDE) | abuse case | 対策 | 検証 |
|---|---|---|---|---|
| T1 | Spoofing | 攻撃者が他テナントの利用者になりすまして Hub にログインする | OIDC の issuer/aud/nonce 検証 + tenant 束縛 (§2.3) | §8.3 認証テスト |
| T2 | Elevation of Privilege | member が API を直接叩いて `sheets status 変更`・`係数変更` を行う | 単一 MW の deny-by-default + 許可表 (§3.3)。画面側の非表示に依存しない | §8.3 認可テスト (全 action × 全 role) |
| T3 | Information Disclosure | **テナント A の利用者がテナント B のシート/ハーネス/監査を読む** | 全クエリへの tenant scope 強制注入 (§3.6) | §8.4 **分離テスト CI 必須** |
| T4 | Information Disclosure | **member が同僚の年収 (salary) を API レスポンスから取得する** | 列レベル認可 + DTO 境界での除外 + 封筒暗号化 (§4.2) | §8.3 PII テスト |
| T5 | Tampering | 利用者が実行回数を水増しして削減効果 KPI を捏造する | 回数のみ受理・係数/金額はサーバ計算・冪等キー・サーバ時刻 (§6.4) | §8.3 ingest テスト |
| T6 | Tampering | **提供者/攻撃者が audit_events を書換えて統制の証跡を消す** | アプリ層 append-only + hash chain (§5) | §8.3 監査 chain 検証 |
| T7 | Spoofing | 窃取した Publisher token で不正な業務ツールを publish する | 短命 access token + refresh rotation + 再利用検知 + 失効導線 (§2.2) | §8.3 token テスト |
| T8 | Tampering | 悪意ある package (zip slip / secret 混入 / 巨大展開) を公開する | ZIP 検査 (§6.3) + secret scan + skills-only 制限 + Green/Yellow | §8.3 package 検査テスト |
| T9 | Tampering | doc / feedback の Markdown に script を埋めて他利用者のセッションを奪う | 共通レンダラの allowlist sanitize (§6.2) + CSP (§7.1) | §8.3 XSS テスト |
| T10 | Elevation of Privilege | AI job の payload に指示を注入し AI worker に想定外の書戻しをさせる | payload の data 化 + 書戻し先の job 束縛 + scope 限定 (§6.5) | §8.3 AI job テスト |
| T11 | Repudiation | 提供者 (provider-admin) が顧客データへアクセスした事実を否認する | provider-admin 操作も監査対象 + 顧客管理者が自テナント監査を閲覧可能 (§5.3) | §8.3 監査テスト |
| T12 | Denial of Service | Device Flow / ingest への大量リクエストで無料枠を枯渇させる | rate limit (§7.2) + 冪等キー + 使用量監視 | §8.5 |
| T13 | Information Disclosure | DB / バックアップ断面の流出で salary・client_secret が平文で読まれる | 封筒暗号化 (§4)。export・R2 断面にも平文を残さない | §8.3 暗号化テスト |
| T14 | Information Disclosure | **テナント A の利用者/管理者が保持業務データ (tenant_data) をテナント越境で読む** | purpose=`tenant_data` の封筒暗号化 (§4) + D4 row-level + R2 tenant prefix 分離。認可 MW 通過後のみ復号 | §8.4 分離テスト (業務データ越境読取ケース) |
| T15 | Information Disclosure | **削除不完全により、削除操作後も業務データが R2 実体・DB 行・バックアップ断面に残存する** | 即時完全削除 + 削除監査 event + restore drill での非復元確認 | §8.3 削除完全性テスト (R2 実体・DB 行・キャッシュ) |

### 1.4 明示的な非目標 (残余リスクとして受容)

| # | 内容 | 受容理由 |
|---|---|---|
| N1 | 提供者 (DB 直接アクセス保持者) による監査の完全な改竄防止 | hash chain は検知性を上げるが、chain 全体の再計算は防げない。外部 WORM は C1 の運用負荷に見合わない (§5.4) |
| ~~N2~~ | ~~顧客業務データの保護~~ | **撤回済 (qa-046・C4 改訂 2026-07-18・appr-007)**。Hub は業務ナレッジ/ドキュメントとハーネス実行入出力を保持できるため非目標から対策対象へ変更 (T14/T15)。業務システム接続 credential は引き続き非保持 |
| N3 | ハーネス実行環境そのものの安全性 | Hub は package の検査と配布統制のみを担う。実行時サンドボックスは Claude Code 側の責務 |
| N4 | 独自 MFA / パスワードポリシー | D3 により IdP の責務 (§2.4) |

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
| JWT claims | `sub`(user_id) / `tenant_id` / `role` / `status` / `iat` / `exp` | 認可 MW が DB 往復なしで判定できる最小集合 (Turso 読取を節約) |
| 署名鍵 | `AUTH_SECRET` (Workers Secret binding) | §4.5 |

**失効の意味論 (重要)**: `updateAge=15分` ごとの JWT 再発行時に、Auth.js の `jwt` callback で `users.role` / `users.status` を DB から再読込して claims を更新する。したがって **role 剥奪・ユーザー無効化の反映は最大 15 分遅延する**。これを受容する代わりに、以下は**即時失効**とする。

| 対象 | 即時性 | 実装 |
|---|---|---|
| Publisher/ingest token 失効 | **即時** | `publisher_tokens.revoked_at` を毎リクエスト参照 (DB) |
| Web セッションの role/status 変更 | 最大 15 分 | JWT 再発行時に反映 (受容) |
| 緊急失効 (退職・侵害) | **即時** | `users.status='inactive'` + `session_revocations` への追加。認可 MW は `iat < revoked_at` の JWT を拒否 (§3.6) |

> `session_revocations` は緊急時のみ書かれる小テーブル。通常の JWT 検証で DB 往復を発生させないよう、**テナント単位の最終失効時刻のみ**を保持し、Workers のメモリ/KV キャッシュ (TTL 60 秒) 経由で参照する。

### 2.2 Publisher / CLI / AI worker (OAuth Device Authorization Flow, RFC 8628)

正本: `backend-spec.md` §4.1 (endpoint)。本節は**数値契約と scope** を確定する。

| 項目 | 確定値 | 根拠 |
|---|---|---|
| `device_code` TTL | **10 分** | RFC 8628 の一般的慣行。作者がブラウザで承認するのに十分 |
| `device_code` 保存 | **SHA-256 ハッシュのみ** (`device_authorizations.device_code_hash`) | DB 流出時に device_code を復元させない |
| `user_code` | **8 文字 / Crockford Base32** (`0-9A-HJKMNP-TV-Z`、`I/L/O/U` 除外) ≒ 40 bit | 人が読み上げ・打鍵できる範囲で総当たりに耐える |
| `user_code` 試行制限 | **5 回失敗で当該 authorization を `denied`** + rate limit (§7.2) | 40 bit でもオンライン総当たりを許さない |
| `user_code` 有効期間 | device_code と同一 (10 分)。**照合後即失効** | 再利用不可 |
| polling `interval` | **5 秒** (`slow_down` 受信時は **+5 秒**) | RFC 8628 §3.5 |
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

## 3. 認可仕様

### 3.1 role モデル

| role | 由来 | 範囲 |
|---|---|---|
| `provider-admin` | `users.role` | 全テナント (提供者自身)。**T11 の対象 — 全操作が監査される** |
| `workspace-admin` | `users.role` | 自テナント / 自 Workspace |
| `member` | `users.role` | 自テナント / 自 Workspace の一般利用者 |
| `owner` | **`projects.owner_user_id` による関係 role (合成)** | 当該 Project のみ |

> `owner` は列ではなく**関係**である (`backend-spec.md` §2.2 既存確定)。同一利用者が Project A では `owner`、Project B では `member` になる。したがって認可判定は **(principal, action, resource) の 3 項**を要し、principal だけでは決まらない。

#### 3.1.1 role の全順序 (許可表の単調性に依存)

```
member  <  owner  <  workspace-admin  <  provider-admin
```

- `backend-spec.md` §3.3 の許可表は**単調**である (左から右へ許可が増えるだけで、上位 role が下位 role の許可を失う行が 1 つも無い)。この事実により、実効 role を**単一値の全順序**として扱え、判定を `effective >= rule.minRole` に還元できる (§3.5)。
- **この単調性は仕様上の前提であり、暗黙の仮定ではない**。表が非単調になった瞬間に判定が壊れるため、テスト T-1 (全 action × 全 role 網羅) が単調性の検査を兼ねる (§8.3)。
- したがって実効 role の合成は「適用しうる role のうち**最大**を返す」で足りる (§3.5)。

#### 3.1.2 workspace-admin の実効範囲は **tenant 単位** (データモデルからの帰結)

| 事実 | 出典 |
|---|---|
| `users` は `tenant_id` を持つが **workspace 所属列を持たない** | `backend-spec.md` §2.2 |
| `workspaces` は「共有・権限の境界」と定義されている | `backend-spec.md` §2.2 |

**この 2 つは矛盾する。** principal に workspace 所属が無い以上、認可判定で `ResourceRef.workspaceId` を突合する対象が存在せず、`workspace-admin` は**名前に反して tenant 単位の管理者**として動作する。

| 判断 | 内容 |
|---|---|
| 本書の確定 | **workspace は共有・カタログの境界であり、権限の境界ではない**。権限の境界は tenant とする。`backend-spec.md` §3.3 が `audit-events 閲覧` を「自テナント」と書いていることとも整合する |
| `ResourceRef.workspaceId` の用途 | 認可判定に**使わない**。データ取得の絞り込み (カタログの可視範囲) にのみ使う |
| 根拠 | C1 (提供者 1 名) 下で、1 テナント内に権限分離が必要なほど多数の workspace を持つ顧客は現時点で想定されない。workspace 単位の権限分離を入れると `workspace_memberships` (M:N) とその分離テストが必要になり、便益に対して運用負荷が見合わない |
| 将来の拡張 | 顧客が「部門ごとに管理者を分けたい」と要求した時点で `workspace_memberships` を追加し、**R4-reopen** で本節を再確定する。それまで role 名は既存確定 (qa-005) を維持する |
| 残余リスク | 1 テナント内の全 workspace が 1 人の workspace-admin から見える。テナント内の部門間機密は保護されない (**顧客への明示事項**) |

### 3.2 判定原則

1. **deny-by-default**: 許可表に一致する規則が無ければ拒否する。
2. **単一ミドルウェア**: 判定は 1 箇所 (`packages/authz`) に集約する。画面側の出し分けは UX であり、**認可ではない**。
3. **両面適用**: 画面 (Server Component / route handler) と API の両方が同じ関数を通る。
4. **tenant scope は認可の前提**: リソースの `tenant_id` と principal の `tenant_id` が一致しない限り、role を見る前に拒否する (`provider-admin` の扱いは §3.5)。
5. **token principal は role ∧ scope の両方**を満たすこと。

### 3.3 許可表 (正本)

正本は `backend-spec.md` §3.3 の認可マトリクス (リソース × role)。**本書はこれを再掲しない**。本書は §3.4 で action 語彙を、§3.5 で判定契約を定める。

### 3.4 action 語彙 (認可の判定単位)

許可表の各行を、コードから参照する安定 id にする。**監査 action (`backend-spec.md` §3.8) と 1:1 でない**ことに注意 — 認可は読取も判定するが、監査は変更のみ記録する。

| action | 対象 | 最小 role |
|---|---|---|
| `metrics.read_aggregate` | dashboard/tracking 集計 | member (金額は集計値のみ) |
| `sheets.create` / `sheets.read_own` | 自分のヒアリングシート | member |
| `sheets.read_all` | テナント内全シート | workspace-admin |
| `sheets.status_change` / `sheets.regenerate` | シート状態 | workspace-admin |
| `builds.read` | 工程ボード閲覧 | member |
| `builds.stage_change` | 工程操作 | workspace-admin |
| `projects.create` | Project 作成 (作成者を owner に固定) | member |
| `projects.update` | Project 情報変更 | owner |
| `harnesses.read` / `harnesses.install` | カタログ閲覧・安定版の導入/ダウンロード descriptor 発行 | member |
| `publish.request` | 自 Project の公開 | owner |
| `publish.approve` / `publish.reject` | Yellow 承認 | workspace-admin |
| `channel.promote` / `channel.rollback` | stable pointer | owner |
| `release.suspend` | 公開停止 | owner (自 Project) / workspace-admin |
| `feedback.create` / `feedback.read` | 改善要望 | member |
| `feedback.status_change` | 状態変更 | workspace-admin |
| `docs.read` | ドキュメント閲覧 | member |
| `docs.write_tenant` | scope=tenant の編集 | workspace-admin |
| `docs.write_common` | scope=common の編集 | **provider-admin** |
| `users.read` | ユーザー一覧 | workspace-admin |
| `users.write` / `users.role_change` | ユーザー管理 | workspace-admin |
| `users.read_salary` / `users.write_salary` | **PII (§4.2)** | workspace-admin |
| `coefficients.change` | 係数設定 | workspace-admin |
| `audit.read` | 監査閲覧 | workspace-admin (自テナント) |
| `aijob.pull` | AI キュー claim | **workspace-admin (自テナントのジョブのみ・D4 scope 内) / provider-admin (全テナント・cross-tenant は監査付き唯一の定常例外)** + scope `aijob:process` (qa-048 改訂 = backend-spec §4.11/§9 と同期) |
| `aijob.complete` / `aijob.fail` | 結果書戻し | **claim 者のみ** + scope `aijob:process` (backend-spec §4.11) |
| `token.revoke_own` | 自分の token 失効 | member (本人) |
| `token.revoke_any` | 他人の token 失効 | workspace-admin |
| `metrics.ingest` | 実行ログ投入 | token + scope `metrics:write` |

### 3.5 判定契約 (`packages/authz`)

認可の心臓部。**この関数を通らない DB アクセス経路を作らない**。

```ts
// packages/authz/src/types.ts
export type BaseRole = 'provider-admin' | 'workspace-admin' | 'member'
export type EffectiveRole = BaseRole | 'owner'
export type Scope = 'publish:write' | 'metrics:write' | 'feedback:write' | 'aijob:process'

export type Principal =
  | { kind: 'session'; userId: string; tenantId: string; role: BaseRole; status: 'active' | 'inactive'; issuedAt: number }
  | { kind: 'token'; tokenId: string; userId: string; tenantId: string; role: BaseRole; scopes: Scope[] }

/** 判定対象リソース。tenantId は必須 (テナント非依存リソースは scope='common' の documents のみ) */
export type ResourceRef = {
  type: 'sheet' | 'build' | 'project' | 'release' | 'feedback' | 'document' | 'user' | 'coefficient' | 'audit' | 'aijob' | 'token' | 'metrics'
  id?: string                  // 監査記録用 (一覧操作では未指定)
  tenantId: string | null      // documents.scope='common' のみ null
  workspaceId?: string         // 認可判定には使わない — 取得の絞り込み専用 (§3.1.2)
  ownerUserId?: string         // projects.owner_user_id — owner 合成に使う
  subjectUserId?: string       // user/token リソースの対象者 — 本人判定に使う
}

/** §3.4 の表を機械可読にしたもの。selfOnly は「本人なら下位 role でも可」を表す (token.revoke_own 等) */
export type ActionRule = { minRole: EffectiveRole; scope?: Scope; selfOnly?: boolean }

export type Decision =
  | { allow: true; effectiveRole: EffectiveRole; crossTenant: boolean }   // crossTenant=true は監査必須 (§5.3)
  | { allow: false; reason: 'tenant_mismatch' | 'inactive_user' | 'revoked_session' | 'missing_scope' | 'insufficient_role' | 'no_rule' }
```

```ts
// packages/authz/src/decide.ts
import { ACTION_RULES } from './rules'   // §3.4 の表を機械可読にしたもの (action -> 最小 role, 必要 scope)

/**
 * 認可判定の単一入口。deny-by-default。
 * 呼び出し側は allow=false のとき RFC 9457 の 403 を返す (存在秘匿が要る場合は 404 — §3.7)。
 */
export function decide(p: Principal, action: Action, r: ResourceRef): Decision {
  const rule = ACTION_RULES[action]
  if (!rule) return { allow: false, reason: 'no_rule' }              // 原則 1: 規則が無ければ拒否

  if (p.kind === 'session' && p.status !== 'active') return { allow: false, reason: 'inactive_user' }
  if (p.kind === 'session' && isRevoked(p.tenantId, p.issuedAt)) return { allow: false, reason: 'revoked_session' }
  if (p.kind === 'token' && rule.scope && !p.scopes.includes(rule.scope)) return { allow: false, reason: 'missing_scope' }

  const effective = resolveEffectiveRole(p, r)                        // ← テナント境界と owner 合成
  if (!effective) return { allow: false, reason: 'tenant_mismatch' }

  // 本人限定 action (token.revoke_own 等) は role 順序で表現できないため個別判定する
  if (rule.selfOnly && r.subjectUserId !== p.userId && !atLeast(effective, 'workspace-admin')) {
    return { allow: false, reason: 'insufficient_role' }
  }
  if (!atLeast(effective, rule.minRole)) return { allow: false, reason: 'insufficient_role' }

  return { allow: true, effectiveRole: effective, crossTenant: r.tenantId !== null && p.tenantId !== r.tenantId }
}

/** §3.1.1 の全順序。許可表の単調性に依存する (T-1 が単調性を検査する) */
const ROLE_ORDER: readonly EffectiveRole[] = ['member', 'owner', 'workspace-admin', 'provider-admin']
const atLeast = (a: EffectiveRole, b: EffectiveRole) => ROLE_ORDER.indexOf(a) >= ROLE_ORDER.indexOf(b)

/**
 * principal と resource から実効 role を決める。テナント境界の唯一の判定点。
 * null を返す = テナント境界違反 (role を見るまでもなく拒否)。
 *
 * 判定順は「テナント境界 → base role → owner 合成」。境界を role より先に見るのが原則 4 (§3.2)。
 */
export function resolveEffectiveRole(p: Principal, r: ResourceRef): EffectiveRole | null {
  // (2) documents.scope='common' は tenant 非依存の共有領域。境界判定の対象外とし role 規則へ委譲する
  //     (書込は rule.minRole='provider-admin' が阻む — §3.4 docs.write_common)
  if (r.tenantId === null) return p.role

  // (1) テナント越境は provider-admin のみ。他は role を見るまでもなく拒否する
  //     越境の可否は §3.1.3 の根拠による。crossTenant として decide() が返し監査を強制する (§5.3)
  if (p.tenantId !== r.tenantId) return p.role === 'provider-admin' ? 'provider-admin' : null

  // (4) workspace-admin は tenant 単位 (§3.1.2)。r.workspaceId は認可判定に使わない
  // (3) owner は関係 role。全順序の下では workspace-admin 以上が既に owner を包含するため、
  //     合成が要るのは member のみ (= 適用しうる role の最大を返す — §3.1.1)
  if (p.role !== 'member') return p.role
  return r.ownerUserId === p.userId ? 'owner' : 'member'
}
```

#### 3.1.3 provider-admin のテナント越境 (確定と根拠)

| 判断 | 内容 |
|---|---|
| 確定 | **越境を許す。ただし暗黙にせず `Decision.crossTenant` として返し、呼び出し側に監査を強制する** |
| 越境が必須な理由 | `idp.connection_change` (§4.3 テナント IdP 設定の登録は提供者の責務)・`aijob.pull` (§3.4 全テナントのジョブを 1 つの AI worker が処理する D5 pull 型)・`docs.write_common`・顧客サポート。越境を全面禁止すると運用が成立しない |
| 却下した案: break-glass (期限付き support session) | 最小権限としては優れるが、承認者が提供者自身 (C1: 1 名) であるため**自己承認**になり、統制として機能しない。手順だけ増えて実効的な防御にならない (security theater — Secure by Design カードの failure mode) |
| 却下した案: 全面禁止 | 上記の必須操作が実行不能になる |
| 代替する統制 | **透明性**: 越境は必ず監査され (`provider.cross_tenant_access` — §5.2)、**顧客の workspace-admin が自テナントの監査で確認できる** (§5.3)。提供者は自分のアクセスを顧客から隠せない |
| 残余リスク | 提供者は DB へ直接到達できるため、アプリ層を経由しないアクセスは記録されない (N1)。**アプリ層の越境禁止はこのリスクを減らさない**一方、監査経路を強制することは減らす |

**既存確定 (qa-031 / `backend-spec.md` §9-3「cross-tenant は監査付き唯一例外」) との関係**: 当該確定は `aijob.pull` を指しており、本節はこれを**否定せず一般化**する。

| 種別 | 経路 | 監査 |
|---|---|---|
| **定常・自動**の越境 | `aijob.pull` / `aijob.complete` のみ (qa-031 の「唯一例外」を維持) | `ai_job.complete` + `provider.cross_tenant_access` |
| **例外的・人手**の越境 | IdP 設定登録 (§4.3)・顧客サポート・障害調査 | `provider.cross_tenant_access` (同一の記録を通す) |

> 定常経路を 1 本に保つ (qa-031 の意図) ことと、例外的越境を**禁止したことにして記録しない**ことは別問題である。後者は監査を迂回させるだけなので、本節は「越境は起きる。ただし必ず記録される」を選ぶ。

**強制の仕組み (呼び出し側の善意に依存しない)**: `decide()` の戻り値を直接使わせず、`withAuthz()` ラッパーを唯一の入口にする。`crossTenant=true` のとき監査 append を**関数内で必ず実行**する。

```ts
export async function withAuthz<T>(p: Principal, action: Action, r: ResourceRef, fn: () => Promise<T>): Promise<T> {
  const d = decide(p, action, r)
  if (!d.allow) throw new AuthzError(d.reason)                       // §3.7 の応答へ写像
  if (d.crossTenant) await auditRepo.append(r.tenantId!, {           // 呼び出し側が忘れられない位置で監査する
    actorType: 'user', actorId: p.userId, action: 'provider.cross_tenant_access',
    entityType: r.type, entityId: r.id, summary: { action },
  })
  return fn()
}
```

### 3.6 tenant scope の強制注入 (T3 対策)

認可判定 (§3.5) は「その操作をしてよいか」を決めるが、**クエリが他テナントの行を返さないこと**は別の防御層で担保する。二重にする理由は、認可の 1 箇所の抜けが即座に全テナント漏洩にならないようにするため (defense in depth)。

| 層 | 実装 | 検証 |
|---|---|---|
| 認可 MW | `decide()` の `tenant_mismatch` 判定 (§3.5) | §8.3 |
| **リポジトリ層** | 全 SELECT/UPDATE/DELETE に `WHERE tenant_id = ?` を**強制注入**する。tenant を受け取らないリポジトリ関数を作らない | §8.4 分離テスト CI |
| 型 | リポジトリ関数の第 1 引数を `TenantCtx` 型 (branded) にし、**忘れるとコンパイルエラー**にする | tsc |
| 例外 | `documents.scope='common'` のみ tenant 非依存 (読取専用・書込は provider-admin) | §8.4 |

```ts
// 例: 型で tenant を強制する
type TenantCtx = { readonly tenantId: string; readonly __brand: 'TenantCtx' }
export function listSheets(ctx: TenantCtx, cursor?: string): Promise<Sheet[]>  // ctx を省略できない
```

### 3.7 拒否時の応答 (存在秘匿)

| 状況 | 応答 | 理由 |
|---|---|---|
| 認証なし | `401` | — |
| 認可拒否・**同一テナント内**のリソース | `403` (RFC 9457) | 存在は既知でよい |
| 認可拒否・**他テナント**のリソース | **`404`** | ID の存在有無を漏らさない (T3 の情報源にしない) |
| scope 不足 (token) | `403` + `detail` に必要 scope | CLI 側で再認可を促す |

## 4. データ保護

### 4.1 封筒暗号化 (KEK/DEK) — S-D5 / S-D8 確定

```
[Workers Secret: KEK]  ──(AES-GCM で復号)──>  [DB: encryption_keys.dek_wrapped]  ──(AES-GCM で復号/暗号化)──>  [列データ]
        1 本・不動                                  DEK (テナント共通・版番号付き)                     users.salary / idp_connections.client_secret
```

| 項目 | 確定 |
|---|---|
| アルゴリズム | **AES-256-GCM** (Web Crypto API。Workers 標準 — 外部依存なし) |
| KEK | `ENCRYPTION_KEK` (Workers Secret binding)。**1 本のみ**。テナント数に依存しない |
| DEK | DB (`encryption_keys`) に **KEK で wrap して保存**。用途別 (`salary` / `idp_secret`) に分ける |
| IV | **レコードごとにランダム 96 bit**。再利用しない (GCM の nonce 再利用は致命的) |
| AAD | `"{table}:{column}:{row_id}"` を付加 | 暗号文の他行への移植 (cut-and-paste 攻撃) を防ぐ |
| 保存形式 | `{key_version}:{iv_b64}:{ciphertext_b64}:{tag_b64}` (単一 TEXT 列) |
| 復号の位置 | **認可 MW 通過後のリポジトリ層のみ**。DTO 境界を越えて平文を出さない |

#### 4.1.1 追加テーブル (backend-spec §2 への追加)

| テーブル | 主な列 | 制約・備考 |
|---|---|---|
| `encryption_keys` | `id`, `purpose`(`salary`/`idp_secret`), `key_version` INT, `dek_wrapped` TEXT (KEK で AES-GCM wrap), `status`(`active`/`retiring`/`retired`), `created_at`, `retired_at` | UNIQUE(purpose, key_version)。`active` は purpose ごとに 1 件。DEK 平文は**保存しない** |

#### 4.1.2 ローテーション手順

| 対象 | 手順 | 全行再暗号化 |
|---|---|---|
| **KEK** | 新 KEK を Workers Secret へ追加 → 全 DEK を旧 KEK で unwrap し新 KEK で wrap し直す (行数 = 数件) → 旧 KEK 削除 | **不要** |
| **DEK** | 新 `key_version` を `active` にし、旧を `retiring` へ → 新規書込は新 version → バッチで旧 version の行を再暗号化 → 旧を `retired` | 必要 (対象は `users.salary` と `idp_connections` のみ = 小規模) |
| 契機 | 定期: **年 1 回**。臨時: 侵害の疑い・退職者の DB アクセス失効時 | — |
| 復号互換 | `key_version` 列により**旧版の復号は常に可能**。`retired` の DEK は削除せず `status` のみ変更 (復旧可能性の確保) | — |

### 4.2 PII: `users.salary` (T4 / T13 対策)

| 観点 | 確定 |
|---|---|
| 分類 | **要保護 PII** (年収 JPY)。C4 改訂後も `tenant_data` とは区別するが、保持例外とは扱わない。削減効果の金額換算 (G5) に必要なため、以下の保護条件で保持する |
| 保存 | 封筒暗号化 (§4.1)。purpose=`salary` |
| 読取 | `users.read_salary` (workspace-admin 以上)。**member 向け DTO に列を含めない** (型レベルで別 DTO にする) |
| 書込 | `users.write_salary` (workspace-admin 以上)。**監査 event `user.salary_change`** — ただし**値は記録しない** (§5.2) |
| 読取の監査 | **`user.salary_read` を監査 event に追加** (SEC4「読取の監査記録」の実装。§5.2 の action 一覧に追加) |
| 集計での扱い | 個人の金額は `users.read_salary` 保持者のみ。**member には集計値のみ** (`metrics_rollups.saved_amount_jpy`)。1 名しかいない部門の集計は個人の金額と等価になるため、**dim=`department` の rollup は構成人数 < 3 のとき金額を返さない (k-匿名性 k=3)** |
| export | **常にマスク** (`***`)。日次 export・R2 バックアップ断面にも平文を残さない (qa-032 既存確定を維持) |
| 削除 | ユーザー削除時に列も削除。退職者は `status='inactive'` + salary を NULL 化できる導線を持つ |

> **なぜ「集計値なら安全」ではないか**: 部門別集計は、その部門が 1〜2 名なら個人の年収を復元できる。mockup の「部門別」カードは実在するため、k-匿名性の閾値を仕様に持たせる。

### 4.3 テナント IdP client_secret (S-D5 確定)

| 観点 | 確定 |
|---|---|
| 保存 | **DB へ封筒暗号化保存** (§4.1、purpose=`idp_secret`)。`idp_connections.client_secret_enc` |
| **既存確定からの変更** | `backend-spec.md` §2.2 の「secret は Workers Secret の参照名のみ (`client_secret_ref`)。暗号化方式は feature P02」を**本節で置換**する (qa-032 の再オープン理由) |
| 変更根拠 | テナント IdP secret は**顧客ごとに動的に増えるデータ**であり、環境 binding では追加のたびに `wrangler secret put` + 再デプロイが必要になる。これは C1 (提供者 1 名の運用負荷) と C2 (顧客数に固定費・手間が比例しない) に反する。Workers の secret 数上限にも到達しうる |
| **「secret は環境 binding のみ」原則との関係** | 当該原則 (qa-020/qa-025) は **Hub 自身の静的 secret** (Turso token・R2 key・Resend key・AUTH_SECRET・KEK) を対象とする。**テナント由来の動的 secret はこの原則の適用外**とし、封筒暗号化 + 認可 + 監査で保護する。この境界を §4.5 の表で明示する |
| 読取 | **復号は OIDC 認可要求の組立時のみ**。API レスポンス・ログ・エラーメッセージへ出さない (マスク済み `***` を返す) |
| 書込 | `provider-admin` のみ (テナント IdP 設定は提供者が顧客と合意して登録する)。監査 event `idp.connection_change` (値は記録しない) |

### 4.4 その他の要保護データ

| データ | 保護 |
|---|---|
| `publisher_tokens.refresh_token_hash` | **SHA-256 ハッシュのみ**。可逆暗号化しない (照合しか要らない) |
| `device_authorizations.device_code_hash` | **SHA-256 ハッシュのみ** |
| `user_code` | 平文保持だが TTL 10 分 + 照合後即失効 (§2.2) |
| `metrics_events.client_context_json` | **PII を含めない**。ハーネス slug・実行結果コードのみ。自由記述を受けない |
| `feedbacks.body` / `documents.body_md` | 利用者入力。sanitize は表示時 (§6.2)。保存は原文 (監査可能性のため) |
| `audit_events.summary_json` | **秘匿値を書かない** (§5.2) |

### 4.5 secret インベントリ (Workers Secret binding)

**この表にないものを Workers Secret に置かない。この表のものを DB・コード・ログに置かない。**

| binding 名 | 内容 | 用途 | ローテーション |
|---|---|---|---|
| `AUTH_SECRET` | Auth.js JWT 署名鍵 | §2.1 | 年 1 回 (全 session 失効を伴う) |
| `ENCRYPTION_KEK` | 封筒暗号化の KEK | §4.1 | 年 1 回 (DEK re-wrap のみ) |
| `TURSO_AUTH_TOKEN` | Turso 接続 | DB | 年 1 回 |
| `R2_ACCESS_KEY` / `R2_SECRET_KEY` | R2 接続 (Workers binding 利用時は不要) | package/backup | 年 1 回 |
| `RESEND_API_KEY` | メール送信 | §4.6 | 年 1 回 |

- **DB に入る secret**: テナント IdP client_secret のみ (封筒暗号化・§4.3)。
- **コードに入る secret**: なし。CI で検査 (§8.2)。
- **ログに入る secret**: なし。エラーは RFC 9457 の `detail` に値を含めない。

### 4.6 メール (Resend) の PII 境界

| 項目 | 確定 |
|---|---|
| API key | `RESEND_API_KEY` (Workers Secret binding のみ) |
| 宛先 | **同一テナント内の `users.email` のみ**。テナント跨ぎ送信をコードで不可能にする (送信関数が `TenantCtx` を要求 — §3.6) |
| 本文 | **PII を含めない**。金額・年収・個人の削減額を本文に書かない。「Hub で確認してください」+ リンクのみ |
| 週次サマリー | 集計値のみ。個人金額は含めない (§4.2 の k-匿名性を適用) |

## 5. 監査と改竄防止

### 5.1 append-only の強制 (S-D6 確定)

Turso/SQLite には DB レベルの append-only 強制機構 (行レベル権限・トリガによる拒否の保証) が無いため、**アプリ層 + hash chain + CI 検査**の 3 点で担保する。

| 層 | 実装 |
|---|---|
| リポジトリ層 | `audit_events` に対する UPDATE/DELETE 関数を**実装しない** (存在しないものは呼べない) |
| 型 | `AuditRepo` は `append()` と `read()` のみを公開する interface |
| CI 検査 | `audit_events` に対する `update(`/`delete(`/`UPDATE `/`DELETE ` の出現を禁止検査 (§8.2) |
| **hash chain** | §5.4 |

### 5.2 監査対象 action

正本は `backend-spec.md` §3.8 (16 action)。**本書で 2 件追加**する (qa-032/qa-033 再オープンで反映)。

| 追加 action | 契機 | 根拠 |
|---|---|---|
| `user.salary_read` | salary の復号読取 (一覧・詳細・export) | SEC4「読取の監査記録」の実装 (T4/T11) |
| `idp.connection_change` | テナント IdP 設定の追加・変更・削除 | §4.3 (顧客 IdP へのなりすまし経路のため) |
| `token.reuse_detected` | refresh token の再利用検知 | §2.2 (窃取検知) |
| **`provider.cross_tenant_access`** | **provider-admin が自テナント以外の resource へ到達した全操作** (読取を含む) | §3.1.3 (越境を許す代わりの統制。`withAuthz()` が自動記録する) |

**記録内容の原則**:

| 記録する | 記録しない |
|---|---|
| `actor_type` / `actor_id` / `action` / `entity_type` / `entity_id` / サーバ時刻 | **値そのもの** (salary の金額・client_secret・token) |
| 変更の**事実**と対象 (`summary_json` に `{"field":"salary","changed":true}`) | 変更前後の値 |
| `provider-admin` の全操作 (T11) | — |

> **なぜ変更前後の値を記録しないか**: 監査ログは workspace-admin が閲覧できる (§3.4 `audit.read`)。値を書くと、監査ログ自体が PII の第 2 の保管場所になり、§4.2 の暗号化・マスクを迂回する経路になる。

### 5.3 provider-admin の透明性 (T11 対策)

| 対策 | 内容 |
|---|---|
| 全操作の監査 | `provider-admin` の操作も例外なく `audit_events` に記録する (`actor_type='user'`) |
| **顧客による監視** | `workspace-admin` は**自テナントの監査を閲覧できる** (`backend-spec.md` §3.3 既存確定)。provider-admin が自テナントのデータへアクセスした事実を顧客が確認できる |
| salary 読取 | provider-admin による `user.salary_read` も記録され、顧客管理者から見える |
| 残余リスク | 提供者は DB に直接到達できるため、アプリを経由しないアクセスは記録されない (N1)。**これを仕様として明示する** |

### 5.4 hash chain (T6 対策・S-D6 確定)

#### 5.4.1 追加列 (backend-spec §2.2 `audit_events` への追加)

| 列 | 型 | 内容 |
|---|---|---|
| `seq` | INTEGER | **テナント内の連番** (1 始まり)。UNIQUE(tenant_id, seq) |
| `prev_hash` | TEXT | 直前 event の `event_hash` (seq=1 は `"genesis"`) |
| `event_hash` | TEXT | 本 event の hash (下式) |

#### 5.4.2 chain の scope: **テナント単位** (グローバル 1 本にしない)

| 案 | 採否 | 理由 |
|---|---|---|
| テナント単位 chain | **採用** | 監査の読み手 (workspace-admin) の検証範囲と一致する。テナント間で書込が直列化しない |
| グローバル 1 本 chain | 不採用 | 全テナントの監査書込が 1 本の chain に直列化し、`seq` 採番が全体のボトルネックになる。D4 (row-level scope) の分離思想とも合わない |

#### 5.4.3 計算式

```
event_hash = SHA-256(
  prev_hash || "\n" ||
  tenant_id || "\n" || seq || "\n" ||
  actor_type || "\n" || actor_id || "\n" ||
  action || "\n" || entity_type || "\n" || entity_id || "\n" ||
  canonical_json(summary_json) || "\n" ||
  created_at
)
```

- `canonical_json` = キー辞書順・空白なしの決定論的シリアライズ (JCS 相当)。**同じ event が常に同じ hash になること**が検証の前提。
- append は `BEGIN IMMEDIATE` トランザクション内で「最終 seq/hash の取得 → 新 event の insert」を行い、`UNIQUE(tenant_id, seq)` で並行 append の競合を検出する (競合時は再試行)。

#### 5.4.4 検証

| 種別 | 頻度 | 内容 |
|---|---|---|
| 通常検証 | 監査画面の閲覧時 (表示範囲のみ) | 表示する連続区間の chain を再計算して一致を確認。不一致は画面に**警告を表示** |
| 全体検証 | **日次 cron** (`backend-spec.md` §7 の cron に追加) | テナントごとに chain 全体を検証。不一致・seq 欠番を検出したら provider-admin へ通知 + `audit.chain_broken` を通知系へ |
| 検出できるもの | 中間行の削除・改竄・挿入 | — |
| 検出できないもの | **chain 全体の再計算による改竄** (提供者による) | N1 の残余リスク。外部 WORM 退避は C1 の運用負荷に見合わないため採らない |

## 6. 入力検査

### 6.1 zod による境界検査

| 項目 | 確定 |
|---|---|
| 単一ソース | `packages/schemas` の zod (`backend-spec.md` §3.1 既存確定) |
| 適用境界 | **全 API 入力** (body / query / path / header)。Server Action の引数も含む |
| 既定 | `.strict()` — **未知プロパティを拒否**する (mass assignment 防止) |
| 失敗時 | RFC 9457 の `errors[]` にフィールド単位で格納 (`backend-spec.md` §3.4)。**入力値そのものをエラーに反射しない** (XSS/情報漏洩の経路にしない) |
| 出力 | **DTO も zod で型付け**し、`users.salary` を含む DTO と含まない DTO を**別型**にする (§4.2) |

### 6.2 Markdown の XSS 対策 (T9)

`documents.body_md` / `feedbacks.body` / ヒアリングシート本文は利用者入力を Markdown として描画する。**共通レンダラ 1 つに集約**し、そこでのみ sanitize する (SEC7)。

| 項目 | 確定 |
|---|---|
| 実装 | `unified` + `remark-parse` → `remark-rehype` → **`rehype-sanitize`** → `rehype-stringify` |
| 方針 | **allowlist** (default schema をベースに縮小)。denylist は採らない |
| 許可要素 | 見出し (h1-h6) / p / ul,ol,li / blockquote / code,pre / table 系 / strong,em,del / a / img / hr / br |
| 禁止要素 | `script` / `iframe` / `object` / `embed` / `style` / `form` / `input` / SVG / MathML |
| 属性 | `on*` を**全面禁止**。`a` は `href`(http/https/mailto のみ) + `title`。`img` は `src`(**https のみ**) + `alt` + `title`。`class` は許可しない (CSS 経由の攻撃面を作らない) |
| `href` 検査 | `javascript:` / `data:` / `vbscript:` を拒否。相対 URL は許可 |
| `rel` | 外部リンクに `rel="noopener noreferrer"` を**強制付与** |
| `dangerouslySetInnerHTML` | sanitize 済み HTML を渡す**この 1 箇所のみ**に限定。他所での使用を CI で禁止検査 (§8.2) |
| 二重防御 | CSP (§7.1) が nonce 無し script の実行を阻止する |

### 6.3 アップロード ZIP の検査 (T8)

`POST /publish` の package (`multipart/form-data`)。既存の secret scan / skills-only 制限 (`packages/inspection`) に加え、**構造検査の数値を確定**する。

| 検査 | 確定値 | 目的 |
|---|---|---|
| 最大圧縮サイズ | **10 MiB** | skills-only package に十分。Workers のリクエストサイズ制約とも整合 |
| 最大展開サイズ | **50 MiB** | zip bomb 防止 |
| **最大圧縮比** | **100:1** | zip bomb 防止 (展開サイズ / 圧縮サイズ) |
| 最大エントリ数 | **1,000** | 大量小ファイルによる枯渇防止 |
| 最大パス長 | **255 文字** | — |
| 最大ディレクトリ深さ | **10** | — |
| **path traversal (zip slip)** | エントリ名を正規化し、`..` の混入・絶対パス (`/` 始まり・`C:` 等)・NUL・シンボリックリンクを**拒否** | 展開先の外へ書かせない |
| エントリ種別 | 通常ファイルとディレクトリのみ。**シンボリックリンク・特殊ファイルを拒否** | — |
| 検査順序 | **展開前に header を検査** → 合格後に展開 → 内容検査 (secret scan / skills-only) | 展開してから判定すると zip bomb を先に食らう |
| 失敗時 | `verdict='red'` + `findings_json` に理由。監査 event | — |
| 実装 | `packages/inspection` (Hub / Publisher 共有の純関数。二重実装禁止 — qa-010/qa-020) | Publisher のローカル pre-check と Hub 側検査が同一ロジック |

- S01 の Web 公開ウィザードは session + CSRF token、Publisher CLI は Bearer + `publish:write` scope を要求する。入口は 2 つでも、この検査と owner/tenant 判定を通らない upload 経路は作らない。
- multipart の `project_id`・`workspace_id`・`owner_user_id` を信頼せず、認証 principal と認可済み PublishRequest から解決する。staging object key に元ファイル名を使わない。

#### 6.3.1 install/download の配布境界 (最優先 P2)

- `POST /api/v1/harnesses/:projectId/install` は session 認証と `harnesses.install` を要求し、principal と同じ tenant/workspace から **stable かつ available** な release をサーバ側で解決する。クライアント指定 release/R2 key は受理しない。
- `skill` は Stage 0 採用済み marketplace/installer descriptor を返す。raw ZIP が採用された場合だけ、Worker 経由で署名した **TTL 5 分以内・単回・対象 release 固定** URL を返す。レスポンス・ログ・Referer に R2 credential/object key を露出しない。
- `web_app` は health 確認済み deployment URL だけを返す。外部遷移は `noopener,noreferrer`。suspended/他 tenant/非 stable は存在秘匿の `404`。
- download count は `Idempotency-Key` を (tenant, user, project, release) の範囲で重複排除してから増やし、URL 再読込やボタン連打で水増ししない。

### 6.4 実行ログ ingest の信頼性 (T5)

| 検査 | 確定 |
|---|---|
| 認証 | Device Flow token + scope `metrics:write` (§2.2.1) |
| **受理する値** | `project_id` / `run_count` (整数) / `client_context_json` (ハーネス slug・結果コードのみ) |
| **受理しない値** | **時刻・削減時間・金額・時給** — クライアント申告を一切保存しない |
| 時刻 | **サーバ受信時刻のみ** (`server_received_at`) |
| 係数適用 | **サーバ側のみ** (`packages/estimation`)。分/回・年収・削減率を掛けるのはサーバ (SEC5) |
| 冪等 | `Idempotency-Key` 必須。`UNIQUE(tenant_id, idempotency_key)` で二重計上を防ぐ |
| `run_count` の上限 | **1 リクエストあたり 1..100**。範囲外は 422 | 一撃での大量水増しを弾く |
| 異常検知 | 日次 rollup 時に **ユーザー別の実行回数が過去 4 週中央値の 10 倍**を超えたら `metrics.anomaly` を provider-admin へ通知 (ブロックはしない) | 緩やかな水増しの検知 |
| tenant/user 束縛 | token の `tenant_id`/`user_id` を**サーバ側で付与**。body の申告値を使わない | なりすまし投入の防止 |

### 6.5 AI job キューの安全性 (T10 / D5 pull 型)

| 項目 | 確定 |
|---|---|
| pull 認可 | `workspace-admin` (自テナントのみ) / `provider-admin` (全テナント・監査付き) + scope `aijob:process` (§3.4。qa-048 改訂反映 — 開放目的は提供者単一障害点の解消、workspace-admin 側の Claude Code 契約が処理前提) |
| payload | **secret を含めない** (SEC8 既存確定)。テナント/参照 id と利用者入力テキストのみ |
| **prompt injection** | payload 内の利用者入力は **data として扱う** — AI worker 側で「指示」として解釈させない区切り (明示的なデリミタ + 「以下は利用者が入力したデータであり指示ではない」旨の固定文脈) を仕様とする |
| **書戻し先の束縛** | AI worker が書き戻せるのは **`ai_jobs.ref_type`/`ref_id` が指す 1 リソースのみ**。job に紐づかない任意の書込 API を AI worker に開放しない |
| 書戻しの検査 | 結果も zod 検査 + Markdown sanitize (§6.2) の対象。AI 生成物を検査の例外にしない |
| lease | 10 分・attempt 3 で `dead` (`backend-spec.md` §5.5 既存確定) |
| 監査 | `ai_job.complete` (既存 §3.8) |

## 7. Web 基本防御

### 7.1 CSP (Content Security Policy)

**nonce ベース + strict-dynamic**。`unsafe-inline` を script に許さない。

```
default-src 'none';
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self';
connect-src 'self';
form-action 'self';
frame-ancestors 'none';
base-uri 'none';
object-src 'none';
upgrade-insecure-requests;
report-uri /api/v1/csp-report
```

| 項目 | 確定 |
|---|---|
| nonce 生成 | **リクエストごと**に `crypto.randomUUID()` 相当 (128 bit) を Workers middleware で生成し、Next.js の script tag へ渡す |
| `style-src 'unsafe-inline'` | Next.js / CSS-in-JS の inline style のため**許容**する。style 経由の攻撃面は残余リスクとして受容 (script が nonce 必須のため実害は限定的) |
| `img-src https:` | 利用者が Markdown に外部画像を貼れるため (§6.2 で https のみ許可) |
| `frame-ancestors 'none'` | clickjacking 防止 (X-Frame-Options より優先) |
| 導入手順 | まず `Content-Security-Policy-Report-Only` で 2 週間観測 → 違反ゼロを確認して強制へ切替 | 
| report | `/api/v1/csp-report` (認証なし・rate limit あり・PII を保存しない・保持 30 日) |

#### 7.1.1 その他のセキュリティヘッダ

| ヘッダ | 値 |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |

### 7.2 rate limit (S-D3 確定・T12 対策)

実装: **Cloudflare Workers の Rate Limiting binding** (無料枠内。不足時は Turso/KV counter へ退避)。`backend-spec.md` §3.7 の「数値は feature P02 で確定」を**本節で置換**する。

| 対象 | 鍵 | 閾値 | 根拠 |
|---|---|---|---|
| `POST /api/v1/device/code` | IP | **10 / 分** | 正常な作者は 1 回。総当たり用の device_code 大量発行を弾く |
| `POST /api/v1/device/token` (polling) | `device_code` | **20 / 分** | interval 5 秒 = 正常時 12/分。余裕を見て 20。超過は `slow_down` |
| `POST /api/v1/device/approve` | session | **5 / 分** | user_code の総当たり (§2.2 の 5 回失敗ロックと二重) |
| `GET/POST /api/auth/*` | IP | **20 / 分** | OIDC redirect の正常回数を大きく超えない |
| `POST /api/v1/metrics/events` | token | **60 / 分** (burst **120**) | ハーネスは 1 実行 1 送信。burst は起動直後のまとめ送信を許容 |
| `POST /api/v1/publish` | token | **10 / 分** | 正常な publish は数分に 1 回 |
| `POST /api/v1/feedback` | token/session | **20 / 分** | — |
| 一般 API (session) | user | **120 / 分** | 画面のポーリング (publish 2 秒 / ボード 30 秒) を阻害しない上限 |
| `POST /api/v1/csp-report` | IP | **30 / 分** | report の氾濫防止 |
| 超過時 | `429` + `Retry-After` (RFC 9457 形式) | — |
| 調整 | feature P02 は**実測に基づく調整のみ**。方式・鍵の変更は R4-reopen | S-D3 |

### 7.3 CSRF

| 項目 | 確定 |
|---|---|
| 前提 | `SameSite=Lax` cookie (§2.1) により cross-site の POST に cookie が付かない |
| 追加防御 | **`Origin` ヘッダ検査**を全 state-changing リクエスト (POST/PUT/PATCH/DELETE) に適用。自 origin 以外は `403` |
| Auth.js | 既定の CSRF token 機構をそのまま使用 |
| Bearer 経路 | cookie を使わないため CSRF 非該当 (CORS も許可しない — `connect-src 'self'`) |
| CORS | **許可しない** (`Access-Control-Allow-Origin` を返さない)。Hub Web と API は同一 origin。Publisher は非ブラウザ |

### 7.4 セッション cookie の詳細

| 属性 | 値 |
|---|---|
| 名前 | `__Host-harness-hub.session` |
| `HttpOnly` | true |
| `Secure` | true |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Domain` | **設定しない** (`__Host-` prefix の要件) |

## 8. 検証

### 8.1 ASVS 到達目標 (S-D2 確定)

**ASVS Level 1 を全面適用し、以下の重点領域のみ Level 2 相当を選択適用**する。未達項目は残余リスクとして本書 §1.4 に明示する (checklist 準拠の形骸化を避ける — Secure by Design カードの failure mode)。

| 領域 | 目標 | 理由 |
|---|---|---|
| 認証 (Authentication) | **L2 相当** | Device Flow の token 窃取 (T7) が公開統制の突破口になる |
| セッション管理 (Session) | **L2 相当** | 失効の意味論 (§2.1) が G4 の統制点に直結する |
| **アクセス制御 (Access Control)** | **L2 相当** | T2/T3 = マルチテナント分離の破綻は最大の被害 |
| **データ保護 (Data Protection)** | **L2 相当** | salary (PII) と `tenant_data` は保持対象の高機密データであり、封筒暗号化・分離・完全削除を外せない |
| **ログと監査 (Logging)** | **L2 相当** | G4 (統制点の一元化) の成立条件 |
| 暗号 (Cryptography) | **L2 相当** | 封筒暗号化の実装誤りは検知しにくい |
| その他の全領域 | **L1** | C1 (1 名 + AI) 下で運用可能な範囲 |
| version | 取得は C02 (`targets` に `owasp-asvs` を追加済み) で行い、version と確認時刻を `fetched-references.json` に記録する | 版を推測で固定しない |

### 8.2 CI 禁止検査 (静的)

| # | 検査 | 目的 |
|---|---|---|
| CI-1 | `Credentials` provider / `SKIP_AUTH` / `NEXTAUTH_DEV` 等の出現禁止 | §2.5 (dev 専用認証の混入防止) |
| CI-2 | `audit_events` への `update`/`delete` 呼出の出現禁止 | §5.1 (append-only) |
| CI-3 | `dangerouslySetInnerHTML` の使用箇所が共通レンダラ 1 箇所のみ | §6.2 (XSS) |
| CI-4 | secret scan (**リポジトリ全体**。`gitleaks` 等) | §4.5 |
| CI-5 | zod スキーマに `.strict()` が付いていること | §6.1 (mass assignment) |
| CI-6 | リポジトリ層関数が `TenantCtx` を受けていること (型検査で担保) | §3.6 (tenant scope) |
| CI-7 | 依存の脆弱性検査 (`pnpm audit` — 高危険度は fail) | 供給チェーン |
| CI-8 | salary を含む DTO 型が member 向け route から参照されていないこと | §4.2 |
| CI-9 | リポジトリ層の呼出が `withAuthz()` の内側からのみ行われること (route handler から直接呼ばない) | §3.1.3 (越境監査の強制)・§3.2 (単一 MW) |

### 8.3 単体・結合テスト (必須)

| # | 対象 | 内容 |
|---|---|---|
| T-1 | **認可 (§3.5)** | **全 action × 全 role × (自テナント/他テナント/owner/非 owner) の組合せを網羅**。deny-by-default を「規則の無い action は拒否」で検証 |
| T-1b | **許可表の単調性 (§3.1.1)** | 全 action について `atLeast` 順序で許可が単調に増えることを検査する。**非単調な規則が入ったら fail** (全順序という判定の前提が壊れたことを検出する) |
| T-1c | **越境の監査強制 (§3.1.3)** | provider-admin の越境 (読取を含む) で `provider.cross_tenant_access` が必ず記録されること。`withAuthz()` を経由しない DB アクセス経路が無いこと |
| T-2 | scope (§2.2.1) | `metrics:write` token で publish が拒否されること |
| T-3 | PII (§4.2) | member 向け API レスポンスに salary が**含まれないこと**。export がマスクされること。k=3 未満の部門集計が金額を返さないこと |
| T-4 | 暗号化 (§4.1) | 暗号文が復号できること。**DB 断面・export に平文が存在しないこと**。IV が再利用されないこと。AAD 不一致で復号が失敗すること |
| T-5 | 鍵ローテーション (§4.1.2) | 旧 `key_version` の行が新 KEK 適用後も復号できること |
| T-6 | 監査 chain (§5.4) | 中間行の改竄・削除・挿入を検証が**検出すること**。並行 append で seq が重複しないこと |
| T-7 | ingest (§6.4) | 時刻・金額の申告が**保存されないこと**。冪等キー重複が二重計上しないこと。`run_count` 範囲外が 422 |
| T-8 | ZIP (§6.3) | zip slip / zip bomb / 圧縮比超過 / シンボリックリンクが**拒否されること** |
| T-9 | XSS (§6.2) | `<script>` / `onerror=` / `javascript:` / `data:` を含む Markdown が無害化されること |
| T-10 | Device Flow (§2.2) | 期限切れ device_code の拒否。**refresh 再利用で family 全失効**。user_code 5 回失敗で denied |
| T-11 | セッション失効 (§2.1) | `session_revocations` 追加後の旧 JWT が拒否されること |
| T-12 | 存在秘匿 (§3.7) | 他テナントのリソース ID に対して 404 が返ること (403 でないこと) |
| T-13 | ヒアリング所有者境界 | member の一覧/詳細が自分の `applicant_user_id` だけを返し、form 内の `applicant` 改ざんで他人のシートを取得できないこと。admin は自テナント全件だけ取得できること |
| T-14 | Project/配布境界 (§6.3.1) | 作成者だけが owner になり、他 Project の publish が拒否されること。install が stable/available だけを返し、他 tenant・任意 release/R2 key 指定を 404 にすること。短命 URL は期限切れ/再利用で拒否されること |

### 8.4 テナント分離テスト (CI 必須・SEC3)

**独立した必須ゲート**とする (T3 が最大の被害であるため)。

| 項目 | 内容 |
|---|---|
| 方式 | 2 テナント (A/B) の完全なフィクスチャを作り、**A の principal で全 API を呼び、B の資源が 1 件も返らないこと**を検証する |
| 対象 | `tenant_id` を持つ**全テーブル**。テーブル追加時にテストが自動で対象を拾う (スキーマ駆動) |
| 網羅の担保 | **新テーブル追加時にこのテストが未対応なら CI が fail する** (テーブル一覧とテスト対象の差分検査) |
| 例外 | `documents.scope='common'` のみ (読取は両テナントから可・書込は provider-admin) |
| 頻度 | **全 PR** |

### 8.5 運用時の監視

| 項目 | 閾値・頻度 | 通知先 |
|---|---|---|
| 監査 chain 全体検証 | 日次 cron (§5.4.4) | provider-admin |
| Turso 使用量 | 日次 (既存 qa-031/qa-032) | provider-admin |
| `token.reuse_detected` | 即時 | provider-admin + 該当 workspace-admin |
| `metrics.anomaly` (§6.4) | 日次 | provider-admin |
| rate limit 429 の急増 | 日次 | provider-admin |
| CSP violation report | 週次サマリー | provider-admin |
| 依存の新規脆弱性 | 週次 (`pnpm audit`) | provider-admin |

### 8.6 インシデント対応 (最小)

C1 (1 名 + AI) 下で実行可能な最小手順のみを定める。

| 事象 | 手順 |
|---|---|
| Publisher token 窃取の疑い | Hub Web から該当 token を失効 (即時) → `publisher_tokens` の family 全失効 → 監査確認 |
| KEK/DEK 侵害の疑い | KEK ローテーション (§4.1.2) → DEK ローテーション → 全 session 失効 (`AUTH_SECRET` 更新) |
| テナント IdP secret 漏洩 | 顧客と合意して IdP 側で secret 再発行 → Hub の `idp_connections` 更新 (監査 event) |
| 監査 chain 不一致検出 | 該当テナントの監査画面に警告表示 → 提供者が原因調査 → 顧客管理者へ通知 |
| 不正 package の公開判明 | `release.suspend` (即時) → `channel.rollback` → 監査 event → 影響 Workspace へ通知 |

### 8.7 構築順に対する security gate

| phase | その phase を開始する前の必須条件 |
|---|---|
| **P0 認証** | SSO/session・Device Flow・単一認可 MW・tenant scope・deny-by-default・失効・監査 logger を完成させる。dev bypass は不可 |
| **P1 ヒアリング** | `sheets.create/read_own/read_all/status_change` と T-13 を通す。salary 原値を一覧・詳細・PDFへ出さない |
| **P2 Hub/パイプライン** | `projects.create/update`、upload の session/Bearer 両経路、ZIP 検査、`harnesses.install` と T-14 を通す。R2 の直接公開は禁止 |
| **P3 以降** | 同じ middleware/tenant repository を流用し、新 action は許可表と全 role テストを同時追加する |

管理者 UI (S17/S05/S06) の実装が P4/P5 でも、admin/member の認可判定は P0 から有効にする。「後から role を付ける」移行は許可しない。

## 9. backend-spec.md への反映差分 (本書で確定し反映済み)

| # | backend-spec.md の箇所 | 変更 |
|---|---|---|
| 1 | §2.2 `idp_connections` | `client_secret_ref` (Workers Secret 参照名) → `client_secret_enc` (封筒暗号化)。「暗号化方式は feature P02」を解消 (§4.3) |
| 2 | §2.2 `audit_events` | `seq` / `prev_hash` / `event_hash` を追加 (§5.4) |
| 3 | §2.2 (新規) | `encryption_keys` テーブルを追加 (§4.1.1) |
| 4 | §2.2 (新規) | `session_revocations` テーブルを追加 (§2.1) |
| 5 | §2.2 `publisher_tokens` | `scopes_json` の値域を §2.2.1 の 4 scope に確定 |
| 6 | §3.2 | session/token の TTL 数値を §2.1/§2.2 で確定 |
| 7 | §3.7 | 「数値は feature P02 で確定」→ §7.2 の確定値へ置換 |
| 8 | §3.8 | `user.salary_read` / `idp.connection_change` / `token.reuse_detected` / `provider.cross_tenant_access` を追加 (§5.2) |
| 9 | §7 (cron) | 監査 chain 日次検証を追加 (§5.4.4) |
| 10 | §3.3 (許可表) | 表が**単調である**ことを仕様上の前提として明示し、T-1b が検査する (§3.1.1) |
| 11 | §2.2 `workspaces` | 「共有・権限の境界」→ **「共有・カタログの境界 (権限の境界は tenant)」** へ修正 (§3.1.2 の矛盾解決) |

## 10. 確定記録

- **2026-07-17**: `/spec-hearing-start` の往復ヒアリング (R4-reopen → R2-interview) で S-D1〜S-D8 をユーザー確認により確定。対象セル: `security.{web,desktop-windows,desktop-macos}` / `auth.{web,desktop-windows,desktop-macos}` / `database.web` / `backend.web`。
- **2026-07-18**: 継続ヒアリング (qa-036/qa-037) で 4 論点 — ASVS 到達目標 (L1 全面 + 重点領域 L2 = §8.1)・セッション/トークンの失効反映 ≤15 分 (§2.1/§2.2)・rate limit 確定テーブル (§7.2)・nonce ベース strict CSP (§7.1) — を AskUserQuestion で再提示し、ユーザーが再確認 (いずれも本書の確定内容と一致)。spec-state の確定登録: `auth.web` = qa-036、`database.web`/`backend.web` = qa-037 (並行セッション登録)、`auth/security の desktop-windows・desktop-macos` = qa-041、`security.web` = qa-042 (並行ヒアリングとの qa 採番衝突を修復して再登録)。本書 frontmatter を `status: confirmed` へ更新。
- **2026-07-18 (C4 改訂追従)**: qa-050 で確定済みの C4 改訂 delta (qa-045/qa-046・appr-007) を本文へ転記 — §1.2 に業務データ 2 種 (最高機密区分) を追加、§1.3 に T14 (保持業務データのテナント越境読取)・T15 (削除不完全による残存) を追加、§1.4 の旧 N2 を撤回済へ更新。新規の内容変更ではなく確定済み qa の転記漏れ是正 (R4-reopen 不要)。業務データ delta の DDL・検証手順の全面展開は qa-046 の据置どおり feature P02 前の security 深掘りで実施する。
- 本書の変更は `system-spec/spec-state.json` の確定セルに紐づく。**内容変更には R4-reopen (根拠付き) が必要**。
