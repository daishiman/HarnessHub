---
status: confirmed
category: backend
aggregate: 確定
spec_cells: [backend.web, backend.mobile, backend.tablet, backend.desktop-windows, backend.desktop-linux, backend.desktop-macos]
serves_goals: [G1, G2, G3, G4, G5]
---

# バックエンド (backend)

- カテゴリ集約状態: **確定**
- 章確定マーカー: `status: confirmed`

## カテゴリ別収集状態

| プラットフォーム | 状態 | 根拠 |
|---|---|---|
| Web (web) | 確定 | 確定質疑: qa-059 |
| モバイル (mobile) | 対象外 | 理由: native モバイルクライアント向け API 差分なし (ブラウザ経由は web 行でカバー) |
| タブレット (tablet) | 対象外 | 理由: native タブレットクライアント向け API 差分なし (ブラウザ経由は web 行でカバー) |
| デスクトップ (Windows) (desktop-windows) | 確定 | 確定質疑: qa-010 |
| デスクトップ (Linux) (desktop-linux) | 対象外 | 理由: Linux desktop クライアントは対象外 (作者環境は macOS + Windows) |
| デスクトップ (macOS) (desktop-macos) | 確定 | 確定質疑: qa-010 |

## 確定内容 (質疑録)

### qa-059 (対応セル: web)

**質問**: docs/backend-spec.md の 2026-07-18 additive 追記 (install/download descriptor・Project 管理 API・sheets/builds/feedbacks 契約詳細化・publish session 認証拡張・§10 API 実装順) を backend 仕様へ反映するか。 (訂正再登録: qa-052 の回答に系譜継続句が欠けていたため、同一 delta を継続句付きで qa-059 として登録し直す)

**回答**: qa-048 の確定内容 (AiJob pull 権限開放・業務データ保持 API 方針。qa-048 が全面維持する qa-037 系譜を含む) を全面維持しつつ、次の delta を確定する。(1) §4.5.1 install/download: POST /api/v1/harnesses/:projectId/install (member) が安定版だけをサーバ解決し target 判別 union descriptor を返す — skill は Stage 0 採用の marketplace/Bootstrap Installer コマンド (raw ZIP は Gate 採用時のみ TTL 5 分以内・単回の短命 URL、それまで null)、web_app は健全性確認済み deployment の launch_url。suspended/非 stable/別 tenant は 404、member の release id/R2 key 指定は不受理。Idempotency-Key で download count 重複加算防止。(2) §4.5.2 Project 管理: POST /api/v1/projects (member。owner_user_id=principal 固定・slug/name は Workspace 内一意)・PATCH /api/v1/projects/:id (owner。tenant/workspace/owner は変更不可)。project.create/project.update を監査 action へ追加し、監査 action は固定数管理をやめ §3.8 の列挙を正本化。(3) sheets: GET 一覧は member/owner=自分のみ・admin=自テナント全件 + item DTO 契約、GET 詳細は form/estimate snapshot・generated_sections・build_ref 等の DTO 契約 (salary 原値は返さない)。所有者判定は改ざん可能な form の applicant でなく session principal.user_id を applicant_user_id へ固定。received の統一表示ラベルは「受付」。PDF は独立非認可 API を作らず認可済み詳細 DTO を print 表示へ再利用。(4) builds: sheet_id/feedback_id の起点二元化 (CHECK + 非 NULL 値の partial UNIQUE、各起点=1 Build)。POST /builds は手動復旧/例外用で、通常経路は AiJob complete 時の冪等自動作成 (sheet_generation→hearing、feedback improvement/review→design・bug→test。初期配置は遷移でなく stage_change 監査対象外)。P1 の間は Build 導線非表示、P2 有効化 migration で既存 Sheet を 1 回だけ backfill。(5) feedbacks: type=improvement/review/bug + priority=high/medium/low (mock の改善要望/レビュー依頼/バグ報告と優先度に対応)。(6) publish 系 (POST /publish・PUT package・POST submit) を session (S01/S02 Web ウィザード + CSRF) or Bearer (Publisher CLI) の 2 経路へ拡張 (状態機械・直列化 qa-009 は不変)。(7) §10 構築優先順位による API 実装順 P0-P5 (着手順のみ。認可 MW・テナント分離 D4・zod 単一ソースは P0 から全 endpoint 適用で後付け不可)。

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
