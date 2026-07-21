---
graph_node_id: "issue-behavior-closure-unresolvable-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["live-trial","behavior-closure","fail-closed"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "behavior closure を計算できない 4 skill があり live-trial 証跡を取得できない"
owners: ["daishiman"]
created_at: "2026-07-21T12:00:00Z"
updated_at: "2026-07-21T12:00:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/harness-creator/skills/wrap-git-commit-safe/SKILL.md","plugins/harness-creator/skills/assign-skill-design-evaluator/SKILL.md","plugins/plugin-dev-planner/skills/run-plugin-dev-plan/SKILL.md","plugins/skill-intake/skills/run-skill-intake/SKILL.md"]
purpose: "declared behavior dependency が解決できず skill_dir_tree_sha を計算できない 4 skill を解消し、live-trial 証跡を取得可能にする"
goal: "4 skill すべてで skill_dir_tree_sha が計算でき、plan-live-trials が各 plugin 全体で fail-closed 停止しない"
scope_in: ["参照ファイル欠落 2 件の是正 (宣言を実態へ合わせるか実体を復元するか判断する)","cross-plugin 依存未宣言 2 件の package-contract.depends_on への追加可否判断","4 skill の digest 計算可否の回帰テスト"]
scope_out: ["4 skill の live-trial 実走 (digest 計算が通ってから別途計画する)","参照解決ロジックの変更 (2026-07-21 に近いスコープ優先へ修正済み)"]
acceptance: ["4 skill すべてで behavior_closure_files が例外を投げない","plan-live-trials.py が harness-creator / plugin-dev-planner / skill-intake の各 plugin 全体で正常終了する","解決不能な declared ref が 0 件であることを機械検査で固定している"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-behavior-closure-unresolvable-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T12:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "参照解決の修正時に、修正後も digest 計算が失敗し続ける 4 skill が残ると判明したため分離した issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-behavior-closure-unresolvable-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-c8m","linked_at":"2026-07-21T12:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T12:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

SKILL.md の `*_refs` が宣言する依存を解決できず、`skill_dir_tree_sha` (behavior closure digest) を計算できない skill が 4 件ある。digest が計算できない skill は live-trial 証跡を取得できず、受け入れ検証の対象外に落ちている。

## 背景と問題

`behavior_closure_files()` は宣言された依存を fail-closed で解決する。解決できない ref が 1 つでもあると例外になり、その skill の digest は計算できない。

2026-07-21 の参照解決修正 (skill dir 相対 → 同一 plugin の skill 名 → repo root の順で解決) により 22 skill が新たに解決可能になったが、以下 4 件は別種の原因で残った。

## 現在の挙動

全 115 skill に対して修正前後の digest 計算を試行した結果:

```
修正前から計算可能 :  89 skill (修正前後で digest 変化 0)
修正後に計算可能   : 111 skill (新規に 22 skill を解決)
計算不能           :   4 skill

- harness-creator/wrap-git-commit-safe
    declared behavior dependency missing: references/resource-map.yaml
- skill-intake/run-skill-intake
    declared behavior dependency missing: ref-workflow-sequence
- harness-creator/assign-skill-design-evaluator
    cross-plugin behavior dependency is not declared in package-contract.depends_on
- plugin-dev-planner/run-plugin-dev-plan
    cross-plugin behavior dependency is not declared in package-contract.depends_on
```

原因は 2 種類ある。

1. **参照ファイルの欠落 (2 件)** — 宣言された実体が存在しない。宣言が古いのか、ファイルが失われたのかの判断が要る
2. **cross-plugin 依存の未宣言 (2 件)** — 他 plugin を参照しているが `package-contract.json` の `depends_on` に無い。依存を宣言するのか、参照をやめるのかの設計判断が要る

## 期待する挙動

4 skill すべてで digest が計算でき、`plan-live-trials.py` が各 plugin 全体で正常終了する。

## 再現手順またはユースケース

1. `plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py` の `skill_dir_tree_sha` を上記 4 skill に対して呼ぶ
2. いずれも `ValueError` になる

## 影響と優先度

- 影響範囲: 4 skill の受け入れ検証
- 深刻度: medium
- 緊急度: 中 — 現状は各 plugin を `--skill` で個別指定すれば計画できるため運用は回る。ただし「digest が計算できない skill は検証対象から静かに外れる」状態であり、検証被覆の穴として恒久化させない方がよい。

## スコープ

- In: 参照欠落 2 件の是正、cross-plugin 依存 2 件の宣言可否判断、回帰テストによる固定
- Out: 4 skill の live-trial 実走、参照解決ロジックの変更 (修正済み)
