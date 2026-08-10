---
status: confirmed
layer: feature-design
task: SYS-BUILD-PIPELINE-BOARD-P02
parent_feature: feat-build-pipeline-board
feature_package_id: feature-package/feat-build-pipeline-board
source: docs/features/feat-build-pipeline-board/requirements-baseline.md
feature_context_digest: sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441
task_spec_digest: sha256:c7bac9d06dc2d36ab72159cdade1e780bc2c6a7fac45bbbb9e15b963cccadf6d
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend]
---

# Build Pipeline Board Architecture Decision Record

## 0. 文書情報

| 項目 | 値 |
|---|---|
| Feature | `feat-build-pipeline-board` |
| Phase | P02 Architecture |
| 状態 | ユーザー確認済み / 設計decision gate解消 / P02 durable completion待ち |
| 正本 | P01 `requirements-baseline.md`、content-addressed P02 task spec |
| P02 package digest | `e14cceb426097994f4ba32885ed65ac825b5ce60e3a3a552f1ef1fe146e879b9` |
| P01 feature digest | `sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441` |

このADRは目標設計を定義する。現行コードを設計済みと見なさず、差分は後続フェーズへ明示的に引き渡す。P02はdocs-onlyであり、DB・API・UI・認可・migrationの実装変更を含まない。

## 1. 背景、決定、非目標

S13 Build進捗ボードで、Hearing Sheet（HS）またはFeedback Request（FR）から生じたBuildを7工程で追跡する。メンバーは閲覧でき、workspace-admin以上だけが手動復旧、メタデータ更新、工程遷移を実行できる。公開可否はBuildに複製せず、既存のPublishRequestを正本とする。

次を決定する。

1. Buildはtenant/workspace/project/source境界を持つ集約とし、HSまたはFRのちょうど一方を起点にする。
2. 工程は `hearing -> requirements -> design -> build -> test -> review -> publish` の隣接遷移だけを許す。前工程への1段階ロールバックも同じ隣接規則で許す。
3. 作成時の初期配置はsource別に決め、工程変更とは区別する。作成後の工程変更はBuild state、`build_stage_events`、auditを1つのDB transactionで原子的に確定する。Build mutationの正式対応driverは当面Tursoだけとし、D1はall-or-nothing同等性が証明されるまでfail-closedで書込みを無効にする。
4. `publish` への遷移は、同一tenant/workspace/projectに属するPublishRequestが `published` の場合だけ許す。Buildには公開status・verdict・channelを保持しない。
5. APIは5 endpoint、Zod契約、共通 `withAuthz` / B9認可表、RFC 9457形式の問題応答を使用する。
6. BuildとMetricsの今後のdelta migrationおよびrelease unitは分離する。現存するcombined `0008_metrics-tracking-and-build-stage-events.sql` は確定済みlineageとしてimmutableに保ち、rename・削除・再採番・物理分割をしない。
7. HearingSheet確定時にProjectをサーバ側で作成して関連付ける。BuildとMetricsはクライアント値ではなく、この関連付けを読むtrusted project resolverから`project_id`を得る。KPI定義とMetrics画面UXはMetrics featureの正本に従い、本ADRへ複製しない。

非目標は、P02での実装、ドラッグ&ドロップ、工程飛び越し、Build独自の公開状態機械、Metrics機能との同時リリース強制である。

## 2. 目標設計と現行実装の境界

