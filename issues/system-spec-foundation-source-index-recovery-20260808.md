---
graph_node_id: "issue-system-spec-foundation-source-index-recovery-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "testing-qa"
tags: ["system-spec","foundation","source-index","provenance"]
priority: "high"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "system-spec foundation の U1〜U9 source-index を復旧する"
owners: ["daishiman"]
created_at: "2026-08-08T11:00:00Z"
updated_at: "2026-08-08T10:10:38Z"
status: "draft"
depends_on: []
related_nodes: ["arch-harness-hub-testing-qa","spec-harness-hub-requirements","issue-system-spec-import-heading-contract-20260808"]
resource_scope: ["system-spec/spec-state.json","system-spec/00-requirements-definition.md","system-spec/source-citation-report.json","system-spec/coverage-report.json","plugins/system-spec-harness"]
purpose: "U1〜U9 の source-index 欠落を、推測せず正規 provenance から復旧する。"
goal: "foundation coverage が実在する原文証跡だけで PASS する状態を回復する。"
scope_in: ["U1〜U9 の実在する source lineage 調査","transition writer からの source-index 更新","compiler と決定論ゲートの再実行"]
scope_out: ["要件内容の推測変更","架空の原文または承認の作成","Harness Hub 製品 runtime の変更"]
acceptance: ["U1〜U9 の 9 件すべてが実在する source-index を持つ","source citation と foundation coverage が PASS する","compiler 再生成差分が正規状態と一致する","推測または捏造した source text が 0 件である"]
architecture_refs: ["arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/system-spec-foundation-source-index-recovery-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":"2026-08-08 final review deterministic gates","evidence_ref":"docs/features/feat-dev-pipeline-improvement/o4zi-system-spec-import-heading-contract-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-08T11:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "system-spec foundation の既存 provenance debt を独立して復旧する監査課題。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/system-spec-foundation-source-index-recovery-20260808.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-iys4","linked_at":"2026-08-08T10:10:38Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T11:00:00Z","missing_sections":[],"status":"complete"}
---

# system-spec foundation の source-index を復旧する

## 概要

`validate-coverage-matrix.py --require-foundation` が検出する U1〜U9 の source-index 欠落を、元のユーザー対話と承認証跡へ遡って正規 writer から復旧する。

## 背景と問題

2026-08-08 の最終レビューで source citation と compiler は PASS したが、foundation gate は U1〜U9 の 9 件をすべて「source-index が無い」として拒否した。今回追加した `qa-205` ではなく、既存 foundation 要件の由来情報が不足している。

## 現在の挙動

- `system-spec/00-requirements-definition.md` には U1〜U9 が存在する。
- 対応する source-index が `system-spec/spec-state.json` に無いため、foundation gate が 9 件失敗する。
- 現在の変更から由来を推測して埋めると、存在しないユーザー発言を作ることになるため禁止する。

## 期待する挙動

- U1〜U9 の各要件が実在する原文・承認・取り込み turn へ結び付く。
- 追加は transition writer（状態遷移の正規更新ツール）から行う。
- source citation、foundation coverage、compiler がすべて PASS する。

## 再現手順またはユースケース

`python3 plugins/system-spec-harness/scripts/validate-coverage-matrix.py --repo-root . --require-complete --require-foundation` を実行すると、U1〜U9 の source-index 不足が 9 件出る。

## 影響と優先度

priority: high。現在の本文内容や製品 runtime を直ちに壊すものではないが、仕様がどのユーザー要求から生まれたかを機械的に証明できないため、仕様監査の完了条件を満たさない。

## スコープ

対象は U1〜U9 の実在する source lineage の調査、正規 writer 更新、compiler 再生成、決定論ゲートの再実行。要件内容の推測変更、架空の原文作成、今回の機能変更への混入は対象外とする。

## 関連グラフ

- `arch-harness-hub-testing-qa`
- `spec-harness-hub-system-specification`
- `issue-system-spec-import-heading-contract-20260808`

## 受入条件

- U1〜U9 の 9 件すべてが実在する source-index を持つ。
- source citation と foundation coverage が PASS する。
- compiler 再生成差分が正規状態と一致する。
- 推測または捏造した source text が 0 件である。

## 検証証跡

2026-08-08 最終レビューの foundation gate 失敗 9 件、および `docs/features/feat-dev-pipeline-improvement/o4zi-system-spec-import-heading-contract-spec-reflection-receipt.md` を発見時の証跡とする。
