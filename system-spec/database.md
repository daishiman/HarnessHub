---
status: confirmed
category: database
aggregate: 確定
spec_cells: [database.web, database.mobile, database.tablet, database.desktop-windows, database.desktop-linux, database.desktop-macos]
serves_goals: [G1, G2, G4, G5]
---

# データベース (database)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-125 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアントを作らないためモバイル固有の永続化なし |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアントを作らないためタブレット固有の永続化なし |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |

## 確定内容 (質疑録)

### qa-125 (対応セル: web)

**質問**: 顧客持ち込み credential の lifecycle と無停止 rotation を database.web の永続化契約へどう反映しますか?

**回答**: qa-112 の tenant scope、方式別保存、共有 credential 非複製、primary connection、migration/rollback 契約を維持する。ただし qa-112【1】の allowed_workspace_domains TEXT NOT NULL DEFAULT [] は migration 0003 の実契約と不一致だったため、TEXT NULL 許容、NULL=顧客方式では hd 未検査・共有方式では fail-closed へ訂正する。【0004 expand】idp_connections に credential_status TEXT NOT NULL DEFAULT active と、client_secret_last4、pending_client_secret_enc / last4 / client_id / credential_mode / allowed_workspace_domains / tested_at、last_tested_at、updated_at の NULL 許容列を追加する。既存行は実際に稼働中だったため active 既定で後方互換を保ち、管理 API の新規行は明示的に pending とする。【無停止】現行暗号文を上書きせず pending に封筒暗号化して保存し、テスト済み時刻と同じ CAS 更新で client ID・secret・方式・許可ドメインを昇格する。取消は pending 列だけを消す。【再開と競合】disabled への新 credential staging は期待状態を CAS 条件にして pending へ戻す。現行テストも現行暗号文と期待状態を CAS 条件にし、競合時は0行として再読込を要求する。暗号文の AAD は同一行の論理 secret slot を用い、pending から現行へ暗号文を再暗号化せず移せる。

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

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
