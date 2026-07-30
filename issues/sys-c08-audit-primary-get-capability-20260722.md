---
graph_node_id: "issue-c08-audit-primary-get-capability-20260722"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-spec-harness","audit-environment","doc-freshness"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "C08 監査 sub-agent が公式 API へ一次 GET できず WebSearch 二次索引依存で doc_freshness FAIL が反復する"
owners: ["daishiman"]
created_at: "2026-07-22T23:38:10Z"
updated_at: "2026-07-26T01:39:34.074446Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/system-spec-harness/agents/","plugins/system-spec-harness/skills/assign-system-spec-completeness-evaluator/"]
purpose: "C05 再々評価 (2026-07-22 23:21Z、completeness-report.json) の medium finding (bucket: audit-environment) と gap 4 の恒久是正。C08 (system-spec-doc-freshness-auditor) の実行環境では WebFetch が無効 ('No such tool available')・curl は Bash 権限拒否で、registry.npmjs.org / api.github.com 等の公式一次ソースへ直接 GET できない。C08 は WebSearch (検索エンジンの二次索引) のみに依拠し、索引ラグと真の乖離を区別できず、pnpm 11.16.0 / opennext-cloudflare 1.20.2 のような公開直後の版で『裏取り不能 FAIL』が構造的に反復する。"
goal: "C08 監査 sub-agent と C05 評価経路が公式 API host (registry.npmjs.org / api.github.com 等) へ read-only の一次 GET を実行でき、二次索引ラグ由来の判定不能 FAIL が発生しない"
scope_in: ["C08 auditor の一次 GET 手段の確立 (WebFetch 有効化、Bash python3 urllib 手順の agent 定義への明記、または許可リスト追加のいずれか)","auditor prompt / agent 定義への照合手順 (curl 拒否時の fallback) の追記","C05 evaluator の delegation prompt での手段伝達の標準化"]
scope_out: ["検査基準の緩和 (fail-closed 原則は維持)","WebSearch 照合自体の廃止 (補助手段としては維持)"]
acceptance: ["C08 auditor が registry.npmjs.org と api.github.com へ read-only GET を実行した監査証跡が残る","公開直後の版 (npm index 遅延中) でも一次 2 経路照合で確定判定できる","変更が agent 定義または SKILL の正本に反映され、session 一時指示に依存しない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-c08-audit-primary-get-capability-20260722.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-22T23:38:10Z","origin_kind":"manual","source_digest":null,"source_path":"system-spec/completeness-report.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "C05 再々評価 (HarnessHub-t9q) の medium finding (audit-environment) と gap 4 で指摘された監査環境の構造要因を追跡する follow-up issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-c08-audit-primary-get-capability-20260722.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-nq2","linked_at":"2026-07-23T10:11:37Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-22T23:38:10Z","missing_sections":[],"status":"complete"}
---

# 概要

C05 再々評価 (2026-07-22 23:21Z、completeness-report.json) の medium finding (bucket: audit-environment) と gap 4 の恒久是正。C08 (system-spec-doc-freshness-auditor) の実行環境では WebFetch が無効 ('No such tool available')・curl は Bash 権限拒否で、registry.npmjs.org / api.github.com 等の公式一次ソースへ直接 GET できない。C08 は WebSearch (検索エンジンの二次索引) のみに依拠し、索引ラグと真の乖離を区別できず、pnpm 11.16.0 / opennext-cloudflare 1.20.2 のような公開直後の版で『裏取り不能 FAIL』が構造的に反復する。

## 背景と問題

`issue-c08-audit-primary-get-capability-20260722` は「C08 監査 sub-agent が公式 API へ一次 GET できず WebSearch 二次索引依存で doc_freshness FAIL が反復する」を追跡する issue である。背景と根本原因は Beads `HarnessHub-nq2` の description / notes と node の purpose に記録している。

## 現在の挙動

graph status は `draft`、completion status は `open` であり、Beads `HarnessHub-nq2` が残作業の実行状態を管理する。

## 期待する挙動

C08 監査 sub-agent と C05 評価経路が公式 API host (registry.npmjs.org / api.github.com 等) へ read-only の一次 GET を実行でき、二次索引ラグ由来の判定不能 FAIL が発生しない

## 再現手順またはユースケース

Beads `HarnessHub-nq2` の description に記録した入力条件を用い、対象 script / workflow / validator を実行して現象を再現する。再現条件と実測結果は同 issue の notes に追記し、完了時は node の evidence_refs へ repository 内の証跡を係留する。

## 影響と優先度

priority は `medium`。C05 再々評価 (2026-07-22 23:21Z、completeness-report.json) の medium finding (bucket: audit-environment) と gap 4 の恒久是正。C08 (system-spec-doc-freshness-auditor) の実行環境では WebFetch が無効 ('No such tool available')・curl は Bash 権限拒否で、registry.npmjs.org / api.github.com 等の公式一次ソースへ直接 GET できない。C08 は WebSearch (検索エンジンの二次索引) のみに依拠し、索引ラグと真の乖離を区別できず、pnpm 11.16.0 / opennext-cloudflare 1.20.2 のような公開直後の版で『裏取り不能 FAIL』が構造的に反復する。 という影響があるため、他 issue と依存・write scope を分離して追跡する。

## スコープ

**対象:**

- C08 auditor の一次 GET 手段の確立 (WebFetch 有効化、Bash python3 urllib 手順の agent 定義への明記、または許可リスト追加のいずれか)
- auditor prompt / agent 定義への照合手順 (curl 拒否時の fallback) の追記
- C05 evaluator の delegation prompt での手段伝達の標準化

**対象外:**

- 検査基準の緩和 (fail-closed 原則は維持)
- WebSearch 照合自体の廃止 (補助手段としては維持)

## 関連グラフ

- 関連 node なし
- Beads: `HarnessHub-nq2`

## 受入条件

- C08 auditor が registry.npmjs.org と api.github.com へ read-only GET を実行した監査証跡が残る
- 公開直後の版 (npm index 遅延中) でも一次 2 経路照合で確定判定できる
- 変更が agent 定義または SKILL の正本に反映され、session 一時指示に依存しない

## 検証証跡

未完了のため、現時点の一次記録は Beads `HarnessHub-nq2` の description / notes と本 issue である。完了時に実行コマンド、結果、repository 内 evidence path を追記する。
