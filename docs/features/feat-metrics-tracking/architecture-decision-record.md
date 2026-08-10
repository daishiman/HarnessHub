---
status: confirmed
layer: feature-design
task: SYS-METRICS-TRACKING-P02
parent_feature: feat-metrics-tracking
feature_package_id: feature-package/feat-metrics-tracking
source: docs/features/feat-metrics-tracking/requirements-baseline.md
feature_context_digest: sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759
task_spec_digest: sha256:03748912dcca192a93a170dc232cb8b619fefef16da2fbe0a4f11d7e0d093256
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend]
---

# feat-metrics-tracking アーキテクチャ決定記録

## 0. 位置づけと優先順位

本書は P02 の設計成果物であり、P01 の確定要件をデータ、API、cron、画面、所有権、移行・復旧の境界へ割り当てる。実装済みであることを示す文書ではない。本文の **決定** は実装が満たすべき規範、**現状差分** は P03 以降で閉じる必要がある検証対象を表す。

判断が競合するときの優先順位は次のとおりとする。

1. 確定済み P01 要件ベースラインとその feature context digest
2. content-addressed P02 task spec (`task_spec_digest`)
3. 本 P02 でユーザー承認された Project 解決、Turso writer、KPI/anomaly、画面 route、チャート方式の具体化
4. 現行コード（実装状況の証拠であり、上位契約を上書きしない）

P02 task spec にある概念列 `user_id` / `server_received_at` は、現行の信頼境界に合わせてそれぞれ `actor_user_id` / `occurred_at` に正規化する。P01/P02 が要求する `project_id` と `project` 次元は本設計でも必須とし、削除しない。Project の信頼起点は HearingSheet 確定処理とし、サーバが Project を作成して HearingSheet へ関連付ける。Metrics は body の `harnessId` を trusted server registry で tenant/workspace/project に解決し、principal/header scope と一つでも不一致、未解決、未登録なら情報を漏らさず fail-closed とする。client の project 値による補完は禁止する。この契約はユーザー承認済みであり、現行 resolver/column 不在は設計ゲートではなく後続 phase が閉じる実装差分である。

P01 の冪等 scope は `(tenant, endpoint)`、TTL は 24 時間を正本とする。endpoint 専用 table では endpoint は table 境界に内在する。現行実装の `(tenant, workspace)` unique は承認済みの具体化ではなく P05 実装差分であり、本 ADR から要件を変更しない。

### 0.1 System Spec 再ヒアリング境界

旧 `system-spec/database.md` の `qa-221` は R2 退避、週次/月次、派生値非保存を記し、確定済み P01/backend の Turso 無期限保持、日次/週次、サーバ算出済み派生値の保存と衝突していた。ユーザー承認済みの「既存 baseline を正本とし、System Spec を再ヒアリングする」に従い、database/web は R4-reopen を経て `qa-229`（承認 `appr-043`）で再確定済みである。現行 System Spec、P01/backend、本 ADR は Turso primary、無期限保持、日次/週次、サーバ算出済み rollup、既存 `0008` immutable で一致し、この source contradiction は解消済みである。

## 1. 決定の要約

