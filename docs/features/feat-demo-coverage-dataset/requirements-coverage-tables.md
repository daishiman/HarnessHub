---
status: confirmed
layer: feature-requirements
title: 確認用データセット 対応表・enum 一覧
feature_id: feat-demo-coverage-dataset
updated_at: "2026-08-15"
---

## 6. route × 状態 対応表 (骨子)

### 6.1 5 状態の定義

| 状態 | 定義 |
|---|---|
| 空 | 当該画面が扱う主コレクションの件数が 0、または主対象が未設定 |
| 1 件 | 主コレクションの件数が 1 (一覧と詳細の最小構成) |
| 大量 | 主コレクションの件数が 50 件以上で、1 ページ表示件数を超える |
| 長文 | 主表示項目に §8 の長文規約を満たすレコードが含まれる |
| エラー | 取得失敗・権限不足・未同期のいずれかを画面上で再現している |

### 6.2 セルの記法

- **適用**: その route でその状態を再現する必要があり、到達手順を定義する対象。
- **非適用**: その route の構造上その状態が存在しない。理由を §6.4 の記号で示す。

A7 の機械検査は、全 140 セル (28 route × 5 状態) が「適用」か「非適用 (理由記号あり)」のどちらかで埋まっていることを判定する。空欄・保留は不可とする。

### 6.3 対応表

| # | route | 空 | 1 件 | 大量 | 長文 | エラー |
|---|---|---|---|---|---|---|
| 1 | `/` | 非適用 (N1) | 非適用 (N1) | 非適用 (N1) | 非適用 (N1) | 適用 |
| 2 | `/[tenant_slug]/signin` | 非適用 (N2) | 適用 | 非適用 (N1) | 非適用 (N1) | 適用 |
| 3 | `/device` | 非適用 (N2) | 適用 | 非適用 (N1) | 非適用 (N1) | 適用 |
| 4 | `/legal` | 非適用 (N1) | 非適用 (N1) | 非適用 (N1) | 適用 | 非適用 (N3) |
| 5 | `/dashboard` | 適用 | 適用 | 適用 | 適用 | 適用 |
| 6 | `/catalog` | 適用 | 適用 | 適用 | 適用 | 適用 |
| 7 | `/catalog/[projectId]` | 非適用 (N4) | 適用 | 適用 | 適用 | 適用 |
| 8 | `/catalog/publish` | 非適用 (N2) | 適用 | 非適用 (N5) | 適用 | 適用 |
| 9 | `/catalog/releases` | 適用 | 適用 | 適用 | 適用 | 適用 |
| 10 | `/builds` | 適用 | 適用 | 適用 | 適用 | 適用 |
| 11 | `/docs` | 適用 | 適用 | 適用 | 適用 | 適用 |
| 12 | `/docs/new` | 非適用 (N2) | 適用 | 非適用 (N5) | 適用 | 適用 |
| 13 | `/docs/[id]` | 非適用 (N4) | 適用 | 非適用 (N6) | 適用 | 適用 |
| 14 | `/docs/[id]/edit` | 非適用 (N4) | 適用 | 非適用 (N6) | 適用 | 適用 |
| 15 | `/feedback` | 適用 | 適用 | 適用 | 適用 | 適用 |
| 16 | `/feedback/new` | 非適用 (N2) | 適用 | 非適用 (N5) | 適用 | 適用 |
| 17 | `/feedback/[id]` | 非適用 (N4) | 適用 | 適用 | 適用 | 適用 |
| 18 | `/metrics` | 適用 | 適用 | 適用 | 適用 | 適用 |
| 19 | `/metrics/usage` | 適用 | 適用 | 適用 | 適用 | 適用 |
| 20 | `/sheets` | 適用 | 適用 | 適用 | 適用 | 適用 |
| 21 | `/sheets/new` | 非適用 (N2) | 適用 | 非適用 (N5) | 適用 | 適用 |
| 22 | `/sheets/[id]` | 非適用 (N4) | 適用 | 適用 | 適用 | 適用 |
| 23 | `/users` | 非適用 (N7) | 適用 | 適用 | 適用 | 適用 |
| 24 | `/users/[id]` | 非適用 (N4) | 適用 | 適用 | 適用 | 適用 |
| 25 | `/settings/account` | 非適用 (N7) | 適用 | 非適用 (N5) | 適用 | 適用 |
| 26 | `/settings/notion` | 適用 | 適用 | 非適用 (N5) | 適用 | 適用 |
| 27 | `/settings/auth` | 適用 | 適用 | 非適用 (N5) | 適用 | 適用 |
| 28 | `/settings/coefficients` | 適用 | 適用 | 適用 | 適用 | 適用 |

