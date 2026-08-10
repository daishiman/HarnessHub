---
graph_node_id: "issue-production-smoke-cancel-cleanup-20260810"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["production-smoke","cleanup","github-actions","reliability"]
priority: "medium"
start_date: "2026-08-10"
target_date: null
iteration: null
title: "CI cancel 時に production smoke の使い捨て tenant を回収する"
owners: ["daishiman"]
created_at: "2026-08-10T11:41:26Z"
updated_at: "2026-08-10T11:48:13Z"
status: "active"
depends_on: []
related_nodes: ["issue-publish-smoke-unwired-20260808","issue-production-smoke-coverage-gaps-20260808","spec-production-coverage-smoke"]
resource_scope: [".github/workflows/ci.yml","apps/hub/scripts/smoke-production-publish.ts","apps/hub/scripts/smoke-production-coverage.ts","packages/db/repository"]
purpose: "cancel-in-progress による強制終了でも本番DBへ試験tenantを恒久残存させない。"
goal: "プロセス内 finally が実行されない中断経路でも、runを特定して期限内に安全に回収できる状態にする。"
scope_in: ["run ID/期限付きfixture","if: always() cleanupまたは定期sweeper","publish先行cleanup","中断経路の回帰検査"]
scope_out: ["production smokeの検査内容変更","長命cleanup資格情報の追加","通常finally cleanupの削除"]
acceptance: ["runner強制終了後も期限付きfixtureを一意に列挙できる","publish領域を消し切るまでidentity tenantを消さない","cleanup失敗を観測可能にし再試行上限を持つ","通常終了とcancel相当の正負検査が通る"]
architecture_refs: ["arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/production-smoke-cancel-cleanup-20260810.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"6a01ce56dcb6a4ab6512ae6f68504793d698ea39ed0998f4d2eee573bc10a309","evaluator":"CI cancel-in-progress と process-local finally の失敗経路監査","evidence_ref":".github/workflows/ci.yml"}
source_lineage: {"imported_at":"2026-08-10T11:41:26Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "cancel-in-progressはプロセス内finallyの完遂を保証せず、使い捨てtenant残存を独立に回収する必要がある。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/production-smoke-cancel-cleanup-20260810.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-aauo","linked_at":"2026-08-10T11:48:13Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-10T11:41:26Z","missing_sections":[],"status":"complete"}
---

# CI cancel 時に production smoke の使い捨て tenant を回収する

## 概要

GitHub Actionsのcancel-in-progressでrunnerが強制終了しても、production smokeのfixtureを期限内に回収する。

## 背景と問題

通常のfinallyは成功・失敗を扱えるが、process自体の停止では完遂を保証できない。

## 現在の挙動

cleanupはrunner内のfinallyだけにあり、cancel後の独立回収経路がない。

## 期待する挙動

run IDと期限で残存fixtureを特定し、依存順を守って回収できる。

## 再現手順またはユースケース

smokeがtenantを作成した後にjobをcancelし、後続cleanupまたはsweeperが残数0へ戻すことを確認する。

## 影響と優先度

本番DBの試験データ残存を防ぐためmedium。通常smoke結線の完了とは分離する。

## スコープ

run ID、TTL、always cleanupまたはsweeper、監視を対象とする。検査シナリオ自体は変えない。

## 関連グラフ

HarnessHub-pf5oおよびproduction coverage smoke仕様のreliability follow-up。

Beads 課題は `HarnessHub-aauo`。通常終了時の cleanup 修正とは分離し、強制終了後の独立回収だけを扱う。

## 受入条件

- cancel後のfixture列挙と期限内回収
- publish成功後だけidentity削除
- bounded retryと失敗観測
- 通常/cancel正負検査PASS

## 検証証跡

Actions runとcleanup残数をartifactへ残す。
