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
| Web (web) | 確定 | 確定質疑: qa-050 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。ブラウザ経由アクセスのセキュリティは web 行でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。ブラウザ経由アクセスのセキュリティは web 行でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-041 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-041 |

## 確定内容 (質疑録)

### qa-050 (対応セル: web)

**質問**: security (web) の確定内容を、脅威モデル基盤 (qa-042) と業務データ保持 delta (qa-046) を単一 qa へ統合し、C05 completeness 監査が検出した孤立 (認可 role 全順序・rate limit 数値表など詳細正本 docs/security-spec.md の値が compile 済み章本文へ現れない) を是正する形で再確定する。章本文が詳細正本の所在を明示引用し、認可 role 全順序を本文へインラインするようにする。

**回答**: docs/security-spec.md を実装粒度の詳細正本とし、qa-042 (脅威モデル基盤) と qa-046 (C4改訂=業務データ保持 delta) を単一 qa へ統合確定する。章本文が詳細正本の所在を明示引用し、孤立 (qa-042 の確定値が章に現れない) を解消する。

(1) 脅威モデル (詳細正本 docs/security-spec.md §1): 信頼境界 7・保護資産 6 + 業務データ 2 種 (顧客業務ナレッジ/ドキュメント・ハーネス実行入出力=最高機密区分)・STRIDE×abuse case T1-T15。明示的非目標は N1・N3・N4 を残余リスクとして受容し、旧 N2 (顧客業務データ保護は非目標) は qa-046 で撤回済 (T14 保持業務データのテナント越境読取・T15 削除不完全による残存を対策対象へ)。

(2) 認可 (詳細正本 docs/security-spec.md §3): role 全順序 = member < owner < workspace-admin < provider-admin (全順序・§3.1.1)。workspace-admin はテナント境界内スコープ (§3.1.2)、cross-tenant アクセスは allow + 監査記録 (§3.1.3)。認可判定は decide() / resolveEffectiveRole() / withAuthz() を単一接点とする。

(3) 認証・セッション (詳細正本 docs/security-spec.md §2): OAuth Device Flow・session TTL 8h・refresh/device_code は SHA-256 ハッシュのみ保存。ASVS 到達目標 = L1 全面 + 重点 6 領域 (認証/セッション/認可/データ保護/監査/暗号) L2 相当 (S-D2)。

(4) データ保護 (詳細正本 docs/security-spec.md §4): 封筒暗号化 KEK/DEK (S-D8・encryption_keys テーブル・key_version 付き・KEK rotation は DEK re-wrap のみ・年1回+臨時)。users.salary = AES-256-GCM (purpose=salary・IV ランダム 96bit・AAD=table:column:row_id)・member 向け DTO 別型・読取も監査 (user.salary_read)・export 常時マスク・部門集計は k-匿名性 k=3 未満で金額非表示。業務データは purpose=tenant_data の封筒暗号化 + D4 row-level + R2 tenant prefix 分離・認可 MW 通過後のみ復号・即時完全削除 + 削除監査 event + restore drill 非復元確認。secret インベントリ 5 binding (AUTH_SECRET/ENCRYPTION_KEK/TURSO_AUTH_TOKEN/R2 key/RESEND_API_KEY)・テナント IdP client_secret は封筒暗号化で DB 保存 (S-D5)。

(5) 監査完全性 (詳細正本 docs/security-spec.md §5): append-only (リポジトリ層に UPDATE/DELETE 関数を未実装 + CI-2 禁止検査) + テナント単位 hash chain (S-D6・seq/prev_hash/event_hash・canonical_json・BEGIN IMMEDIATE・日次 cron 全体検証 + 閲覧時区間検証)。provider-admin 透明性 = 全操作監査 + 顧客管理者が自テナント監査で越境 (provider.cross_tenant_access) を確認可能 (S-D9)。

(6) 入力検査 (詳細正本 docs/security-spec.md §6): ZIP/ingest/AI job の検査値・Markdown (doc/フィードバック/シート本文) は rehype-sanitize の縮小 allowlist で XSS 対策。

(7) Web 基本防御 (詳細正本 docs/security-spec.md §7): CSP (§7.1)・rate limit 数値表 = 9 route の上限 (§7.2・S-D3)。

(8) 検証計画 (詳細正本 docs/security-spec.md §8): ASVS L1+L2・CI-1〜CI-9・T-1〜T-12。テナント分離テストに業務データ越境読取ケースと削除完全性 (R2 実体・DB 行・キャッシュ) 検証を追加する。

業務データ delta の DDL・検証手順の docs 全面展開は feature P02 前の security 深掘りで実施する (qa-046 の据置事項を継承)。本 qa-050 が security(web) 確定の正本であり、qa-042 (基盤) と qa-046 (delta) はその構成根拠として qa_log に保持する。

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
