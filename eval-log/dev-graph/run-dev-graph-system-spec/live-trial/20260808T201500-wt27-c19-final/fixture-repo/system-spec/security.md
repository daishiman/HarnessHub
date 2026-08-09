---
status: confirmed
category: security
aggregate: 確定
spec_cells: [security.web, security.mobile, security.tablet, security.desktop-windows, security.desktop-linux, security.desktop-macos]
serves_goals: [G1, G2]
---

# セキュリティ (security)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-024 |
| モバイル (mobile) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、モバイル向け成果物を作らないため |
| タブレット (tablet) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、タブレット向け成果物を作らないため |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |

## 確定内容 (質疑録)

### qa-024 (対応セル: web)

**質問**: セキュリティ × Web (web) について、待ち受け範囲・入力検証・問い合わせ構築・秘密の保存をどうしますか。その方針にした設計上の理由を教えてください。

**回答**: localhost (127.0.0.1) バインド固定、外向き通信なし、token はハッシュ保存、入力は schema 検証、SQL は必ずパラメータバインド。

【適用した上流指針・設計原則と、その原則がこの要件になった理由】
- OWASP ASVS の入力検証要件 → 確定内容の『入力は schema 検証』 → 検証されない値が service / repository へ到達する経路を無くし、想定外の型・範囲が永続化されて G3 の復元結果を壊さないようにするため。
- OWASP ASVS の injection 対策要件 → 確定内容の『SQL は必ずパラメータバインド』 → 文字列連結による問い合わせ構築を禁止し、TODO 本文に含まれる任意文字列が SQL 構文として解釈されないようにするため (G2 の認可を迂回する読み書きを防ぐ)。
- secure-by-design (`secure-by-design.md`) の「攻撃面を減らす」原則 → 確定内容の『127.0.0.1 バインド固定・外向き通信なし・token はハッシュ保存』 → 到達可能な経路を端末内に限定することで G1 を設定値ではなく実装の既定として担保するため。

(上流指針: OWASP ASVS + Secrets Management Cheat Sheet (security) / deep card: secure-by-design.md。上の各 - は 1 論点で、spec-state-contract の「qa_log の論点分離」に従い qa-024-p1..p3 として分離索引 entry も追記している。)

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

---

#### 本章での適用

- 上記原則は確定内容 qa-024 (対応セル: web) の判断へ適用する
- 資するゴール: G1, G2

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
