---
graph_node_id: "feat-stage0-distribution-gate"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["macro-feature","stage-0","platform"]
priority: "high"
start_date: null
target_date: null
iteration: "Stage 0"
title: "Stage 0: 配布経路 technical gate (H7) 検証"
owners: ["daishiman"]
created_at: "2026-07-17T00:38:30Z"
updated_at: "2026-07-30T02:30:23.206423Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["features/feat-stage0-distribution-gate.md"]
purpose: "Stage 1 へ投資する前に、Skill 配布の成立経路 (URL 型 marketplace / npm source / Bootstrap Installer) と Windows 実機 E2E を検証し、成立経路を確定する (仮説 H7)"
goal: "最小 artifact で 2 経路以上の配布検証が完了し、採用経路が根拠付きで記録された状態"
scope_in: ["URL 型 marketplace 検証","npm source 検証 (公式サポート確認済み)","Bootstrap Installer 試作","Windows/macOS 実機 E2E","採用経路の決定記録"]
scope_out: ["Hub 本体の実装","課金・商用配布"]
acceptance: ["2 経路以上の実機検証記録が存在する","採用経路が decision record として登録される","Windows E2E が成功する"]
architecture_refs: ["arch-harness-hub-infrastructure"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-stage0-distribution-gate.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-stage0-distribution-gate/30b40c7f947918bd751c6a32832ea781ff6b7d8d7449d2a975c93bfc6134d00b/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-30T02:30:02Z","origin_kind":"generated","source_digest":"606ff30758d33576aa527ffae0d9228aeed47e4e8aeff8c6964938e7738a6f69","source_path":"specs/harness-hub-system-specification.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "C14 マクロ分解 (確定 system-spec の Stage 0-2 スコープから導出)"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-stage0-distribution-gate.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-j71","linked_at":"2026-07-18T16:05:13Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-21T03:20:08Z","evidence_refs":["docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md","docs/features/feat-stage0-distribution-gate/acceptance-record.md"],"policy":"manual","reconciled_at":"2026-07-30T02:24:47Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# Stage 0: 配布経路 technical gate (H7) 検証

> Stage 0 / macro feature (C14)。1 feature = 13 task への細分解は system-dev-planner (`/dev-graph plan`) が行う。

## 目的

Stage 1 へ投資する前に、Skill 配布の成立経路 (URL 型 marketplace / npm source / Bootstrap Installer) と Windows 実機 E2E を検証し、成立経路を確定する (仮説 H7)

## 到達状態

最小 artifact で 2 経路以上の配布検証が完了し、採用経路が根拠付きで記録された状態

## スコープ

**対象 (in):**

- URL 型 marketplace 検証
- npm source 検証 (公式サポート確認済み)
- Bootstrap Installer 試作
- Windows/macOS 実機 E2E
- 採用経路の決定記録

**対象外 (out):**

- Hub 本体の実装
- 課金・商用配布

## 受入

- 2 経路以上の実機検証記録が存在する
- 採用経路が decision record として登録される
- Windows E2E が成功する

## アーキテクチャ参照

- [arch-harness-hub-infrastructure](../architecture/harness-hub-infrastructure.md)

- 要件正本: [spec-harness-hub-requirements](../specs/harness-hub-system-specification.md)

## 機能間依存

- なし

## Handoff

- 次工程: `/dev-graph plan --feature-id <本 feature id> --feature-context features/<id>.context.json` (exact-13 task 仕様化)
- 昇格条件: confirmation_status=confirmed + evaluation_status=pass + implementation_readiness=complete で起票対象になる

## 2026-07-30 post-close trigger

`HarnessHub-e2u` の公式出典再照合で、旧 H7 実施後に `git-subdir` source が
正式契約として確認された。履歴上の Stage 0 判定は改変せず、後続
`HarnessHub-n2c0` が macOS / Windows の install、Skills 列挙、実 skill 起動を
fail-closed で再検証する。全証跡が揃うまで本 feature を成立扱いに戻さず、
Stage 1 の開始条件も解除しない。

- 設計・試験差分:
  [requirements-baseline.md](../docs/features/feat-stage0-distribution-gate/requirements-baseline.md) /
  [test-design.md](../docs/features/feat-stage0-distribution-gate/test-design.md)
- 仕様反映受領書:
  [source-freshness-spec-reflection-receipt.md](../docs/features/feat-stage0-distribution-gate/source-freshness-spec-reflection-receipt.md)