| ID | 決定 | 主な理由 |
|---|---|---|
| ADR-M01 | ingest は 15 分の短命 access token、`metrics:write`、Workspace 束縛、必須 `Idempotency-Key` で保護する | 長命 credential と Workspace 越境を避ける |
| ADR-M02 | client が送る量的な実測値は `runCount` のみ。時刻、actor、部門、係数、時間、金額は信頼しない | SEC5 と改ざん耐性 |
| ADR-M03 | actor は認証済み principal から付与し、信頼できる部門 lookup がない間は `department_id = null` とする | client 自己申告による主体・組織偽装を防ぐ |
| ADR-M04 | 冪等 scope は P01 正本どおり tenant + endpoint、payload digest を照合し、TTL は 24 時間とする | 同じ key の異なる request を replay と誤認しない |
| ADR-M05 | 日次事前集計 + 週次確定を cron で行い、Turso transaction を正規 writer として Workspace・期間単位の rollup 集合を一括確定する | 部分集計を読者へ公開しない |
| ADR-M06 | 金額換算は `tenant_coefficients` と `packages/estimation` を使うサーバ処理だけで行う | client 計算・salary 露出・式の重複を防ぐ |
| ADR-M07 | `packages/estimation` の境界・公開 contract・横断品質 gate の owner は `feat-hub-foundation` とする | 2 consumer 以上が使う共有層の単一 owner |
| ADR-M08 | 完了率は期間末の完了 HearingSheet 数 / 対象 HearingSheet 総数、利用率は期間内 1 回以上利用された公開済み Harness 数 / 対象公開済み Harness 総数とし、分母 0 は `—` とする | 意味の異なる母集団を混同しない |
| ADR-M09 | 各チャートは `packages/ui` の inline SVG とし、その直後に同値 HTML table を常時利用可能にする | 3 MiB 予算、a11y、非視覚利用を両立する |
| ADR-M10 | 既存 combined `0008` は immutable な履歴として維持し、今後の delta migration・release・rollback evidence だけを Metrics と Build で分離する | 履歴改変を避けつつ、将来の feature failure boundary を分ける |
| ADR-M11 | 生 event は Turso に無期限保持し、使用量と 10 倍 anomaly を日次監視する。anomaly は直前 4 完了週がすべて揃い中央値が 0 でない場合だけ判定する | 採用済み保持方針の費用・誤検知リスクを可視化する |
| ADR-M12 | HearingSheet 確定時にサーバが Project を作成・関連付けし、Metrics body の `harnessId` は trusted server registry で tenant/workspace/project に解決する | client 自己申告と越境参照を防ぐ |
| ADR-M13 | Metrics の正規 writer は Turso とし、D1 は Turso と同等の原子性が証明されるまで全 Metrics write を fail-closed で無効にする | adapter 差で部分 commit や split-brain を起こさない |
| ADR-M14 | 全 design gate は解消済みだが、P03 の正式開始は P02 linked PR merge と default branch reconciliation 後に限る | 設計確定と durable task completion を混同しない |

## 2. 所有権と境界

### 2.1 `packages/estimation` owner の確定

判断基準は `docs/shared-layers.md` §1–§2 の「複数 feature が使う package 境界・公開 primitive・横断品質 gate は foundation に一元化し、domain logic は担当 feature が同じ境界へ提供する」である。Metrics の効果試算と hearing-intake の sheet estimate という複数 consumer が存在するため、第三の consumer が現れるまで重複を許す方式は採らない。

| 対象 | owner / responsibility |
|---|---|
| `packages/estimation` の package 境界、公開 contract、共通 primitive、横断品質 gate | `feat-hub-foundation`（単一 owner） |
| `packages/estimation/src/metrics.ts` の時給・削減時間・削減額・rollup domain adapter | `feat-metrics-tracking` が提供する domain logic |
| `sheetEstimate` consumer と sheet snapshot | `feat-hearing-intake` |
| `tenant_coefficients` の更新、監査、salary/role policy | `feat-user-org-admin` |
| `tenant_coefficients` の読取と rollup への係数注入 | `feat-metrics-tracking` |
| S17 画面 | `feat-user-org-admin`。Metrics は user rollup API までを供給 |
| 共通チャート component | `feat-hub-foundation`。Metrics は S09/S16 で消費 |

この決定の影響範囲は `packages/estimation`、Metrics cron、hearing-intake の estimate consumer、および両 consumer の contract test である。訂正対象は P01 の `estimation-engine-single-pure-function-owner-unresolved` と、Metrics を package 全体の owner と読める feature 文言である。`docs/shared-layers.md` 自体は本 task の write scope 外なので変更せず、P03 で本 ADR との trace を検証する。合格条件は duplicate implementation が 0 であり、Metrics と hearing-intake の両 consumer が同じ公開 primitive を呼ぶことである。

### 2.2 Project provenance と trusted Harness registry

Project の作成 owner は HearingSheet 確定処理のサーバ側 application service とする。HearingSheet を確定するとき、サーバ生成 ID で Project を作成し、HearingSheet と Project の関連を同じ Turso transaction で保存する。Project 作成または関連付けのどちらかが失敗した場合は HearingSheet 確定も rollback し、中間状態を公開しない。同じ HearingSheet の再試行は既存関連を再生し、別 Project を重複作成しない。

Project から Build/publish を経て公開された Harness は、trusted server registry に `harness_id`, `tenant_id`, `workspace_id`, `project_id`, published status を持つサーバ管理レコードとして登録する。Metrics ingest は registry の read port だけを利用し、body の `harnessId` を次の順で検証する。

1. `harnessId` が registry に存在し、公開済みであること。
2. registry の tenant/workspace が認証済み principal と `x-harness-workspace-id` に一致すること。
3. registry の `project_id` が HearingSheet からサーバ生成された Project lineage に属すること。
4. すべて満たす場合だけ解決済み `project_id` を event に保存する。不一致・未解決・曖昧な複数解決は fail-closed とし、client から `projectId` を受理しない。

