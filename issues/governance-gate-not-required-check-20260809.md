---
graph_node_id: "issue-governance-gate-not-required-check-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["ci","branch-protection","governance","follow-up"]
priority: "medium"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "governance-check の各ゲートが merge をブロックしない (branch protection 不在)"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T03:48:29.706523Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: [".github/workflows/governance-check.yml"]
purpose: "「CI に job はあるが merge を止めない」状態を解消し、ゲートの強制力を一元化する。"
goal: "必須ゲートの集合が 1 箇所で管理され、未登録のゲートが機械的に検出される状態にする。"
scope_in: ["main の branch protection と required status checks の方針決定","必須ゲート集合の単一管理 (台帳と実 workflow の parity 検査)"]
scope_out: ["個別ゲートのロジック変更","governance-check.yml の step 追加そのもの"]
acceptance: ["必須ゲートの台帳が存在し、実 workflow の job/step と突合できる","台帳にあるのに required check に未登録のゲートが機械的に検出される","protection を敷かない方針を選ぶ場合は、その判断と代替の強制手段が記録されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/governance-gate-not-required-check-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "「CI に job はあるが merge を止めない」状態を解消し、ゲートの強制力を一元化する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/governance-gate-not-required-check-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ic7w","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
---

## 実測

```
gh api repos/:owner/:repo/branches/main/protection
-> 404 Branch not protected
```

main に branch protection が無く、required status checks も設定されていない。

## なぜ問題か

HarnessHub-hz8m で `--phase-order` 経路へ signal/verdict 検査を組み込み `continue-on-error: false`
にしたが、**job が落ちても merge は止まらない**。つまり「CI に job はあるが required check に
登録されていない」状態で、hz8m が塞いだ配線断 (旗が no-op) と同型の空洞がもう一段外側に残っている。

elegant-review run-20260809-remnants の MD-05 が指摘したとおり、他プロジェクトでは必須化経路が
branch protection という 1 箇所に一元化されるが、本 repo では「実装済みのゲートを呼ぶかどうか」が
個々の workflow 側に散っている。

## やること

1. main に protection を敷くか、敷かない方針を明示的に選ぶ (敷かないなら代替の強制手段を記録)
2. 必須ゲートの集合を台帳として 1 箇所で管理し、実 workflow との parity を機械検査する

## 注意

protection を先に敷くと既存の赤いゲート (例: validate-graph-schema の全体 exit 1) で全 PR が
止まる。台帳側で「必須にするゲート」を明示的に選ぶ設計にすること。
