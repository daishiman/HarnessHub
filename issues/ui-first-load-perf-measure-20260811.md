---
graph_node_id: "issue-ui-first-load-perf-measure-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["performance","web-vitals","launch"]
priority: "high"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "本番 URL で画面ごとの初回表示速度を計測する"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-11T10:45:30Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/app"]
purpose: "公開後の実測に基づいて、重い画面を特定する。"
goal: "本番 URL で Core Web Vitals を計測し、予算超過の画面を洗い出す。"
scope_in: ["本番 URL での計測","First Load JS 予算 (G13) との突合","重い画面の一覧化"]
scope_out: ["計測前の推測による最適化"]
acceptance: ["主要画面の計測値が記録される","First Load JS 予算 120 KiB との差分が出る","予算超過の画面が課題として残る"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-first-load-perf-measure-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"abcc38716831cd3a4468e24190148402f7553fad15188452d52f904d2682b223","evaluator":"2026-08-11 の全28画面 UI 統一作業で実測した残課題","evidence_ref":"docs/product/backlog.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "UI 統一作業で残した未着手項目であり、実装単位の不具合・改善課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-first-load-perf-measure-20260811.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-mulk","linked_at":"2026-08-11T10:45:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 本番 URL で画面ごとの初回表示速度を計測する

## 概要

今回の UI 変更後、本番 URL での表示速度計測が未実施のまま。

## 背景と問題

手元 preview では認証必須の業務画面まで到達できず (/health が turso_credentials_missing で 503)、実測できていない。

## 現在の挙動

計測値が無いため、どの画面が重いか判断できない。

## 期待する挙動

公開後に本番 URL で計測し、重い画面があれば手を入れる。

## 再現手順またはユースケース

公開後の本番 URL に対して Core Web Vitals を計測する。

## 影響と優先度

リリース判定の必須項目ではないが、公開直後に確認すべきため high。

## スコープ

計測と洗い出しまで。改善実装は結果を見て別課題にする。

## 関連グラフ

G13 First Load JS 予算。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

docs/product/backlog.md (2026-08-11 時点) の優先度高 #4。
