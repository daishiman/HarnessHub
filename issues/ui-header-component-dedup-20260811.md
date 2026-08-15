---
graph_node_id: "issue-ui-header-component-dedup-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "frontend"
tags: ["ui-consistency","design-system"]
priority: "medium"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "見出し帯の部品が 2 種類ある状態を解消する"
owners: ["daishiman"]
created_at: "2026-08-11T00:00:00Z"
updated_at: "2026-08-12T03:37:40Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["packages/ui/src/layout/primitives.tsx","packages/ui/src/layout/ScreenHeader.tsx","specs/harness-hub-ui-foundation-addendum.md"]
purpose: "ScreenHeader と PageHeader の二重化を、仕様側の整理も含めて片付ける。"
goal: "画面上部の見出しを作る部品を 1 つに収束させる。"
scope_in: ["PageHeader の扱いの決定","仕様 (FR-UIF-001) の更新要否の判断","残る利用箇所の移行"]
scope_out: ["ScreenHeader の見た目の変更"]
acceptance: ["どちらを正とするか仕様に記載される","hub アプリ内の利用が 1 種類に揃う","browser test / VRT が緑のまま"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/ui-header-component-dedup-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"f1c13bc7b424f35ed3f247caed89849a2fad4f1724887ad31a32d5e37c4452ce","evaluator":"2026-08-11 の全28画面 UI 統一作業で実測した残課題","evidence_ref":"docs/product/backlog.md"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"docs/product/backlog.md","source_plugin":null,"source_version":null}
classification_confidence: 0.98
classification_reason: "UI 統一作業で残した未着手項目であり、実装単位の不具合・改善課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/ui-header-component-dedup-20260811.md","confidence":0.98}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-z45h","linked_at":"2026-08-11T10:45:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 見出し帯の部品が 2 種類ある状態を解消する

## 概要

見出し帯を作る部品が ScreenHeader と PageHeader の 2 つある。

## 背景と問題

hub アプリ側の利用は ScreenHeader に統一済みだが、PageHeader は specs/harness-hub-ui-foundation-addendum.md の FR-UIF-001 で公開 contract として規定されているため削除できない。将来どちらを使うか迷う元になる。

## 現在の挙動

hub 内の PageHeader 参照は 0 件。catalog entries と browser tests、packages/ui 本体に残る。

## 期待する挙動

仕様側で扱いを決め、部品を 1 つに収束させる。

## 再現手順またはユースケース

新しい画面を追加するとき、どちらの部品を使うか判断できない。

## 影響と優先度

実害は将来の迷いに限られるため medium。

## スコープ

部品の統合と仕様の更新。見た目は変えない。

## 関連グラフ

specs/harness-hub-ui-foundation-addendum.md FR-UIF-001。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

docs/product/backlog.md (2026-08-11 時点) の優先度中 #9。
