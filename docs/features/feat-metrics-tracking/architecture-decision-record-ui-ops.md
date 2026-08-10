---
status: confirmed
layer: feature-design
task: SYS-METRICS-TRACKING-P02
parent_feature: feat-metrics-tracking
feature_package_id: feature-package/feat-metrics-tracking
source: docs/features/feat-metrics-tracking/architecture-decision-record.md
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend]
---

# feat-metrics-tracking アーキテクチャ決定記録（UI・運用・handoff）

> 前半（決定要約・データ・API・cron）は [architecture-decision-record.md](./architecture-decision-record.md)。

## 7. S09 / S16 画面構成と KPI

### 7.1 KPI の確定契約

完了率と利用率は別 KPI とし、次の式をユーザー承認済み contract とする。

| KPI | 確定式 | trusted source / period semantics | 分母 0 |
|---|---|---|---|
| 完了率 (`completionRate`) | **選択期間末時点の完了 HearingSheet 数 ÷ 同時点の対象 HearingSheet 総数** | hearing-intake owner が期間末 snapshot を materialize する。期間末より前に対象 Workspace に存在する HearingSheet を母集団とし、その時点の `status=completed` を分子にする | API は `null`、UI は `—` |
| 利用率 (`utilizationRate`) | **選択期間内に 1 回以上利用された公開済み Harness 数 ÷ 対象公開済み Harness 総数** | trusted server registry の対象公開済み Harness 母集団と、同じ期間の Harness rollup を server-side で突合する。distinct `harness_id` を数え、未公開 Harness は分子・分母から除外する | API は `null`、UI は `—` |

割合は server-side で算出し、UI は再計算しない。summary service は各 owner が materialize した期間 read model と確定 rollup だけを読み、生の HearingSheet、registry、`metrics_events` を request ごとに online aggregate しない。response は rate と対象期間を返し、0 と測定不能を区別する。

現行実装には次の差分がある。S09 mock/frontend spec は完了率を要求するが現行 summary/UI に field がなく、現行「活用率」の `activeHarnessRatio()` は実行実績由来の `summary.ranking` 件数を分母にも使い、非空時にほぼ 100% となる。空配列を 0 とする挙動も確定契約の `—` と異なる。P04 は期間末 snapshot、完了/未完了、公開/未公開、期間内未利用、分母 0 を test vector にし、P05 で現行式を置き換える。

### 7.2 画面構成

| screen | structure | data / authorization | a11y / performance |
|---|---|---|---|
| S09 Dashboard `/dashboard` | 期間 filter、総実行回数・削減時間・削減額・完了率・利用率 KPI、週次推移、完了率 donut、Harness ranking、部門別削減、更新時刻/空状態 | summary + weekly rollups + 確定 KPI read model。集計金額は member 以上、個人金額は表示しない | server-first data acquisition、予約領域で CLS 防止、各 inline SVG 直後の同値 HTML table、keyboard 操作、状態/単位を text で表示 |
| S16 Usage `/tracking` | Harness selector、選択 Harness の実行回数・削減時間・削減額、週次 trend、週別詳細表、更新時刻/空状態 | `harnessId` 付き summary + `period=weekly&dim=harness` rollups | selector に label、各 SVG 直後の同値 HTML table、focus 可視、loading/error/empty を区別 |

route は S09=`/dashboard`、S16=`/tracking` を正本とする。現行 `/metrics` と `/metrics/usage` は実装差分であり、P05 で正本 route へ収束させる。既存 bookmark の互換 redirect を置く場合も tenant/workspace scope と認可を再評価し、旧 route を第二の画面 owner として残さない。KPI は §7.1、dimension は §3.2/§4.3 の確定 contract に従う。

チャートは `packages/ui` の共通 component を使う self-contained inline SVG とし、canvas、画像だけの表現、重量 chart library を採らない。各 SVG の **DOM 上の直後**に、同じ dataset、期間、単位、系列名を持つ HTML table を常時 render する。表を toggle、hover、JavaScript 成功、視覚表示だけに依存させず、支援技術と keyboard からいつでも利用可能にする。これは bundle 3 MiB 予算、WCAG の知覚可能性、印刷・支援技術、故障時の回復を同時に満たす承認済み決定である。S09/S16 の CWV は実環境計測で good を必須とし、計測不能を pass としない。

## 8. Security、PII、監査

