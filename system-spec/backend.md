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
| Web (web) | 確定 | 確定質疑: qa-228 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアント向け API 差分なし (ブラウザ経由は web 行でカバー) |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアント向け API 差分なし (ブラウザ経由は web 行でカバー) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-010 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-010 |

## 確定内容 (質疑録)

### qa-228 (対応セル: web)

**質問**: backend/webの承認済み現行契約を、旧値と訂正文を併記せず一つの無矛盾な仕様として統合するとどうなるか。

**回答**: [出所] 利用者の2026-08-10逐語回答「推奨案3点を承認。」（appr-043）と、既存確定qa-220〜qa-224のうち矛盾しない契約を統合した現行正本である。認証方式D3、認可単一middleware、strict schema、deny-by-default、共通error model、additive evolutionを維持する。

【1 Projectの正規生成と解決】
HearingSheet確定遷移を起点に、サーバが同一tenant/workspace内でProjectを冪等に作成または既存Projectへ関連付け、その関係を保存する。Build作成はこの確定関係をtrusted resolverで解決できた場合だけ許す。MetricsはbodyのharnessIdをサーバ側Harness/Release/Project registryでtenant/workspace/projectへ一意に解決する。project_idをclient body・表示名・token claimから採用せず、未解決・不一致・越境は情報を漏らさずfail-closedとする。

【2 Metrics ingest】
POST /api/v1/metrics/eventsはDevice Flowの短命Bearer token、x-harness-workspace-id、Idempotency-Keyを必須とする。tokenから信頼する主体はtenant/workspace/userまで。strict bodyはharnessIdと整数runCountだけで、client時刻・actor・department・project・時間・金額・給与・係数を拒否する。actorはprincipal由来、departmentはtrusted lookup未整備中null、occurred_atはサーバ採番。business factsはappend-onlyで更新・削除APIを持たない。

【3 冪等】
論理scopeはtenant+endpoint、TTLは24時間、digestはcanonical payloadに束縛する。同key・同digestの有効期間内再送は200で同じeventを再生し、同key・異digestは422で計上しない。期限切れkeyは旧event factsを変えずclaimだけ解放する。unique constraintを同時実行の最終防壁とする。

【4 rollup】
Workers cronは日次事前集計と週次確定を行い、tenant/harness/department/project/user次元のrun_count、saved_minutes、saved_amount_jpyをサーバ側packages/estimationで算出する。workspace+period単位の全次元upsertをTurso単一transactionでcommitし、失敗時は全件rollbackする。D1 write adapterは同等all-or-nothing証明まで無効。画面APIはcommit済みrollupとowner snapshotだけを読み、生eventのonline aggregateを禁止する。

【5 KPIとanomaly】
completionRateは期間末HearingSheet snapshotのcompleted件数÷対象総数、utilizationRateは期間末公開済みHarness snapshotのうち期間内利用1回以上の件数÷対象総数。分母0はrate=null+denominator_empty。anomalyは過去4完了週が揃い中央値が0でない場合だけ10倍超を評価する。通知は観測日・scope・user・rule versionで冪等化し、ingestをブロックしない。

【6 Build mutation】
正規endpointはPOST /api/v1/builds/{id}/stage。expected source stageまたはexpected_updated_atによるCASを課し、競合は409。正規writerはTursoだけで、state・stage event・auditを同一transactionでall-or-nothingに記録する。D1は同等原子性が証明されるまで503 typed unavailableかつzero-writeで拒否し、部分書込みやTurso失敗時fallbackを行わない。

【7 UI供給】
S09=/dashboard、S16=/tracking。APIはKPIのnumerator/denominator/period/snapshotAt/nullable rate/reasonと、chart/table共通data modelを返す。集計金額はmember以上、user次元の金額はusers.read_salary保持者だけに返す。

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

##### 確定内容 qa-228 (対応セル: web)

- 確定要件: [出所] 利用者の2026-08-10逐語回答「推奨案3点を承認。」（appr-043）と、既存確定qa-220〜qa-224のうち矛盾しない契約を統合した現行正本である。認証方式D3、認可単一middleware、strict schema、deny-by-default、共通error model、additive evolutionを維持する。

【1 Projectの正規生成と解決】
HearingSheet確定遷移を起点に、サーバが同一tenant/workspace内でProjectを冪等に作成または既存Projectへ関連付け、その関係を保存する。Build作成はこの確定関係をtrusted resolverで解決できた場合だけ許す。MetricsはbodyのharnessIdをサーバ側Harness/Release/Project registryでtenant/workspace/projectへ一意に解決する。project_idをclient body・表示名・token claimから採用せず、未解決・不一致・越境は情報を漏らさずfail-closedとする。

