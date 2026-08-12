---
status: confirmed
category: backend
aggregate: 確定
spec_cells: [backend.web, backend.mobile, backend.tablet, backend.desktop-windows, backend.desktop-linux, backend.desktop-macos]
serves_goals: [G4, G5, G1, G3]
---

# バックエンド (backend)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-231 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアント向け API 差分なし (ブラウザ経由は web 行でカバー) |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアント向け API 差分なし (ブラウザ経由は web 行でカバー) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-010 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-010 |

## 確定内容 (質疑録)

### qa-231 (対応セル: web)

**質問**: Claude CodeやCodexで作成したドキュメントをHarness HubへAPI反映する追加要件について、既存の認証・セキュリティ・backend・database契約をどう更新するか。

**回答**: [出所] 利用者の2026-08-12の明示要望『Claude Codeの方で作成したドキュメントをこちらのシステムのドキュメントの方に送信できるようにもしておいてほしい』『APIでこちらの方に反映させる』を追加要件として確定する。qa-073（Device Flow数値・保存先）、qa-161/qa-162（Web認証・セキュリティ）、qa-228（backend）、qa-229（database）の既存契約は、以下の差分以外を全面維持する。

【外部Docs同期】Claude Code、Codex、Publisher CLI等の外部作成環境は、固定API keyやブラウザCookieを使わず、既存Device Flowの15分短命access tokenと新しい専用scope docs:writeでMarkdownを同期する。発行主体はworkspace-admin以上、同期先はtokenと同一tenantのdraft文書だけとし、provider-adminにもこの機械経路でのtenant越境を許さない。common文書・自動公開・画像同期はv1対象外とする。既存4 scopeへdocs:writeを加え現行値域を5 scopeとするが、TTL、refresh rotation、OS資格情報域保存、即時失効、再利用検知の契約は変えない。Linuxは永続token保存を行わず実行ごとにDevice Flowを使う。

【API契約】GET/PUT /api/v1/docs/imports/:source/:externalIdを追加する。自然キーはtenant+source+externalId、externalIdはrepository identityとrepository相対pathから導出したSHA-256とし、絶対pathや利用者名を送らない。同じ内容の再送は文書を増やさずunchangedを返す。既存変更にはGETのETagをIf-Matchで要求し、欠落428、古い値412とする。Hub側で手動編集・公開された文書はmodifiedとし、CLIは明示的forceが無い限り停止する。監査には本文を入れず、source、hash ID、revision、結果だけを記録する。

【DB契約】documentsへnullableなexternal_source、external_document_id、external_content_hash、external_revisionをadditive migrationで追加し、tenant_id+external_source+external_document_idを一意にする。外部同期はCASでrevisionを更新し、通常文書と既存行の意味を変えない。documentsは既存ADRどおりworkspace_idを持たずtenant帰属を維持する。

【クライアント境界】同期対象はrepository root配下のMarkdown通常ファイルに限定し、../、絶対path、repository外を指すsymlinkを拒否する。同期コマンドはdocs:writeだけを要求し、既存publish/feedback/aijob/metrics権限を同梱しない。

### qa-010 (対応セル: desktop-windows, desktop-macos)

**質問**: 作者側 Publisher の実装形態は?

**回答**: TypeScript 統一を採用。Publisher core は TypeScript (Node + pnpm) で新規実装し、Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する。責務: package 収集・manifest 補完・ローカル pre-check・Hub API 呼出 (Device Flow 認証)・target=web_app の wrangler CLI スクリプト実行と結果報告・URL 登録。検査ロジックは Hub 側 (Workers=JS) と共有し二重実装を回避する。既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) は仕様の正本 (移植元) として参照し、挙動同値性をテストで担保して TypeScript へ移植する (C3 整合)。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| application-architecture | Robert C. Martin — Clean Architecture | レイヤ境界・依存方向 (内向き)・ユースケース中心設計 | Clean Architecture (2017), the Dependency Rule |
| data-access | Robert C. Martin — Clean Architecture | 永続化を境界の外側へ追い出し interface adapter で隔離する | Clean Architecture — gateways/repositories boundary |

