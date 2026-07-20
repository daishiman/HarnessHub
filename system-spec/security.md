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
| Web (web) | 確定 | 確定質疑: qa-061 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。ブラウザ経由アクセスのセキュリティは web 行でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。ブラウザ経由アクセスのセキュリティは web 行でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-041 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-041 |

## 確定内容 (質疑録)

### qa-061 (対応セル: web)

**質問**: docs/security-spec.md の 2026-07-18 追記 (許可表拡張・§6.3.1 install/download 配布境界・T-13/T-14 テスト・§8.7 構築順 security gate) を security 仕様へ反映するか。 (訂正再登録: qa-054 の回答に系譜継続句が欠けていたため、同一 delta を継続句付きで qa-061 として登録し直す)

**回答**: qa-050 の確定内容 (脅威モデル基盤 qa-042 と業務データ保持 delta を統合した security (web) 確定) を全面維持しつつ、次の delta を確定する。許可表へ projects.create (member。作成者を owner に固定)・projects.update (owner)・harnesses.install (member。安定版の導入/ダウンロード descriptor 発行) を追加 (install_hint から改称)。§6.3.1 配布境界: install は session 認証 + harnesses.install を要求し principal と同 tenant/workspace の stable かつ available release だけをサーバ側解決、クライアント指定 release/R2 key は不受理。skill の raw ZIP は Stage 0 採用時のみ Worker 署名の TTL 5 分以内・単回・対象 release 固定 URL とし、レスポンス/ログ/Referer に R2 credential/object key を露出しない。web_app は health 確認済み URL のみ返し外部遷移は noopener,noreferrer。suspended/他 tenant/非 stable は存在秘匿の 404。download count は (tenant, user, project, release) 範囲の Idempotency-Key 重複排除後に加算。upload は S01 Web=session+CSRF / Publisher CLI=Bearer+publish:write の 2 入口を同一検査・owner/tenant 判定へ収束させ、multipart の project_id/workspace_id/owner_user_id を信頼せず認証 principal と認可済み PublishRequest から解決、staging object key に元ファイル名を使わない。テスト追加: T-13 ヒアリング所有者境界 (member は自分の applicant_user_id のみ・form 改ざんで他人のシート取得不可・admin は自テナント全件のみ)、T-14 Project/配布境界 (作成者のみ owner・他 Project publish 拒否・install は stable/available のみ・他 tenant/任意 release/R2 key 指定 404・短命 URL の期限切れ/再利用拒否)。§8.7 構築順 security gate: P0 で SSO/session・Device Flow・単一認可 MW・tenant scope・deny-by-default・失効・監査 logger を dev bypass なしで完成 → P1 開始前に sheets 権限 + T-13 → P2 開始前に projects 権限・upload 2 経路・ZIP 検査・harnesses.install + T-14 → P3 以降は同一 MW/tenant repository 流用 + 新 action の許可表・全 role テスト同時追加。管理者 UI が P4/P5 でも admin/member 認可判定は P0 から有効で「後から role を付ける」移行は不許可。

### qa-041 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者デスクトップ環境 (macOS / Windows) における認証資格情報とローカル秘密の保護 (auth / security の desktop-windows・desktop-macos セル) の実装可能粒度の詳細は? (qa-008 の Device Flow 方針の数値契約・保存先・失効・ローカル運用規律)

**回答**: docs/security-spec.md §2.2 (Device Flow 数値契約)・§2.2.1 (scope)・§4.4・§8.6 と dev-workflow の qa-039 (ローカル運用規律) を desktop 実仕様として確定する。(1) Publisher / CLI / AI worker の認証 = OAuth Device Authorization Flow (RFC 8628、qa-008 維持): device_code TTL 10 分・SHA-256 ハッシュのみ DB 保存、user_code 8 文字 Crockford Base32 (I/L/O/U 除外)・5 回失敗で denied・照合後即失効、polling interval 5 秒 (slow_down +5 秒)。(2) token: access token 15 分 (短命 JWT・サーバ非保存)、refresh token 90 日・rotation 必須・SHA-256 ハッシュのみ保存・再利用検知で同一 family 全失効 + 監査 event token.reuse_detected + admin/本人通知。(3) 保存先 = OS 資格情報域のみ: macOS Keychain / Windows Credential Manager。平文ファイル・環境変数・リポジトリへの保存を禁止し、長命 secret のコピペを非エンジニアに求めない (G1 整合)。(4) scope 最小権限 = publish:write / metrics:write / feedback:write / aijob:process の 4 種。ハーネス実行環境へ渡る token は metrics:write + feedback:write のみで publish 権限を含めない。(5) 失効導線 = Hub Web (S04/S18) から本人・admin が即時失効 (publisher_tokens.revoked_at を毎リクエスト参照)。窃取疑い時は family 全失効 → 監査確認 (§8.6 インシデント最小手順)。(6) ローカル開発の秘密・本番境界 (qa-039 接続): production への wrangler deploy / migration をローカルから日常的に行わない (正本経路は CI。緊急時のみ + 事後記録)、ローカルは preview 用 Turso または local SQLite を binding し本番 DB を指さない、secret scan を local hook でも実行可能にする (正本の遮断は CI)。作者環境は macOS 主・Windows 従で同一 pnpm script が動作すること。

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
| owasp-asvs | 5.0.0 | OWASP Foundation (owasp.org) | https://owasp.org/www-project-application-security-verification-standard/ | 2026-07-18T00:00:00Z | 2026-07-18T00:00:00Z |
| rehype-sanitize | 6.0.0 | rehype (unified collective) (github.com) | https://github.com/rehypejs/rehype-sanitize | 2026-07-18T00:00:00Z | 2026-07-18T00:00:00Z |