この registry 契約の owner は Project/catalog/publish の既存 server boundary であり、Metrics は read-only consumer である。Metrics が owner table を直接 query する回避策は採らず、tenant/workspace/project を一括して返す typed resolver port と cross-tenant/workspace/project negative test を必須とする。

## 3. データモデル

時刻列はすべて epoch millisecond、期間は `[period_start, period_end)` の半開区間、金額は最小通貨単位の整数（現在は JPY の円）とする。DB の物理制約と application/repository の契約を分けて記す。

### 3.1 `MetricsEvent` (`metrics_events`)

| column | type / null | 意味・生成元 |
|---|---|---|
| `id` | TEXT, NOT NULL, PK | サーバ生成 event ID |
| `tenant_id` | TEXT, NOT NULL | principal の tenant scope |
| `workspace_id` | TEXT, NOT NULL | principal/header を認可層で照合した Workspace scope |
| `project_id` | TEXT, NOT NULL | trusted Harness resolver が同一 tenant/workspace 内で解決した project scope。body から受けない |
| `harness_id` | TEXT, NOT NULL | strict body で受け、trusted resolver が tenant/workspace/project scope を検証した Harness ID |
| `actor_user_id` | TEXT, NOT NULL | 認証済み principal の `userId`。body から受けない |
| `department_id` | TEXT, NULL | 信頼できる user→department lookup の結果。未実装中は必ず `null` |
| `run_count` | INTEGER, NOT NULL | client が送れる唯一の量的実測値。整数 1..1000 |
| `occurred_at` | INTEGER, NOT NULL | サーバ受信時刻。client 時刻を受けない |
| `idempotency_key` | TEXT, NULL | 有効中の key。1..200 文字。TTL 後は旧行を残して `null` 化できる |
| `request_digest` | TEXT, NOT NULL | canonical `{harnessId,runCount}` の SHA-256 digest |
| `idempotency_expires_at` | INTEGER, NOT NULL | `occurred_at + 24h` |
| `created_at` | INTEGER, NOT NULL | サーバ生成作成時刻 |

物理制約・索引は次のとおり。

- PRIMARY KEY: `id`
- UNIQUE INDEX `metrics_events_scope_idem_uq (tenant_id, idempotency_key)`。endpoint 専用 table なので endpoint は table 境界に内在する。SQLite は複数 `NULL` を許すため、期限切れ key の再利用と履歴保持を両立する。
- INDEX `metrics_events_tenant_workspace_occurred_idx (tenant_id, workspace_id, occurred_at)`。期間 rollup の入力走査に使う。
- INDEX `metrics_events_tenant_workspace_project_occurred_idx (tenant_id, workspace_id, project_id, occurred_at)`。Project 別期間集計に使う。
- INDEX `metrics_events_tenant_harness_occurred_idx (tenant_id, harness_id, occurred_at)`。Harness 別期間集計に使う。
- 現行 DB には FK と CHECK はない。tenant/workspace/project/actor/harness の整合、`run_count` 値域、scope 一致は strict schema、認可 middleware、trusted registry resolver、repository の fail-closed 条件で強制し、P04 で分離・越境テストを必須化する。

現行 schema/repository には `project_id`、trusted Harness resolver、および上記の P01 scope index がなく、unique は `(tenant_id, workspace_id, idempotency_key)` である。これは target design ではなく P05/P08 が閉じる実装差分である。resolver が配線され、trusted source から `project_id` を移行できるまで client 値による backfill や ingest 継続を認めない。

event の business facts は append-only とし、更新・削除 API を持たない。唯一の metadata 変更例外は `idempotency_expires_at <= now` の後に `idempotency_key = null` とする claim release である。これは key 再利用のための metadata 解放に限定し、`id`、tenant/workspace/project/harness/actor/department、`run_count`、`occurred_at`、`request_digest`、expiry、作成時刻、payload 由来 facts を変更しない。生 event は無期限保持する。

### 3.2 `MetricsRollup` (`metrics_rollups`)