集計: 適用 105 セル / 非適用 35 セル / 未記入 0 セル (合計 140 セル = 28 route × 5 状態)。

### 6.4 非適用の理由記号

| 記号 | 理由 |
|---|---|
| N1 | 静的コンテンツのみで、件数に依存する表示を持たない |
| N2 | 入力専用画面で、初期表示が常に未入力の 1 状態である |
| N3 | データ取得を伴わないため取得失敗・権限不足・未同期が発生しない |
| N4 | 詳細画面は対象 1 件の存在が前提で、不在は「エラー」状態に含める |
| N5 | 単一フォームで、繰り返し要素のページング境界を持たない |
| N6 | 単一ドキュメントの表示・編集で、一覧のページング境界を持たない |
| N7 | 認証済み利用者が必ず 1 件以上存在するため 0 件が成立しない |

## 7. ドメイン enum 一覧 (実測 40 カラム / 129 値)

`packages/db/schema/**/*.ts` を実測した結果である。A2 の機械検査は、以下の全 129 値が seed 後の DB に最低 1 件ずつ存在することを判定する。

### 7.1 build-pipeline

| テーブル.カラム | 値 (件数) |
|---|---|
| `buildStageEvents.from_stage` | hearing / requirements / design / build / test / review / publish (7) |
| `buildStageEvents.to_stage` | 同上 (7) |

### 7.2 builds

| テーブル.カラム | 値 (件数) |
|---|---|
| `builds.type` | hearing / improvement / review / bug (4) |
| `builds.stage` | hearing / requirements / design / build / test / review / publish (7) |

### 7.3 core/catalog

| テーブル.カラム | 値 (件数) |
|---|---|
| `projects.status` | active / suspended / archived (3) |
| `targetChannels.target` | skill / web_app (2) |
| `releases.status` | available / suspended / deprecated (3) |
| `packages.kind` | skills-package (1) |
| `deploymentReferences.provider` | cloudflare (1) |
| `catalogEntries.visibility` | private / workspace (2) |

### 7.4 core/identity

| テーブル.カラム | 値 (件数) |
|---|---|
| `tenants.status` | active / suspended (2) |
| `idpConnections.credential_mode` | customer_google / shared_google (2) |
| `idpConnections.credential_status` | pending / tested / active / disabled (4) |
| `idpConnections.pending_credential_mode` | customer_google / shared_google (2) |
| `users.role` | provider-admin / workspace-admin / member (3) |
| `users.status` | active / inactive (2) |

### 7.5 core/publish

| テーブル.カラム | 値 (件数) |
|---|---|
| `publishRequests.status` | draft / validating / needs_fix / ready / approval_pending / approved / publishing / failed / published (9) |
| `publishRequests.verdict` | green / yellow / red (3) |
| `deviceAuthorizations.status` | pending / approved / denied / consumed (4) |

### 7.6 core/security

| テーブル.カラム | 値 (件数) |
|---|---|
| `auditEvents.actor_type` | user / publisher_token / system (3) |
| `encryptionKeys.purpose` | salary / idp_secret / tenant_data (3) |
| `encryptionKeys.status` | active / retiring / retired (3) |

### 7.7 core/smoke

| テーブル.カラム | 値 (件数) |
|---|---|
| `smokeFixtureLeases.kind` | database / hearing / coverage / publish (4) |

### 7.8 docs-cms

| テーブル.カラム | 値 (件数) |
|---|---|
| `documents.scope` | common / tenant (2) |
| `documents.status` | draft / published (2) |
| `documents.thumbnail_source` | auto / manual (2) |
| `documents.excerpt_source` | auto / manual (2) |

### 7.9 feedback-loop

| テーブル.カラム | 値 (件数) |
|---|---|
| `feedbacks.type` | improvement / review / bug (3) |
| `feedbacks.priority` | high / medium / low (3) |
| `feedbacks.source` | harness / manual (2) |
| `feedbacks.status` | open / in_progress / resolved (3) |

### 7.10 hearing-intake

| テーブル.カラム | 値 (件数) |
|---|---|
| `hearingSheets.status` | received / generating / review / completed (4) |
| `aiJobs.kind` | sheet_generation / feedback_response / doc_draft (3) |
| `aiJobs.status` | queued / processing / completed / failed / dead (5) |
| `displayCodeCounters.kind` | HS / FR / DOC (3) |
| `hearingShareTokens.audience` | harness_creator / system_orchestrator (2) |

### 7.11 metrics-tracking

| テーブル.カラム | 値 (件数) |
|---|---|
| `metricsRollups.period` | daily / weekly (2) |
| `metricsRollups.dimension` | tenant / harness / department / user (4) |