| concern | control |
|---|---|
| tenant isolation | 全 event/rollup query に tenant + workspace を repository context から強制注入し、別 scope を 404 とする |
| actor spoofing | `actor_user_id` は principal だけから生成。body field は strict schema で拒否 |
| department spoofing | trusted lookup 実装までは `department_id=null`。client field を受理しない |
| project / Harness spoofing | HearingSheet 確定でサーバ生成した Project lineage と trusted registry を使い、body の `harnessId` を tenant/workspace/project/published status に束縛する。未解決・越境・不一致は fail-closed。client project を受理しない |
| token theft | access token TTL 15 分、scope 最小化、Workspace 束縛、失効 row を毎 request 確認 |
| replay / payload substitution | tenant+endpoint scope unique key、SHA-256 digest、24h TTL、異 payload は 422 |
| salary inference | salary を Metrics API に出さない。集計額は member、`dim=user` の個人額は admin 限定 |
| coefficient tampering | 更新 owner=user-org-admin、認可、値域検証、`coefficient.change` audit |
| count inflation | 1 request 上限 1000、直前 4 完了週あり・中央値非 0 の場合だけ日次 `>10x` anomaly notification、correlation/job evidence |
| stale/partial rollup | Turso の Workspace・期間単位 transaction、`computedAt` 表示、cron failure evidence。D1 write は原子性証明まで fail-closed |

## 9. Migration、release、rollback

### 9.1 Build と Metrics の将来分離（承認済み）

既存 `0008_metrics-tracking-and-build-stage-events.sql` と対応する schema snapshot/journal は適用済み lineage artifact であり immutable とする。履歴 file の分割・削除・改名・再採番・内容変更は禁止する。combined `0008` は歴史的例外であり、Build と Metrics の今後の release を結合する根拠にはしない。

P08 は `0008` の lineage と target schema を検証し、今後 schema 差分が必要な場合だけ Metrics 所有の additive delta migration を新しい番号で追加する。Build と Metrics を同じ将来 delta に混在させず、schema test、tenant isolation、release gate、rollback evidence を feature ごとに分離する。差分がなければ migration を作らず、既存 table を再作成しない。

### 9.2 Rollout

1. 本 ADR の local design gate は解消済みだが、P02 linked PR を merge し default branch reconciliation で durable done にする。それまでは P03 を正式開始しない。
2. durable done 後、P03 が本 ADR の確定 decision と現行実装差分を独立 review する。新たな矛盾が見つかった場合だけ通常の reopen 手順へ戻す。
3. P04 が ingest、冪等、認可、Turso rollup atomicity、KPI、anomaly、a11y/CWV の executable test ID を固定する。
4. P05–P07 が schema/repository/service/API/UI/cron と evidence を閉じる。
5. P08 が immutable `0008` の lineage を検証し、必要な場合だけ Metrics 専用 additive delta migration を生成して preview Turso で apply、schema、tenant isolation を検証する。
6. API/cron を先に compatible deploy し、ingest→daily→weekly→S16 `/tracking`→S09 `/dashboard` の順に feature gate を開く。Build release の成否に連動させない。

### 9.3 Rollback

| trigger | rollback action | data handling |
|---|---|---|
| auth/tenant/idempotency defect | Metrics ingest route/feature gate を停止し、短命 token/family を必要に応じ失効 | event/rollup table を保持。誤 scope data は隔離して監査し自動削除しない |
| rollup formula/transaction defect | read/dashboard gate と cron を停止し、直前の compatible code へ戻す | raw event を正本として保持し、修正版で対象期間を冪等再集計 |
| D1 write 経路の誤配線 | write capability gate で開始前に拒否し、Turso 正規経路の設定を復旧 | D1 へ部分 data を作らない。D1 を Turso の自動 fallback にしない |
| UI/CWV/a11y regression | S09/S16 の新 UI gate を戻す | API/DB data は保持 |
| future Metrics delta apply failure | Metrics 専用 delta だけを停止し、transactional DDL が使える環境では未完了 DDL を rollback | immutable `0008` を書き換えず、Build migration/release へ影響させない |
| Turso cap pressure | 通知と R4-reopen。ingest rate/表示範囲の安全な抑制を先に検討 | 無期限保持を無承認で短縮・drop しない |

additive delta の routine rollback は application を先に戻し、既存 table を残す。`project_id` 追加など既存行を扱う delta は P08 で preflight、trusted-source backfill、rollback を明示し、client 値で補完しない。`DROP TABLE`、保存期間導入、履歴削除は別の data lifecycle migration、export/restore rehearsal、利用者承認なしに行わない。

## 10. 依存関係

