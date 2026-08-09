---
status: confirmed
category: database
aggregate: 確定
spec_cells: [database.web, database.mobile, database.tablet, database.desktop-windows, database.desktop-linux, database.desktop-macos]
serves_goals: [G1, G3, G4]
---

# データベース (database)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-021 |
| モバイル (mobile) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、モバイル向け成果物を作らないため |
| タブレット (tablet) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、タブレット向け成果物を作らないため |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: requirements-brief.md §2 platform 方針: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |

## 確定内容 (質疑録)

### qa-021 (対応セル: web)

**質問**: データベース × Web (web) について、永続化方式・テーブル構成・スキーマ移行をどうしますか。その構成を選んだ設計上の理由と、他の構成を採らなかった理由も併せて教えてください。

**回答**: SQLite ファイル 1 個 (`todo.db`)。テーブルは `todos` と `api_tokens`。起動時にスキーマを冪等作成し、マイグレーションは単調増加の SQL 版数で管理する。

【適用した上流指針・設計原則と、その原則がこの要件になった理由】
- DDD (`ddd.md`) の「invariant と transaction owner を集約へ閉じる」原則 → 確定内容の `todos` と `api_tokens` の 2 テーブル分離 → TODO の状態遷移 (未完了→完了) の不変条件を todos 側が単独で持ち、認証資格の更新経路と業務データの更新経路が同一 transaction に混ざらないようにするため (G2 の認可判定が業務更新へ巻き込まれない)。
- Clean Architecture (data-access concern) の「永続化は詳細であり内側の規則を汚染しない」原則 → 確定内容の『起動時に冪等なスキーマ作成 + 単調増加 SQL 版数のマイグレーション』 → 版数を単調増加に固定することで再起動時に到達しうるスキーマ状態を一意にし、上位層を変更せずに G3 (再起動後も全件復元) を保証できるため。
- Google SRE (reliability concern) の「復旧経路を単純に保つ」原則 → 確定内容の『SQLite ファイル 1 個 (`todo.db`)』 → 復旧単位をファイル 1 個に一致させ、バックアップ/復旧の分岐を無くすことで G4 (1 ファイルコピーでバックアップ) を満たすため。PostgreSQL を採らなかったのは常駐プロセスが G4 と U8 制約に反するため (D1)。

(上流指針: Clean Architecture (data-access) / Google SRE (reliability) / deep card: ddd.md。上の各 - は 1 論点で、spec-state-contract の「qa_log の論点分離」に従い qa-021-p1..p3 として分離索引 entry も追記している。)

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

- 上記原則は確定内容 qa-021 (対応セル: web) の判断へ適用する
- 資するゴール: G1, G3, G4

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| sqlite | 3.53.4 | SQLite Consortium (sqlite.org) (www.sqlite.org) | https://www.sqlite.org/changes.html | 2026-08-08T11:00:34.281Z | 2026-08-08T11:00:34.281Z |
| postgresql | 18.4 | PostgreSQL Global Development Group (www.postgresql.org) | https://www.postgresql.org/docs/release/18.4/ | 2026-08-08T11:17:11.432Z | 2026-08-08T11:17:11.432Z |