| 領域 | 目標設計 | 現行実装の観察 | 後続差分 |
|---|---|---|---|
| Build | source・project・表示メタデータを永続化 | `builds` は `type/stage/source/publish_request/timestamps` が中心 | trusted project resolverを前提に、P05/P08で列、CHECK、索引、backfillを追加 |
| Stage event | tenant/workspaceを含むappend-only履歴 | event表と履歴取得はある | DB制約とscope整合を強化 |
| 原子性 | 作成後の工程変更でstate + event + auditを単一transactionでcommit | state/eventの書込み後、routeからauditを別呼出し | Tursoだけを正式対応。D1 mutationは同等性証明までfail-closed |
| API | GET list/detail、POST manual recovery、PATCH metadata、POST stage | GET list/detailとPOST stageが中心 | POST collectionとPATCH itemを追加 |
| 認可 | 共通B9表から5 endpointを評価 | `builds.read` と `builds.stage_change` は存在 | create/update actionを同じ表へ追加。直書きrole判定は禁止 |
| Cursor | scope/filterに束縛されたopaque cursor。不正は422 | 現行はBuild idをcursorとして解決 | keyset cursorへ置換し、silent fallbackを禁止 |
| Publish | PublishRequestのstatusだけを正本にする | publish遷移時のstatus確認はある | tenantだけでなくworkspace/project一致も検証 |
| S13 | desktop/mobile、状態表示、確認UIを含む | StageBoardなど再利用可能部品がある | P06で画面とAPI契約を統合 |
| Migration | 既存0008はimmutable、今後のdeltaとreleaseをfeature別にする | combined 0008がjournal・snapshot・fixtureに組込み済み | 0008を共通baselineとして、以後の追加migrationをfeature別に生成 |

## 3. データモデル

### 3.1 `builds`

以下を目標の全カラムとする。既存列は互換性を維持して移行し、欠落列はBuild専用migrationで追加・backfillする。

| カラム | 型 / null | 制約と意味 |
|---|---|---|
| `id` | TEXT NOT NULL | ULID、PRIMARY KEY |
| `tenant_id` | TEXT NOT NULL | 認可・データ分離の最上位scope。入力値を信用せずsessionから確定 |
| `workspace_id` | TEXT NOT NULL | tenant配下scope。header/query/bodyの値はsession許可scopeと一致必須 |
| `sheet_id` | TEXT NULL | HS起点。`feedback_id` と排他的 |
| `feedback_id` | TEXT NULL | FR起点。`sheet_id` と排他的 |
| `project_id` | TEXT NOT NULL | Feedbackは既存Project関連付け、HSはHearingSheet確定時にサーバ作成・関連付けされたProjectをtrusted resolverで解決する。クライアント値を採用しない |
| `type` | TEXT NOT NULL | 既存互換分類 `hearing/improvement/review/bug`。sourceから確定し、クライアント更新不可 |
| `title` | TEXT NOT NULL | 1〜200文字。sourceの表示名を初期値としPATCH可能 |
| `stage` | TEXT NOT NULL | 7値enum。初期値はHS=`hearing`、Feedback improvement/review=`design`、Feedback bug=`test` |
| `risk` | TEXT NOT NULL | DB/API正本は `ok/warn`、既定 `ok`。Build UI adapterだけが `ok -> none`, `warn -> warn` と表示語彙へ変換する |
| `eta_date` | TEXT NULL | `YYYY-MM-DD` のcalendar date |
| `assignee_user_id` | TEXT NULL | 同一tenant/workspaceの有効user。解除時はNULL |
| `publish_request_id` | TEXT NULL | 同一tenant/workspace/projectのPublishRequest参照 |
| `note` | TEXT NULL | 0〜2000文字 |
| `created_at` | INTEGER NOT NULL | server生成Unix epoch milliseconds、作成後不変 |
| `updated_at` | INTEGER NOT NULL | server生成Unix epoch milliseconds、変更のたび単調更新 |

DB制約は次のとおりとする。

