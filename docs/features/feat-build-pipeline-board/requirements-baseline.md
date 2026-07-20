---
status: confirmed
layer: feature-design
task: SYS-BUILD-PIPELINE-BOARD-P01
parent_feature: feat-build-pipeline-board
feature_package_id: feature-package/feat-build-pipeline-board
source: .dev-graph/plans/feature-package-feat-build-pipeline-board/goal-spec.json
feature_context_digest: sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441
architecture_refs: [arch-harness-hub-frontend, arch-harness-hub-backend]
---

# feat-build-pipeline-board 要件ベースライン

> **位置づけ**: P01 (要件ベースライン確定) の成果物。promoted goal-spec の purpose/goal/scope_in/scope_out/acceptance/quality_constraints を**確定転記**した baseline であり、P02 以降の全 task はこの文書を唯一の合意事項として参照する。転記元との相違が判明した場合は本文書を修正せず goal-spec 側の再確定を dev-graph へ差し戻す (rollback 規約)。

> **構築順オーバーレイ (baseline 外)**: **P2・最優先**。P1 の HearingSheet と P2 の PublishRequest 契約を受け、S12→S13→S01/S02 の参照が切れない状態にする。正本: [system-design-overview.md](../../system-design-overview.md) §3 / [README.md](../README.md)。

## 1. 目的 (purpose)

ヒアリング→要件定義→設計→構築→テスト→レビュー→公開の 7 工程を S13 のボードで進行管理し (工程操作は admin)、公開工程を既存 PublishRequest 状態機械 (B4/I2/I3) へ接続する

## 2. ゴール (goal)

各ハーネスの構築進捗が 7 工程ボードで可視化され、工程操作が admin 限定 + 監査記録付きで行え、公開工程が publish パイプラインと二重実装なしに連動する状態

## 3. スコープ

### 3.1 scope_in

1. Build エンティティ (7 stage・リスク表示)
2. S13 パイプラインボード (ステージボード共通部品の消費)
3. 工程操作の admin 権限 + 監査 event (SEC6)
4. 公開工程の PublishRequest 接続 (B4)

### 3.2 scope_out

1. publish 状態機械の再実装 (既存 I2/I3 を使う)
2. 工程の自動遷移 (手動運用から開始)

## 4. 受入基準 (acceptance — goal-spec 3 件の確定転記・転記原文)

1. 7 工程の遷移が admin のみ操作でき監査 event に記録される
2. 公開工程が PublishRequest の状態と整合する (二重状態を持たない)
3. ボードが axe 違反 0・CWV good で動作する

## 5. 品質制約 (quality_constraints — goal-spec 6 件の確定転記)

| id | summary (転記原文) | source |
|---|---|---|
| stage-transition-admin-audit-sec2-sec6-qa021 | 7 工程 (ヒアリング→要件定義→設計→構築→テスト→レビュー→公開) の遷移操作は S13 パイプラインボードで admin 限定とし (SEC2)、SEC6 で Studio 反映時に新規確定した監査対象 (工程操作・係数変更・doc 編集・フィードバック status 変更・ユーザー管理操作) の一つとして監査 event に記録する | system-spec/ui-ux.md qa-021 (S13: 構築パイプライン 7 工程ボード。工程操作は admin); system-spec/security.md qa-025 (SEC2 認可単一 MW の role×操作許可表・工程操作は admin 限定, SEC6 監査対象追加) |
| publish-stage-publishrequest-connect-no-dup-b4-i2-i3 | S13 パイプラインの公開工程は新規状態機械を作らず、既存 PublishRequest 状態機械 (I2 static validation/secret scan/policy 判定、I3 immutable Release + TargetChannel 別 stable pointer による atomic な公開/更新/rollback) へ接続する。Build の状態機械は hearing→…→publish の隣接遷移のみとし、publish 工程は PublishRequest 接続 (B4) として扱い二重実装しない | system-spec/00-requirements-definition.md I2, I3; system-spec/spec-state.json qa-023 (B4 publish 連携: S13 パイプラインの公開工程は既存 PublishRequest 状態機械 (I2/I3) へ接続し二重実装しない); system-spec/backend.md qa-033 (endpoint 一覧の builds、状態機械 §5 の Build 定義) |
| build-entity-tenant-scope-d4-qa024 | Build エンティティ (7 stage・リスク表示) は Studio 拡張の新規テーブルであり、D4 (row-level tenant scope: 単一 DB + tenant_id/workspace_id スコープ列 + アプリ層強制) に従い tenant_id/workspace_id スコープ列を必須とする | system-spec/00-requirements-definition.md D4 (マルチテナント論理分離、row-level-scope 確定); system-spec/spec-state.json qa-024 (Build エンティティを含む Studio 拡張エンティティの新規追加・全新規テーブルへの tenant_id/workspace_id スコープ列必須); system-spec/database.md qa-032 (テーブル構成の前倒し詳細確定でエンティティ構成を再確認、D4 row-level scope を維持) |
| stage-board-shared-component-qa021-qa022 | S13 の 7 工程ボードは design system の共通部品 (ステージボード) を消費するのみとし、独自実装を行わない | system-spec/ui-ux.md qa-021 (共通部品の拡張: ステージボードを design system に組込む); system-spec/frontend.md qa-022 (共通 design system で再実装しチャート等と同様に共通部品化する方針) |
| rest-zod-single-source-authz-mw-b1-qa023 | builds を含む新規 REST 資源群 (B1) は zod スキーマ単一ソースへ追加し、全て認可単一ミドルウェア (deny-by-default) 配下の role×操作許可表に従う | system-spec/spec-state.json qa-023 (B1 新規 REST 資源群をヒアリング/シート/パイプライン/フィードバック/ドキュメント/ユーザー管理を含めて zod スキーマ単一ソースへ追加し全て認可 MW 配下); system-spec/backend.md qa-033 (endpoint 一覧 §4.1-§4.12、認可単一ミドルウェア deny-by-default の role×リソースマトリクス §3.3); system-spec/security.md qa-025 (SEC2) |
| approval-queue-authz-table-shared-b9-qa023 | 工程操作の admin 権限判定は Yellow review (I8) の承認 queue と共通の認可表で扱う (B9 承認 queue 統合)。工程操作専用の別認可ロジックを新設しない | system-spec/spec-state.json qa-023 (B9 承認 queue 統合: Yellow review (I8) と工程操作の admin 権限判定を共通の認可表で扱う) |

## 6. 転記元と検証

- 転記元: `.dev-graph/plans/feature-package-feat-build-pipeline-board/goal-spec.json` (promoted。feature_context_digest = sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441)
- 本文書の受入条件 (P01 acceptance): goal-spec の acceptance 3 件 (§4) と quality_constraints 6 件 (§5) が過不足なく転記されていること
