---
status: confirmed
layer: feature-design
title: 確認用データセット ドメイン enum 一覧
feature_id: feat-demo-coverage-dataset
updated_at: "2026-08-15"
---

## 10. ドメイン enum 全値 (実測 43 カラム / 135 値)

`packages/db/schema/**/*.ts` の実測結果である。検査 3 (A2) の入力となる。

| 領域 | テーブル.カラム | 値 | 件数 |
|---|---|---|---|
| build-pipeline | `buildStageEvents.from_stage` | hearing / requirements / design / build / test / review / publish | 7 |
| build-pipeline | `buildStageEvents.to_stage` | 同上 | 7 |
| builds | `builds.type` | hearing / improvement / review / bug | 4 |
| builds | `builds.stage` | hearing / requirements / design / build / test / review / publish | 7 |
| builds | `builds.risk_override` | none / warn / blocked (null は「上書きなし」で enum 値ではない) | 3 |
| core/catalog | `projects.status` | active / suspended / archived | 3 |
| core/catalog | `targetChannels.target` | skill / web_app | 2 |
| core/catalog | `releases.status` | available / suspended / deprecated | 3 |
| core/catalog | `packages.kind` | skills-package | 1 |
| core/catalog | `deploymentReferences.provider` | cloudflare | 1 |
| core/catalog | `catalogEntries.visibility` | private / workspace | 2 |
| core/identity | `tenants.status` | active / suspended | 2 |
| core/identity | `idpConnections.credential_mode` | customer_google / shared_google | 2 |
| core/identity | `idpConnections.credential_status` | pending / tested / active / disabled | 4 |
| core/identity | `idpConnections.pending_credential_mode` | customer_google / shared_google | 2 |
| core/identity | `users.role` | provider-admin / workspace-admin / member | 3 |
| core/identity | `users.status` | active / inactive | 2 |
| core/publish | `publishRequests.status` | draft / validating / needs_fix / ready / approval_pending / approved / publishing / failed / published | 9 |
| core/publish | `publishRequests.verdict` | green / yellow / red | 3 |
| core/publish | `deviceAuthorizations.status` | pending / approved / denied / consumed | 4 |
| core/security | `auditEvents.actor_type` | user / publisher_token / system | 3 |
| core/security | `encryptionKeys.purpose` | salary / idp_secret / tenant_data | 3 |
| core/security | `encryptionKeys.status` | active / retiring / retired | 3 |
| core/smoke | `smokeFixtureLeases.kind` | database / hearing / coverage / publish | 4 |
| docs-cms | `documents.scope` | common / tenant | 2 |
| docs-cms | `documents.status` | draft / published | 2 |
| docs-cms | `documents.thumbnail_source` | auto / manual | 2 |
| docs-cms | `documents.excerpt_source` | auto / manual | 2 |
| feedback-loop | `feedbacks.type` | improvement / review / bug | 3 |
| feedback-loop | `feedbacks.priority` | high / medium / low | 3 |
| feedback-loop | `feedbacks.source` | harness / manual | 2 |
| feedback-loop | `feedbacks.status` | open / in_progress / resolved | 3 |
| hearing-intake | `hearingSheets.status` | received / generating / review / completed | 4 |
| hearing-intake | `aiJobs.kind` | sheet_generation / feedback_response / doc_draft | 3 |
| hearing-intake | `aiJobs.status` | queued / processing / completed / failed / dead | 5 |
| hearing-intake | `displayCodeCounters.kind` | HS / FR / DOC | 3 |
| hearing-intake | `hearingShareTokens.audience` | harness_creator / system_orchestrator | 2 |
| metrics-tracking | `metricsRollups.period` | daily / weekly | 2 |
| metrics-tracking | `metricsRollups.dimension` | tenant / harness / department / user | 4 |
| mutation-safety | `mutationCreateIdempotency.resource` | documents / sheets | 2 |
| mutation-safety | `mutationCreateIdempotency.operation` | create | 1 |
| notion-integration | `notionIntegrations.mode` | url / api_key | 2 |
| tenant-data | `tenantDataObjects.kind` | knowledge_doc / run_input / run_output / hearing_screenshot | 4 |

合計: 43 カラム / 135 値。

### 10.1 動作前提と衝突する enum 値の扱い

一部の enum 値は、「テナント `local` が有効で、seed した利用者でサインインできる」という動作前提と正面から衝突する。単純に既存行の値を書き換えると、画面に到達できなくなる。

| 衝突する値 | 衝突の内容 | 扱い |
|---|---|---|
| `tenants.status = suspended` | サインイン対象テナントを停止すると全画面へ到達できない | サインインに使うテナントとは別に、停止状態のテナントを 1 件用意する |
| `users.status = inactive` | サインインに使う利用者を非活性にするとサインインできない | サインイン用の利用者とは別に、非活性の利用者を用意する |
| `idpConnections.credential_status = disabled` | 認証連携を無効にするとサインイン経路が塞がる | サインインに使う連携とは別の連携行として用意する |

この扱いにより、対象テナントは「サインインに使う主テナント」と「停止状態の副テナント」の 2 件になる。§4 の削除条件がテナント境界を含むという制約 (§4.3) は 2 件それぞれに対して適用する。

### 10.2 画面に現れないテーブルの enum

`encryptionKeys` / `smokeFixtureLeases` / `auditEvents.actor_type` / `buildStageEvents` などは、30 route のいずれにも直接表示されない。受入条件 A2 は「各ドメインモデルの enum ステータスが全値」と定めており、画面表示の有無で対象を絞っていない。したがってこれらも投入対象に含め、検査 3 (§9.2) の対象とする。画面到達手順 (§2 の `reach`) は持たない。

## 11. 既存 schema への影響

本設計は `packages/db/schema/**` への列追加・型変更・制約変更を伴わない。既存 schema が表現できる値の範囲内で fixture を構成する。したがって移行 (migration) と後方互換の考慮は不要であり、P08 における該当判定は「非該当」となる。

## 12. テスト方針の固定 (P04 への引き継ぎ)

| レベル | 対象 |
|---|---|
| 単体 | 決定論 ID の導出 (同一入力で同一出力・衝突なし)、fixture 生成規則 |
| 結合 | seed 実行 → DB 状態の確認 (enum 網羅・件数・文字数) |
| 境界値 | 表示区切りの前後 3 点 (§5.3)、長文の規約文字数の前後 |
| 回帰 | 同一引数の連続 2 回実行で状態が一致すること (A5)、非ローカル URL の拒否 (A6) |

| 制約 | 内容 |
|---|---|
| C1 | テストは画面の DOM 構造や画素位置に依存せず、データ内容 (enum 値・件数・文字数) を契約とする |
| C2 | カバレッジ目標 80% は P05 が実装するコードに適用する。定義ファイル (データのみ) は対象としない |

## 13. 未解決事項

現時点で本設計に未解決の判断は無い。P03 のレビューで指摘が出た場合は、本書へ反映してから P04 以降へ引き継ぐ。