- `CHECK ((sheet_id IS NOT NULL) <> (feedback_id IS NOT NULL))` によりsourceを厳密なXORにする。
- `CHECK (stage IN ('hearing','requirements','design','build','test','review','publish'))`。
- `CHECK (risk IN ('ok','warn'))`、title/noteの長さ、`eta_date` 形式を検証する。API Zodだけに依存しない。
- `UNIQUE (tenant_id, sheet_id) WHERE sheet_id IS NOT NULL` と `UNIQUE (tenant_id, feedback_id) WHERE feedback_id IS NOT NULL` により1 source = 1 Buildを保証する。
- 1つのPublishRequestを複数Buildが参照することは許す。P01と詳細正本にない1:1 cardinalityを追加しないため、`publish_request_id`のUNIQUE制約は置かない。
- source、project、assignee、PublishRequestはrepositoryでtenant/workspace所属を検証する。現行の参照先に複合FKの親keyとなる複合UNIQUEがないため、本featureでは複合FKを新設しない。親schemaの変更が別featureで承認された場合だけ後続ADRで再検討する。
- Buildの物理削除APIは提供しない。sourceやPublishRequestの削除で履歴を連鎖削除しない。

索引は次を必須とする。

| 索引 | 定義 / 用途 |
|---|---|
| `builds_pk` | PRIMARY KEY (`id`) |
| `builds_source_sheet_uq` | UNIQUE (`tenant_id`,`sheet_id`) WHERE sheet_id IS NOT NULL |
| `builds_source_feedback_uq` | UNIQUE (`tenant_id`,`feedback_id`) WHERE feedback_id IS NOT NULL |
| `builds_board_idx` | (`tenant_id`,`workspace_id`,`stage`,`updated_at` DESC,`id` DESC) |
| `builds_project_idx` | (`tenant_id`,`workspace_id`,`project_id`,`updated_at` DESC,`id` DESC) |
| `builds_assignee_idx` | (`tenant_id`,`workspace_id`,`assignee_user_id`,`updated_at` DESC,`id` DESC) WHERE assignee_user_id IS NOT NULL |

### 3.2 `build_stage_events`

| カラム | 型 / null | 制約と意味 |
|---|---|---|
| `id` | TEXT NOT NULL | ULID、PRIMARY KEY |
| `tenant_id` | TEXT NOT NULL | Buildと同じtenant |
| `workspace_id` | TEXT NOT NULL | Buildと同じworkspace |
| `build_id` | TEXT NOT NULL | 対象Build。履歴保護のためdeleteはRESTRICT |
| `from_stage` | TEXT NULL | 作成時の初回eventだけNULL可。それ以外は7値enum |
| `to_stage` | TEXT NOT NULL | 7値enum |
| `actor_user_id` | TEXT NOT NULL | 操作したsession user。クライアント指定不可 |
| `reason` | TEXT NULL | 0〜500文字。ロールバック時は必須 |
| `occurred_at` | INTEGER NOT NULL | domain上の発生時刻、server生成epoch milliseconds |
| `created_at` | INTEGER NOT NULL | DB挿入時刻、server生成epoch milliseconds |

DB制約は、両stageのenum CHECK、`from_stage IS NULL OR from_stage <> to_stage`、同一Buildのtenant/workspace一致とする。作成時の初期履歴はstage changeではない初期配置記録として、HS=`NULL -> hearing`、Feedback improvement/review=`NULL -> design`、Feedback bug=`NULL -> test`を記録する。この初期履歴には`build.stage_change` auditを発行せず、未承認の`build.create` audit actionも作らない。作成後のeventだけを隣接工程のstage changeとして扱う。隣接判定はapplicationの正本関数で行い、DB CHECK相当のmigration testも持つ。表はappend-onlyであり、application repositoryにupdate/deleteを公開せず、migration以外の変更・削除をテストで禁止する。

必須索引はPRIMARY KEY (`id`)、`(tenant_id,workspace_id,build_id,occurred_at,id)`、`(tenant_id,workspace_id,occurred_at,id)` である。前者はdetail履歴、後者はworkspace監査・運用調査に用いる。

### 3.3 risk移行契約