```text
P01 confirmed baseline
  -> P02 this ADR
     -> P03 independent design review
        -> P04 executable test design
           -> P05 implementation
              -> P06 execution evidence
                 -> P07 QA adjudication
                    -> P08 Metrics-only migration
                       -> P09 CI fail-closed gates
                          -> P10 security review
                             -> P11 source/digest handoff
                                -> P12 operational docs
                                   -> P13 Metrics-only release acceptance
```

Runtime dependency は `HearingSheet finalization -> server-created Project -> Build/publish -> trusted Harness registry -> access-token/authz -> ingest -> metrics_events -> coefficient + estimation -> Turso atomic daily/weekly rollup -> summary/rollups API -> S16 /tracking -> S09 /dashboard` である。`tenant_coefficients` の write owner は user-org-admin、package boundary owner は hub-foundation、completion read model は hearing-intake、utilization母集団は trusted registry owner が提供する。typed port と contract test で接続し、Metrics が各 owner の storage を直接所有しない。

外部依存は soft assumption にしない。`feat-hearing-intake` の Project 作成/関連付け、Project/catalog/publish owner の trusted Harness registry、`feat-auth-tenancy` の principal、`feat-domain-model-db` の Turso transaction port と immutable migration lineage、`feat-hub-foundation` の estimation/UI contract、`feat-user-org-admin` の係数・PII policy、KPI read model、notification owner の冪等 delivery contractを確定 dependency とする。設計上の owner/port は解消済みであり、後続 phase は contract test を先に固定して実装する。Metrics から各 owner の storage を直接読む回避策、および D1 write fallback を禁止する。

## 11. 設計と現行実装の対応

この表は code review 時点の差分であり、「決定済み」と「実装済み」を混同しないための記録である。

| area | 現状 | P03 以降の closure |
|---|---|---|
| principal actor / department | body から actor/department を除き、actor は context、department は null | trusted department lookup を追加する場合も client field を復活させない |
| idempotency / digest / TTL | 現行は tenant+workspace unique、SHA-256 digest、24h expiry | P01 正本の tenant+endpoint scope へ P05 で修正し、並行競合、異 workspace replay、expiry と metadata claim release を固定 |
| server time / count-only | strict `{harnessId,runCount}`、server time が実装済み | unknown field、clock、upper bound test を維持 |
| schema/indexes | 現行は `project_id` と project index がない | §2.2 の確定 resolver と trusted-source migration で、client 補完なしに target へ移行 |
| HearingSheet→Project | 現行 HearingSheet に Project relation/finalization transaction がない | サーバ作成・関連付け・再試行冪等性を Turso transaction で実装 |
| daily + weekly cron | 2 段 job と Turso usage monitor は存在 | failure evidence と §6.2 の anomaly job wiring/冪等通知を追加 |
| rollup transaction / writer | repository は行ごとの upsert loop | Turso で Workspace・期間の rollup 集合を 1 transaction に変更。D1 write は原子性証明まで無効（未充足） |
| estimation boundary | 共有 package と Metrics adapter が存在 | hub-foundation owner、両 consumer contract、duplicate=0 を gate 化 |
| project dimension | trusted mapping/column/dimension と Harness scope resolver がない | §2.2 の確定 contract を実装し、完了まで ingest/release fail-closed |
| completion/utilization | completion field/provider がなく、現行「活用率」は実行済み ranking を母集団、空配列を 0 としている | §7.1 の確定式、期間末 read model、分母 0=`—` へ置換（未充足） |
| charts | inline SVG と equivalent data table の切替導線はある | 各 SVG 直後に同値 HTML table を常時利用可能にし、a11y と bundle/CWV を実測 |
| individual amount | `dim=user` は `users.read_salary` で admin gate | 403 と aggregate member access の回帰 test を維持 |
| retention/monitoring | event は削除 API なし、Turso daily usage monitor は存在 | 4 完了週・中央値非 0・冪等 key の確定 anomaly contract を実装 |
| S09/S16 contract | 現行 route は `/metrics` と `/metrics/usage` | 正本 S09=`/dashboard`、S16=`/tracking` へ同期 |
| System Spec database/web | 旧 `qa-221` の R2、週/月、派生値非保存は P01/backend と矛盾していた | R4-reopen 後の現行 `qa-229` で Turso primary、無期限保持、daily/weekly、サーバ算出 rollup、immutable `0008` へ同期済み |
| migration/release | Metrics と Build が immutable combined `0008` に存在 | 履歴は不変。今後の delta/evidence/release のみ feature 別に分離 |