- 本章の確定内容 (質疑録) は上記 authority を上流指針として適用する。具体技術の選定はこの指針に従属し、指針との乖離は再オープン (R4-reopen) の根拠になる。

## 適用された設計知識

### Domain-Driven Design — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/ddd.md`

#### 目的

businessの重要なruleと用語をmodel/code/会話で一致させ、複雑性を適切な境界へ閉じ込め、継続的な学習をsoftwareへ反映する。

#### 解決する問題

- 仕様語、画面語、DB列、code名がずれ、変更時に意味を再解釈する。
- 異なる業務文脈の同名概念を一modelへ押し込み、巨大で矛盾したmodelになる。
- invariantとtransaction ownerが不明で、どこからでもdataを変更できる。
- legacy codeのtechnical構造がbusiness capabilityを隠し、改善順を決められない。

#### 適用条件

- rule、例外、用語、状態遷移が多く、domain expertとの継続的なmodel学習が価値を持つ。
- team/部門ごとに言葉やownershipが異なり、integrationで翻訳が必要。
- core domainの差別化がsystemの本質的目的に直結する。

#### 非適用条件

- 単純CRUD、汎用supporting機能、既製serviceで十分なgeneric subdomain。
- domain expertへアクセスできず、用語とruleを検証するfeedback loopを作れない段階。
- bounded contextをservice数へ機械変換する目的。monolith内moduleでも境界は成立する。

#### トレードオフ・失敗モード

- workshop、model、mapping、専門語彙の維持に継続的な時間が必要。
- aggregateを大きくしすぎてlock/latencyを増やす、細かくしすぎてinvariantをeventual consistencyへ漏らす。
- 「Repository/Entity」等のpattern名だけ採用したanemic modelになり、business ruleがserviceへ散る。
- bounded contextを組織図やDB tableから決め、実際の言語・capability境界を検証しない。
- eventを事実でなくcommandとして命名し、ordering/idempotency/failure recoveryを設計しない。

#### goalへの寄与

- U1-U9の語彙をmodelへ接続し、goalがどのcontext/capability/invariantで実現されるかを示す。
- core domainへ設計投資を集中し、generic領域は無料/低コストserviceや標準実装も比較対象にできる。
- refactoringは一括rewriteでなく、重要なbusiness rule周辺からstrangler/bubble context等で境界を育てる。

---

### Clean Architecture — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/clean-architecture.md`

#### 目的

変化しやすいUI、DB、framework、外部サービスから、長く保持したい業務ルールとuse caseを隔離し、技術交換やテストを目的達成の阻害要因にしない。

#### 解決する問題

- 業務ルールがcontroller/ORM/UI lifecycleへ埋まり、単体で検証できない。
- 外部技術変更が内側のuse caseまで波及し、置換費用を予測できない。
- 入出力形式やvendor型が境界を越え、責務と所有者が曖昧になる。

#### 適用条件

- business ruleが外部I/Oより長寿命で、UI/DB/providerの変更可能性がある。
- 複数delivery channelや外部integrationから同じuse caseを再利用する。
- 重要なpolicyを高速・決定論的にテストする価値が、境界導入費を上回る。

#### 非適用条件

- 寿命の短い検証用prototypeで、交換可能性より学習速度が明確に優先される。
- domain ruleがほぼ無い単純変換scriptで、port/adapterが実質的な抽象を生まない。
- 外部製品そのものがsystemの目的で、抽象化すると必要機能が失われる。ただしsecurity/audit boundaryは別途必要。

#### トレードオフ・失敗モード

- 境界、DTO、mapping、dependency injectionの量が増え、小規模systemでは認知負荷が先行する。
- 「4層を作ること」が目的化すると、変化軸のないinterfaceやpass-through use caseが増える。
- domain modelを万能化してdelivery固有の制約を隠すと、現実のlatency/transaction/error semanticsを見失う。
- portを外側が定義したりinner layerがORM型を返したりすると、名前だけcleanな依存逆転になる。