| column | type / null | 意味・生成元 |
|---|---|---|
| `id` | TEXT, NOT NULL, PK | サーバ生成 rollup ID |
| `tenant_id` | TEXT, NOT NULL | tenant scope |
| `workspace_id` | TEXT, NOT NULL | Workspace scope |
| `period` | TEXT, NOT NULL | `daily` または `weekly` |
| `dimension` | TEXT, NOT NULL | `tenant` / `harness` / `department` / `project` / `user` |
| `dimension_key` | TEXT, NOT NULL | dimension に対応する ID。部門未解決は予約済み unassigned key |
| `period_start` | INTEGER, NOT NULL | 集計期間の開始（inclusive） |
| `period_end` | INTEGER, NOT NULL | 集計期間の終了（exclusive） |
| `run_count` | INTEGER, NOT NULL | サーバ集計済み実行回数 |
| `saved_minutes` | INTEGER, NOT NULL | サーバ側 `packages/estimation` 算出値 |
| `saved_amount` | INTEGER, NOT NULL | サーバ側算出の最小通貨単位。wire 名は `savedAmountJpy` |
| `computed_at` | INTEGER, NOT NULL | cron の算出時刻。再集計で更新 |
| `created_at` | INTEGER, NOT NULL | 初回作成時刻 |
| `updated_at` | INTEGER, NOT NULL | 最終更新時刻 |

物理制約・索引は次のとおり。

- PRIMARY KEY: `id`
- UNIQUE INDEX `metrics_rollups_scope_uq (tenant_id, workspace_id, period, dimension, dimension_key, period_start)`。cron 再実行は同じ論理行を upsert する。
- INDEX `metrics_rollups_tenant_workspace_read_idx (tenant_id, workspace_id, period, dimension, period_start)`。S09/S16 の期間・次元読取に使う。
- 現行 DB には FK と CHECK はない。`period` / `dimension` の値域、`period_start < period_end`、非負集計値、Workspace scope は schema/repository/service で強制し、P03/P04 で contract test 化する。

`project` 次元と `metrics_events.project_id` は P01/P02 の必須 target である。owner/resolver contract は §2.2 で確定したが、現行の trusted project lookup、rollup dimension、body の `harnessId` を tenant/workspace/project へ束縛する resolver は未実装である。本 ADR は偽の `project_id` を client から受けて埋めない。P05 が resolver と schema を実装して P04 契約テストを通すまで ingest/release を fail-closed とする。

### 3.3 `TenantCoefficient` (`tenant_coefficients`、既存 read dependency)

| column | type / null / default | 意味 |
|---|---|---|
| `tenant_id` | TEXT, NOT NULL, PK | tenant singleton の scope。Workspace 列は持たない |
| `annual_hours` | INTEGER, NOT NULL, default `2000` | 時給換算の年間労働時間 |
| `minutes_per_run` | INTEGER, NOT NULL, default `15` | 1 実行あたり削減分 |
| `sheet_reduction_rate` | REAL, NOT NULL, default `0.35` | sheet estimate の削減率 |
| `updated_by` | TEXT, NOT NULL | 最終更新 actor |

PRIMARY KEY は `tenant_id` だけで、secondary index、FK、DB CHECK はない。wire/application 契約は `annual_hours` と `minutes_per_run` を正の整数、`sheet_reduction_rate` を `0..1`、`updated_by` を認証済み actor とする。更新は user-org-admin の認可済み経路だけが行い、`coefficient.change` 監査 event を必須とする。Metrics は read-only consumer であり、raw salary を response や client 計算へ渡さない。

## 4. API 契約

すべての endpoint は `x-harness-workspace-id` と認証済み principal の tenant/workspace を照合し、repository の全 query に tenant/workspace 条件を注入する。エラーは共通 error model（machine code、利用者向け message、field details、retryability、correlation ID）へ写像する。

### 4.1 `POST /api/v1/metrics/events`

| 項目 | 契約 |
|---|---|
| credential | OAuth Device Flow の短命 Bearer access token。TTL 15 分、DB に access token 本体を保存しない |
| authorization | credential=`access_token`、scope=`metrics:write`、role=`member` 以上。token は tenant/workspace に束縛 |
| headers | `x-harness-workspace-id` 必須、`Idempotency-Key` 必須（trim 後 1..200 文字） |
| strict body | `{ "harnessId": string, "runCount": integer(1..1000) }` のみ |
| server-derived | `tenant_id`, `workspace_id`, `project_id`, `actor_user_id`, `department_id`, `occurred_at`, digest, expiry, ID |
| success | 新規は `201 {eventId,deduplicated:false}`、同 key・同 digest・TTL 内の再送は `200 {eventId,deduplicated:true}` |
| conflict | 同 key・異なる digest・TTL 内は domain conflict として `422`。既存 event を返さず、計上もしない |
| expiry | 24h 後は旧行の key を null 化して同じ key を新規 request に再利用可能 |
| other errors | invalid body/header/workspace は 400、未認証/期限切れは 401、scope/credential 不一致は 403、tenant/workspace 不一致は情報を漏らさない 404 |

