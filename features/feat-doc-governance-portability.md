---
graph_node_id: "feat-doc-governance-portability"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["macro-feature","dev-pipeline","governance","qa-070"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "ドキュメント規約とポータビリティ検査 (300 行 fail-closed lint / 仕組み-ナレッジ境界検査 / 移植 opt-in 検査)"
owners: ["daishiman"]
created_at: "2026-07-22T01:25:08Z"
updated_at: "2026-07-22T02:47:44Z"
status: "active"
depends_on: []
related_nodes: ["issue-qa070-implementation-feature-20260722","feat-dev-pipeline-improvement"]
resource_scope: ["features/feat-doc-governance-portability.md"]
purpose: "qa-070 (appr-008 承認) で確定したドキュメント規約 2 件 — 仕組みとナレッジのオン・オフ分離・1 文書 300 行上限 — を機械的に強制する検査群を実装し、G1 (仕組みの持ち出しによる配布・運用効率)・G4 (fail-closed 品質ゲート)・G5 (ドキュメント管理の持続性) を支える"
goal: "3 検査 (300 行 lint・仕組み-ナレッジ境界検査・移植導線 opt-in 検査) が CI で fail-closed に動作し、既存超過 6 文書の allowlist は縮小のみ許す ratchet で管理され、再実行しても同じ結果 (冪等) になる状態"
scope_in: ["markdown 正本文書 (system-spec 章・architecture・features・tasks・docs) の 300 行上限 fail-closed CI lint (既存超過 6 文書は縮小のみ許す remediation allowlist ratchet 付き)","仕組み側ファイル (plugins/・.claude/skills/ 等) への repo 固有ナレッジ (固有 node id・固有 path・固有 qa 番号) hard-coded 参照の検査","extract-blueprint / install-bundle の『仕組みのみ既定 (オン)・ナレッジ同梱は明示 opt-in (オフ既定)』検査"]
scope_out: ["規約自体の変更 (qa-070 で確定済み)","既存超過 6 文書の分割実施 (issue-doc-granularity-remediation-20260722 / HarnessHub-3d8 側)","Hub プロダクト本体機能 (Web/API/DB) の変更","dev-graph への新 verb 追加"]
acceptance: ["300 行超過の新規違反が CI で fail-closed に遮断され、allowlist は既存 6 文書のみ・縮小のみ許す ratchet として検査される","仕組み側ファイルへの repo 固有ナレッジ hard-coded 参照を検出する検査が存在し、検出時に exit 非 0 で停止する","extract-blueprint / install-bundle がナレッジを既定で含めず、明示 opt-in なしの同梱を検査が遮断する","3 検査が CI ゲートへ組み込まれ、同一入力での再実行が差分 0 に収束する (冪等)"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-doc-governance-portability.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-doc-governance-portability/d33c318dbf7cf3f407daf50b396531f67b365d7d8743146223f46224a8958aee/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-22T01:25:08Z","origin_kind":"generated","source_digest":"0c48fb74e1f93e4e6fe6e4f31cf5e04c4b3839537fae063002a3ce2f3e10b2bf","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 qa-070 ドキュメント規約 2 件の実装 3 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-doc-governance-portability.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ik0","linked_at":"2026-07-22T02:47:44Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-22T09:35:00Z","missing_sections":[],"status":"complete"}
---

# ドキュメント規約とポータビリティ検査 (300 行 fail-closed lint / 仕組み-ナレッジ境界検査 / 移植 opt-in 検査)

> macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

qa-070 (appr-008 承認) で確定したドキュメント規約 2 件 — 仕組みとナレッジのオン・オフ分離・1 文書 300 行上限 — を機械的に強制する検査群を実装し、G1 (仕組みの持ち出しによる配布・運用効率)・G4 (fail-closed 品質ゲート)・G5 (ドキュメント管理の持続性) を支える

## 到達状態

3 検査 (300 行 lint・仕組み-ナレッジ境界検査・移植導線 opt-in 検査) が CI で fail-closed に動作し、既存超過 6 文書の allowlist は縮小のみ許す ratchet で管理され、再実行しても同じ結果 (冪等) になる状態

## スコープ

**対象 (in):**

- markdown 正本文書 (system-spec 章・architecture・features・tasks・docs) の 300 行上限 fail-closed CI lint (既存超過 6 文書は縮小のみ許す remediation allowlist ratchet 付き)
- 仕組み側ファイル (plugins/・.claude/skills/ 等) への repo 固有ナレッジ (固有 node id・固有 path・固有 qa 番号) hard-coded 参照の検査
- extract-blueprint / install-bundle の『仕組みのみ既定 (オン)・ナレッジ同梱は明示 opt-in (オフ既定)』検査

**対象外 (out):**

- 規約自体の変更 (qa-070 で確定済み)
- 既存超過 6 文書の分割実施 (issue-doc-granularity-remediation-20260722 / HarnessHub-3d8 側)
- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加

## 受入

- 300 行超過の新規違反が CI で fail-closed に遮断され、allowlist は既存 6 文書のみ・縮小のみ許す ratchet として検査される
- 仕組み側ファイルへの repo 固有ナレッジ hard-coded 参照を検出する検査が存在し、検出時に exit 非 0 で停止する
- extract-blueprint / install-bundle がナレッジを既定で含めず、明示 opt-in なしの同梱を検査が遮断する
- 3 検査が CI ゲートへ組み込まれ、同一入力での再実行が差分 0 に収束する (冪等)

## アーキテクチャ参照

- [arch-harness-hub-dev-workflow](../architecture/harness-hub-dev-workflow.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md) / qa-070 (system-spec/dev-workflow.md, appr-008)

## 機能間依存

- なし (feat-dev-pipeline-improvement と独立。同系統の開発基盤検査だが実装対象が重ならない)

## Handoff

- 次工程: `/dev-graph plan --feature-id feat-doc-governance-portability --feature-context features/feat-doc-governance-portability.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる
