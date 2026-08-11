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
| Web (web) | 確定 | 確定質疑: qa-229 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアントを作らないためモバイル固有の永続化なし |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアントを作らないためタブレット固有の永続化なし |
| デスクトップ (Windows) (desktop-windows) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 対象外 | 理由: 作者環境にローカル DB を持たない。公開状態の正本は Hub 側 control plane (作者側は作業ディレクトリの package のみ) |

## 確定内容 (質疑録)

### qa-229 (対応セル: web)

**質問**: database/webの承認済み現行契約を、旧値と訂正文を併記せず一つの無矛盾な仕様として統合するとどうなるか。

**回答**: [出所] 利用者の2026-08-10逐語回答「推奨案3点を承認。」（appr-043）、既存P01 baseline、qa-221〜qa-225のうち矛盾しない契約を統合した現行正本である。tenant分離、PII非複製、expand-then-contractを維持する。

【1 Project関係】
HearingSheet確定時に、サーバがtenant_id/workspace_idでscopeされたProjectを冪等に作成または関連付け、HearingSheet→Project関係を保存する。BuildとMetricsはこの関係または派生したHarness/Release/Project registryだけをtrusted resolverとして使い、client/token申告project_idを保存しない。

【2 metrics_events】
append-only事実表はid、tenant_id、workspace_id、project_id、harness_id、principal由来actor_user_id、nullable department_id、run_count、server occurred_at、nullable idempotency_key、request_digest、idempotency_expires_at、created_atを持つ。client_reported_at、時間、金額、給与、係数を持たない。全queryはtenant/workspace scopeを必須とし、Project/Harness/actorの関係をrepositoryでfail-closed検証する。

endpoint専用tableでの冪等uniqueはtenant_id+idempotency_keyで、論理scope tenant+endpointを表現する。TTLは24時間。同key・異digestは422。期限後は旧eventのbusiness facts、digest、expiryを不変にしたままkey claimだけnull化して再利用できる。

【3 metrics_rollups】
id、tenant_id、workspace_id、period=daily|weekly、dimension=tenant|harness|department|project|user、dimension_key、period_start、period_end、run_count、saved_minutes、saved_amount_jpy、computed_at、created_at、updated_atを持つ。saved値はserver側packages/estimationの算出結果であり、client申告値やsalaryは保存しない。uniqueはtenant+workspace+period+dimension+dimension_key+period_startとする。

【4 transactionとwriter能力】
rollupのatomic boundaryはtenant+workspace+period+period_startで、全dimension rowをTurso単一transactionでupsertする。Buildのstate・stage event・auditもTurso単一transactionを正規writerとする。D1 write adapterとD1 Build mutationは同等all-or-nothing証明までzero-writeで無効にする。

【5 保持】
metrics_eventsはTursoへ無期限保持し、R2 archiveや自動削除を行わない。一般DB backupのR2利用とは区別する。Turso storage/read/write使用量を日次監視し、無料枠圧迫時だけR4-reopenと利用者承認を経て保持期間を再検討する。

【6 KPI snapshot】
HearingSheet ownerは期間末の対象集合とcompleted状態、Catalog/Release ownerは期間末の対象公開済みHarness集合をsnapshotAt付きで永続化するかversioned read modelから決定論的に再現できなければならない。完了率は前者、利用率の分母は後者、分子は後者と期間内Harness rollupの共通部分。分母0はnullで表示「—」。anomalyは過去4完了週が揃い中央値が0でない場合だけ評価する。

【7 migration】
既存combined 0008は履歴としてimmutableに保ち、再採番・物理分割しない。今後のdelta migration、release、rollback evidenceはBuildとMetricsで分離する。rollbackはmigration lineageと前方修正を含むrelease単位で設計し、既存表DROPだけに限定しない。

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

##### 確定内容 qa-229 (対応セル: web)

- 確定要件: [出所] 利用者の2026-08-10逐語回答「推奨案3点を承認。」（appr-043）、既存P01 baseline、qa-221〜qa-225のうち矛盾しない契約を統合した現行正本である。tenant分離、PII非複製、expand-then-contractを維持する。

【1 Project関係】
HearingSheet確定時に、サーバがtenant_id/workspace_idでscopeされたProjectを冪等に作成または関連付け、HearingSheet→Project関係を保存する。BuildとMetricsはこの関係または派生したHarness/Release/Project registryだけをtrusted resolverとして使い、client/token申告project_idを保存しない。

【2 metrics_events】
append-only事実表はid、tenant_id、workspace_id、project_id、harness_id、principal由来actor_user_id、nullable department_id、run_count、server occurred_at、nullable idempotency_key、request_digest、idempotency_expires_at、created_atを持つ。client_reported_at、時間、金額、給与、係数を持たない。全queryはtenant/workspace scopeを必須とし、Project/Harness/actorの関係をrepositoryでfail-closed検証する。

endpoint専用tableでの冪等uniqueはtenant_id+idempotency_keyで、論理scope tenant+endpointを表現する。TTLは24時間。同key・異digestは422。期限後は旧eventのbusiness facts、digest、expiryを不変にしたままkey claimだけnull化して再利用できる。

【3 metrics_rollups】
id、tenant_id、workspace_id、period=daily|weekly、dimension=tenant|harness|department|project|user、dimension_key、period_start、period_end、run_count、saved_minutes、saved_amount_jpy、computed_at、created_at、updated_atを持つ。saved値はserver側packages/estimationの算出結果であり、client申告値やsalaryは保存しない。uniqueはtenant+workspace+period+dimension+dimension_key+period_startとする。

【4 transactionとwriter能力】
rollupのatomic boundaryはtenant+workspace+period+period_startで、全dimension rowをTurso単一transactionでupsertする。Buildのstate・stage event・auditもTurso単一transactionを正規writerとする。D1 write adapterとD1 Build mutationは同等all-or-nothing証明までzero-writeで無効にする。

【5 保持】
metrics_eventsはTursoへ無期限保持し、R2 archiveや自動削除を行わない。一般DB backupのR2利用とは区別する。Turso storage/read/write使用量を日次監視し、無料枠圧迫時だけR4-reopenと利用者承認を経て保持期間を再検討する。

【6 KPI snapshot】
HearingSheet ownerは期間末の対象集合とcompleted状態、Catalog/Release ownerは期間末の対象公開済みHarness集合をsnapshotAt付きで永続化するかversioned read modelから決定論的に再現できなければならない。完了率は前者、利用率の分母は後者、分子は後者と期間内Harness rollupの共通部分。分母0はnullで表示「—」。anomalyは過去4完了週が揃い中央値が0でない場合だけ評価する。

【7 migration】
既存combined 0008は履歴としてimmutableに保ち、再採番・物理分割しない。今後のdelta migration、release、rollback evidenceはBuildとMetricsで分離する。rollbackはmigration lineageと前方修正を含むrelease単位で設計し、既存表DROPだけに限定しない。
- 設計解釈の記録経路: `dialogue`
- 原則: Domain Event (過去の事実を明示する) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/ddd.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: event factsと期限付きidempotency claimを分離し、旧eventを残したままclaimだけを解放して監査可能性とkey再利用を両立した。
  - トレードオフ:
    - idempotency metadataだけはappend-only例外になる
    - 無期限保持費用を日次監視で引き受ける
- 原則: Dependency Rule (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/clean-architecture.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: owner間関係をtrusted resolverへ閉じ、client inputをproject identityから排除した。
  - トレードオフ:
    - resolver未実装中はfail-closedになる
    - D1 parity証明までTurso依存が残る
- 資するゴール: G4, G5

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
