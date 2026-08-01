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
| Web (web) | 確定 | 確定質疑: qa-115 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザからの認証は web 行 (Hub Web の IdP/SSO) でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザからの認証は web 行でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-073 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-073 |

## 確定内容 (質疑録)

### qa-115 (対応セル: web)

**質問**: HarnessHub-fnej の共有 Google OAuth client 方式を、auth.web の既存認証契約を維持しながらどう統合しますか?

**回答**: ユーザーの 2026-08-01 最終レビュー・仕様反映指示を明示承認として、qa-097 の production Google OIDC、JIT、session、Device Flow 契約を全面維持し、次を追加確定する。

【1. credential mode】idp connection は customer_google と shared_google を明示し、未知値や共有設定不備を既定方式へ fallback させない。既存行は customer_google を既定にして従来の tenant 別 issuer/client/secret と callback path を維持する。

【2. 共有認可開始】shared_google は issuer を https://accounts.google.com に固定し、環境単位の client_id/client_secret を使う。認可開始は tenant path から行うが、Google へ渡す redirect_uri は /api/auth/shared/callback/tenant-oidc の1本に集約する。state には tenant id/slug、発行・期限、CSRF binding hash を HMAC 署名して載せ、PKCE と nonce は Auth.js の検査を維持する。

【3. callback と帰属】共通 callback は署名・期限・binding cookie を DB lookup より先に検証し、復元した tenant id/slug と実接続を完全一致させる。Auth.js が署名・nonce 検証した Google ID token の hd を、tenant の allowed_workspace_domains と大文字小文字を正規化した完全一致で照合する。hd 欠落、別 Workspace、サブドメイン、tenant 差し替えでは session/JIT 行を作らない。

【4. principal 分離】同じ Google sub でも principal は tenant_id と sub の組で束縛し、共有 client を tenant identity として使わない。shared は callback 用予約 slug として tenant route で拒否する。

### qa-073 (対応セル: desktop-windows, desktop-macos)

**質問**: qa-041 (auth / security の desktop-windows・desktop-macos) の R4-reopen: Device Flow の polling interval に server 強制の上限値と、interval を守った client への減衰規則を確定するか? (follow-up HarnessHub-l2g9 / issue-auth-tenancy-spec-delta-20260725。qa-041 は interval 5 秒・slow_down 受信時 +5 秒までしか確定しておらず、RFC 8628 §3.5 自体も加算幅までしか規定していない。feat-auth-tenancy 実装は上限 60 秒と -5 秒の減衰を導入済みで、Publisher CLI から観測できる契約である)

**回答**: ユーザー確認 (2026-07-25、AskUserQuestion で「上限 60 秒・減衰 -5 秒を確定」を選択。承認記録 appr-010) により、qa-041 の確定内容を全面維持したうえで polling interval の上限と減衰を追加確定し、auth / security の desktop-windows・desktop-macos の専用正本として再確定する。【本 R4-reopen の唯一の差分】polling interval は 5 秒を初期値とし、interval 未満の polling には slow_down を返して +5 秒を加算、interval を守った polling には -5 秒を減衰させる。server が強制する interval の上限は 60 秒、下限は発行応答で client へ告げた 5 秒とする。根拠: RFC 8628 §3.5 は加算幅しか定めておらず、上限が無いと interval は単調増加して device_code TTL 600 秒を追い越し、client が次に叩いてよい時刻に達する前に code が失効して server 側から flow を詰ませる。上限 60 秒は TTL 600 秒に対し最悪でも 10 回は叩けることを値の選択そのもので担保する。加算幅と減衰幅を同じ 5 秒にするのは、幅が違うと「速く叩いて罰を受け、次の 1 回だけ守って帳消しにする」交互 polling が実質的に罰を免れるためであり、初期値への一括 reset も同じ理由で採らない。下限を告知値 5 秒より下げないのは、告知どおりに叩いている client を後から slow_down にできてしまわないため。限界を明示する: 上限が縛るのは server が強制する間隔だけであり、client が自分側で持つ間隔は RFC どおり slow_down のたびに +5 秒され上限を持たない (client 実装の責務であり server からは是正できない)。実装正本は apps/hub/src/lib/auth/config.ts の AUTH_NUMERIC_CONTRACT (devicePollIntervalSeconds=5 / devicePollBackoffSeconds=5 / devicePollMaxIntervalSeconds=60) と apps/hub/src/lib/auth/device-flow/service.ts の nextPollIntervalSeconds() / relaxedPollIntervalSeconds()、仕様正本は docs/security-spec.md §2.2。【qa-041 から維持する確定内容】docs/security-spec.md §2.2 (Device Flow 数値契約)・§2.2.1 (scope)・§4.4・§8.6 と dev-workflow の qa-039 (ローカル運用規律) を desktop 実仕様として確定する。(1) Publisher / CLI / AI worker の認証 = OAuth Device Authorization Flow (RFC 8628、qa-008 維持): device_code TTL 10 分・SHA-256 ハッシュのみ DB 保存、user_code 8 文字 Crockford Base32 (I/L/O/U 除外)・5 回失敗で denied・照合後即失効。(2) token: access token 15 分 (短命 JWT・サーバ非保存)、refresh token 90 日・rotation 必須・SHA-256 ハッシュのみ保存・再利用検知で同一 family 全失効 + 監査 event token.reuse_detected + admin/本人通知。(3) 保存先 = OS 資格情報域のみ: macOS Keychain / Windows Credential Manager。平文ファイル・環境変数・リポジトリへの保存を禁止し、長命 secret のコピペを非エンジニアに求めない (G1 整合)。(4) scope 最小権限 = publish:write / metrics:write / feedback:write / aijob:process の 4 種。ハーネス実行環境へ渡る token は metrics:write + feedback:write のみで publish 権限を含めない。(5) 失効導線 = Hub Web (S04/S18) から本人・admin が即時失効 (publisher_tokens.revoked_at を毎リクエスト参照)。窃取疑い時は family 全失効 → 監査確認 (§8.6 インシデント最小手順)。(6) ローカル開発の秘密・本番境界 (qa-039 接続): production への wrangler deploy / migration をローカルから日常的に行わない (正本経路は CI。緊急時のみ + 事後記録)、ローカルは preview 用 Turso または local SQLite を binding し本番 DB を指さない、secret scan を local hook でも実行可能にする (正本の遮断は CI)。作者環境は macOS 主・Windows 従で同一 pnpm script が動作すること。

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
