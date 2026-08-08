---
status: confirmed
category: security
aggregate: 確定
spec_cells: [security.web, security.mobile, security.tablet, security.desktop-windows, security.desktop-linux, security.desktop-macos]
serves_goals: [G4, G5, G1]
---

# セキュリティ (security)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-161 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。ブラウザ経由アクセスのセキュリティは web 行でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。ブラウザ経由アクセスのセキュリティは web 行でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-073 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-073 |

## 確定内容 (質疑録)

### qa-161 (対応セル: web)

**質問**: qa-152 / qa-158 は認可拒否を apps/hub/src/middleware/authz.ts の DenyReason 5 値だけで論じ、『外部応答は 401/403 の 2 値まで』という境界を置いた。しかし実装には第 2 の認可層 apps/hub/src/lib/authz/with-authz.ts (route handler の決定点) があり、WrapperDenyReason は 12 値、denyStatusFor は 400/401/403/404 を返し、tenant_mismatch は意図的に 404 へ畳まれている。境界前提が実装と矛盾している。2 層を通した tenant enumeration 境界を確定せよ。

**回答**: C07 matrix-auditor の HIGH finding への確定対応。qa-152 / qa-158 の逐語は改変せず、本 entry を正本とする。私の以前の境界記述は『認可層は 1 つ』という誤った前提に立っており、実装は 2 段構えである。訂正する。

[前提の訂正] 認可は 2 層ある。(i) edge middleware (src/middleware/authz.ts) = スコープ門。DenyReason 5 値 (unauthenticated / ambiguous_scope / missing_tenant_scope / tenant_mismatch / workspace_not_member)、status は 401|403。DB へ届かないため資源の実在を一切参照しない。(ii) route handler の withAuthz (src/lib/authz/with-authz.ts) = 決定点。WrapperDenyReason は AuthzDenyReason 9 値 (no_rule / inactive_user / revoked_session / credential_not_allowed / missing_scope / tenant_mismatch / workspace_not_member / not_owner / insufficient_role) に unauthenticated / untrusted_origin / unresolved_resource を加えた 12 値、status は denyStatusFor により 400|401|403|404。DB を参照でき、緊急失効も見る (ADR AD-7 の 2 段構え)。

[境界の再定義] 『外部応答は 401/403 の 2 値まで』は層をまたぐ規則としては誤り。層に依らない不変則はただ 1 つ、**『応答から、要求者が権限を持たないテナント/workspace/資源の実在を推測できないこと』**とする。各層の具体形は資源実在を参照するかどうかで変わる。
[i-1] edge 層: 実在照会を行わないので、実在/非実在で応答が変わりようがない。5 値を 401 (未認証) と 403 (それ以外) の 2 値へ畳む qa-152 [1] / qa-158 の結論はそのまま有効。
[ii-1] route 層: 実在照会を行うため、応答形が実在の oracle になりうる。既存実装は tenant_mismatch を 404 へ畳んでおり (with-authz.ts denyStatusFor、受入テスト T-ISO-06 が固定)、これは『403 だと他テナントにその ID の資源が存在すると読み取れる』という、私が置いた 2 値境界より**強い**防御である。この既存挙動を維持し、変更しない。私の以前の記述は誤って弱い側へ倒していた。
[ii-2] revoked_session / unauthenticated を 401、unresolved_resource を 400 とする既存マッピングも実在情報を漏らさないため維持する (401 は『名乗り直せば通る可能性』、400 は資源参照の形式不正)。

[残存リスクの明示 — 隠さず記録する] route 層で workspace_not_member / not_owner が 403 を返す経路は、同一テナント内において『その資源は存在するが自分の workspace/所有ではない』ことを推測させうる。テナント境界は越えないため今回は受容し、404 へ畳むことはしない。理由は、同一テナント内では所属変更や共有依頼という正当な業務導線が存在し、404 に畳むと利用者が『権限が無い』のか『本当に無い』のか分からず問い合わせ不能になるため。テナント内での資源存在の秘匿が要件化された時点で再オープンする候補として明記する。

[内部ログへの反映] qa-151 [147-a] / qa-156 の構造化ログは、理由コードに加えて**どちらの層で落ちたか (layer=edge|route)** を必ず持たせる。2 層が同名の理由 (tenant_mismatch / workspace_not_member / unauthenticated) を持つため、層を記録しないと切り分けができない。特に route 層の tenant_mismatch は外部へは 404 として出るので、ログ側でしか『権限不足の 404』と『本当に存在しない 404』を区別できない (with-authz.ts のコメントが明記している代償)。

[この見落としが起きた理由と再発防止] 私は DenyReason という 1 つの型名だけを頼りに列挙を閉じ、同じ責務を担う別ファイルを探さなかった。同種の見落としを防ぐため、qa-160 の CI 必須ゲートに [V5] を加える: 『認可拒否の理由コード集合が、仕様書に列挙された集合と一致することを検査する (実装に増えた理由が仕様に無ければ CI を赤にする)』。列挙の網羅性を人の注意力ではなく機械に担保させる。
本 entry は appr-033 (ユーザーによる代理回答の明示委任) の範囲で AI が確定したものであり、利用者の逐語発話ではない。

