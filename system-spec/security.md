---
status: confirmed
category: security
aggregate: 確定
spec_cells: [security.web, security.mobile, security.tablet, security.desktop-windows, security.desktop-linux, security.desktop-macos]
serves_goals: [G2, G4, G5, G6, G1]
---

# セキュリティ (security)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-311 |
| モバイル (mobile) | 対象外 | 理由: native モバイルアプリなし。ブラウザ経由アクセスのセキュリティは web 行でカバー |
| タブレット (tablet) | 対象外 | 理由: native タブレットアプリなし。ブラウザ経由アクセスのセキュリティは web 行でカバー |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-231 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-231 |

## 確定内容 (質疑録)

### qa-311 (対応セル: web)

**質問**: 改善要望の入力検証・秘匿情報の扱い・悪用防止をどう確定するか。自動収集した診断情報の秘匿はどう担保するか。

**回答**: [appr-063 による再確定] 本セルは appr-061 (改善要望の出口を GitHub Issue へ戻す) と appr-063 (画像・診断ファイルを Contents API で対象リポジトリへ commit する) の機密境界への影響を反映して再確定した。qa-238 の内容は以下の差分以外を全面維持する。

[機密境界の変更点] appr-048 以前の設計は「スクリーンショットと診断は Hub の認可の内側だけに置く」だった。appr-061 でこれを改め、GitHub 側へ出すことが確定した。さらに appr-063 で、GitHub が Issue への画像添付を公式 API として提供していないこと (公式に案内されるのはブラウザ UI のドラッグ&ドロップだけで、uploads.github.com / user-attachments は文書化されていない内部経路。https://docs.github.com/en/rest/issues/issues および https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files を 2026-08-16 に確認) を受けて、Contents API で対象リポジトリへ commit する方式が選ばれた。この 2 つにより、以下 3 点が本章の前提として変わる。

(1) 黒塗り (マスキング) は任意である (appr-061)。以下の「黒塗り注釈は元画像に対して破壊的に焼き込み、マスク前の画素をサーバへ送らない」は、**黒塗りが行われた場合の扱い**を定めるものであり、黒塗りを必須にはしない。未黒塗りの画像がそのまま GitHub へ出る経路は仕様どおり開いている。実装でこれを必須化して塞がない (利用者の決定を実装側で覆さない)。

(2) 以下の「R2 オブジェクトには署名なし公開 URL を与えず、必ず認可を通す API route 経由でストリームする」は、**Hub 側 R2 についての規則**である。GitHub のリポジトリへ commit した複製には及ばない。GitHub 側の到達範囲は対象リポジトリの可視性に従い、public なら誰でも閲覧できる。リポジトリの可視性を仕様で制約しないことは appr-061 の利用者決定であり、維持する。したがって「機密は必ず認可の内側にある」という主張は、本機能のスクリーンショットと診断については成立しない。成立しているかのように書かない。

(3) commit した画像と診断ファイルは git 履歴に永久に残る。削除 commit を積んでも過去の commit から到達できるため、削除の効果は Hub 側 (R2・DB) とリポジトリの最新 tree に限られる。

[トークンの権限] Issue 起票に加えて対象リポジトリの contents 書込み権限が要る (fine-grained PAT なら Issues: Read and write と Contents: Read and write を対象 1 リポジトリのみに)。GITHUB_ISSUE_TOKEN は Cloudflare Workers Secret として保持し、DB・リポジトリ・設定 JSON へ書かない。権限が強くなるぶん、対象リポジトリを 1 つに限定することを運用条件として仕様に含める。トークン漏洩時の影響は Issue の改変にとどまらずリポジトリの改変に及ぶ、という事実を明記する。

[診断の秘匿との関係] 以下の診断マスク規則 (a)〜(d) は GitHub へ出す分にもそのまま適用する。むしろ外部へ出るぶん重要度が上がるため、マスク後の内容だけを commit 対象とし、マスク前の生データを GitHub へ出す経路を作らない。(d) の「診断は workspace-admin 以上だけが閲覧できる」は Hub 側の話であり、GitHub 側ではリポジトリの可視性に従う。この差を運用手順書に明記する。

---- 以下 qa-238 の内容 (appr-063 で変更なし) ----

[逐語] 「リクエスト上限、画像 magic bytes 検証、投稿 rate limit」 (参考実装 PR#69 の変更内容として利用者が提示)、および 「その裏側においてはDevToolsで情報を抽出したりとか、そういうふうな情報も含めて共有するようにしておいてほしいです。」

[技術的具体化] 画像検証: MIME 名乗りを信じず先頭バイトの magic bytes と突き合わせ、png / jpeg / webp だけを通す。既存 docs-cms の image-service と hearing-share の safe-attachment が同じ判定を持つため、判定関数を共有モジュールへ切り出して 3 箇所目の独自実装を作らない。データ URL 形式の場合は base64 復号後の実バイトで判定する。

上限: リクエスト全体のバイト上限、本文 1000 文字、画像 1 枚あたりのバイト上限を課し、超過は 413 相当で拒否する。上限判定は復号後の実バイトで行う (base64 長で判定すると 4/3 の差で抜ける)。

rate limit: 投稿に固定窓レート制限を課す。ただし既存 rate-limit 実装は KV / Durable Object を持たないため isolate 内メモリで数えており、複数 isolate に分散すると実効上限が緩む既知の限界がある。改善要望の投稿は乱用の実害が小さい (投稿は管理者にしか見えない) ため、この既知の限界を受け入れ、厳密な分散カウンタは導入しない。ただし限界を仕様に明記し、実害が観測されたら Durable Object へ移す判断点を残す。

診断情報の秘匿: 自動収集した診断は投稿者が中身を意識しないまま送られるため、収集時点でマスクを掛ける。(a) failed request の記録は method・path・ステータス・所要時間だけとし、query string・request body・response body・Cookie・Authorization ヘッダは保持しない。(b) console error のメッセージと stack は保持するが、JWT 様文字列・Bearer トークン・メールアドレス・36 文字以上の連続 base64/hex をパターン置換で伏せ字にする。(c) localStorage / sessionStorage / Cookie は一切読まない。(d) 診断情報は要望本体と同じ認可 (workspace-admin 以上) の下でのみ閲覧でき、投稿者にも返さない。

スクリーンショットの秘匿: 画面には他人の個人情報が写り得るため、黒塗り注釈は元画像に対して破壊的に焼き込み、マスク前の画素をサーバへ送らない。送信されるのは焼き込み後の 1 枚だけとする。R2 オブジェクトには署名なし公開 URL を与えず、必ず認可を通す API route 経由でストリームする。

### qa-231 (対応セル: desktop-windows, desktop-macos)

**質問**: Claude CodeやCodexで作成したドキュメントをHarness HubへAPI反映する追加要件について、既存の認証・セキュリティ・backend・database契約をどう更新するか。

**回答**: [出所] 利用者の2026-08-12の明示要望『Claude Codeの方で作成したドキュメントをこちらのシステムのドキュメントの方に送信できるようにもしておいてほしい』『APIでこちらの方に反映させる』を追加要件として確定する。qa-073（Device Flow数値・保存先）、qa-161/qa-162（Web認証・セキュリティ）、qa-228（backend）、qa-229（database）の既存契約は、以下の差分以外を全面維持する。

【外部Docs同期】Claude Code、Codex、Publisher CLI等の外部作成環境は、固定API keyやブラウザCookieを使わず、既存Device Flowの15分短命access tokenと新しい専用scope docs:writeでMarkdownを同期する。発行主体はworkspace-admin以上、同期先はtokenと同一tenantのdraft文書だけとし、provider-adminにもこの機械経路でのtenant越境を許さない。common文書・自動公開・画像同期はv1対象外とする。既存4 scopeへdocs:writeを加え現行値域を5 scopeとするが、TTL、refresh rotation、OS資格情報域保存、即時失効、再利用検知の契約は変えない。Linuxは永続token保存を行わず実行ごとにDevice Flowを使う。

【API契約】GET/PUT /api/v1/docs/imports/:source/:externalIdを追加する。自然キーはtenant+source+externalId、externalIdはrepository identityとrepository相対pathから導出したSHA-256とし、絶対pathや利用者名を送らない。同じ内容の再送は文書を増やさずunchangedを返す。既存変更にはGETのETagをIf-Matchで要求し、欠落428、古い値412とする。Hub側で手動編集・公開された文書はmodifiedとし、CLIは明示的forceが無い限り停止する。監査には本文を入れず、source、hash ID、revision、結果だけを記録する。

【DB契約】documentsへnullableなexternal_source、external_document_id、external_content_hash、external_revisionをadditive migrationで追加し、tenant_id+external_source+external_document_idを一意にする。外部同期はCASでrevisionを更新し、通常文書と既存行の意味を変えない。documentsは既存ADRどおりworkspace_idを持たずtenant帰属を維持する。

【クライアント境界】同期対象はrepository root配下のMarkdown通常ファイルに限定し、../、絶対path、repository外を指すsymlinkを拒否する。同期コマンドはdocs:writeだけを要求し、既存publish/feedback/aijob/metrics権限を同梱しない。

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

##### 確定内容 qa-311 (対応セル: web)

- 確定要件: 「[appr-063 による再確定] 本セルは appr-061 (改善要望の出口を GitHub Issue へ戻す) と appr-063 (画像・診断ファイ…」 (全文は本章「確定内容 (質疑録)」の `qa-311` を正本とする)
- 設計解釈の記録経路: `dialogue`
- 原則: 宣言された型を信頼せず実体で検証する (magic bytes による content sniffing 防御) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: Content-Type や data URL の宣言は投稿側が自由に書けるため、実行可能な内容を画像と名乗って送り込む余地が残る。先頭バイトで実体を判定し、既存 2 箇所と同じ判定を共有モジュールで再利用する。
  - トレードオフ:
    - magic bytes が一致しても内部が壊れた画像は通る。表示側は復号失敗を握って壊れた表示にしない
    - 判定を共有モジュールへ切り出すため既存 2 feature に変更が波及する。波及範囲は契約テストで固定する
- 原則: 収集時点での最小化とマスキング (データ最小化) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: 診断情報は投稿者が内容を確認せずに送るため、後段でのマスクでは「一度は保存された」事実が消えない。ブラウザ側の収集時点で query・body・Cookie を落とし、トークン様文字列を伏せ字にしてから送る。
  - トレードオフ:
    - query string を落とすため、クエリ依存の不具合 (検索条件で落ちる等) の再現手掛かりが減る。route pattern と本文で補う
    - 伏せ字パターンは万能ではなく、非定型な機密文字列は通り抜ける。診断の閲覧を workspace-admin 以上に絞ることで二重防御にする
- 原則: 分散カウンタによる厳密なレート制限 (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#非適用条件`)
  - 採否: `not_applicable`
  - 章固有の根拠: 本システムは KV も Durable Object も持たず、既存 rate limiter は isolate ローカルで数える。改善要望の投稿は認証済み利用者に限られ、結果は管理者にしか見えないため、乱用の実害が上限逸脱のコストを上回らない。既知の限界として明記し導入を見送る。
  - トレードオフ:
    - isolate 分散時に実効上限が緩む。実害観測時に Durable Object へ移す判断点を仕様へ残す
    - 上限が緩いぶん、大量投稿で R2 が膨らむ可能性がある。オブジェクトの保持期間と容量監視で受ける
- 原則: 機密データを認可境界の内側に閉じ込める (データを外部へ複製しない) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#非適用条件`)
  - 採否: `not_applicable`
  - 章固有の根拠: appr-061 で利用者はスクリーンショットと診断を GitHub 側へ出すことを選び、appr-063 でその実現方法として対象リポジトリへの commit を選んだ。黒塗りは任意、リポジトリ可視性は不問という選択も維持されている。したがって本機能では、機密が認可境界の内側に留まるという前提そのものが成立しない。防護を張れないため、成立していない原則を成立しているかのように書かず、not_applicable として明示したうえで、投稿フォーム・設定画面・削除確認の 3 箇所で「何が外へ出るか」「何が消えないか」を事実として表示することへ置き換える。
  - トレードオフ:
    - 未黒塗りの業務画面が GitHub へ出る投稿が一定数生じる。実装側で必須化して塞がず、表示で伝える
    - git 履歴に残るため削除要求に完全には応えられない。応えられない範囲を削除確認画面で先に示す
##### 確定内容 qa-231 (対応セル: desktop-windows, desktop-macos)

- 確定要件: 「[出所] 利用者の2026-08-12の明示要望『Claude Codeの方で作成したドキュメントをこちらのシステムのドキュメントの方に送信できるようにもしてお…」 (全文は本章「確定内容 (質疑録)」の `qa-231` を正本とする)
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
- 資するゴール: G2, G4, G5, G6, G1

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| owasp-asvs | 5.0.0 | OWASP Foundation (owasp.org) | https://owasp.org/www-project-application-security-verification-standard/ | 2026-08-15T01:35:54Z | 2026-08-15T01:35:54Z |
| rehype-sanitize | 6.0.0 | rehype (unified collective) (github.com) | https://github.com/rehypejs/rehype-sanitize | 2026-08-15T00:15:16Z | 2026-08-15T00:15:16Z |
| cloudflare-workers-secrets | 2026-08-15 (取得日。WebSearch 経路のためページ本文の更新日表示は未確認) | Cloudflare, Inc. (developers.cloudflare.com) | https://developers.cloudflare.com/workers/configuration/secrets/ | 2026-08-15T01:35:54Z | 2026-08-15T01:35:54Z |
| github-attaching-files | 2026-08-16 (取得日。WebSearch 経路のためページ本文の更新日表示は未確認) | GitHub, Inc. (docs.github.com) | https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files | 2026-08-16T02:49:50Z | 2026-08-16T02:49:50Z |
