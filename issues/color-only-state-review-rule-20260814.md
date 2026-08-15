---
graph_node_id: "issue-color-only-state-review-rule-20260814"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "ui-ux"
tags: ["design-system","accessibility","review","follow-up"]
priority: "medium"
start_date: "2026-08-14"
target_date: null
iteration: null
title: "新規部品の色単独表現をレビュー観点として design-system.md へ明文化する"
owners: ["daishiman"]
created_at: "2026-08-14T11:30:00Z"
updated_at: "2026-08-14T12:56:03.905958Z"
status: "active"
depends_on: []
related_nodes: ["feat-semantic-emphasis-icons"]
resource_scope: ["architecture/harness-hub-design-system.md"]
purpose: "色だけに意味を担わせる新規部品の混入を、自動検出できない領域としてレビュー観点で受け止める"
goal: "部品追加時に色以外の識別手段の有無を確認する観点が architecture/harness-hub-design-system.md に明記された状態にする"
scope_in: ["architecture/harness-hub-design-system.md へのレビュー観点の追記"]
scope_out: ["axe ルールの追加 (自動検出は不可能)","既存部品の意匠変更"]
acceptance: ["部品追加時に色以外の識別手段 (テキスト・記号・アイコン形状) の併置を確認する観点が明文化されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/color-only-state-review-rule-20260814.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b10daedf4d24a112c73943e2cecac213a193042aaa0e6e43518a2314a64cfbdf","evaluator":"feat-semantic-emphasis-icons P09/P10 の品質ゲート確認で検出","evidence_ref":"docs/features/feat-semantic-emphasis-icons/quality-gate-report.md"}
source_lineage: {"imported_at":"2026-08-14T11:30:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "色だけに意味を担わせていないことは axe が検出できる違反ではなく、新規部品の色単独表現は自動検出できない"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/color-only-state-review-rule-20260814.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-eag1","linked_at":"2026-08-14T12:30:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-14T11:30:00Z","missing_sections":[],"status":"complete"}
---

# 新規部品の色単独表現をレビュー観点として design-system.md へ明文化する

## 背景

**「色だけに意味を担わせていないこと」は axe が検出できる違反ではない。**

`feat-semantic-emphasis-icons` の P02 で 7 部品 (Badge / Alert / Chip / Toast / StageBoard /
KpiCard / callout) を監査し、全てが色以外の識別手段 (テキスト・記号・アイコン形状) を持つことを
確認した。G9 の axe (30 + 5 件) も pass している。

しかし axe が見ているのは DOM の構造とコントラストであって、「この状態は色でしか区別されていない」
という意味論ではない。新規部品が色単独表現を持ち込む退行は、現状どのゲートにも掛からない。

## やること

`architecture/harness-hub-design-system.md` へ、部品追加時のレビュー観点として明文化する。
判断基準は「その色を無彩色に潰したとき、状態を区別できるか」。

## 出所

`docs/features/feat-semantic-emphasis-icons/quality-gate-report.md` §3.5 / §4-3
