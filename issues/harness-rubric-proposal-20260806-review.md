---
graph_node_id: "issue-rubric-proposal-20260806-review"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["harness-creator","rubric-governance","follow-up"]
priority: "low"
start_date: null
target_date: null
iteration: null
title: "rubric governance: 2026-08-06 自動生成提案の human review と処遇決定"
owners: ["daishiman"]
created_at: "2026-08-07T03:35:55Z"
updated_at: "2026-08-07T03:44:21.154506Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/harness-creator/skills/run-skill-rubric-governance/proposals/2026-08-06-rubric-update.md"]
purpose: "機械生成された rubric 更新提案が triage されずに滞留し、評価基準の自己改善ループが閉じない状態を解消する"
goal: "2026-08-06 分 draft の friction_density 25 件を正規フローで triage し、採否と根拠を記録した状態にする"
scope_in: ["2026-08-06 分 draft の triage と処遇決定","集計キーに旧 worktree 絶対 path が混入する不具合の要否判定"]
scope_out: ["rubric 本体 (schemas/ templates/) の実改訂 (run-rubric-sync の管轄)","friction_density 閾値ロジックの実装変更"]
acceptance: ["friction_density 25 件を閾値見直し / 評価項目新設 / templates 更新 / 棄却のいずれかへ全件分岐させる","集計キーの絶対 path 混入について要否を判定し、必要なら別 issue を起票する","draft の status を採否結果に応じて更新するか、対応不要と判断した理由を残す"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/harness-rubric-proposal-20260806-review.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-07T03:35:55Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "aggregate-evals.py が自動生成した rubric 更新提案 draft の採否判断が未着手のまま滞留している follow-up。実装変更を伴わない governance タスクのため issue。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/harness-rubric-proposal-20260806-review.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-lzfs","linked_at":"2026-08-07T03:39:30Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-07T03:35:55Z","missing_sections":[],"status":"complete"}
---

# 概要

`aggregate-evals.py` が SessionEnd で自動生成した rubric 更新提案 `2026-08-06-rubric-update.md` を履歴へ退避したが、本文が明記するとおり採否判断 (human review) は別工程で未着手のまま残っている。

## 背景と問題

`plugins/harness-creator/skills/run-skill-rubric-governance/proposals/` 配下の rubric 更新提案は、評価ログの集計結果から機械生成される追跡対象成果物である (兄弟 10 件はいずれも git 追跡下)。生成物には `status: draft` と「PR 起票は別工程」が明記されており、生成だけでは governance ループが閉じない。

2026-08-06 生成分は作業ツリー上にのみ存在し、git object DB のどこにも保存されていなかった。HarnessHub-3vcz (2026-07-22 分) と同じ滞留パターンである。

## 現在の挙動

- 集計母数: 評価 615 件 / FAIL 率 6.99% / 平均スコア 85.692。
- `friction_density` 異常が 25 skill で検出されている (`run-skill-create` / `run-elegant-review` / `run-slide-report-modify` ほか)。
- そのうち 1 件は skill 名ではなく旧 worktree の絶対 path (`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-084044-wt-9/plugins/dev-graph/skills/run-dev-graph-schedule/SKILL.md`) として記録されており、集計キーの正規化が効いていない疑いがある。
- 主要 finding カテゴリ top5: (1) `invalidated: origin/main advanced during the trial` 10 件 (2) ゴールシーク配線 `progress-missing` 4 件 (3) 同 `eval-root-missing` 3 件 (4) `C14-OUT1` required_observations 未回収 3 件 (5) `C02-OUT1` required_observations 未回収 3 件。
- 提案アクション欄は「閾値/観点の見直し」「評価項目の新設または重み調整」「templates 更新」の 3 つが未分岐のまま並んでおり、どれを採るかが決まっていない。

## 期待する挙動

`run-skill-rubric-governance` の正規フローで 25 件を triage し、rubric 改訂に落とすもの・観測ノイズとして棄却するものが判別され、draft の処遇 (採用 / 却下 / 保留) が記録された状態。

## 再現手順またはユースケース

1. `plugins/harness-creator/skills/run-skill-rubric-governance/proposals/2026-08-06-rubric-update.md` を開く。
2. 「検出された異常」25 件と「主要 finding カテゴリ」を確認する。
3. `status: draft` のまま採否記録が存在しないことを確認する。

## 影響と優先度

- 影響範囲: harness-creator の rubric governance ループ (評価基準の自己改善)
- 深刻度: low (既存の評価は動作しており、改善提案が滞留しているだけ)
- 緊急度: 低。ただし提案が積み上がるほど triage コストが増える

## スコープ

- In: 2026-08-06 分 draft の triage と処遇決定、集計キー正規化不全の要否判定
- Out: rubric 本体 (`schemas/` / `templates/`) の実改訂そのもの (採用が決まった時点で `run-rubric-sync` の管轄)、`friction_density` 閾値ロジックの実装変更

## 関連グラフ

- 原因/親ノード: (HarnessHub-3vcz は同種の滞留を扱った先行 issue。closed)
- 解決タスク: 本 node 自身

## 受入条件

- [ ] friction_density 25 件を triage し、閾値見直し / 評価項目新設 / templates 更新 / 棄却のいずれかへ全件を分岐させる
- [ ] 集計キーに旧 worktree の絶対 path が混入する不具合の要否を判定し、必要なら別 issue を起票する
- [ ] draft の status を採否結果に応じて更新するか、対応不要と判断した理由を残す

## 検証証跡

- コマンド/テスト: `python3 plugins/harness-creator/skills/run-skill-rubric-governance/scripts/aggregate-evals.py --help` で再集計手順を確認
- 証跡 path: `plugins/harness-creator/skills/run-skill-rubric-governance/proposals/2026-08-06-rubric-update.md`
