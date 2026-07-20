---
status: confirmed
category: auth
aggregate: 確定
spec_cells: [auth.web, auth.mobile, auth.tablet, auth.desktop-windows, auth.desktop-linux, auth.desktop-macos]
serves_goals: [G2, G4, G1]
---

# 認証(ログイン) (auth)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-036 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザからの認証は web 行 (Hub Web の IdP/SSO) でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザからの認証は web 行でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-041 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-041 |

## 確定内容 (質疑録)

### qa-036 (対応セル: web)

**質問**: Hub Web の認証 (auth.web) の実装可能粒度の詳細は? (qa-005 の Auth.js + テナント別 OIDC 方針の検証契約・session 数値・失効の意味論・開発環境の認証)

**回答**: qa-005 の Auth.js + テナント別 OIDC (顧客既存 IdP 委譲・Hub 独自アカウント基盤なし・署名付き JWT cookie・role 4 種) を全面維持し、docs/security-spec.md §2.1/§2.3/§2.5 で確定する。session 数値: strategy=JWT、cookie は __Host-harness-hub.session (HttpOnly/Secure/SameSite=Lax/Path=/、Domain 設定なし)、maxAge 8 時間 (業務日 1 日)、updateAge 15 分、claims は sub/tenant_id/role/status/iat/exp (認可 MW が DB 往復なしで判定でき Turso 読取を節約する最小集合)、署名鍵は AUTH_SECRET (Workers Secret binding)。失効の意味論: JWT は stateless のため role/status 変更の反映は最大 15 分遅延する (updateAge ごとの再発行時に jwt callback で DB 再読込)。これを受容する代わりに、Publisher/ingest token 失効は即時 (publisher_tokens.revoked_at を毎リクエスト参照)、緊急失効 (退職・侵害) は session_revocations テーブル (テナント単位の最終失効時刻・KV/メモリキャッシュ TTL 60 秒) により即時とし認可 MW が iat < revoked_at の JWT を拒否する。OIDC 検証契約 (T1 対策): issuer は idp_connections.issuer_url と厳密一致 (discovery の issuer とも一致)、aud は当該テナントの client_id、nonce/state 検証、PKCE S256 を confidential client でも併用、tenant 束縛はログイン URL /{tenant_slug}/signin で tenant を先に確定し当該テナントの idp_connections のみを候補にする、email_verified=true のみ受理し email はテナント跨ぎの識別子に使わない (同一 email が複数テナントに存在しうるため識別子は idp_subject。UNIQUE(tenant_id, idp_subject) で束縛)、JIT provisioning は role=member/status=active で作成し自動昇格しない。パスワード/2FA/リセットは実装せず IdP 責務とする (D3 維持・scope out)。mockup の login 画面は IdP redirect へ、account 画面のセキュリティ節は IdP 設定への外部リンク + Publisher token 一覧・失効ボタンへ置換する。開発・デモ環境の認証 (ユーザー確認による確定 2026-07-17): 提供者の Google Workspace を dev tenant の OIDC provider として登録し本番と同一経路で認証する。dev 専用 provider (Credentials/mock login/SKIP_AUTH) をコードに存在させず CI で文字列出現を禁止検査する (認証経路を 1 本に保てば dev 専用コードの本番混入という事故クラスが構造的に発生しない)。ネット接続と dev tenant IdP 設定が開発の前提条件になることを受容する。CSRF は SameSite=Lax + 全 state-changing リクエストの Origin 検査 + Auth.js 既定の CSRF token、CORS は不許可。

### qa-041 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者デスクトップ環境 (macOS / Windows) における認証資格情報とローカル秘密の保護 (auth / security の desktop-windows・desktop-macos セル) の実装可能粒度の詳細は? (qa-008 の Device Flow 方針の数値契約・保存先・失効・ローカル運用規律)

