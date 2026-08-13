---
status: confirmed
layer: feature-runbook
parent_feature: feat-build-pipeline-board
feature_package_id: feature-package/feat-build-pipeline-board
beads_id: HarnessHub-9am
recorded_at: 2026-08-13
---

# runbook: feat-build-pipeline-board (P12)

> SYS-BUILD-PIPELINE-BOARD-P12 の正本成果物。S13 運用手順・工程操作監査確認手順・PublishRequest 接続監視手順を記載する。

## 1. S13 運用手順 (Build Pipeline Board の日常運用)

- **画面**: `/builds` (`apps/hub/src/app/(dashboard)/builds/page.tsx`)。7 工程 (ヒアリング→要件定義→設計→構築→テスト→レビュー→公開) を `StageBoard` 共通部品で表示する。
- **一覧取得**: `GET /api/v1/builds` (`apps/hub/src/app/api/v1/builds/route.ts`) — workspace 内の Build を stage 別に取得。`builds.read` 権限 (member 以上) が必要。
- **詳細取得**: `GET /api/v1/builds/:id` (`apps/hub/src/app/api/v1/builds/[id]/route.ts`)。
- **工程遷移**: `POST /api/v1/builds/:id/stage` (`apps/hub/src/app/api/v1/builds/[id]/stage/route.ts`) — `builds.stage_change` 権限 (workspace-admin 以上) が必要。隣接工程への遷移のみ許可 (2つ以上先へのスキップは拒否)。`expected_stage` による CAS (compare-and-swap) で同時更新の競合を検出し 409 を返す。
- **公開工程**: `publish` への遷移は、接続済み `PublishRequest` が `published` 状態でない場合 409 で拒否される。運用者は先に PublishRequest 側 (I2/I3 の状態機械) を完了させてから工程遷移を行うこと。

ADR の目標契約にある手動復旧用 `POST /api/v1/builds` と metadata 更新用 `PATCH /api/v1/builds/:id` は未実装のため、現行運用では使用しない。

## 2. 工程操作監査確認手順

- **監査正本**: 工程遷移が成功すると、hash chain 付き `audit_events` に action=`build.stage_change` が 1 件追記される。改ざん検出と認可操作の監査はこちらを正本とする。
- **工程履歴**: 同じ成功遷移は `build_stage_events` にも追記される。こちらは詳細画面と分析に使う業務履歴であり、hash chain 付き監査台帳ではない。
- 監査台帳の確認クエリ例:
  ```sql
  SELECT tenant_id, workspace_id, actor_id, action, entity_type, entity_id,
         summary_json, seq, prev_hash, event_hash, created_at
  FROM audit_events
  WHERE tenant_id = :tenant_id
    AND workspace_id = :workspace_id
    AND action = 'build.stage_change'
    AND entity_type = 'build'
  ORDER BY seq DESC
  LIMIT 50;
  ```
- 業務工程履歴の確認クエリ例:
  ```sql
  SELECT tenant_id, workspace_id, build_id, from_stage, to_stage, actor_user_id, occurred_at
  FROM build_stage_events
  WHERE tenant_id = :tenant_id AND workspace_id = :workspace_id
  ORDER BY occurred_at DESC
  LIMIT 50;
  ```
- 拒否された遷移 (403/409/422) は `audit_events` と `build_stage_events` のどちらにも記録されない (test-design.md カテゴリ2 参照)。ただし、記録が無いことだけで却下を断定せず、HTTP 応答と両テーブルを突合する。
- 定期監査: `actor_user_id` が workspace-admin ロールを実際に保持しているかを、権限変更履歴と突合すること (ロール剥奪後に旧セッションで遷移が成功していないか)。

## 3. PublishRequest 接続監視手順

- Build の `publish_request_id` (nullable FK, `packages/db/schema/build-pipeline/schema.ts`) が既存 `PublishRequest` を参照する。二重の状態機械は持たない。
- 監視観点:
  1. `publish` stage の Build のうち `publish_request_id` が null のものが無いか定期確認 (あれば不整合、手動調査が必要)。
  2. `PublishRequest` が `published` 以外の状態で Build 側が `publish` stage に遷移していないか (本来 409 で防止されるが、念のため定期監査)。
  3. I2 (static validation/secret scan/policy 判定) と I3 (immutable Release + TargetChannel 別 stable pointer) のログと `build_stage_events` の `occurred_at` を突合し、公開完了までのリードタイムを追跡する。

## scope_in / acceptance 未割当チェック

feature context (`sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441`) の scope_in/acceptance に対し、上記 3 項目で全件を追跡した (未割当 0 件)。
