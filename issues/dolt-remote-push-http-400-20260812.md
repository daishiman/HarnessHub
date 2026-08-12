---
graph_node_id: "issue-dolt-remote-push-http-400-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["beads","dolt","sync"]
priority: "medium"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "Dolt remote への Beads push HTTP 400 を解消する"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-12T06:56:46Z"
status: "done"
depends_on: []
related_nodes: []
resource_scope: ["scripts/install-git-hooks.sh","docs/beads-operations-runbook.md","tests/scripts-root/test_root__validate_git_hooks_wiring.py"]
purpose: "Dolt push が差分計算用 baseline を持てず HTTP 400 になる再現条件を除去する。"
goal: "新しい clone が正規初期化され、既存 remote baseline 欠落時も installer が安全に補完する。"
scope_in: ["refs/dolt/data の初回取得","refspec の冪等設定","runbook と回帰テスト"]
scope_out: ["force push","JSONL を同期正本として扱うこと"]
acceptance: ["通常の bd dolt push が成功する","fresh clone の初期化・補完経路が決定論的に検証される"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/dolt-remote-push-http-400-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"33e2e5bd6e3f1376d89c6571860a4fec9d927b16df0b726273d5b1c8f84d7892","evaluator":"通常 push 回復の実測と local bare remote 回帰テスト","evidence_ref":"docs/beads-operations-runbook.md"}
source_lineage: {"imported_at":"2026-08-12T06:56:46Z","origin_kind":"manual","source_digest":null,"source_path":"docs/beads-operations-runbook.md","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "HarnessHub-jab2 の解決内容を graph と issue artifact へ復元する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/dolt-remote-push-http-400-20260812.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-jab2","linked_at":"2026-08-12T06:56:46Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-12T05:52:10Z","evidence_refs":["scripts/install-git-hooks.sh","docs/beads-operations-runbook.md","tests/scripts-root/test_root__validate_git_hooks_wiring.py"],"policy":"manual","reconciled_at":"2026-08-12T06:56:46Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-08-12T06:56:46Z","missing_sections":[],"status":"complete"}
---

# Dolt remote への Beads push HTTP 400 を解消する

## 原因

新しい clone に `refs/dolt/data` が無く、Dolt push が remote に存在する chunk を差し引けないことが原因だった。認証方式の HTTPS/SSH 差異は本件の原因ではない。

## 改善

新しい clone の正規経路を `bd bootstrap` としたうえで、hook installer は local baseline が欠けるときだけ remote を照会し、存在する exact ref を取得して post-condition を検証する。通常 fetch 用の wildcard refspec は冪等に維持する。

## 証跡

運用手順は `docs/beads-operations-runbook.md`、実装は `scripts/install-git-hooks.sh`、回帰検査は `tests/scripts-root/test_root__validate_git_hooks_wiring.py` に置く。
