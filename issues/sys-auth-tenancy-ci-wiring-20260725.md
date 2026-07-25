---
graph_node_id: "issue-auth-tenancy-ci-wiring-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["follow-up","ci","auth-tenancy","qa-020","sec2"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "feat-auth-tenancy の認証・認可 CI 検査 3 件が CI 未結線 (手動実行でしか走らない)"
owners: ["daishiman"]
created_at: "2026-07-25T00:37:03Z"
updated_at: "2026-07-25T00:40:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-auth-tenancy"]
resource_scope: ["apps/hub/package.json","package.json","scripts/ci/"]
purpose: "feat-auth-tenancy が追加した 3 つの静的検査 (check-auth-adapter-boundary.mjs = Auth.js 境界隔離 / check-single-authz-middleware.mjs = 認可判定の単一集約 + route 例外の厳密一致 / check-dev-auth-provider-absence.mjs = dev 専用 provider の非存在) は、束ね役の check-auth-gates.mjs 経由で手動実行すれば緑になるが、CI からは 1 度も呼ばれていない。呼ばれない検査は存在しないのと同じで、Auth.js 型の境界外流出・authz 例外の増殖・dev バイパスの混入が無検出で通る。apps/hub/package.json と root の verify は本 feature の write scope 外のため P09/P10/P11/P13 で未達として記録済み。あわせて tests/auth-tenancy/tenant-isolation.test.ts (D4 の row-level-scope を守る 12 ケース) が hub テストスイート内で走るだけで CI 必須ゲートとして名指しされておらず、将来テストが分割・skip されたとき静かに外れうる"
goal: "認証・認可の 3 検査と分離テストが、人間の記憶ではなく CI の exit code で守られている状態"
scope_in: ["apps/hub/package.json へ検査スクリプト起動用の script を追加","root verify から当該 script を呼ぶ結線","分離テストの CI 必須ゲート指定"]
scope_out: ["検査スクリプト自体のロジック変更 (feat-auth-tenancy で確定済み)","next-auth の導入判断"]
acceptance: ["root の verify (または hub の同等スクリプト) から check-auth-gates.mjs が起動し、3 検査が exit code で判定される","検査を意図的に赤化させた状態で verify が fail することを 1 回実測する","tests/auth-tenancy/tenant-isolation.test.ts が CI 必須ゲートとして名指しで記録される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-auth-tenancy-ci-wiring-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T00:37:03Z","origin_kind":"manual","source_digest":null,"source_path":"docs/features/feat-auth-tenancy/quality-assurance-report.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "feat-auth-tenancy P09/P10/P11 が未達として記録した CI 結線を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-auth-tenancy-ci-wiring-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-1f28","linked_at":"2026-07-25T00:40:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T00:37:03Z","missing_sections":[],"status":"incomplete"}
---

# 概要

<問題または要望を一文で記載>

## 背景と問題

<誰が、どの状況で、何に困っているか>

## 現在の挙動

<観測事実。再現不能の場合はその旨と理由>

## 期待する挙動

<解決後に観測できる状態>

## 再現手順またはユースケース

1. <step>

## 影響と優先度

- 影響範囲: <users/data/system>
- 深刻度: <critical|high|medium|low>
- 緊急度: <理由>

## スコープ

- In: <対象>
- Out: <非対象>

## 関連グラフ

- 原因/親ノード: <graph_node_id>
- 関連仕様: <graph_node_id>
- 関連アーキテクチャ: <graph_node_id>
- 解決タスク: <graph_node_id>

## 受入条件

- [ ] <観測可能な結果>

## 検証証跡

- コマンド/テスト: <how-to-verify>
- 証跡 path: <path-or-url>