### qa-073 (対応セル: desktop-windows, desktop-macos)

**質問**: qa-041 (auth / security の desktop-windows・desktop-macos) の R4-reopen: Device Flow の polling interval に server 強制の上限値と、interval を守った client への減衰規則を確定するか? (follow-up HarnessHub-l2g9 / issue-auth-tenancy-spec-delta-20260725。qa-041 は interval 5 秒・slow_down 受信時 +5 秒までしか確定しておらず、RFC 8628 §3.5 自体も加算幅までしか規定していない。feat-auth-tenancy 実装は上限 60 秒と -5 秒の減衰を導入済みで、Publisher CLI から観測できる契約である)

**回答**: ユーザー確認 (2026-07-25、AskUserQuestion で「上限 60 秒・減衰 -5 秒を確定」を選択。承認記録 appr-010) により、qa-041 の確定内容を全面維持したうえで polling interval の上限と減衰を追加確定し、auth / security の desktop-windows・desktop-macos の専用正本として再確定する。【本 R4-reopen の唯一の差分】polling interval は 5 秒を初期値とし、interval 未満の polling には slow_down を返して +5 秒を加算、interval を守った polling には -5 秒を減衰させる。server が強制する interval の上限は 60 秒、下限は発行応答で client へ告げた 5 秒とする。根拠: RFC 8628 §3.5 は加算幅しか定めておらず、上限が無いと interval は単調増加して device_code TTL 600 秒を追い越し、client が次に叩いてよい時刻に達する前に code が失効して server 側から flow を詰ませる。上限 60 秒は TTL 600 秒に対し最悪でも 10 回は叩けることを値の選択そのもので担保する。加算幅と減衰幅を同じ 5 秒にするのは、幅が違うと「速く叩いて罰を受け、次の 1 回だけ守って帳消しにする」交互 polling が実質的に罰を免れるためであり、初期値への一括 reset も同じ理由で採らない。下限を告知値 5 秒より下げないのは、告知どおりに叩いている client を後から slow_down にできてしまわないため。限界を明示する: 上限が縛るのは server が強制する間隔だけであり、client が自分側で持つ間隔は RFC どおり slow_down のたびに +5 秒され上限を持たない (client 実装の責務であり server からは是正できない)。実装正本は apps/hub/src/lib/auth/config.ts の AUTH_NUMERIC_CONTRACT (devicePollIntervalSeconds=5 / devicePollBackoffSeconds=5 / devicePollMaxIntervalSeconds=60) と apps/hub/src/lib/auth/device-flow/service.ts の nextPollIntervalSeconds() / relaxedPollIntervalSeconds()、仕様正本は docs/security-spec.md §2.2。【qa-041 から維持する確定内容】docs/security-spec.md §2.2 (Device Flow 数値契約)・§2.2.1 (scope)・§4.4・§8.6 と dev-workflow の qa-039 (ローカル運用規律) を desktop 実仕様として確定する。(1) Publisher / CLI / AI worker の認証 = OAuth Device Authorization Flow (RFC 8628、qa-008 維持): device_code TTL 10 分・SHA-256 ハッシュのみ DB 保存、user_code 8 文字 Crockford Base32 (I/L/O/U 除外)・5 回失敗で denied・照合後即失効。(2) token: access token 15 分 (短命 JWT・サーバ非保存)、refresh token 90 日・rotation 必須・SHA-256 ハッシュのみ保存・再利用検知で同一 family 全失効 + 監査 event token.reuse_detected + admin/本人通知。(3) 保存先 = OS 資格情報域のみ: macOS Keychain / Windows Credential Manager。平文ファイル・環境変数・リポジトリへの保存を禁止し、長命 secret のコピペを非エンジニアに求めない (G1 整合)。(4) scope 最小権限 = publish:write / metrics:write / feedback:write / aijob:process の 4 種。ハーネス実行環境へ渡る token は metrics:write + feedback:write のみで publish 権限を含めない。(5) 失効導線 = Hub Web (S04/S18) から本人・admin が即時失効 (publisher_tokens.revoked_at を毎リクエスト参照)。窃取疑い時は family 全失効 → 監査確認 (§8.6 インシデント最小手順)。(6) ローカル開発の秘密・本番境界 (qa-039 接続): production への wrangler deploy / migration をローカルから日常的に行わない (正本経路は CI。緊急時のみ + 事後記録)、ローカルは preview 用 Turso または local SQLite を binding し本番 DB を指さない、secret scan を local hook でも実行可能にする (正本の遮断は CI)。作者環境は macOS 主・Windows 従で同一 pnpm script が動作すること。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
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

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| owasp-asvs | 5.0.0 | OWASP Foundation (owasp.org) | https://owasp.org/www-project-application-security-verification-standard/ | 2026-08-07T03:30:09Z | 2026-08-07T03:30:09Z |
| rehype-sanitize | 6.0.0 | rehype (unified collective) (github.com) | https://github.com/rehypejs/rehype-sanitize | 2026-08-07T03:26:34Z | 2026-08-07T03:26:34Z |
