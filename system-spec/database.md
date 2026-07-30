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
| Web (web) | 確定 | 確定質疑: qa-097 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアントを作らないためモバイル固有の永続化なし |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアントを作らないためタブレット固有の永続化なし |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |

## 確定内容 (質疑録)

### qa-097 (対応セル: web)

**質問**: HarnessHub-njkm の接続復旧実装を受け、qa-086 の schema・migration・書き込み共有範囲を失わず、プロセス外 SQLITE_BUSY 後の database.web 契約をどう確定しますか?

**回答**: ユーザーの 2026-07-30 最終レビュー・仕様反映指示を明示承認として、qa-086 の schema、migration、guardedWrite、実行環境別共有範囲を全面維持し、次の database.web 契約を再確定する。

【1. 既存データ契約の維持】user_workspaces は tenant_id,user_id,workspace_id の複合主キー、device_authorizations は tenant_id NOT NULL と workspace_id/scopes_json/device_name/attempts/last_polled_at を保持し、expired は expires_at から導出する。publisher_tokens は workspace_id NOT NULL と family_id を持ち、旧 token は移送せず Device Flow で再発行する。repository write は HarnessHub-mb7c で全量 guardedWrite 経由へ統一済みで、packages/db/scripts/check-db-write-gate.mjs が新規迂回を拒否する。

【2. 実行環境別の競合境界】Node の file: / :memory: libSQL adapter は writeConcurrencyScope=process-local とし、同一プロセス内の write を guardedWrite で直列化する。別プロセスが同じ file DB を触る競合は直列化の外に残る。Cloudflare Workers の Turso Web client と D1 adapter は writeConcurrencyScope=request-bound とし、要求間 Promise を共有せず、DB 側の排他と CAS、競合再試行へ委ねる。

【3. 壊れた接続の隔離】process-local 接続が SQLITE_BUSY / database is locked を踏んだ場合、接続層は raw client を poisoned（復旧まで使用禁止）として記録する。以後の read/write/transaction 操作は ConnectionPoisonedError で fail-fast し、未 commit の行を同じ接続から読ませず、『成功したのに別接続から行が見えない』silent data loss を防ぐ。UNIQUE などロック以外の確定失敗は poison にしない。request-bound 接続は 1 要求ごとに状態が閉じるため poison にせず従来の再試行を維持する。

【4. 復旧口と参照安定性】TursoAdapter は reconnect() と isPoisoned() を公開する。reconnect() は古い raw client を閉じ、同じ factory から新しい client を作り、poison を解除する。公開 Client と Drizzle adapter の参照は変えないため、既に構築済み repository や spread された test adapter を作り直さない。poison 検知時の自動 reconnect は、並行 transaction を途中で巻き込み故障の観測も消すため採用しない。

【5. 再試行と検証】ConnectionPoisonedError は元の SQLITE_BUSY を cause に保持するが、isLockConflict はこれを再試行対象から除外し、壊れた接続を 25 回叩かない。fake Client の状態遷移テストに加え、子プロセスが同じ file DB の write lock を保持する実 libSQL テストで、BUSY 後の read/write fail-fast、未 commit 行が別接続から見えないこと、lock 解放と reconnect 後の書き込みが別接続から見えることを固定する。

【6. 境界】DB schema、migration、API payload、Cloudflare request-bound runtime の公開挙動は変更しない。本差分はローカル file DB 接続の障害検知・明示復旧契約を追加する。

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