Buildのdomain/API値は`ok/warn`に統一し、`PATCH`もこの2値だけを受ける。現行の停滞日数由来`none/warn/blocked`は正本から廃止し、migration時点の既存行は現行算出結果が`none`なら`ok`、`warn`または`blocked`なら`warn`へ縮退backfillする。移行中の互換readerは旧`blocked`を`warn`へ正規化し、新規writerと新API responseは`blocked`を生成しない。互換期間終了後はBuild固有schemaとadapterから`blocked`を削除する。以後のriskはworkspace-admin以上が明示的に更新する値であり、停滞時間から暗黙更新しない。

### 3.4 tenant / workspace分離

すべてのread/writeは `tenant_id + workspace_id` をWHERE句に含める。URLの `id`、cursor、source id、PublishRequest idだけで検索しない。workspace headerとquery/bodyが不一致なら処理せず、他scopeの存在を404/403差で推測させない。list/detail/event/publish検証/auditの全てに同じscopeを渡す。cache key、log、trace attributeにもtenant/workspaceを含め、別workspaceのDTOを再利用しない。

### 3.5 trusted project resolver依存契約

Hearing Intake featureはHearingSheetを確定状態へ遷移させるサーバ処理でProjectを冪等に作成し、同じtenant/workspaceのHearingSheetへ`project_id`を関連付ける。この関連付けの永続化と再試行時の二重Project防止はHearing Intake側が所有する。BuildとMetricsはProjectを作成せず、共通resolverへ`tenant_id,workspace_id,source_kind,source_id`を渡し、scope検証済みの`project_id`だけを受け取る。

resolverは未関連、source不存在、tenant/workspace不一致を区別可能なtyped failureとして返し、クライアント申告値や`form_json`からProjectを推測しない。Buildの手動復旧・自動作成とMetricsのproject次元は同じresolver contract testを共有し、解決不能時は書込みを行わない。既存HearingSheetのbackfillでも同じサーバ側Project作成・関連付け経路を使い、Build migrationが独自にProjectを捏造しない。

## 4. 5 endpoint契約

共通prefixは `/api/v1/builds`。request/response/errorは `packages/schemas` のZodを唯一のAPI契約とし、routeとclientで共有する。未知フィールドは拒否する。

| Method / path | 用途 | 入力の要点 | 成功 | 主な失敗 |
|---|---|---|---|---|
| `GET /api/v1/builds` | board list | `workspace_id`, optional `stage/type/project_id/assignee_user_id`, `limit=1..100`, `cursor` | 200 `{items,next_cursor}`。各itemにnullableな`publish_request` summary | 不正・別filter・別scope cursorは422 |
| `GET /api/v1/builds/{id}` | detail/history | path id + workspace scope | 200 Build、events、nullableな`publish_request` summary | scope外または不存在404 |
| `POST /api/v1/builds` | manual recovery | bodyは `sheet_id` XOR `feedback_id`。両方/どちらもなしは禁止 | 201新規、同一source既存なら200を返す冪等復旧 | XOR/source所属不正422、権限403 |
| `PATCH /api/v1/builds/{id}` | metadata更新 | 必須`expected_updated_at` + strict partial: `title/risk/eta_date/assignee_user_id/note/publish_request_id`の1項目以上。riskは`ok/warn` | 200更新Build | 所属不正422、CAS競合409 |
| `POST /api/v1/builds/{id}/stage` | 隣接工程変更 | `{expected_stage,to_stage,reason?}`。rollbackではreason必須 | 200 Build + event | 非隣接/不正422、CAS/publish未完了409 |

POST manual recoveryはsourceをtenant/workspaceで解決し、`type/初期title/初期stage`をserver側で導出する。`project_id`は、Feedbackでは既存Project関連付け、HSではHearingSheet確定時にサーバ側で作成・関連付けされたProjectを、Build/Metrics共通のtrusted resolverから取得する。resolverがProjectを返さない、またはscopeが一致しない場合はクライアント値で補完せずfail-closedで409とする。bodyからscopeやactorを採用しない。PATCHはsource、type、stage、created_atを更新できない。工程変更はstage endpointだけを通す。`expected_updated_at`は更新対象ではなく、scope/idとともにUPDATEのWHEREへ含める。成功時の`updated_at`は少なくとも旧値+1となるよう単調増加させ、CAS敗北は409とする。

