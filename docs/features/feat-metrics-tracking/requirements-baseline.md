---
status: confirmed
layer: feature-design
task: SYS-METRICS-TRACKING-P01
parent_feature: feat-metrics-tracking
feature_package_id: feature-package/feat-metrics-tracking
source: .dev-graph/plans/feature-package-feat-metrics-tracking/goal-spec.json
feature_context_digest: sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-frontend]
---

# feat-metrics-tracking 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

導入ハーネスの利用実態と削減効果 (G5) を可視化するため、実行ログ ingest (B2: 短命 token・冪等キー・回数のみ)・週次 rollup (B3: Workers cron)・試算エンジン共通層 (サーバ側係数換算) と S09/S16 ダッシュボードを提供する (I10)

## 2. ゴール (goal)

実行ログがサーバ側で信頼可能に集計され (SEC5)、S09 ダッシュボード・S16 利用/削減効果・S17 個別集計が週次 rollup から描画される状態

## 3. スコープ

### 3.1 scope_in

1. MetricsEvent/MetricsRollup エンティティ + ingest API (B2)
2. Workers cron 週次 rollup (B3)
3. 試算エンジン純関数 (時給=年収÷annualHours・分/回・削減率、単一実装)
4. S09 ダッシュボード (KPI/推移/完了率/ランキング/部門別)
5. S16 利用・削減効果 (ハーネス別・週次)
6. チャート共通部品の消費 (bundle 3MiB 予算内)

### 3.2 scope_out

1. クライアント側での金額換算・自己申告 (SEC5 で禁止)
2. 外部 BI 連携

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. ingest が短命 token + 冪等キーで保護され重複計上しない
2. 金額換算がサーバ側のみで行われる (クライアント申告は回数のみ)
3. S09/S16 が rollup 由来のデータで描画され CWV good を維持する

