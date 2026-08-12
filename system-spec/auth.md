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
| Web (web) | 確定 | 確定質疑: qa-231 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。モバイルブラウザからの認証は web 行 (Hub Web の IdP/SSO) でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。タブレットブラウザからの認証は web 行でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-231 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-231 |

## 確定内容 (質疑録)

### qa-231 (対応セル: web, desktop-windows, desktop-macos)

**質問**: Claude CodeやCodexで作成したドキュメントをHarness HubへAPI反映する追加要件について、既存の認証・セキュリティ・backend・database契約をどう更新するか。

**回答**: [出所] 利用者の2026-08-12の明示要望『Claude Codeの方で作成したドキュメントをこちらのシステムのドキュメントの方に送信できるようにもしておいてほしい』『APIでこちらの方に反映させる』を追加要件として確定する。qa-073（Device Flow数値・保存先）、qa-161/qa-162（Web認証・セキュリティ）、qa-228（backend）、qa-229（database）の既存契約は、以下の差分以外を全面維持する。

【外部Docs同期】Claude Code、Codex、Publisher CLI等の外部作成環境は、固定API keyやブラウザCookieを使わず、既存Device Flowの15分短命access tokenと新しい専用scope docs:writeでMarkdownを同期する。発行主体はworkspace-admin以上、同期先はtokenと同一tenantのdraft文書だけとし、provider-adminにもこの機械経路でのtenant越境を許さない。common文書・自動公開・画像同期はv1対象外とする。既存4 scopeへdocs:writeを加え現行値域を5 scopeとするが、TTL、refresh rotation、OS資格情報域保存、即時失効、再利用検知の契約は変えない。Linuxは永続token保存を行わず実行ごとにDevice Flowを使う。

【API契約】GET/PUT /api/v1/docs/imports/:source/:externalIdを追加する。自然キーはtenant+source+externalId、externalIdはrepository identityとrepository相対pathから導出したSHA-256とし、絶対pathや利用者名を送らない。同じ内容の再送は文書を増やさずunchangedを返す。既存変更にはGETのETagをIf-Matchで要求し、欠落428、古い値412とする。Hub側で手動編集・公開された文書はmodifiedとし、CLIは明示的forceが無い限り停止する。監査には本文を入れず、source、hash ID、revision、結果だけを記録する。

【DB契約】documentsへnullableなexternal_source、external_document_id、external_content_hash、external_revisionをadditive migrationで追加し、tenant_id+external_source+external_document_idを一意にする。外部同期はCASでrevisionを更新し、通常文書と既存行の意味を変えない。documentsは既存ADRどおりworkspace_idを持たずtenant帰属を維持する。

【クライアント境界】同期対象はrepository root配下のMarkdown通常ファイルに限定し、../、絶対path、repository外を指すsymlinkを拒否する。同期コマンドはdocs:writeだけを要求し、既存publish/feedback/aijob/metrics権限を同梱しない。

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

---

#### 本章での適用

##### 確定内容 qa-231 (対応セル: web, desktop-windows, desktop-macos)

- 確定要件: [出所] 利用者の2026-08-12の明示要望『Claude Codeの方で作成したドキュメントをこちらのシステムのドキュメントの方に送信できるようにもしておいてほしい』『APIでこちらの方に反映させる』を追加要件として確定する。qa-073（Device Flow数値・保存先）、qa-161/qa-162（Web認証・セキュリティ）、qa-228（backend）、qa-229（database）の既存契約は、以下の差分以外を全面維持する。

【外部Docs同期】Claude Code、Codex、Publisher CLI等の外部作成環境は、固定API keyやブラウザCookieを使わず、既存Device Flowの15分短命access tokenと新しい専用scope docs:writeでMarkdownを同期する。発行主体はworkspace-admin以上、同期先はtokenと同一tenantのdraft文書だけとし、provider-adminにもこの機械経路でのtenant越境を許さない。common文書・自動公開・画像同期はv1対象外とする。既存4 scopeへdocs:writeを加え現行値域を5 scopeとするが、TTL、refresh rotation、OS資格情報域保存、即時失効、再利用検知の契約は変えない。Linuxは永続token保存を行わず実行ごとにDevice Flowを使う。

【API契約】GET/PUT /api/v1/docs/imports/:source/:externalIdを追加する。自然キーはtenant+source+externalId、externalIdはrepository identityとrepository相対pathから導出したSHA-256とし、絶対pathや利用者名を送らない。同じ内容の再送は文書を増やさずunchangedを返す。既存変更にはGETのETagをIf-Matchで要求し、欠落428、古い値412とする。Hub側で手動編集・公開された文書はmodifiedとし、CLIは明示的forceが無い限り停止する。監査には本文を入れず、source、hash ID、revision、結果だけを記録する。

【DB契約】documentsへnullableなexternal_source、external_document_id、external_content_hash、external_revisionをadditive migrationで追加し、tenant_id+external_source+external_document_idを一意にする。外部同期はCASでrevisionを更新し、通常文書と既存行の意味を変えない。documentsは既存ADRどおりworkspace_idを持たずtenant帰属を維持する。

【クライアント境界】同期対象はrepository root配下のMarkdown通常ファイルに限定し、../、絶対path、repository外を指すsymlinkを拒否する。同期コマンドはdocs:writeだけを要求し、既存publish/feedback/aijob/metrics権限を同梱しない。
- 設計解釈の記録経路: `dialogue`
- 原則: Least privilege / deny by default (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 外部文書同期を既存の広い権限へ混ぜずdocs:writeへ分離し、token同一tenantのdraftだけを許可してprovider-admin越境も閉じた。
  - トレードオフ:
    - scope値域と認可マトリクスの更新が必要になる
    - 別コマンド用refresh tokenでは再認可が必要になる
- 原則: Concurrency and consistency (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/api-design-patterns.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 自然キーによる冪等upsertとETag/If-Matchの楽観的競合制御を公開契約に含め、再送重複と無言の上書きを防いだ。
  - トレードオフ:
    - clientは更新前にGETする必要がある
    - 競合時の428/412処理とrevision管理が増える
- 資するゴール: G2, G4, G1

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
