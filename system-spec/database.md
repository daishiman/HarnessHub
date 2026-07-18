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
| Web (web) | 確定 | 確定質疑: qa-045 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアントを作らないためモバイル固有の永続化なし |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアントを作らないためタブレット固有の永続化なし |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |

## 確定内容 (質疑録)

### qa-045 (対応セル: web)

**質問**: C4 改訂 (業務データ保持) の database (web) への反映は?

**回答**: qa-037 の確定内容 (27 テーブル・ULID・封筒暗号化・hash chain 等) を全面維持しつつ、次の delta を確定する。(1) 新テーブル tenant_data_objects: id, tenant_id, workspace_id, kind (`knowledge_doc` / `run_input` / `run_output`), title, r2_key, size_bytes, content_hash (sha256), enc_key_version, uploaded_by, created_at。実体は保存しない (R2 参照とメタデータのみ。Turso 5GB 無料枠を業務データで消費しない)。D4 row-level scope 必須・分離テスト CI 対象。(2) 暗号化: encryption_keys の purpose に `tenant_data` を追加し、テナント別 DEK による封筒暗号化で R2 実体を暗号化保存する (KEK/DEK 運用は qa-042 の S-D8 と同一機構)。(3) 削除ポリシー: ユーザー削除操作・テナント解約時に R2 実体と DB 行を即時完全削除し、audit_events のみ残す (soft delete 列は設けない)。日次 DB export に平文は含まれない (実体は暗号化済み R2 のみ)。四半期 restore drill に「削除済み業務データが復元されないこと」の確認項目を追加する (qa-019 拡張)。(4) R2 バケット: 業務データ用 prefix をテナント別に分離し (tenant_id prefix)、PackageRegistry (immutable) とはバケットまたは prefix を分ける。無料枠 10GB の使用量は Turso 使用量監視 cron (qa-031 論点 4 の帰結) に R2 使用量を追加して監視する。

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