「回数のみ」は、client が送る量的な効果値が `runCount` だけという意味である。Harness の識別子以外に client 時刻、actor、department、project、削減時間、金額、給与、係数を受けない。actor は principal だけから付与し、trusted department lookup がない間は `null` とする。body の `harnessId` は trusted resolver で同一 tenant/workspace/project に解決できた場合だけ受理し、project を client 値から生成しない。

冪等判定は P01 正本どおり `(tenant_id, endpoint, idempotency_key)` の論理 scope で行う。現行では endpoint 専用 table なので endpoint は table 境界に内在する。digest は key から独立して canonical `{harnessId,runCount}` を SHA-256 化する。同時 INSERT は unique index を最終防壁とし、競合後に同じ scope を再読取して同 digest だけを replay する。現行 `(tenant_id, workspace_id, idempotency_key)` unique は P05 で閉じる実装差分である。

### 4.2 `GET /api/v1/metrics/summary`

| 項目 | 契約 |
|---|---|
| credential / authorization | session のみ、`metrics.read_aggregate`、member 以上 |
| query | `from=YYYY-MM-DD`, `to=YYYY-MM-DD`, `harnessId?`。`from <= to`。内部では半開区間へ変換 |
| source | 確定済み `metrics_rollups` のみ。既定は `weekly`。`metrics_events` の online aggregate を禁止 |
| response | `period`, `kpi`, `trend`, `ranking`, `departments`。`kpi` は既存値に `completionRate: number|null`, `utilizationRate: number|null` を additive に含める。金額・時間・割合はサーバ算出済み表示値 |
| privacy | tenant/harness/department/project の集計値は member 以上。個人別 raw salary は返さない |

S09 の `completionRate` と `utilizationRate` は §7.1 の確定式で別々に算出する。分母 0 は API で `null`、画面で `—` とし、0% と誤表示しない。HearingSheet と公開済み Harness の母集団は各 owner が期間単位で materialize した trusted read model を summary service が合成し、`metrics_events`、HearingSheet、registry の online aggregate は禁止する。

### 4.3 `GET /api/v1/metrics/rollups`

| 項目 | 契約 |
|---|---|
| credential / authorization | session のみ、`metrics.read_aggregate`、member 以上 |
| query | `period=daily|weekly`, `dim=tenant|harness|department|project|user`, `from`, `to`, `harnessId?`, `projectId?` |
| source | `metrics_rollups` 読取のみ。生 event の online aggregate を禁止 |
| response | `items[]` = `period`, `periodStart`, `dim`, `dimKey`, `runCount`, `savedMinutes`, `savedAmountJpy`, `computedAt` |
| privacy | tenant/harness/department/project は member 以上。`dim=user` の個人別金額は `users.read_salary` を持つ workspace-admin/provider-admin だけ。未許可は 403 |

`project` は target contract から削除しない。§2.2 の trusted mapping が実装され、P04 の越境 test が通るまで endpoint 自体を release しない。client 値で project rollup を生成してはならない。

## 5. Ingest の信頼境界と冪等フロー

1. edge と認可 middleware が 15 分 access token の署名、期限、失効、credential 種別、`metrics:write`、tenant/workspace を検証する。
2. strict schema が body を `{harnessId,runCount}` に限定し、`actorUserId` / `departmentId` を含む未知 field を拒否する。
3. route が header を検証し、repository context へ principal の `userId` を actor として渡す。
4. trusted Harness resolver が body の `harnessId` を server registry で検索し、公開済み status と HearingSheet→Project lineage を含む tenant/workspace/project scope を一意に解決する。principal/header と一つでも不一致、未解決、曖昧なら情報を漏らさず fail-closed とする。
5. repository がサーバ時刻を採番し、解決済み `project_id` を保存する。department は trusted resolver がない限り `null`、digest と `+24h` expiry を生成する。
6. tenant+endpoint scope 内 key が有効なら digest を照合する。同一なら既存 response を replay、相違なら 422 とし、どちらも新規計上しない。
7. 期限切れなら旧 row の key claim だけを null 化し、新しい event を insert する。payload、digest、event facts は不変とする。unique index の競合は再読取して同じ規則を適用する。
8. client 申告の時刻、時間、金額、係数、actor、department、project は保存しない。

