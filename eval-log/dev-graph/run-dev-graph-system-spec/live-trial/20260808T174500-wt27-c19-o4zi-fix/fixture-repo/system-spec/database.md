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
| Web (web) | 確定 | 確定質疑: qa-database-web |
| モバイル (mobile) | 対象外 | 理由: 本システムはクライアント実装を含まず、モバイル向け成果物を作らないため |
| タブレット (tablet) | 対象外 | 理由: 本システムはクライアント実装を含まず、タブレット向け成果物を作らないため |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: 本システムはクライアント実装を含まず、デスクトップアプリ成果物を作らないため |

## 確定内容 (質疑録)

### qa-database-web (対応セル: web)

**質問**: カテゴリ database × platform web の要件は何か (system-spec/requirements-brief.md §3 の確定回答を一次入力とする)

**回答**: SQLite ファイル 1 個 (`todo.db`)。テーブルは `todos` と `api_tokens`。起動時にスキーマを冪等作成し、マイグレーションは単調増加の SQL 版数で管理する。

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

### 単一ファイル永続化 (SQLite) の適用条件照合

- project candidate: `sqlite-single-file-persistence-fit` (`deepened`)
- 解決対象: 永続化先の選択が常駐ミドルウェア追加を招くと G4 (1 コマンド起動・1 ファイルバックアップ) と U8 が破れる

#### 目的

公式の client/server 判断チェックリストを確定内容 (todo.db 1 ファイル・todos/api_tokens・起動時の冪等スキーマ作成) に照合し、SQLite 採択の可否を根拠づける

#### 解決する問題

- 永続化先を誤ると常駐プロセスが 1 個増え、バックアップが dump 運用になる

#### 適用条件

- 確定内容どおり単一プロセス・単一利用者で、データとアプリが同一端末にある
- 並行 writer が発生しない (本システムは利用者 1 名の CRUD のみ)

#### 非適用条件

- 公式が挙げる 3 条件 (ネットワーク分離・多数の並行 writer・テラバイト級) のいずれかに該当する場合。本システムはいずれにも該当しないため非適用条件に触れない

#### トレードオフ

- 書込みが直列化される代わりに、運用対象プロセスが 0 個増える (G4 に直結)

#### 失敗モード

- 将来マルチユーザー化した際に writer 競合が顕在化する。単一プロセス前提を運用章へ明記し、逸脱時は D1 を再評価する

#### goalへの寄与

G1 (端末外へ出ない) / G3 (再起動後も残る) / G4 (todo.db 1 個のコピーがバックアップ手順そのものになる)

---

#### 本章での適用

- 上記原則は確定内容 qa-database-web (対応セル: web) の判断へ適用する
- 資するゴール: G1, G3, G4

## 最新ドキュメント出典

| 対象 | バージョン | 公式発行元 | 出典URL | 取得 | 最新確認 |
|---|---|---|---|---|---|
| sqlite | 3.53.4 | SQLite (D. Richard Hipp / SQLite Consortium) (www.sqlite.org) | https://www.sqlite.org/index.html | 2026-08-08T08:45:43.761Z | 2026-08-08T08:45:43.761Z |
| postgresql | 18 | PostgreSQL Global Development Group (www.postgresql.org) | https://www.postgresql.org/docs/ | 2026-08-08T09:03:06.121Z | 2026-08-08T09:03:06.121Z |