Cursor codecは`v1.<base64url(payload)>.<base64url(mac)>`とし、payloadに`version=1,tenant_id,workspace_id,sort/filter fingerprint,updated_at,id,issued_at,expires_at`を含め、server secretによるHMAC-SHA-256で署名する。有効期間は発行から15分とする。decode/MAC検証失敗、期限切れ、filter変更、scope不一致はsilentに先頭へ戻さずRFC 9457 `422 Unprocessable Content` を返す。cursorは認可tokenではなく、認可は毎回実施する。並び順は`updated_at DESC,id DESC`のkeyset paginationとし、payloadだけで境界を再現できるためcursor発行元の行が削除されても継続できる。

`publish_request` read-through summaryのZod shapeは、`null`またはstrictな`{id,status,verdict,channel_id,release_id}`とする。`status`はPublishRequestの9値、`verdict`と`release_id`はnullable、他3項目は非nullableとし、tenant/workspace/projectや内部findingsは応答へ含めない。これは読取時の派生DTOであり、Build列へ複製保存しない。

エラーは `application/problem+json` で `type,title,status,detail,instance,code` を返す。400は構文不正、401は未認証、403は認可不足、404はscope内不存在、409はCAS・公開前提・一意競合、422は意味的入力/cursor不正とする。

## 5. 7工程の状態機械と単一transaction

初期配置は工程遷移ではない。HSは`hearing`、Feedback improvement/reviewは`design`、Feedback bugは`test`へ直接作成する。初期配置記録を`build_stage_events`へ残しても`build.stage_change` auditの対象にはせず、隣接規則は作成後の移動だけへ適用する。

| 現在 | 許可される次工程 | 補足 |
|---|---|---|
| `hearing` | `requirements` | HS起点の初期stage |
| `requirements` | `hearing`, `design` | 戻しにはreason必須 |
| `design` | `requirements`, `build` | 同上 |
| `build` | `design`, `test` | 同上 |
| `test` | `build`, `review` | 同上 |
| `review` | `test`, `publish` | publish guard必須 |
| `publish` | `review` | 再作業時の戻し。PublishRequest statusは書き換えない |

自己遷移、2工程以上の飛び越し、任意stageの直接PATCH、client時刻/actorの採用は禁止する。並行更新は `expected_stage` を用いるcompare-and-swap（CAS＝期待した古い値と一致するときだけ更新する方式）で検出し409を返す。

工程変更use caseはadapterの単一transactionを開き、次を順番に実施する。

1. tenant/workspace/idでBuildを読み、`expected_stage`、隣接規則、actor権限を再検証する。
2. `to_stage=publish` なら、Buildに紐づくPublishRequestをtenant/workspace/project付きで読み、statusが `published` であることを検証する。
3. scopeとexpected stageをWHEREに含むCASでBuild.stage/updated_atを更新する。
4. 同じtransaction clientで`build_stage_events`をinsertする。
5. 同じtransaction clientでhash-chain audit `build.stage_change` をappendする。
6. 3件すべて成功した場合だけcommitする。event/audit失敗、CAS 0件、PublishRequest不整合は全てrollbackする。

現行のrouteからの事後audit呼出しはこの原子性を満たさない。正式対応するTursoでは、1つのadapterとtransaction clientを所有するserviceからtransaction-awareな内部port（例: `appendInTransaction(tx, event)`）を呼び、独自transactionを二重に開かない。CAS、event insert、audit appendのいずれかが失敗した場合はtransaction全体をrollbackする。

manual recoveryはBuild作成とsource別の初期配置履歴を同じTurso transactionへまとめるが、初期配置は工程変更ではないため`build.stage_change` auditを発行しない。正本にない`build.create` actionも追加しない。

