---
graph_node_id: "issue-doc-internal-link-baseline-cleanup-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["documentation","link-integrity","ratchet","cleanup"]
priority: "medium"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "文書内リンク既存baseline 354件を0件へ縮退する"
owners: ["daishiman"]
created_at: "2026-08-12T07:34:00Z"
updated_at: "2026-08-12T07:36:00.266515Z"
status: "active"
depends_on: []
related_nodes: ["issue-doc-internal-link-integrity-gate-20260811"]
resource_scope: ["docs/","issues/","scripts/lint-doc-internal-link-integrity.py"]
purpose: "強化済みlintが検出する既存dangling参照を、例外化せず段階的に修正する"
goal: "未追跡Markdownを含む同一定義でviolation_count=0かつnew_violation_count=0にし、max-violationsを0へ下げる"
scope_in: ["既存354 fingerprintの分類","正しい移動先への参照更新","削除済み証跡の明示的な歴史表現への変更","ratchet上限の縮小"]
scope_out: ["path allowlistの追加","走査rootの縮小","実在しないtargetの生成による偽装","今回のelegant-reviewへの354件一括混在"]
acceptance: ["violation_countとmax-violationsが0になる","new_violation_countが0のまま維持される","未追跡Markdownも参照元として走査される","CIとlocalの引数形が一致する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/doc-internal-link-baseline-cleanup-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"115aede6ac1607cc1e27f8057ddd56b659967f5805035013140c0280baddbd95","evaluator":"elegant-review 30-thinking-method review","evidence_ref":"issues/doc-internal-link-integrity-gate-20260811.md"}
source_lineage: {"imported_at":"2026-08-12T07:34:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "強化後のlintで573文書5949参照を走査し、既存354件・新規fingerprint 0件を実測した独立cleanup"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/doc-internal-link-baseline-cleanup-20260812.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-wenp","linked_at":"2026-08-12T07:35:45.253621Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T07:34:00Z","missing_sections":[],"status":"complete"}
---

# 文書内リンク既存baseline 354件を0件へ縮退する

## 概要

source-awareかつtracked-target-onlyのリンクlintで、573文書5949参照のうち既存dangling 354件を検出した。今回の差分から増えたfingerprintは0件であるため、既存負債を独立して段階解消する。

## 背景と問題

総数上限とbase fingerprint比較により悪化は防げるが、既存354件が正しい参照になるわけではない。上限を固定したままでは文書利用者が古いpathへ誘導され続ける。

## 現在の挙動

`lint-doc-internal-link-integrity.py --max-violations 354 --ratchet-base origin/main` は違反354件、新規fingerprint 0件でPASSする。未追跡Markdownも参照元として走査し、未追跡targetは合格にしない。

## 期待する挙動

全参照を実在する追跡済みtargetへ修正し、violation_countとmax-violationsを0へ下げる。歴史的に削除済みのpathは、現行参照と誤認しない文章へ直す。

## スコープ

354 fingerprintを文書群ごとに分類し、独立対象は並列、同じ正本を参照する変更は直列で修正する。allowlist追加、走査root縮小、空file生成は行わない。

## 再現手順またはユースケース

`python3 scripts/lint-doc-internal-link-integrity.py --repo-root . --max-violations 354 --ratchet-base origin/main --json` を実行し、violation_count=354とnew_violation_count=0を確認する。

## 受入条件

violation_count=0、max-violations=0、new_violation_count=0を同時に満たす。CIとlocalの引数形、および未追跡Markdown走査の回帰テストを維持する。

## 影響と優先度

コード実行には直結しないが、設計・運用・証跡の参照可能性を損なうためpriorityはmediumとする。件数が多いため今回の変更境界へ混在させない。

## 検証証跡

ゲート実装と基準値は `issues/doc-internal-link-integrity-gate-20260811.md`、CI配線は `.github/workflows/governance-check.yml` と `scripts/run-ci-checks.sh` を正とする。

## 関連グラフ

`issue-doc-internal-link-integrity-gate-20260811` が悪化防止を所有し、本nodeが既存baselineの0件化を所有する。