## 12. 受入・品質制約対応表

| source requirement | architecture evidence | executable acceptance |
|---|---|---|
| A1 短命 token + 冪等 key、重複計上なし | §4.1, §5 | 15 分 token、tenant+endpoint scope、same/different payload、並行、TTL±境界、claim release 後も facts/digest 不変 |
| A2 金額換算は server-only、client は count-only | §3, §4.1, §6 | unknown amount/time/actor field rejection、server formula parity |
| A3 S09/S16 は rollup 由来、CWV good | §4.2–4.3, §7 | `/dashboard`・`/tracking`、raw-event online read=0、bundle≤3MiB、CWV good fail-closed |
| QC1 ingest safety | §2.2, §4.1, §5 | HearingSheet→Project server transaction、registry tenant/workspace/project/published照合、越境 fail-closed、digest 422、24h reuse、201/200 |
| QC2 rollup cron/server conversion | §6 | daily/weekly、Turso transaction atomic rollback、idempotent rerun、read committed only、D1 write capability fail-closed |
| QC3 estimation single owner | §2 | owner=hub-foundation、Metrics/hearing consumer contract、duplicate=0 |
| QC4 coefficient scope/audit | §3.3, §8 | positive/range validation、tenant isolation、audit event |
| QC5 S09/S16 authz | §4, §7, §8 | project resolver、member aggregate、admin user amount、non-admin 403、S09 `/dashboard`、S16 `/tracking` |
| QC6 chart budget/server display | §7 | 各 inline SVG 直後の常時利用可能な同値 HTML table、no client amount calculation、bundle/CWV |
| QC7 S17 boundary | §2, §10 | Metrics supplies user rollup only; S17 UI/role remains user-org-admin |
| QC8 indefinite retention/monitor/anomaly | §6.2–6.3, §8 | no delete path、daily Turso threshold、直前4完了週あり・median≠0・`>10x`・冪等 notify-only |
| approved KPI contracts | §4.2, §7.1 | 期間末完了 HearingSheet 率と期間内公開済み Harness 利用率を別算出し、両方とも分母0はAPI `null` / UI `—` |
| approved migration/release split | §9 | immutable combined `0008` を維持し、今後の Metrics delta/apply/rollback/evidence を Build から分離 |

## 13. P02 required evidence と P03 handoff

- Owner 決定の判断基準、影響範囲、訂正対象: §2
- `metrics_events` / `metrics_rollups` / `tenant_coefficients` の全 column、constraint、index: §3
- ingest / summary / rollups の API 3 件: §4
- cron の日次事前集計、週次確定、transaction、監視段: §6
- S09 / S16 画面構成、KPI、inline SVG + 同値表: §7
- rollback、release 分離、依存関係: §9–§10
- P01 acceptance 3 件・quality constraints 8 件との対応: §12

P02 の design gate はすべて user-confirmed で解消済みである。

1. Project: HearingSheet 確定時にサーバ作成・関連付けし、trusted Harness registry が tenant/workspace/project/published status を解決する。
2. Writer: Metrics primary/正規 writer は Turso、rollup は Turso transaction。D1 write は同等原子性の証明まで fail-closed で無効にする。
3. KPI: 完了率・利用率の式と分母 0=`—` を §7.1 で確定した。
4. Anomaly: 直前 4 完了週がすべて揃い、中央値非 0 の場合だけ `>10x` を判定し、冪等に通知する。
5. Migration: combined `0008` は immutable とし、今後の feature delta/release/rollback だけを分離する。
6. UI: S09=`/dashboard`、S16=`/tracking`、各 inline SVG 直後の同値 HTML table を常時利用可能にする。
7. Source boundary: P01/backend/Turso primary と System Spec `qa-229` を一致した実装正本とする。旧 `qa-221` は履歴であり、未承認の代替実装を許可しない。

このため本 ADR の設計状態は `status: confirmed` である。実装差分は P03 の再判断事項ではなく、P04 の executable test design と P05 以降が閉じる対象である。新しい上位矛盾が見つかった場合だけ通常の reopen 手順へ戻し、P01 baseline 自体を直接書き換えず source goal/spec の再確定へ差し戻す。

ただし **P03 の正式開始は現時点では不可** とする。本更新と validator 通過で成立するのは P02 の local evidence complete までであり、P02 task の durable completion ではない。P02 の durable done（永続的な完了）は linked PR の merge と default branch reconciliation 後にのみ成立し、その完了 event が確認されるまで P03 を開始しない。実装完了や release 完了も主張しない。