**回答**: docs/security-spec.md §2.2 (Device Flow 数値契約)・§2.2.1 (scope)・§4.4・§8.6 と dev-workflow の qa-039 (ローカル運用規律) を desktop 実仕様として確定する。(1) Publisher / CLI / AI worker の認証 = OAuth Device Authorization Flow (RFC 8628、qa-008 維持): device_code TTL 10 分・SHA-256 ハッシュのみ DB 保存、user_code 8 文字 Crockford Base32 (I/L/O/U 除外)・5 回失敗で denied・照合後即失効、polling interval 5 秒 (slow_down +5 秒)。(2) token: access token 15 分 (短命 JWT・サーバ非保存)、refresh token 90 日・rotation 必須・SHA-256 ハッシュのみ保存・再利用検知で同一 family 全失効 + 監査 event token.reuse_detected + admin/本人通知。(3) 保存先 = OS 資格情報域のみ: macOS Keychain / Windows Credential Manager。平文ファイル・環境変数・リポジトリへの保存を禁止し、長命 secret のコピペを非エンジニアに求めない (G1 整合)。(4) scope 最小権限 = publish:write / metrics:write / feedback:write / aijob:process の 4 種。ハーネス実行環境へ渡る token は metrics:write + feedback:write のみで publish 権限を含めない。(5) 失効導線 = Hub Web (S04/S18) から本人・admin が即時失効 (publisher_tokens.revoked_at を毎リクエスト参照)。窃取疑い時は family 全失効 → 監査確認 (§8.6 インシデント最小手順)。(6) ローカル開発の秘密・本番境界 (qa-039 接続): production への wrangler deploy / migration をローカルから日常的に行わない (正本経路は CI。緊急時のみ + 事後記録)、ローカルは preview 用 Turso または local SQLite を binding し本番 DB を指さない、secret scan を local hook でも実行可能にする (正本の遮断は CI)。作者環境は macOS 主・Windows 従で同一 pnpm script が動作すること。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| authentication | OWASP ASVS + Secrets Management Cheat Sheet | 認証方式・セッション・資格情報/シークレット/API キーの取扱いの上流指針 | https://owasp.org/www-project-application-security-verification-standard/ |
| security | OWASP ASVS + Secrets Management Cheat Sheet | 脅威モデル・入力検証・暗号化・監査ログの上流指針 | https://owasp.org/www-project-application-security-verification-standard/ |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Secure by Design — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/secure-by-design.md`

#### 目的

利用者の注意や運用後のpatchへ安全性を押し付けず、systemのdefault、architecture、development lifecycleに安全な結果を組み込み、被害可能性と復旧費を下げる。

#### 解決する問題

- 認証・認可・data protectionが後付けで、business flowと矛盾する。
- defaultが過大権限/公開状態で、利用者の完全な設定に安全性が依存する。
- 単一防御の突破で全面侵害になり、検知・封じ込め・復旧の証拠が無い。
- dependency、secret、build、releaseの供給chain riskが製品境界外として放置される。

#### 適用条件

- identity、個人/機密data、金銭、外部入力、admin操作、multi-tenant boundaryを扱う全system。
- compromise時の影響がgoal、法規、信頼、運用継続を損なう。
- vendor/serviceを使う場合も、共有責任とfailure/exit planを明示できる。

#### 非適用条件

- security自体が不要なsystemは原則ない。asset/threatが極小ならcontrolを軽量化できるが、根拠付きrisk acceptanceが必要。
- controlがthreatを減らさず、accessibility/availability/safetyを重大に損なう場合はそのcontrolを採用しない。代替・補償統制を設計する。
- checklist準拠だけでproject固有のtrust boundaryとabuse caseを置き換えない。

#### トレードオフ・失敗モード

- friction、latency、delivery費、運用負荷が増えるため、risk reductionと明示的に釣り合わせる。
- security theaterとしてcontrol数だけ増やし、owner、evidence、responseを持たない。
- fail closedを無差別適用してavailability/safety incidentを起こす。degraded modeとbreak-glass監査が必要。
- secretを隠しても過大権限や長期credentialを残す、暗号化してもkey lifecycleを設計しない等の局所最適。
- free tier製品を価格だけで選び、audit、export、retention、MFA、incident support不足を見落とす。

#### goalへの寄与

- stakeholderの安全・信頼・継続性をsuccess criteriaへ変換し、threat/control/evidenceをgoalへトレースする。
- security controlは「導入済み」ではなく、阻止/検知/復旧時間、権限範囲、data exposureで効果を測る。
- 予算0制約でも、secure default、最小data、短命credential、標準機能、open-source検査を優先し、残余riskを隠さない。

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
