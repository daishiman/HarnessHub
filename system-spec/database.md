---
status: confirmed
category: database
aggregate: 確定
spec_cells: [database.web, database.mobile, database.tablet, database.desktop-windows, database.desktop-linux, database.desktop-macos]
serves_goals: [G4, G5]
---

# データベース (database)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-231 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアントを作らないためモバイル固有の永続化なし |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアントを作らないためタブレット固有の永続化なし |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |

## 確定内容 (質疑録)

### qa-231 (対応セル: web)

**質問**: Claude CodeやCodexで作成したドキュメントをHarness HubへAPI反映する追加要件について、既存の認証・セキュリティ・backend・database契約をどう更新するか。

**回答**: [出所] 利用者の2026-08-12の明示要望『Claude Codeの方で作成したドキュメントをこちらのシステムのドキュメントの方に送信できるようにもしておいてほしい』『APIでこちらの方に反映させる』を追加要件として確定する。qa-073（Device Flow数値・保存先）、qa-161/qa-162（Web認証・セキュリティ）、qa-228（backend）、qa-229（database）の既存契約は、以下の差分以外を全面維持する。

【外部Docs同期】Claude Code、Codex、Publisher CLI等の外部作成環境は、固定API keyやブラウザCookieを使わず、既存Device Flowの15分短命access tokenと新しい専用scope docs:writeでMarkdownを同期する。発行主体はworkspace-admin以上、同期先はtokenと同一tenantのdraft文書だけとし、provider-adminにもこの機械経路でのtenant越境を許さない。common文書・自動公開・画像同期はv1対象外とする。既存4 scopeへdocs:writeを加え現行値域を5 scopeとするが、TTL、refresh rotation、OS資格情報域保存、即時失効、再利用検知の契約は変えない。Linuxは永続token保存を行わず実行ごとにDevice Flowを使う。

【API契約】GET/PUT /api/v1/docs/imports/:source/:externalIdを追加する。自然キーはtenant+source+externalId、externalIdはrepository identityとrepository相対pathから導出したSHA-256とし、絶対pathや利用者名を送らない。同じ内容の再送は文書を増やさずunchangedを返す。既存変更にはGETのETagをIf-Matchで要求し、欠落428、古い値412とする。Hub側で手動編集・公開された文書はmodifiedとし、CLIは明示的forceが無い限り停止する。監査には本文を入れず、source、hash ID、revision、結果だけを記録する。

【DB契約】documentsへnullableなexternal_source、external_document_id、external_content_hash、external_revisionをadditive migrationで追加し、tenant_id+external_source+external_document_idを一意にする。外部同期はCASでrevisionを更新し、通常文書と既存行の意味を変えない。documentsは既存ADRどおりworkspace_idを持たずtenant帰属を維持する。

【クライアント境界】同期対象はrepository root配下のMarkdown通常ファイルに限定し、../、絶対path、repository外を指すsymlinkを拒否する。同期コマンドはdocs:writeだけを要求し、既存publish/feedback/aijob/metrics権限を同梱しない。

## 上流指針 (doctrine anchor)

| concern | authority (正本) | 導く上流原則 | 出典 |
|---|---|---|---|
| data-access | Robert C. Martin — Clean Architecture | 永続化を境界の外側へ追い出し interface adapter で隔離する | Clean Architecture — gateways/repositories boundary |
| reliability | Google SRE | SLO/エラーバジェット・冗長性・スケーリング・監視の上流指針 | https://sre.google/books/ |

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
- 資するゴール: G4, G5

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)

## 2026-08-12 MVP 実装追記 (feat-hearing-intake / HarnessHub-370h)

- migration `0010_hearing-intake-screenshots-and-share-tokens.sql` で
  `hearing_screenshots` と `hearing_share_tokens` を追加する。
- 画像 blob は `tenant_data_objects` を再利用し、hearing 側はメタデータと token 境界だけを持つ。
- 詳細は `docs/backend-spec.md` §2.3。

## 2026-08-12 MVP 実装追記 (feat-docs-cms blog essentials / HarnessHub-zkcl)

- `documents.publish_at` を nullable epoch ms として純増する。`scheduled` enum は追加しない。
- 表示状態: `published` / `draft+future publish_at`=予約中 / それ以外の draft=非公開。
- 予約公開 cron は default/max 100・`publish_at ASC,id ASC`・行 CAS。監査 action=`docs.scheduled_publish`。
- 分類 (category/tags)・thumbnail/excerpt の auto/manual 契約と clear 規則の正本は
  `docs/features/feat-docs-cms/architecture-decision-record.md` §1/§8 と `docs/backend-spec.md`。
- 本追記は docs CMS 既存枠 (tenant 分離・admin 編集・sanitize) の具体化であり、auth role 階層は不変。
