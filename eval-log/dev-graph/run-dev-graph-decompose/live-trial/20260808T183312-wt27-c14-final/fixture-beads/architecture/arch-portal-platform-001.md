---
graph_node_id: "arch-portal-platform-001"
artifact_kind: "architecture"
artifact_subtypes: ["frontend","backend","security"]
project_id: "internal-business-portal"
domain: "internal-portal"
tags: ["portal","authentication","web-application","session"]
priority: null
start_date: null
target_date: null
iteration: null
title: "業務ポータル アプリケーション基盤"
owners: []
created_at: "2026-08-08T18:33:12Z"
updated_at: "2026-08-08T18:33:12Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["src/portal/web","src/portal/api","src/portal/auth"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/arch-portal-platform-001.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T18:33:12Z","origin_kind":"generated","source_digest":"aae36bba439a0ba94b4761689cbdd4651b39cbb65900c2331091fd6c199e139a","source_path":"docs/want.md","source_plugin":"run-dev-graph-decompose","source_version":"0.1.0"}
classification_confidence: 1.0
classification_reason: "ログイン・画面配信・API を共有する業務ポータル本体の基盤アーキテクチャ"
classification_candidates: []
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":null,"missing_sections":[],"status":"incomplete"}
---

# Architecture overview

業務ポータル アプリケーション基盤。ログイン・画面配信・API を共有する業務ポータル本体の基盤アーキテクチャ。

## Context and drivers

- Business/technical context: 社内利用者が自分のアカウントで業務ポータルへログインし、画面と API を同一の認証境界の内側で使う。
- Quality attribute priorities: 機密性と可用性を最優先し、社内ネットワーク内の応答時間 1 秒以内を目標にする。
- Constraints: 既存の社内アカウント基盤を単一の認証元とし、外部 IdP を追加しない。

## Goals and non-goals

- Goals: ログイン、画面配信、業務 API を 1 つの信頼境界に収め、認可判定を単一箇所へ集約する。
- Non-goals: 社外公開、匿名アクセス、モバイルネイティブアプリの提供は扱わない。

## System context and boundaries

- Users/external systems: 社内利用者、管理者、社内アカウント基盤、業務データストア。
- Trust/deployment/data boundaries: ブラウザとポータル間は TLS、ポータルとデータ層は社内ネットワーク内の閉域接続とする。
- Context diagram: 本ノードの Container and component view の表を正本とし、図は別途保持しない。

## Container and component view

| Container/Component | Responsibility | Interface | Data owner | Deployment unit |
|---|---|---|---|---|
| ポータル Web | 画面配信とセッション保持 | HTTPS | セッションストア | ポータルアプリ |
| ポータル API | 業務データの読み書き入口 | 内部 HTTP API | 業務データストア | ポータルアプリ |
| 認証コンポーネント | 資格情報検証と認可判定 | 社内アカウント基盤連携 | 認証セッション | ポータルアプリ |

## Cross-cutting contracts

- Identity/access: 認証セッションを唯一の利用者識別とし、管理者判定も同じセッション属性から導く。
- Errors/resilience: 失敗した操作は部分適用を残さず、再実行で同じ結果へ収束させる。
- Observability/audit: ログイン、通知送信、レポート閲覧を監査ログへ記録する。
- Configuration/secrets: 資格情報と接続情報は設定ストアから注入し、リポジトリへ保存しない。
- Compatibility/versioning: API は後方互換の追加のみを許し、破壊的変更は新経路を併設して移行する。

## Subtype architecture

- Frontend: ポータル画面のレンダリングとセッション連携を担う。
- Backend: 業務 API と認可判定を担う。
- Infrastructure: N/A: 本アーキテクチャノードの責務外であり Infrastructure 観点は他ノードが所有する
- Data: N/A: 本アーキテクチャノードの責務外であり Data 観点は他ノードが所有する
- Security: 認証セッションと権限境界の設計を担う。

## Architecture decisions

| ADR | Decision | Alternatives | Trade-on rationale | Consequences |
|---|---|---|---|---|
| ADR-1 | 社内アカウント基盤を単一の認証元にする | 独自ユーザーテーブル | 資格情報の二重管理を避ける | 基盤障害時はログイン不可になる |
| ADR-2 | 画面と API を同一信頼境界へ置く | 分離デプロイ | 認可判定を単一箇所へ集約できる | 単一デプロイ単位が肥大化する |

## Delivery, migration and rollback

- Build/deploy topology: 単一パイプラインでビルドし、社内環境へ順に配信する。
- Migration sequence: 認証、データモデル、通知、集計の順に投入する。
- Rollback trigger/procedure: 監査ログでエラー率上昇を検知した場合、直前の配信版へ切り戻す。

## Risks and verification

- Risk/assumption: 社内アカウント基盤の応答遅延がログイン全体を遅らせる想定を置いている。
- Architecture fitness test: 認可判定が単一コンポーネント経由であることを静的検査で確認する。
- Load/failure/security validation: 想定同時利用者数での負荷試験と、権限外アクセス試験の結果を証跡にする。
