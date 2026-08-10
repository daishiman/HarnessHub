---
graph_node_id: "issue-deferred-verification-backlog-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["verification-tier","deferred","governance","standing"]
priority: "medium"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "tier 降格で外れた検査の常設受け皿 (deferred-verification backlog)"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T03:49:09.788688Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["scripts/verification-gate-ledger.json","eval-log/verification-tier/"]
purpose: "critical 未満の tier で省略した重い検査を、回収可能な形で 1 箇所に集める。"
goal: "省略した検査と回収手段が常に追跡可能で、受け皿の無い延期が CI で成立しない。"
scope_in: ["completeness-evaluator / independent-audit-fork / live-trial の延期記録","回収した run の追記"]
scope_out: ["tier 規則表の見直し","個別 PR 単位の自動起票"]
acceptance: ["governance-check の tier 判定 step が本 issue を --deferred-issue として参照する","延期された検査の rerun_command が台帳から辿れる"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/deferred-verification-backlog-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "critical 未満の tier で省略した重い検査を、回収可能な形で 1 箇所に集める。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/deferred-verification-backlog-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-sy31","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
source_path: "issues/deferred-verification-backlog-20260809.md"
---

## 背景

`system-spec/dev-workflow.md`【4】【5】と qa-209【3】は、tier が critical 未満の run では
完成度 evaluator 全 aspect・独立監査 fork・live-trial 全 scenario を **起動しない**ことを認める。
ただし「省略した事実と対象を deferred-verification issue へ記録する」ことを同時に義務づける。

`scripts/build-verification-plan.py` はこの義務を機械化しており、`deferred` が 1 件でもあるのに
受け皿 issue が指定されていなければ exit 2 で拒否する (fail-closed)。CI の
`governance-check.yml` が tier を算出して plan を導出する以上、**常設の受け皿**が要る。

本 issue はその常設の受け皿である。個別 PR ごとに issue を起こす運用はノイズが大きく、
CI から beads を書く権限も持たせたくないため、repo 全体で 1 本の backlog として保持する。

## この issue が受け止める検査

| 検査 id | 起動される tier | 未満の tier での扱い |
|---|---|---|
| `completeness-evaluator` | critical | deferred (本 issue が受け皿) |
| `independent-audit-fork` | critical | deferred (本 issue が受け皿) |
| `live-trial` | critical | deferred (本 issue が受け皿) |

台帳の正本は `scripts/verification-gate-ledger.json`。各 gate の `rerun_command` が、
延期した検査を後から回す手段である (回収不能な延期を作らないための必須項目)。

## 回収の運び方

1. main への統合前に critical 相当の変更が溜まったら、`--tier critical` で plan を導出して
   3 検査を実行する
2. 実行結果を `eval-log/verification-tier/<run-id>/` へ残す
3. 本 issue へ「どの run で回収したか」を追記する

## 閉じる条件

本 issue は**常設**であり、通常は閉じない。閉じてよいのは次のいずれか。

- tier 制度そのものが廃止され、全検査が常時 blocking へ戻ったとき
- PR 単位で deferred issue を自動起票する経路が入り、常設の受け皿が不要になったとき

## 参照

- `system-spec/dev-workflow.md`【3】【4】【5】
- `scripts/verification-gate-ledger.json`
- `scripts/build-verification-plan.py`
- HarnessHub-xcl3 (tier 判定の配線)