### 7.12 notion-integration

| テーブル.カラム | 値 (件数) |
|---|---|
| `notionIntegrations.mode` | url / api_key (2) |

### 7.13 tenant-data

| テーブル.カラム | 値 (件数) |
|---|---|
| `tenantDataObjects.kind` | knowledge_doc / run_input / run_output / hearing_screenshot (4) |

### 7.14 上流仕様との差分 (記録)

正本 task spec (`phase-01-requirements.md`) の背景節は、enum の対象を `packages/db/schema/core/catalog.ts` と `packages/db/schema/core/publish.ts` の 9 カラムに限定して記述していた。本書作成時に全 schema を実測したところ、対象は 40 カラム / 129 値であった。goal-spec の受入条件 A2 は「各ドメインモデルの enum ステータスが全値」と定めており、特定 2 ファイルへの限定を含まない。したがって本書は実測 40 カラム / 129 値を正本とし、後続 phase もこの範囲を対象とする。

## 8. 長文パターンの規約

日本語の折返しを実際に発生させることを目的とし、以下を満たすレコードを各対象に含める。

| 対象 | 最小文字数 | 含める要素 |
|---|---|---|
| 一覧・詳細の見出し (プロジェクト名、ドキュメント題名、要望題名、シート題名) | 40 文字 | 中黒・全角括弧を含む複合語 |
| 説明文・本文の先頭段落 | 200 文字 | 句読点を含む連続した文 |
| タグ名・カテゴリ名 | 20 文字 | 単語区切りを持たない連続文字列 |
| 利用者名・部署名 | 25 文字 | 全角スペースを含む複合名 |

折返し位置の検証そのものは `feat-ui-layout-remediation` の担当であり、本 feature は「折返しが発生する長さのデータを供給する」ところまでを負う。

## 9. エラー状態の再現要件

エラー状態は、DB の内容だけで再現できるものと、実行時の制御が必要なものに分かれる。

| 種別 | 再現の位置 | 要件 |
|---|---|---|
| 取得失敗 | 実行時 | 対象 route の取得処理を失敗させる手段を持ち、その手段が seed 済みデータを破壊しない |
| 権限不足 | データ | member ロールの利用者で管理者専用 route へ到達したときの表示を再現できる利用者を seed に含める |
| 未同期 | データ | Notion 連携が未接続、およびビルドが未完了のレコードを seed に含める |

## 10. 冪等性と安全性の要件

| # | 要件 |
|---|---|
| I1 | 同じ入力で seed を連続 2 回実行したとき、投入後の全テーブル内容が一致する (A5) |
| I2 | 識別子・作成日時などの生成値は、実行のたびに変化しない決定論的な導出とする |
| I3 | seed が受け付ける DB URL は `file:` / `http://127.0.0.1` / `http://localhost` に限る。それ以外は終了コード 2 で拒否する (A6) |
| I4 | I3 のガードは既存の `packages/db/scripts/seed-local.ts` の判定を維持し、緩和しない |
| I5 | 本番・staging の DB を対象にしない (scope_out 1) |

## 11. 到達手順の文書化要件

seed 済み状態から、§6 で「適用」とした全 105 セルへ到達する手順を文書化する。各手順は次を含む。

1. 対象 route の URL。
2. サインインに使う利用者 (ロールを含む)。
3. その状態を成立させている seed 上のレコードの識別。
4. 実行時操作が必要な場合はその操作 (エラー状態など)。

## 12. 後続 phase への引き継ぎ

| 引き継ぐもの | 引き継ぎ先の観点 |
|---|---|
| §5 の 28 route | fixture の設計単位 |
| §6 の 140 セル対応表 | 到達手順の作成対象と A7 の検査入力 |
| §7 の 129 enum 値 | fixture の網羅対象と A2 の検査入力 |
| §8 の長文規約 | 長文レコードの生成規則と A4 の検査入力 |
| §9 のエラー再現要件 | 実行時制御の設計 |
| §10 の冪等性・安全性要件 | seed 実装の制約と A5/A6 の検査入力 |

## 13. 実測の再現手順

本書の数値は次のコマンドで再現できる。

```bash
# 対象 route 数 (28 件)
find apps/hub/src/app -name 'page.tsx' | wc -l

# 画面台帳の現行画面行 (28 件)
grep -c '| current |' docs/screen-inventory.md

# enum 定義の所在
grep -rn "enum\|STATUSES\|STAGES\|TYPES" packages/db/schema --include='*.ts'

# 本 feature の計画検証
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-demo-coverage-dataset
```