#### goalへの寄与

- `essential_purpose`に直結するpolicyを外部詳細から守り、goal達成ロジックの検証を速くする。
- 制約に「vendor lock-in低減」「複数platform」「高い変更頻度」がある場合、変更範囲と移行riskを局所化する。
- 適用判断は「何層あるか」でなく、守るgoal、予想される変更、boundary testで観測する。

---

### API Design Patterns — deep knowledge card

- 出典カード: `ref-system-design-knowledge/references/api-design-patterns.md`

#### 目的

consumerとproviderの独立変更を支える安定した契約を作り、再試行、失敗、並行更新、pagination、evolutionを予測可能にする。

#### 解決する問題

- resource/operationの意味、error、null、time、identifierがendpointごとに揺れる。
- timeout後の再試行で二重処理が起き、clientが成功/失敗を判断できない。
- collection増大や並行更新でoffset paginationと全件responseが破綻する。
- version/evolution方針がなく、provider変更がconsumerを突然壊す。

#### 適用条件

- 複数client/team/organizationが独立releaseで同じservice boundaryを利用する。
- network failureとretryが通常事象で、operation結果の重複や不明状態を制御する必要がある。
- contractの長期互換性とobservabilityが局所的な実装簡潔性より重要。

#### 非適用条件

- 同一process内のprivate callで、network boundaryや独立versioningが存在しない。
- hard real-time stream、双方向session、巨大event flowなど、request/response RESTが問題形状に合わない。
- 単純CRUD表面化がdomain invariantを迂回させる場合。use-case operationまたは別interaction modelを選ぶ。

#### トレードオフ・失敗モード

- version、idempotency ledger、schema governance、compatibility testに運用費がかかる。
- 「名詞URL」だけ守ってtransaction、authorization、error semanticsを設計しない表層RESTになる。
- offset paginationは簡単だが大規模/更新中datasetで遅延・重複・欠落を起こす。
- idempotency keyのscope/TTL/payload bindingが曖昧だと、別requestを誤って同一視する。
- breaking changeを新versionで逃がし続けると、複数version保守とsecurity patch負担が増える。

#### goalへの寄与

- mobile/web/desktop間で一貫したbusiness capabilityを共有し、platform別再実装を減らす。
- reliability goalにはretry-safe operationと明示的error、delivery goalにはcontract testとadditive evolutionを結ぶ。
- 選択はAPI様式の流行でなく、consumer、latency、consistency、offline、security、cost constraintsへの適合で評価する。

---

#### 本章での適用

##### 確定内容 qa-231 (対応セル: web)

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
##### 確定内容 qa-010 (対応セル: desktop-windows, desktop-macos)

- 確定要件: TypeScript 統一を採用。Publisher core は TypeScript (Node + pnpm) で新規実装し、Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する。責務: package 収集・manifest 補完・ローカル pre-check・Hub API 呼出 (Device Flow 認証)・target=web_app の wrangler CLI スクリプト実行と結果報告・URL 登録。検査ロジックは Hub 側 (Workers=JS) と共有し二重実装を回避する。既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) は仕様の正本 (移植元) として参照し、挙動同値性をテストで担保して TypeScript へ移植する (C3 整合)。
- 設計解釈の記録経路: `legacy_backfill` (`set-qa-design-applications`)
- 原則: Ports and Adapters / DIP (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: Publisher core を TypeScript の中心ロジックとし、Claude Code / Codex plugin、Hub API、wrangler CLI を外部 adapter として扱う責務分離に適用した。
  - トレードオフ:
    - core と adapter の境界型・mapping が増える
    - 既存 Python 資産の TypeScript 移植と挙動同値テストが必要になる
- 原則: Appropriate abstraction / DRY (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-code.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: Hub と Publisher の検査規則を共有し、同じ package 契約を別実装へ重複させない方針に適用した。
  - トレードオフ:
    - 共有境界の変更が双方へ波及する
    - 偶然似た処理まで統合しない継続的な見極めが要る
- 資するゴール: G4, G5, G1, G3

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
