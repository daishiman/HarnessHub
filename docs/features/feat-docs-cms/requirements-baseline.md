---
status: confirmed
layer: feature-design
task: SYS-DOCS-CMS-P01
parent_feature: feat-docs-cms
feature_package_id: feature-package/feat-docs-cms
source: .dev-graph/plans/feature-package-feat-docs-cms/goal-spec.json
feature_context_digest: sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend]
---

# feat-docs-cms 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

## 1. 目的 (purpose)

利用ガイド・FAQ 等のドキュメントを common (全テナント) / tenant (テナント限定) スコープで管理し (B7/I13)、S15 の閲覧/編集 UI と D5 pull 型 AI キューによる下書き生成を提供する

## 2. ゴール (goal)

ドキュメントがスコープ規則 (tenant 分離 + common 共有) 下で閲覧・編集でき、Markdown が sanitize 済みで描画され (SEC7)、AI 下書きがキュー経由で生成される状態

## 3. スコープ

### 3.1 scope_in

1. Doc エンティティ (scope=common/tenant・Markdown 本文)
2. S15 一覧/閲覧/編集 (編集は admin)
3. Markdown レンダラ + エディタ共通部品の消費 (XSS sanitize)
4. AI 下書き生成 (D5 キュー)
5. doc 編集の監査 event (SEC6)

### 3.2 scope_out

1. 外部公開サイト生成
2. バージョン管理 (Git 連携)

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. tenant スコープ doc が他テナントから参照できない (分離テスト)
2. Markdown 描画で XSS が sanitize される (テスト付き)
3. 編集操作が監査 event に記録される

## 5. 品質制約 (quality_constraints — goal-spec 8 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| tenant-scope-d4-doc-entity | Doc を含む全新規テーブルに tenant_id/workspace_id スコープ列を必須とする (row-level tenant scope)。Doc は scope=common (全テナント共有) / tenant (テナント限定) の値を持ち、tenant スコープ doc は他テナントから参照できないようアプリ層で強制する | system-spec/00-requirements-definition.md D4; system-spec/database.md qa-024 |
| markdown-sanitize-sec7-doc | doc 本文などの Markdown は共通レンダラの sanitize で一括担保し、XSS を防ぐ | system-spec/security.md qa-025 (SEC7) |
| markdown-common-component-qa021-qa022 | Markdown レンダラ + エディタ (XSS sanitize) は design system の共通部品として組込み、doc 機能はこれを消費するのみで独自実装を行わない。frontend 側は共通レンダラの sanitize 済み HTML のみを描画する | system-spec/ui-ux.md qa-021; system-spec/frontend.md qa-022 (5) |
| doc-edit-audit-sec6 | doc 編集操作は SEC6 で追加確定された監査対象 (工程操作・係数変更・doc 編集・フィードバック status 変更・ユーザー管理操作) に含まれ、監査 event に記録される | system-spec/security.md qa-025 (SEC6) |
| ai-queue-pull-type-d5-doc-draft | doc の AI 下書き生成 (I13) は D5 確定の pull 型キュー: ジョブ登録 → Claude Code セッションが pull → 結果書戻しで完結し、サーバ側 AI 課金は発生しない | system-spec/00-requirements-definition.md D5, I13; system-spec/backend.md qa-023 (B5, B7) |
| ai-queue-authz-payload-secret-ban | AiJob (AI キュー) の pull/書戻しの認可は Device Flow token 保有者に限定し、job payload に secret を含めない | system-spec/security.md qa-025 (SEC8) |
| doc-edit-admin-only-qa021-sec2 | S15 ドキュメントの一覧/閲覧/編集のうち編集操作は admin 限定とする。新規 API 群は認可単一ミドルウェア (deny-by-default) 配下で role×操作の許可表に従う | system-spec/ui-ux.md qa-021 (S15); system-spec/security.md qa-025 (SEC2) |
| b7-zod-single-source-authz-mw | ドキュメント CMS を含む新規 REST 資源群 (B1) は zod スキーマ単一ソースへ追加し、全て認可単一ミドルウェア (deny-by-default) 配下に置く。B7 でドキュメント CMS の common/tenant スコープが確定している | system-spec/backend.md qa-023 (B1, B7) |

## 6. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-docs-cms/goal-spec.json` (promoted。feature_context_digest = sha256:6e8ea8a7a1042002d0bb0b3ff2a2b3464ea4a45ba77ddea709580cc3bed03d34)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 8 件 (§5) が過不足なく転記されていること