D1はread-only経路だけを許可し、`POST /builds`、`PATCH /builds/{id}`、`POST /builds/{id}/stage`、自動Build作成を含む全Build mutationをdriver guardで書込み開始前に拒否する。HTTP mutationはRFC 9457の503 `build_write_driver_unsupported`、自動作成は同じcodeのtyped errorとして失敗させ、state/event/auditの一部も書かない。D1でstate + event + auditのall-or-nothing同等性がfailure injectionを含む実行証跡で証明され、後続ADRが対応driverへ昇格するまでこのfail-closed境界を維持する。

## 6. PublishRequestを正本とする公開連携

Buildが保持するのはnullableな `publish_request_id` だけである。PublishRequestの `status`、Yellow判定、承認者、公開channel、release resultをBuildへ複製しない。画面表示はdetail/list queryでPublishRequestからread-throughし、cacheする場合もPublishRequestの更新で無効化する。

複数Buildが同じPublishRequestを参照してもよい。公開前提は各Buildについて同一tenant/workspace/projectと`published`を検証し、DBの1:1 UNIQUEではなくrepository契約で守る。

`publish` 遷移時は次を全て満たす。ドメイン表記のPublishedは、現行PublishRequest wire/DB契約では小文字の `published` として比較する。

- 参照が存在し、Buildと同じtenant/workspace/projectである。
- PublishRequest statusが正確に `published` である。
- 認可されたactorによる隣接遷移である。
- transaction内の検証からcommitまでに前提が変わらないよう、同一snapshot/CASを用いる。

PublishRequestの`published`は終端であり、`reopen`や`rolled_back`というPublishRequest statusは定義しない。Channel/Releaseのstable pointer rollbackはPublishRequestの状態遷移ではなく、Buildを自動で戻さない。再作業が必要ならadminが明示的な`publish -> review`工程変更を行い、通常の`build.stage_change` event/auditへ記録する。これによりPublishRequestとChannel/Releaseの語彙を混ぜず、二重状態機械と自動修復処理を排除する。

## 7. B9共有認可表

Build専用middlewareやroute内のrole文字列比較を作らず、Yellow承認と同じB9共通 `ACTION_RULES` / `withAuthz` 経路を使う。目標表は次のとおり。

| Action | Endpoint | member | owner | workspace-admin | provider-admin | 認証mode |
|---|---|---:|---:|---:|---:|---|
| `builds.read` | 2 GET | allow | allow | allow | allow | session |
| `builds.create` | POST collection | deny | deny | allow | allow | session |
| `builds.update` | PATCH item | deny | deny | allow | allow | session |
| `builds.stage_change` | POST stage | deny | deny | allow | allow | session |
| `publish.approve` | Yellow承認（既存） | deny | deny | allow | allow | session |

認可判定はdeny-by-defaultとし、tenant/workspace membership、session主体、actionを共通guardへ渡す。表示制御だけをセキュリティ境界にせず、APIで再検証する。B9 contract testではBuildの3 write actionと`publish.approve`が同一最小role・同一session modeであることも固定する。

## 8. S13画面構成

S13は既存の共有`StageBoard`/card/detail patternを使い、Build固有DTOをadapterで渡す。

| 領域 | Desktop | Mobile | 共通挙動 |
|---|---|---|---|
| Header/filter | workspace、project、type、assignee filter | 折りたたみfilter | URL/queryとAPI filterを同期 |
| Stage navigation | 7列を順序固定で表示 | 横スクロール可能なstage chip、件数、選択stageの縦list | hearingからpublishまで同一順序 |
| Build card | title、HS/FR種別、assignee、ETA、risk | 同情報を1列表示 | link/buttonのkeyboard focusを保証 |
| Detail | side panel/dialogにsource、project、note、PublishRequest、history | full-height sheet/dialog | scope内データだけ表示 |
| Stage action | adminに前/次button | touch targetを確保した前/次button | DnDなし。ConfirmDialog後にPOST stage |
| Publish guard | 未公開なら理由とPublishRequest導線 | 同左 | UI判定だけでなくAPIで強制 |

