---
graph_node_id: "arch-portal-data-notify-001"
artifact_kind: "architecture"
artifact_subtypes: ["data","infrastructure"]
project_id: "internal-business-portal"
domain: "internal-portal"
tags: ["portal","assignment","deadline","notification","reporting"]
priority: null
start_date: null
target_date: null
iteration: null
title: "業務ポータル データ・通知基盤"
owners: []
created_at: "2026-08-08T18:33:12Z"
updated_at: "2026-08-08T18:33:12Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["src/portal/data","src/portal/notification","infra/portal"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/arch-portal-data-notify-001.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T18:33:12Z","origin_kind":"generated","source_digest":"aae36bba439a0ba94b4761689cbdd4651b39cbb65900c2331091fd6c199e139a","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "作業・期限データの保持と期限接近通知・集計配信を担う共有基盤アーキテクチャ"
classification_candidates: []
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":null,"missing_sections":[],"status":"incomplete"}
---

# Architecture overview

業務ポータル データ・通知基盤。作業・期限データの保持と期限接近通知・集計配信を担う共有基盤アーキテクチャ。

## Context and drivers

- Business/technical context: 作業の割当と期限を単一のデータモデルで保持し、期限接近の検知と全社集計の両方へ同じ実体を供給する。
- Quality attribute priorities: データ整合性と再実行可能性を最優先し、通知の重複送信を許さない。
- Constraints: 集計と通知は同じ割当データを読み、別系統の写しを作らない。

## Goals and non-goals

- Goals: 割当・期限の正本を 1 つ持ち、通知ジョブと集計クエリの両方がそこから導出される状態にする。
- Non-goals: リアルタイムストリーミング配信と外部 BI ツールへの直接連携は扱わない。

## System context and boundaries

- Users/external systems: 業務ポータル本体、通知ジョブ実行基盤、社内メール配信基盤、管理者。
- Trust/deployment/data boundaries: 通知ジョブはポータルと同一データ層を読むが、書き込みは送信履歴テーブルだけに限定する。
- Context diagram: 本ノードの Container and component view の表を正本とし、図は別途保持しない。

## Container and component view

| Container/Component | Responsibility | Interface | Data owner | Deployment unit |
|---|---|---|---|---|
| 割当データストア | 作業と期限の正本保持 | SQL | 割当テーブル | データ層 |
| 通知ジョブ | 期限接近判定と通知生成 | 定期実行ジョブ | 送信履歴テーブル | ジョブ実行基盤 |
| 集計クエリ層 | 全社進捗の集計 | 読み取り専用 SQL | 参照のみ | データ層 |

## Cross-cutting contracts

- Identity/access: 認証セッションを唯一の利用者識別とし、管理者判定も同じセッション属性から導く。
- Errors/resilience: 失敗した操作は部分適用を残さず、再実行で同じ結果へ収束させる。
- Observability/audit: ログイン、通知送信、レポート閲覧を監査ログへ記録する。
- Configuration/secrets: 資格情報と接続情報は設定ストアから注入し、リポジトリへ保存しない。
- Compatibility/versioning: API は後方互換の追加のみを許し、破壊的変更は新経路を併設して移行する。

## Subtype architecture

- Frontend: N/A: 本アーキテクチャノードの責務外であり Frontend 観点は他ノードが所有する
- Backend: N/A: 本アーキテクチャノードの責務外であり Backend 観点は他ノードが所有する
- Infrastructure: ジョブ実行基盤と配信経路の構成を担う。
- Data: 割当・期限・送信履歴のデータモデルを担う。
- Security: N/A: 本アーキテクチャノードの責務外であり Security 観点は他ノードが所有する

## Architecture decisions

| ADR | Decision | Alternatives | Trade-on rationale | Consequences |
|---|---|---|---|---|
| ADR-1 | 割当と期限の正本を 1 つのデータモデルに置く | 通知用と集計用の写しを分ける | 集計とダッシュボードの数値乖離を防ぐ | 書き込み競合の設計が必要になる |
| ADR-2 | 通知の一意性を送信履歴テーブルで保証する | 送信側のべき等キーのみ | 重複送信を実データで検証できる | 履歴テーブルの保守が必要になる |

## Delivery, migration and rollback

- Build/deploy topology: 単一パイプラインでビルドし、社内環境へ順に配信する。
- Migration sequence: 認証、データモデル、通知、集計の順に投入する。
- Rollback trigger/procedure: 監査ログでエラー率上昇を検知した場合、直前の配信版へ切り戻す。

## Risks and verification

- Risk/assumption: 社内アカウント基盤の応答遅延がログイン全体を遅らせる想定を置いている。
- Architecture fitness test: 認可判定が単一コンポーネント経由であることを静的検査で確認する。
- Load/failure/security validation: 想定同時利用者数での負荷試験と、権限外アクセス試験の結果を証跡にする。