【2 Metrics ingest】
POST /api/v1/metrics/eventsはDevice Flowの短命Bearer token、x-harness-workspace-id、Idempotency-Keyを必須とする。tokenから信頼する主体はtenant/workspace/userまで。strict bodyはharnessIdと整数runCountだけで、client時刻・actor・department・project・時間・金額・給与・係数を拒否する。actorはprincipal由来、departmentはtrusted lookup未整備中null、occurred_atはサーバ採番。business factsはappend-onlyで更新・削除APIを持たない。

【3 冪等】
論理scopeはtenant+endpoint、TTLは24時間、digestはcanonical payloadに束縛する。同key・同digestの有効期間内再送は200で同じeventを再生し、同key・異digestは422で計上しない。期限切れkeyは旧event factsを変えずclaimだけ解放する。unique constraintを同時実行の最終防壁とする。

【4 rollup】
Workers cronは日次事前集計と週次確定を行い、tenant/harness/department/project/user次元のrun_count、saved_minutes、saved_amount_jpyをサーバ側packages/estimationで算出する。workspace+period単位の全次元upsertをTurso単一transactionでcommitし、失敗時は全件rollbackする。D1 write adapterは同等all-or-nothing証明まで無効。画面APIはcommit済みrollupとowner snapshotだけを読み、生eventのonline aggregateを禁止する。

【5 KPIとanomaly】
completionRateは期間末HearingSheet snapshotのcompleted件数÷対象総数、utilizationRateは期間末公開済みHarness snapshotのうち期間内利用1回以上の件数÷対象総数。分母0はrate=null+denominator_empty。anomalyは過去4完了週が揃い中央値が0でない場合だけ10倍超を評価する。通知は観測日・scope・user・rule versionで冪等化し、ingestをブロックしない。

【6 Build mutation】
正規endpointはPOST /api/v1/builds/{id}/stage。expected source stageまたはexpected_updated_atによるCASを課し、競合は409。正規writerはTursoだけで、state・stage event・auditを同一transactionでall-or-nothingに記録する。D1は同等原子性が証明されるまで503 typed unavailableかつzero-writeで拒否し、部分書込みやTurso失敗時fallbackを行わない。

【7 UI供給】
S09=/dashboard、S16=/tracking。APIはKPIのnumerator/denominator/period/snapshotAt/nullable rate/reasonと、chart/table共通data modelを返す。集計金額はmember以上、user次元の金額はusers.read_salary保持者だけに返す。
- 原則: Threat modeling (abuse case を設計前提にする) (`plugins/system-spec-harness/skills/ref-system-design-knowledge/references/secure-by-design.md#中核概念`)
  - 採否: `applied`
  - 章固有の根拠: project_idをclient/tokenから受けずserver registryで解決し、原子性能力のないD1 writerをzero-writeで閉じて越境参照と部分監査を防いだ。
  - トレードオフ:
    - D1ではBuild書込み可用性を提供できない
    - trusted resolverとProject作成が先行依存になる
##### 確定内容 qa-010 (対応セル: desktop-windows, desktop-macos)

- 確定要件: TypeScript 統一を採用。Publisher core は TypeScript (Node + pnpm) で新規実装し、Claude Code / Codex plugin (slash command /harness-hub:publish + skill + スクリプト) として配布する。責務: package 収集・manifest 補完・ローカル pre-check・Hub API 呼出 (Device Flow 認証)・target=web_app の wrangler CLI スクリプト実行と結果報告・URL 登録。検査ロジックは Hub 側 (Workers=JS) と共有し二重実装を回避する。既存 Python 資産 (harness-creator の package check / package contract / marketplace catalog) は仕様の正本 (移植元) として参照し、挙動同値性をテストで担保して TypeScript へ移植する (C3 整合)。
- 設計原則の採否根拠: (legacy_exempt — design-app contract 制定前の 確定であり遡及記録は不能。免除の根拠は spec-state.legacy_migration。理由: モック harness-studio-v2 の UI/UX 反映に伴い ui-ux/frontend/backend/database の web セルを再確定する必要があるが、legacy 1.0 + 確定セルで全 writer 経路が到達不能だったため。既存 225 qa entry は design-app contract 制定前の記録であり遡及適用不能なので legacy_exempt として明示記録する (schema 1.0 時代に validator が暗黙免除していた範囲と同一)。)
- 資するゴール: G4, G5, G1, G3

## 最新ドキュメント出典

- (このカテゴリに割り当てた取得済みドキュメントなし。全体出典は index.md 参照)