## 5. 品質制約 (quality_constraints — goal-spec 8 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| metrics-ingest-short-token-idempotency-count-only-b2-sec5 | 実行ログ ingest (`POST /api/v1/metrics/events`) は短命 Bearer token 認証 + `Idempotency-Key` ヘッダ必須 (scope=(tenant,endpoint)・TTL 24h) で保護し、クライアントは実行回数 (run_count) のみを送信する。時刻はサーバ採用とし、時間・金額の自己申告は受け付けない。重複 key は 200 (既存応答再生) で冪等応答し、重複計上しない。 | system-spec/00-requirements-definition.md I10 (実行ログ ingest: 短命 token・冪等キー・クライアントは回数のみ送信); system-spec/spec-state.json qa-025 (SEC5: クライアント申告は実行回数のみとし係数適用・金額換算はサーバ側で行う。ingest は短命 token + 冪等キー + サーバ時刻); system-spec/spec-state.json qa-023 (B2 実行ログ ingest: 短命 token 認証・冪等キー・クライアントは実行回数のみ送信・時刻はサーバ採用); docs/backend-spec.md §4.9 (`POST /api/v1/metrics/events`: 回数のみ受理・時刻はサーバ採用・Idempotency-Key 必須、207 なし、重複 key は 200)、§2.3 `metrics_events` テーブル (append-only、UNIQUE(tenant_id, idempotency_key)、時間・金額の自己申告は受けない) |
| metrics-rollup-cron-server-conversion-b3 | 週次/部門別/ユーザー別/ハーネス別の rollup は Workers cron (日次 + 週次確定) で `metrics_events` → `metrics_rollups` へ事前集計する。金額換算はサーバ側のみで行い、ダッシュボード系 API は rollup 読取のみに限定して生イベントのオンライン集計を禁止する (Turso 読取予算対策)。 | system-spec/00-requirements-definition.md I10 (Workers cron の週次 rollup); system-spec/spec-state.json qa-023 (B3 集計 rollup: Workers cron で週次/部門別/ユーザー別の事前集計、金額換算はサーバ側のみ); docs/backend-spec.md §2.3 `metrics_rollups` テーブル (UNIQUE(tenant_id, period, period_start, dim, dim_key)、金額換算はサーバのみ)、§7 cron 表 (metrics rollup: 日次+週次確定)、§8 非機能 (Turso 読取予算: ダッシュボード系は rollup 読取のみに限定し生イベントのオンライン集計を禁止, B3)、§4.9 `GET /api/v1/metrics/summary` (rollup 読取のみ) |
| estimation-engine-single-pure-function-owner-unresolved | 試算エンジン (時給 = 年収 ÷ annualHours・削減分/回・削減率) は `packages/estimation` の純関数として Publisher/Hub 間で単一実装とし、係数は `tenant_coefficients` (annualHours 既定 2000・minutes_per_run 既定 15・sheet_reduction_rate 既定 0.35) から注入する。金額換算はサーバ側のみでクライアントへ salary を渡さない。**未解決 (P02 必須解消事項)**: 実装 owner の記述が docs/shared-layers.md §2 (feat-hub-foundation へ一元化と記載) と本 feature の scope_in (試算エンジン純関数を含む) で食い違っており、P02 設計時に owner を確定し、shared-layers.md か本 feature のいずれかを訂正する必要がある。 | features/feat-metrics-tracking.md 上流未解決節 (試算エンジン owner 食い違い、出典: feat-user-org-admin plan-findings.json 2026-07-17 evaluator finding); docs/shared-layers.md §2 (試算エンジン(純関数): 時給/削減時間/削減額/シート試算の単一実装。係数 (annualHours・分/回・削減率) はテナント設定); docs/backend-spec.md §1 コード構造規約 (検査 pipeline/試算エンジン/通知ディスパッチは純関数の共有パッケージ、Publisher と Hub で二重実装しない)、§6.2 `packages/estimation` (算出式・係数注入・金額換算はサーバ側のみ、SEC4/SEC5); system-spec/00-requirements-definition.md I10 (サーバ側係数換算) |
| tenant-coefficients-scope-audit-d4 | `tenant_coefficients` (annualHours・minutes_per_run・sheet_reduction_rate・updated_by) は D4 (row-level tenant scope: 単一 DB + tenant_id/workspace_id スコープ列 + アプリ層強制) に従いテナント別に管理し、係数変更は監査 event 必須とする (B10/SEC6)。`metrics_events`/`metrics_rollups` を含む Studio 拡張の新規テーブルは全て tenant_id スコープ列必須でリポジトリ層に WHERE 句を強制注入し、分離テストを CI 必須とする。 | system-spec/00-requirements-definition.md D4 (マルチテナント論理分離、row-level-scope confirmed); system-spec/spec-state.json qa-024 (Studio 追加エンティティに MetricsEvent/MetricsRollup/TenantCoefficient を含み、全新規テーブルへ tenant_id/workspace_id スコープ列必須 = D4); docs/backend-spec.md §2.3 `tenant_coefficients` テーブル定義 (係数変更は監査 event 必須, B10/SEC6) |
| dashboard-s09-s16-rollup-read-only-authz-sec4 | S09 ダッシュボード (KPI カード・推移・完了率・ランキング・部門別削減) と S16 利用・削減効果はいずれも `GET /api/v1/metrics/summary`・`GET /api/v1/metrics/rollups` の rollup 読取専用 API から描画する。dim=tenant/department/project の集計値は member 以上全員に開放するが、dim=user の金額換算は admin 限定とする (SEC4 の逆算対策: 個人の給与を rollup から逆算されないため)。 | system-spec/spec-state.json qa-021 (Studio mockup 反映: S09 ダッシュボード(KPIカード・推移・完了率・ランキング・部門別削減)、S16 利用・削減効果の画面追加確定); docs/backend-spec.md §4.9 (`GET /api/v1/metrics/summary` member、`GET /api/v1/metrics/rollups` member(集計値)/admin(user 次元の金額)、SEC4 逆算対策); system-spec/spec-state.json qa-025 (SEC4 PII ガード: salary は admin 限定表示・一般 API 非公開) |
| frontend-chart-bundle-budget-server-estimate-display-only-qa022 | S09/S16 のチャート (折れ線・バー・ドーナツ・KPI カード) は共通部品 (packages/ui) を消費し、Worker bundle 3MiB 予算内の軽量実装とする (重量チャートライブラリ不採用)。試算表示 (時給換算・削減額) はサーバ計算値の表示専用とし、クライアント側での金額再計算・自己申告は行わない。 | system-spec/spec-state.json qa-022 (Studio mockup 反映 frontend: チャート類は Worker bundle 3MiB 予算内の軽量実装、重量チャートライブラリを採用しない。試算表示はサーバ計算値の表示専用でクライアント側の金額再計算・自己申告を行わない、qa-025 SEC5 と対); system-spec/spec-state.json qa-018 (CWV good・Worker 3MiB 制限下の bundle 予算管理); docs/backend-spec.md §8 (Worker bundle ≤3MiB を CI ゲート化) |
| s17-individual-metrics-supplied-to-user-org-admin-boundary | S17 (ユーザー管理 + 個別ダッシュボード) の個別集計は本 feature の週次 rollup から供給されるが、S17 の画面自体は feat-user-org-admin の管轄であり、本 feature のスコープは MetricsEvent/MetricsRollup の生成・rollup API 提供までとする (S17 の画面実装・role 管理・年収係数 PII ガードは feat-user-org-admin 側の責務)。 | features/feat-metrics-tracking.md 到達状態 (『S09 ダッシュボード・S16 利用/削減効果・S17 個別集計が週次 rollup から描画される状態』); features/feat-metrics-tracking.md 機能間依存 (feat-user-org-admin); system-spec/00-requirements-definition.md I10 (S09/S16/S17 のダッシュボードへ供給) および I14 (S17/S18: role 管理・年収係数 PII・通知設定) |
| metrics-retention-indefinite-usage-monitoring-anomaly-detection | `metrics_events` の生データは無期限 DB 保持とする (2026-07-17 ユーザー決定、90 日 R2 退避案を不採用)。代償として Turso 使用量日次監視 cron (無料枠閾値超過で admin 通知) と、ユーザー別実行回数が過去 4 週中央値の 10 倍超で `metrics.anomaly` 通知を出す日次異常検知 cron (ブロックはしない) を運用に組み込む。無料枠圧迫時は保持期間導入を R4-reopen で再検討する。 | system-spec/spec-state.json qa-031 (metrics 生データ保持は無期限 DB 保持をユーザー選択、Turso 使用量日次監視 cron を追加); docs/backend-spec.md §2.3 `metrics_events` (生データは無期限 DB 保持、Turso 無料枠使用量を保守運用の監視対象とし圧迫時は保持期間導入を R4-reopen で再検討)、§7 cron 表 (Turso 使用量監視: 日次、metrics 異常検知: 日次・中央値10倍超で通知・ブロックしない) |

## 6. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-metrics-tracking/goal-spec.json` (promoted。feature_context_digest = sha256:64106cc96859b3755741efeb26321fd3746af1a823d0d7837d5b2147b41ee759)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 8 件 (§5) が過不足なく転記されていること
