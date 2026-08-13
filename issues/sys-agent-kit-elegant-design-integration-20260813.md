---
graph_node_id: "issue-agent-kit-elegant-design-integration-20260813"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform-ui"
tags: ["elegant-review","agent-kit","design-system","ui-ux"]
priority: "high"
start_date: "2026-08-13"
target_date: null
iteration: null
title: "最新エージェントキットとデザインシステム改善を全配布面へ整合する"
owners: ["daishiman"]
created_at: "2026-08-13T07:20:00Z"
updated_at: "2026-08-13T07:21:30Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/harness-creator/skills/run-elegant-review/","plugins/harness-creator/agents/elegant-*.md",".claude/",".codex/",".agents/","packages/ui/","apps/hub/","architecture/","docs/",".github/workflows/ci.yml"]
purpose: "共有された最新キットと Harness Studio の設計思想を、既存成果物を消さずに HarnessHub の正本・配布面・実装・文書・CIへ整合する。"
goal: "30思考法を全適用して4条件をPASSさせ、検証済み変更をPR経由でmainへ統合する。"
scope_in: ["思考リセットと30思考法レビュー","エージェントキット正本と配布面の整合","Graphite × Amber UI/UXの実装・仕様・テスト・CI整合","PR作成・リモート統合・ローカルmain同期"]
scope_out: ["成果物の物理削除","本番Cloudflare公開","公開API・DB・認可の意味変更","無関係な別課題の変更"]
acceptance: ["Phase1思考リセットを経由する","30思考法全件のcoverageを機械検証する","キット正本とClaude/Codex/Agents配布面を整合する","デザインシステムを実装・仕様・テスト・CIで一致させる","4条件をすべてPASSする","PRをsquash統合しローカルmainを最新化する"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-agent-kit-elegant-design-integration-20260813.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-13T07:20:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "既存Webアプリとエージェントキットを横断する単一の整合改善課題。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-agent-kit-elegant-design-integration-20260813.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-y67o","linked_at":"2026-08-13T07:21:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-13T07:20:00Z","missing_sections":[],"status":"complete"}
---

# 概要

共有された最新エージェントキットの思考リセット・30思考法・5エージェント・4条件ゲートを HarnessHub の正本へ整合し、既に進行した Graphite × Amber 対応と現在の未確定 UI 改善を一つの検証可能な変更へ収束させる。

## 背景と問題

PR #721 では配色仕様の一部が main へ統合済みだが、現在の作業ツリーには共通部品、画面、設計書、テスト、CI まで広げた未確定差分が残る。また、リポジトリ内の `run-elegant-review` は共有キットと概ね一致する一方、Claude・Codex・Agents の配布面と実行時契約が同じ正本を参照しているかを再確認する必要がある。

## 改善前の挙動

統合済み PR と未確定差分が別状態で存在し、キット正本・配布面・UI 実装・仕様書・CI の全体が同じ判断を表すことを一つのレビューで証明できていない。

## 改善後の挙動

思考リセット後に30思考法を3レーンで独立適用し、発見事項だけを最小変更として反映する。共有仕様と異なる値は HarnessHub 固有の既存契約に基づく理由を正本へ記録し、4条件を機械検証する。完成後は PR を作成し、全ゲート成功を確認してリモート統合し、ローカル main を最新化する。

## スコープ

- In: `run-elegant-review` と5エージェント、Claude/Codex/Agents 配布面、現在の UI・設計システム・画面・文書・テスト・CI 差分、関連アーキテクチャ、PR/merge/main 同期
- Out: 成果物の物理削除、公開API・DB・認可の意味変更、本番Cloudflare公開、別課題の無関係差分

## 受入条件

1. Phase 1 の思考リセットを経由し、成果物を削除していない。
2. 30思考法すべてを3つの独立レーンで適用し、coverage を機械検証する。
3. 共有キットの正本と Claude/Codex/Agents 配布面の関係が明文化・検証される。
4. Graphite × Amber、Light/Dark、レスポンシブ、テーマ、アクセシビリティ、コンポーネント契約が実装・仕様・テスト・CIで一致する。
5. 共有仕様からの意図的な差異は HarnessHub 固有契約の根拠を記録する。
6. 矛盾なし・漏れなし・整合性あり・依存関係整合の4条件がすべてPASSする。
7. 品質ゲート成功後にPRを作成・squash統合し、ローカルmainを最新化する。

## 検証方針

`run-elegant-review` の phase schema・coverage validator、UI focused/full tests、型検査、lint、build、デザインシステムの静的ゲート、PR CI を実測し、自己申告だけでPASSにしない。