member/ownerには変更controlを表示せずread-only、workspace-admin/provider-adminにはmanual recovery、metadata edit、stage actionを表示する。loading skeleton、空状態、403、404、422 cursor、409競合、5xx retryを別状態で描画し、失敗時に楽観表示を確定しない。stage変更後はBuild、counts、historyを同時再検証する。`aria-label`、見出し順、dialog focus trap/return、keyboard操作、44px相当touch targetを守り、axe違反0を受入条件とする。LCP/INP/CLSはCore Web Vitalsの`good`範囲を維持し、7列全件を初期描画せずpagination/段階描画する。

## 9. Migration / release分離

BuildとMetricsは所有データ、rollback条件、受入証跡が異なるため、今後のdeltaを同じSQL migrationおよびrelease gateへ束ねない。ユーザー承認済みの分離方針を採用する。

現存する`packages/db/migrations/0008_metrics-tracking-and-build-stage-events.sql`はDrizzle journal、snapshot、実DB fixtureから参照される確定済みlineageである。適用環境の有無にかかわらずimmutableとし、rename・削除・内容差替え・再採番・2ファイルへの物理分割を禁止する。既存0008にBuildとMetricsが同居した履歴はbaselineとして受け入れ、以後の変更を次の2系統のadditive deltaへ分離する。

1. Build delta migration: `builds`の追加列/backfill/XOR CHECK/source partial unique/board indexes、既存`build_stage_events`の必要な強化、関連snapshot/journal。
2. Metrics delta migration: Metrics固有の追加・修正だけと、そのsnapshot/journal。

各migration testは0008までを共通baselineとして適用した後、自featureのdeltaだけを検証する。Build deltaはMetrics tableを変更せず、Metrics deltaはBuild table/eventを変更しない。deploy artifact、feature flag、smoke test、rollback decisionも別々にし、一方だけが承認・rollbackされても他方のschema/dataを変更しない。将来schema driftが検出された場合も0008を書き換えず、feature-ownedのforward repair migrationで収束させる。

## 10. Rollback設計

| 失敗点 | 検知 | Rollback / recovery |
|---|---|---|
| transaction中のstate/event/audit失敗 | exception、CAS 0件、audit chain検証 | transaction全rollback。409/5xxを返し再取得 |
| publish guard失敗 | status/scope/project不一致 | 書込み前に409。PublishRequestをBuildから変更しない |
| migration expand失敗 | migration test、schema introspection | deploy停止、backupから復旧。Metrics migrationへ影響させない |
| backfill/XOR違反 | preflight count、partial unique作成失敗 | 不正sourceを隔離しmigrationをcommitしない |
| API/UI回帰 | contract/e2e/axe/CWV | code/flagをBuild単位でrollback。追加列/eventは保持して旧code互換を維持 |
| cursor互換切替 | 422率、problem code監視 | 旧cursorを黙って再解釈せず、UI再取得を促す。新旧codecの期限付きreadのみ許可 |

破壊的な列削除は同一releaseで行わず、expand -> backfill/dual-read検証 -> cutover -> 後続contract migrationの順にする。append-only event/auditはrollbackで削除しない。rollback操作自身もaudit対象にする。

## 11. 依存関係とフェーズ引継ぎ