## 6. Cron、係数換算、transaction

### 6.1 段構成

| stage | schedule / input | 処理 | output / failure boundary |
|---|---|---|---|
| 日次事前集計 | 毎日、確定した直前日 `[start,end)` の `metrics_events` | tenant→workspace で分割し、tenant/harness/department/project/user 次元を `packages/estimation` と当該 tenant coefficient で算出 | `period=daily`。Workspace・期間の全次元を 1 transaction で upsert |
| 週次確定 | 毎週、完了した直前週 `[start,end)` の event | 日次の単純再加算ではなく同じ純関数・丸め規則で確定値を再計算 | `period=weekly`。Workspace・期間の全次元を 1 transaction で upsert |
| Turso 使用量監視 | 日次 | storage/read/write 使用量を収集し、無料枠の設定閾値と比較 | 閾値超過を admin 通知。保持変更は自動実行しない |
| Metrics anomaly | 日次 | user ごとの当日 run count を、直前 4 完了週がすべて揃い、その同 user 週次 run count 中央値が 0 でない場合だけ比較 | 当日値が中央値の `> 10x` なら `metrics.anomaly` 通知。ingest はブロックしない |

各 rollup transaction は `(tenant_id, workspace_id, period, period_start)` を atomic boundary とする。全 dimension row の upsert が成功したときだけ commit し、1 row でも失敗すればその集合全体を rollback する。失敗した tenant/workspace は他 scope の処理を汚染せず、job は対象期間、件数、所要時間、失敗 scope を記録する。read API は commit 済み row だけを読む。cron 再実行は unique key + upsert により冪等である。

この保証は repository の行単位 loop では成立しない。write port は `commitWorkspacePeriod(context, rows)` 相当の transaction-capable contract とし、Turso adapter の実 transaction を正規実装とする。`guardedWrite`（直列化・retry）や複数の独立 statement は transaction の代用にしない。

Metrics の primary store と正規 writer は P01/backend/System architecture に従い Turso とする。ingest、rollup、係数参照に伴う Metrics write を D1 へ fallback/dual-write しない。D1 は、failure injection を含む contract test で Turso と同じ `(tenant_id, workspace_id, period, period_start)` 単位の all-or-nothing、rollback、再試行後の一意性を証明し、architecture decision を更新するまで **write disabled** とする。D1 環境で write が要求された場合は処理開始前に capability error で fail-closed とし、1 行も書かない。これは Build 書込みを Turso-only/D1 fail-closed とした承認済み境界と整合し、共有 adapter が feature ごとの原子性を弱める余地を作らない。read API は Turso で commit 済みの rollup だけを読む。

金額換算は cron/service のサーバ側だけで `packages/estimation` を呼ぶ。係数は `tenant_coefficients` を注入し、既定値使用の可観測性を保つ。salary、hourly rate、係数を client へ送り、client で再計算する方式は禁止する。

### 6.2 Anomaly の確定契約

判定対象 user について、観測日の直前に連続する **4 完了週すべて**の週次 run count が存在するときだけ中央値を算出する。4 週未満、欠損週あり、または中央値 0 の場合は判定も通知も行わない。当日 run count が中央値の **10 倍を超えた場合だけ**（10 倍ちょうどを含まない）、notification-only の `metrics.anomaly` を生成し、ingest はブロックしない。

通知の冪等 scope は `(tenant_id, actor_user_id, observed_date, rule_version)` とし、cron retry で同じ anomaly を重複通知しない。job registry へ対象日、4 週の境界、中央値、観測値、通知成否、所要時間を記録するが、salary/時給/token/key は記録しない。現行 daily/weekly rollup と Turso usage monitor の存在を anomaly job の実装済み証拠には流用せず、P04 が欠損週、中央値 0、10 倍ちょうど、10 倍超、retry を test vector にする。

### 6.3 保持と運用判断

`metrics_events` は P01/backend と System Spec `qa-229` に従い Turso DB に無期限保持し、R2 archive や自動削除を採らない。使用量監視が無料枠圧迫を示した場合だけ、R4-reopen と利用者承認を経て保持期間を再検討する。旧 `qa-221` の履歴は監査用に残るが現行セルからは参照されず、R2 退避・月次化の実装根拠にはならない。

## 続き

画面・KPI・Security・Migration・handoff は [architecture-decision-record-ui-ops.md](./architecture-decision-record-ui-ops.md) を参照する。
