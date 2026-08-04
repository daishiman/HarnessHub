---
graph_node_id: "issue-fetched-reference-evidence-provenance-20260804"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["system-spec","citation","provenance","quality-gate"]
priority: "medium"
start_date: "2026-08-04"
target_date: null
iteration: null
title: "fetched reference の evidence provenance 欠落を解消する"
owners: ["daishiman"]
created_at: "2026-08-04T00:00:00Z"
updated_at: "2026-08-04T08:05:24.385000Z"
status: "closed"
closed_at: "2026-08-04T00:00:00Z"
depends_on: []
related_nodes: ["issue-hooks-entry-point-parity-generalization-20260728","spec-harness-hub-requirements"]
resource_scope: ["issues/sys-fetched-reference-evidence-provenance-20260804.md","system-spec/fetched-references.json","system-spec/spec-state.json","plugins/system-spec-harness/scripts/validate-source-citation.py"]
purpose: "citation provenance の不足が current system-spec で再現するかを検証し、誤った残課題を残さない。"
goal: "current system-spec の citation gate が PASS であることを記録し、再現しない不足報告を完了させる。"
scope_in: ["citation gate の再実行","既存記録との照合","誤検知の完了解決"]
scope_out: ["Harness Hub の製品 API、DB schema、認証認可、UI、Cloudflare deploy unit"]
acceptance: ["citation gate が 0 で終了する","再コンパイル時の投影差分をレビューする","未再現の残課題を closed として記録する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-fetched-reference-evidence-provenance-20260804.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"4b0c134b7643358cf7928fb2bf2327539278030d546f247046bdad84980a96a1","evaluator":"validate-source-citation.py (current system-spec)","evidence_ref":"system-spec/spec-state.json"}
source_lineage: {"imported_at":"2026-08-04T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "C03 final review で検出した既存 citation provenance 欠落を、変更本体から分離して追跡する issue。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-fetched-reference-evidence-provenance-20260804.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-yxb2","linked_at":"2026-08-04T05:48:25Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-08-04T00:00:00Z","evidence_refs":["system-spec/spec-state.json","system-spec/fetched-references.json"],"policy":"manual","reconciled_at":"2026-08-04T00:00:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-08-04T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`system-spec/fetched-references.json` の 20 reference に provenance 不足があるという報告を、current system-spec で再検証した。結果は citation gate PASS であり、40 件の違反は再現しなかった。

## 背景と影響

報告は HarnessHub-vf66 の hook parity 変更とは独立していたが、current tree の `validate-source-citation.py` では全件が対応・必須フィールド・公式 host・取得証跡の一致を満たした。未再現の原因を推測で補わず、検証結果を正とする。

## 完了条件

- `validate-source-citation.py --targets system-spec/spec-state.json --references system-spec/fetched-references.json --repo-root .` が 0 で完了する。
- current tree の実測が PASS であることを Beads と dev-graph に記録する。
- 未再現の問題を根拠なく product scope の変更へ拡大しない。

## 影響境界

対象は仕様ソースの provenance（根拠の来歴）記録であり、製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

## 背景と問題

過去の不足報告が current tree でも再現するかを、正規 CLI で確認する。

## 現在の挙動

`validate-source-citation.py` は現在 0 で終了し、出典記録が必須フィールド・公式 host・時刻・取得証跡の一致を満たすと報告する。

## 期待する挙動

citation gate の current PASS を受領し、再現しない不足報告を closed にする。

## 再現手順またはユースケース

repository root で `validate-source-citation.py --targets system-spec/spec-state.json --references system-spec/fetched-references.json --repo-root .` を実行する。

## 影響と優先度

製品変更ではなく、current tree では未再現の品質報告である。誤った blocker を残さないため closed にする。

## スコープ

検証コマンドと既存記録の照合に限定する。製品実装、取得証拠の書換え、本 PR の hook parity ロジックは含めない。

## 関連グラフ

`spec-harness-hub-requirements` と `issue-hooks-entry-point-parity-generalization-20260728` に関連する。

## 受入条件

current citation gate の PASS、再コンパイルの無関係差分がないこと、Beads/dev-graph の closed 記録を確認する。

## 検証証跡

`validate-source-citation.py` の current PASS が本 issue の完了解決根拠である。再び失敗した場合は fresh evidence とともに別 issue として起票する。