| 依存 | 種別 | このADRでの扱い | 後続gate |
|---|---|---|---|
| P01 requirements baseline | hard upstream | purpose/scope/acceptanceを固定 | digest一致 |
| core tenant/workspace/project/user | runtime | 全queryと参照検証のscope | repository integration test |
| Hearing Sheet / Feedback Request / Project resolver | runtime | XOR source、1 source = 1 Build。HS確定時にProjectをサーバ作成・関連付けし、Build/Metricsはtrusted resolverを共有 | resolver contract test、missing/scope mismatchはfail-closed |
| PublishRequest | runtime | 公開statusの唯一の正本 | published guard/CAS test |
| common authz B9 | runtime/security | shared action table、deny-by-default | auth matrix contract test |
| audit hash chain / DB adapter | runtime/security | Tursoで作成後のstage state/event/auditを同一transaction。D1 mutationは無効 | Turso failure injection、D1 mutation 503/zero-write test |
| shared StageBoard / ConfirmDialog | UI | 表示/操作を再利用、DnD禁止 | component/e2e/axe |
| Metrics tracking | independent consumer | trusted project resolverだけを共有し、KPI定義・式・期間・画面UXはMetrics正本に委ねる。migration/releaseは分離 | resolver contract parity、相互非依存migration test |
| P03〜P13 | downstream | P03レビュー後にtest-firstで実装 | 各phaseのentry/exit criteria |

HS→Project解決方式とDB driver対応範囲の2 decision gateはユーザー確認により解消し、本ADRの設計内容は`confirmed`である。ただしP02 taskのdurable completionはlinked PR mergeとdefault branch reconciliationまで成立しないため、依存先P03を正式開始してはならない。P02 durable completion後にP03へ引き渡し、P04はその後に失敗系を先に固定し、P05以降は確定ADRと実装差分を解消する。

## 12. 検証計画

| 層 | 必須検証 |
|---|---|
| Schema/migration | 全列、enum/CHECK、XOR、source partial unique、risk縮退backfill、scope索引、append-only、immutable 0008からのfeature別delta、upgrade/rollback fixture |
| Repository | tenant/workspace遮断、trusted project resolver、source別初期stage、初期配置auditなし、cursor keyset、PATCH/stage CAS、隣接遷移、publish同一scope、複数Buildから同一PublishRequest参照、Turso transaction rollback failure injection |
| API contract | 5 endpointのZod、risk `ok/warn`、strict PublishRequest summary、`expected_updated_at`、署名・期限付きcursor、unknown field、XOR、422 cursor、404非漏えい、409競合、problem+json |
| Authz B9 | 4 role x 5 endpoint、deny-by-default、Yellow承認との共通rule table |
| UI | desktop 7列、mobile chip/list、read-only/admin control、ConfirmDialog、error/empty/loading、no DnD |
| Accessibility/performance | axe 0、keyboard/focus/touch、LCP/INP/CLS good、pagination下の負荷 |
| Publish | unpublished/別scope/別projectを拒否、publishedのみ許可、Buildに公開状態を複製しない |
| Audit | Tursoでは作成後のstage変更だけstate/event/auditが全成功または全失敗、初期配置はstage-change audit 0件、actor/scope/from/to/reason、hash-chain整合。D1 mutationは503かつzero write |

## 13. P01受入条件との対応

| P01受入条件 / 品質制約 | 設計箇所 | 受入証跡 |
|---|---|---|
| adminのみ作成後の工程操作、全stage changeをaudit | §5、§7 | B9 matrix test、transaction failure injection、audit chain verification |
| PublishRequest連携、公開状態を二重管理しない | §6 | published guard integration test、schema/APIにduplicate statusがないこと |
| tenant data scope | §3.4、§4 | cross-tenant/workspace repository/API negative test |
| shared StageBoard | §8 | component reuse review、S13 desktop/mobile e2e |
| REST + Zod + single authz | §4、§7 | schema contract test、route guard inventory |
| B9共有認可表 | §7 | Build actionsとYellow `publish.approve`の同一table test |
| accessibility / Core Web Vitals | §8、§12 | axe 0 report、CWV good evidence |

本ADRの設計内容とdecision gate 2件はユーザー確認済みである。一方、P02 taskのdurable done（永続的な完了）はlinked PRのmergeとdefault branch reconciliation後にのみ成立する。現時点ではP02 durable completion、P03正式開始、実装完了のいずれも主張しない。
