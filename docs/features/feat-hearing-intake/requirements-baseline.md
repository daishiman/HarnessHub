---
status: confirmed
layer: feature-design
task: SYS-HEARING-INTAKE-P01
parent_feature: feat-hearing-intake
feature_package_id: feature-package/feat-hearing-intake
source: .dev-graph/plans/feature-package-feat-hearing-intake/goal-spec.json
feature_context_digest: sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data]
---

# feat-hearing-intake 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

業務課題から業務ツールが生まれる入口として、S10 の 4 ステップウィザード (削減試算付き)・受付番号採番・D5 pull 型 AI キューによるヒアリングシート生成・S11/S12 のシート管理を提供する (I11, J4)

## 2. ゴール (goal)

非エンジニアがウィザードで課題を登録すると受付番号が発番され、AI キュー (D5) 経由で生成されたシートが S11/S12 に反映され status 管理 (admin) できる状態

## 3. スコープ

### 3.1 scope_in

1. S10 ヒアリングウィザード (4 ステップ・自動試算表示)
2. HearingSheet/FormData エンティティ + 受付番号採番
3. AI 処理キュー (D5 pull 型) のジョブ投入・生成結果の書戻し受領
4. S11 シート一覧 / S12 シート詳細 (status 変更は admin)
5. ステップウィザード共通部品の消費

### 3.2 scope_out

1. AI 実行基盤のサーバ側実装 (D5 で不採用)
2. 構築工程の進行管理 (feat-build-pipeline-board)

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. ウィザード完了で受付番号が発番され「生成中」状態が表示される (非同期 UI パターン)
2. AI キューのジョブが pull→書戻しで完結しサーバ側 AI 課金が発生しない
3. シート本文の Markdown が sanitize 済みで描画される (SEC7)

## 5. 品質制約 (quality_constraints — goal-spec 10 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| async-ui-pattern-hearing-wizard | ウィザード完了後の AI 生成待ちは「受付番号 + 生成中ステータス + 完了通知」の非同期 UI パターンで吸収する。処理遅延は数分〜セッション次第であることを前提に UI を設計する | system-spec/ui-ux.md qa-021; system-spec/00-requirements-definition.md D5 |
| ai-queue-pull-type-d5 | ヒアリングシート生成の AI 処理キューは D5 確定の pull 型: ジョブ登録 → Claude Code セッションが pull → 結果書戻しで完結し、サーバ側 AI 課金は発生しない | system-spec/00-requirements-definition.md D5; system-spec/backend.md qa-023 (B5) |
| ai-queue-authz-payload-secret-ban | AiJob (AI キュー) の pull/書戻しの認可は Device Flow token 保有者に限定し、job payload に secret を含めない | system-spec/security.md qa-025 (SEC8) |
| markdown-sanitize-sec7 | ヒアリングシート本文などの Markdown は共通レンダラの sanitize で一括担保し、XSS を防ぐ | system-spec/security.md qa-025 (SEC7) |
| tenant-scope-d4-new-entities | HearingSheet/FormData/AiJob を含む全新規テーブルに tenant_id/workspace_id スコープ列を必須とする (row-level tenant scope) | system-spec/00-requirements-definition.md D4; system-spec/database.md qa-024 |
| hearing-sheet-entities-and-receipt-number | HearingSheet (受付番号・status・生成物参照)・FormData (ウィザード入力)・AiJob (D5 pull 型キュー: kind/status/payload/result) は qa-024 で確定したエンティティ。受付番号の採番はこのエンティティ設計に属する | system-spec/database.md qa-024 |
| wizard-common-component-qa022 | ヒアリング 4 ステップウィザードの進捗表示・戻る/次へ・キーボード操作は共通部品 (packages/ui のステップウィザード) で担保し、独自実装しない | system-spec/frontend.md qa-022 |
| estimate-server-computed-only | 削減効果の自動試算表示 (時給換算・削減額) はサーバ計算値の表示専用とし、クライアント側での金額再計算・自己申告を行わない | system-spec/frontend.md qa-022; system-spec/security.md qa-025 (SEC5) |
| b1-zod-single-source-authz-mw | ヒアリング/シート関連の新規 REST 資源は zod スキーマ単一ソースへ追加し、全て認可単一ミドルウェア (deny-by-default) 配下に置く | system-spec/backend.md qa-023 (B1) |
| authz-single-mw-role-table | 新規 API 群は認可単一ミドルウェア (deny-by-default) 配下で role×操作の許可表に従う。S11/S12 の status 変更を admin 限定とする feature 側の要件は、この許可表の枠組みで実装する | system-spec/security.md qa-025 (SEC2) |

## 6. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-hearing-intake/goal-spec.json` (promoted。feature_context_digest = sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 10 件 (§5) が過不足なく転記されていること
