---
graph_node_id: "issue-legal-copy-replacement-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["legal","content"]
priority: "medium"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "利用規約・プライバシーポリシーの本文を法務確認済みのものに差し替える"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-11T10:45:30Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/app/legal/page.tsx"]
purpose: "雛形の文面を、法務確認済みの正式な本文へ置き換える。"
goal: "/legal の本文が正式な内容になる。"
scope_in: ["利用規約の本文","プライバシーポリシーの本文"]
scope_out: ["/legal の画面構成の変更"]
acceptance: ["法務確認済みの本文が反映される","改定日が画面に出る"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/legal-copy-replacement-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"6e98288d9bfae3171f4d64caa4596896e17f500b25549ce0aeed0d48fef9a305","evaluator":"2026-08-11 の全28画面 UI 統一作業で実測した残課題","evidence_ref":"docs/product/backlog.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "UI 統一作業で残した未着手項目であり、実装単位の不具合・改善課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/legal-copy-replacement-20260811.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5yen","linked_at":"2026-08-11T10:45:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 利用規約・プライバシーポリシーの本文を法務確認済みのものに差し替える

## 概要

/legal の本文がいまだ雛形の文面のまま。

## 背景と問題

画面の枠組み (見出し・説明文) は整えたが、中身は差し替え待ち。

## 現在の挙動

雛形の文面が表示される。

## 期待する挙動

法務確認済みの本文が表示される。

## 再現手順またはユースケース

/legal を開く。

## 影響と優先度

公開範囲が限定されている間は medium。外部公開時は high へ上げる。

## スコープ

本文の差し替えのみ。

## 関連グラフ

UI 統一作業 (2026-08-11) の残課題。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

docs/product/backlog.md (2026-08-11 時点) の優先度中 #8。
