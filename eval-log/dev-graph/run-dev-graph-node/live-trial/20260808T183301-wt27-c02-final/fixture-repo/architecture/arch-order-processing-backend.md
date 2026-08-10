---
graph_node_id: "arch-order-processing-backend"
artifact_kind: "architecture"
artifact_subtypes: ["backend","security"]
project_id: "c02final"
domain: "product-platform"
tags: ["architecture","backend","security","infrastructure"]
priority: null
start_date: null
target_date: null
iteration: null
title: "注文処理バックエンドのアーキテクチャとセキュリティ層"
owners: ["dev-graph-harness"]
created_at: "2026-08-08T09:37:12Z"
updated_at: "2026-08-08T09:37:12Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["architecture/arch-order-processing-backend.md"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/arch-order-processing-backend.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T09:37:12Z","origin_kind":"manual","source_digest":"73cf6d5c9cdfb6d7552719d91f259345c301d85914b658b35287c0eeea4cfc39","source_path":"mixed-artifacts.json","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "系全体の構成・境界・subtype (backend/security) を定義するため architecture へ写像した"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/arch-order-processing-backend.md","confidence":0.98},{"artifact_kind":"specification","candidate_path":"specs/arch-order-processing-backend.md","confidence":0.17}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:37:12Z","missing_sections":[],"status":"complete"}
---

## Architecture overview

注文処理パイプラインのバックエンド構成と、それに組み込むセキュリティ制御を定義する。

## Context and drivers

決済と在庫を跨ぐ更新を単一障害で不整合にしないこと、
および個人情報の保護要件を満たすことが主要な制約である。

- Quality attribute priorities: 整合性 > 機密性 > 応答時間
- Constraints: 外部決済事業者の可用性に依存し、在庫は同時更新が集中する

## Goals and non-goals

- Goals: 決済と在庫の跨ぎ更新を補償可能にする、個人情報を保存時暗号化する、監査証跡を改竄検知可能にする
- Non-goals: フロントエンド構成、データ分析基盤、外部決済事業者の内部設計

## System context and boundaries

1. クライアント から API gateway (TLS 終端)
2. API gateway から 認証サービス (トークン検証)
3. 認証サービス から 注文サービス (認可済みリクエスト)
4. 注文サービス から 決済・在庫 (saga による調停)
5. 全更新を監査ログへ非同期送出

## Container and component view

- 注文サービス: 注文ライフサイクル (作成・更新・取消) を保持する
- 決済アダプタ: 外部決済事業者との境界を 1 か所へ閉じる
- 在庫サービス: 楽観ロックで在庫を更新する
- 通知サービス: イベント駆動で通知を送出する

| Container/Component | Responsibility | Interface | Data owner | Deployment unit |
|---|---|---|---|---|
| API gateway | TLS 終端と入口での流量制御 | HTTPS | 保持しない | edge |
| 認証サービス | トークン検証と主体解決 | 内部 HTTP | 認証情報 | auth |
| 注文サービス | 注文集約の調停 | 内部 HTTP と非同期メッセージ | 注文データ | order |
| 決済アダプタ | 外部決済事業者との境界 | 外部 HTTPS | 決済参照 | order |
| 在庫サービス | 在庫の楽観更新 | 非同期メッセージ | 在庫データ | inventory |
| 通知サービス | イベント駆動の通知送出 | 非同期メッセージ | 通知履歴 | notify |

## Cross-cutting contracts

- Identity/access: 主体はトークンから解決し、サービス間でも主体情報を伝播する
- Errors/resilience: 補償可能な失敗は saga で巻き戻し、外部依存の失敗は再試行と打ち切りを併用する
- Observability/audit: 全更新を追記専用の監査ログへ非同期送出する
- Configuration/secrets: 秘密情報は実行環境の秘密ストアから注入し、リポジトリへ保持しない
- Compatibility/versioning: 公開契約の破壊的変更は API バージョンで表現し、併存期間を設ける

## Subtype architecture

合成対象は backend と security の 2 subtype で、それぞれ下位節に実体を持つ。

- Frontend: N/A: 本 architecture はサーバ側の構成と制御だけを対象とする
- Backend: 下記 Backend 節に記載する
- Infrastructure: N/A: 実行基盤の調達構成は本書の対象外で、別途 infrastructure 文書で扱う
- Data: N/A: 永続化方式は Backend 節に含め、独立したデータ基盤設計は持たない
- Security: 下記 Security 節に記載する

### Backend

サービス間は非同期メッセージで疎結合にし、注文集約のみが在庫と決済を調停する。
永続化は関係データベース、冪等性キーで再送を吸収する。

- Runtime/framework: サーバサイド実行環境上の HTTP サービス群
- Pattern: 注文集約を調停者とする saga、非同期メッセージによる疎結合
- Domain and module boundaries: 注文・決済・在庫・通知を別モジュール境界とし、集約を跨ぐ直接参照を禁じる
- API and service contracts: 同期は内部 HTTP、非同期はイベントメッセージで表現する
- Data and transaction behavior: 単一集約内はデータベーストランザクション、集約跨ぎは補償トランザクション
- Async processing: 在庫確保・決済確定・通知を非同期段として分離する
- Security and resilience: 冪等性キーで再送を吸収し、外部依存の失敗を補償で巻き戻す
- Operations and verification: saga の各段で相関 ID を伝播し、未完了 saga を検出できるようにする

### Security

- 認証: 公開鍵署名のトークンとリフレッシュトークンの回転
- 認可: 役割ベースのポリシー評価をゲートウェイ直後で行う
- データ保護: 保存時の個人情報を暗号化し、転送は TLS のみ許可する
- 監査: 追記専用の監査ログで改竄を検出する

- Threat model: 資格情報の再利用、他テナントデータへの越境参照、監査証跡の改竄を主要脅威とする
- Controls and verification: トークン失効の境界試験、認可の越境試験、監査ログの改竄検知試験で確認する

## Architecture decisions

| ADR | Decision | Alternatives | Trade-off rationale | Consequences |
|---|---|---|---|---|
| ADR-001 | 決済と在庫の跨ぎ更新を saga で調停する | 分散トランザクション | 外部依存を含む更新で可用性を保てる | 補償経路の実装と監視が必要になる |
| ADR-002 | 認可をゲートウェイ直後で評価する | 各サービスで個別評価 | 認可判定を 1 か所へ集約し漏れを減らす | ポリシー更新の影響範囲が広くなる |

## Delivery, migration and rollback

- Build/deploy topology: サービス単位で独立に配備し、注文サービスと在庫サービスは別配備単位とする
- Migration sequence: 監査ログ送出、認可の集約、saga 調停の順に段階導入する
- Rollback trigger/procedure: saga 未完了率が閾値を超えた場合、直前の同期経路へ切り戻す

## Risks and verification

- Risk/assumption: 補償処理が失敗すると注文と在庫が長時間不整合のまま残る
- Architecture fitness test: 決済失敗・在庫不足の注入試験で補償が完了することを確認する
- Load/failure/security validation: 同時注文負荷での在庫二重引当なし、認可越境なし、監査ログ欠落なしを検証する
