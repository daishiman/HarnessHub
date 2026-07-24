---
graph_node_id: "issue-planner-script-line-limit-20260724"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["system-dev-planner","line-limit","refactoring","follow-up"]
priority: "low"
start_date: null
target_date: null
iteration: null
title: "system-dev-planner: 500 行超の script 2 本 (promote-system-plan.py 677 / build-system-handoff.py 580) を責務単位へ分割する"
owners: ["daishiman"]
created_at: "2026-07-24T23:58:00Z"
updated_at: "2026-07-25T00:05:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-validator-contract-version-20260724"]
resource_scope: ["plugins/system-dev-planner/scripts/promote-system-plan.py","plugins/system-dev-planner/scripts/build-system-handoff.py"]
purpose: "issue-validator-contract-version-20260724 の対応で validate-system-plan.py を 601 行から 401 行へ分割した際、同 plugin 内の他 2 本が 500 行上限を超過したまま残っていることを確認した。いずれも当該変更以前からの超過であり、当該変更が触ったのは promote-system-plan.py の 2 行のみ。責務単位へ分割して上限へ収める"
goal: "promote-system-plan.py と build-system-handoff.py および分離先の全ファイルが 500 行以下になり、命名規則・PKG 検査・planner pytest・既 promote package の digest 不変性がいずれも維持されている"
scope_in: ["promote-system-plan.py (677 行) の責務単位分割","build-system-handoff.py (580 行) の責務単位分割","分離先 module の命名規則準拠と実行ビット付与"]
scope_out: ["C12 validate-json-schema-subset.py と C14 の JSON Schema サブセット実装の統合 (依存の非対称性を壊すため)","500 行上限そのものの緩和","既 promote package の canonical digest を変える改変"]
acceptance: ["対象 2 本と分離先の全ファイルが 500 行以下","lint-script-naming.py で新規 VIOLATION 0 件","make plugin-package-check で blocking failure 0 件","planner pytest 全件 PASS","既 promote package の canonical digest が不変"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-planner-script-line-limit-20260724.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-24T23:58:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "500 行上限超過という保守性の残件を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-planner-script-line-limit-20260724.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-7ui","linked_at":"2026-07-25T00:05:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-24T23:58:00Z","missing_sections":[],"status":"incomplete"}
---

# 概要

system-dev-planner の `promote-system-plan.py` (677 行) と `build-system-handoff.py` (580 行) が 500 行上限を超過しており、責務単位へ分割する。

## 背景と問題

`issue-validator-contract-version-20260724` (beads HarnessHub-8vx) の対応で `validate-system-plan.py` を 601 行から 401 行へ分割した際、同 plugin 内の他 2 本が上限超過のまま残っていることを確認した。いずれも当該変更以前からの超過であり、当該変更が触ったのは `promote-system-plan.py` の 2 行 (`validate()` 呼び出しへの `baseline={}` 追加) のみ。

## 現在の挙動

```
$ wc -l plugins/system-dev-planner/scripts/promote-system-plan.py
     677
$ wc -l plugins/system-dev-planner/scripts/build-system-handoff.py
     580
```

## 期待する挙動

対象 2 本と分離先の全ファイルが 500 行以下になり、命名規則・PKG 検査・planner pytest・既 promote package の digest 不変性がいずれも維持されている。

## 再現手順またはユースケース

1. `wc -l plugins/system-dev-planner/scripts/*.py` で 500 行超を列挙する。
2. 分割後に同コマンドで全件 500 行以下を確認する。

## 影響と優先度

- 影響範囲: system: 保守性。実行時の挙動には影響しない。
- 深刻度: low
- 緊急度: 低。ただし HarnessHub-1y6 が `promote-system-plan.py` / `validate-system-plan.py` を触る予定であり、分割を後にすると衝突面が広がる。

## スコープ

- In: 対象 2 本の責務単位分割、分離先 module の命名規則準拠と実行ビット付与。
- Out: C12 `validate-json-schema-subset.py` と C14 の JSON Schema サブセット統合 (依存の非対称性を壊す)、500 行上限そのものの緩和、既 promote package の digest を変える改変。

## 関連グラフ

- 原因/親ノード: `issue-validator-contract-version-20260724`
- 関連仕様: なし (plugin 内部の保守性)
- 関連アーキテクチャ: なし
- 解決タスク: 本 issue に紐づく beads issue

## 受入条件

- [ ] 対象 2 本と分離先の全ファイルが 500 行以下
- [ ] `lint-script-naming.py` で新規 VIOLATION 0 件
- [ ] `make plugin-package-check` で blocking failure 0 件
- [ ] planner pytest 全件 PASS
- [ ] 既 promote package の canonical digest が不変

## 検証証跡

- コマンド/テスト: `wc -l` / `python3 scripts/lint-script-naming.py --repo-root .` / `make plugin-package-check` / `python3 -m pytest plugins/system-dev-planner/tests -q`
- 証跡 path: 未取得 (着手時に記録)

## 先行対応で踏んだ制約

1. 新規 script 名は `scripts/lint-script-naming.py` の `<verb>-<target>.py` 規則に従う。verb allowlist は `build/diff/extract/format/guard/lint/render/validate` のみで underscore 禁止 (28 章 §4.3)。先行対応では初回命名 `contract_versions.py` / `json_schema_subset.py` が VIOLATION 2 件になり改名した。
2. `Write` で作った script は 644 になるため `chmod +x` が必要。shebang があって実行ビットが無いと PKG-007 で blocking FAIL になる。
3. 分割は plugin の behavior closure を変えるため dev-graph 3 skill の live-trial verdict が stale 化する (HarnessHub-1y6 と同型)。再取得とセットで計画する。
