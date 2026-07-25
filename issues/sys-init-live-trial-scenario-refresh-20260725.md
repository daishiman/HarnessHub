---
graph_node_id: "issue-init-live-trial-scenario-refresh-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","live-trial","evidence-freshness","run-dev-graph-init"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "run-dev-graph-init の live-trial verdict と criteria scenario receipt を HarnessHub-sgt の SKILL.md 変更へ追随させる"
owners: ["daishiman"]
created_at: "2026-07-25T00:29:18Z"
updated_at: "2026-07-25T11:02:35.378890Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["eval-log/dev-graph/run-dev-graph-init/live-trial/20260724T063927Z-init-wt1/verdict.json","eval-log/dev-graph/run-dev-graph-init/criteria-test/scenario-verdict.json","plugins/dev-graph/skills/run-dev-graph-init/SKILL.md"]
purpose: "HarnessHub-sgt の SKILL.md 変更で失効した挙動面の証跡 2 件を genuine な再取得で回復し、run-dev-graph-init の受入証跡チェーンを緑へ戻す"
goal: "lint-live-trial-verdict.py --all が exit0 になり、test_skill_criteria_evidence.py の C01 2 test が pass する状態"
mvp_alignment: null
scope_in: ["run-skill-live-trial を run-dev-graph-init に対して再実行し新 run-id の verdict.json を保存する","再取得した live-trial verdict を参照する criteria scenario receipt (OUT1) を独立レビューで再取得する","scenario receipt の target.skill_md_sha256 を再取得時点の実測値へ更新する"]
scope_out: ["SKILL.md の追加変更 (sgt で確定済み)","content-review verdict の再取得 (sgt 内で完了済み)","live-trial verdict 不在 6 skill の解消 (D13 パイロットゲートの record-only 範囲)"]
acceptance: ["lint-live-trial-verdict.py --all が dev-graph/run-dev-graph-init について stale-sha を報告しない","eval-log/dev-graph/run-dev-graph-init/criteria-test/scenario-verdict.json の target.skill_md_sha256 が現行 SKILL.md の実測 sha と一致する","pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py が C01 について pass する","scenario receipt の OUT1 が新 run-id の live-trial verdict を参照する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-init-live-trial-scenario-refresh-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T00:29:18Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-sgt の実装中に behavior closure digest の失効として機械検出された、挙動面証跡の追随作業"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-init-live-trial-scenario-refresh-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-5pdc","linked_at":"2026-07-25T00:29:18Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-25T03:09:54Z","evidence_refs":["eval-log/dev-graph/run-dev-graph-init/live-trial/20260725T014705Z-init-wt9/verdict.json","eval-log/dev-graph/run-dev-graph-init/live-trial/20260725T014705Z-init-wt9/transcript.jsonl","eval-log/dev-graph/run-dev-graph-init/criteria-test/scenario-verdict.json","plugins/dev-graph/tests/test_skill_criteria_evidence.py"],"policy":"manual","reconciled_at":"2026-07-25T03:09:54Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T00:29:18Z","missing_sections":[],"status":"complete"}
---

# 概要

HarnessHub-sgt の SKILL.md 変更で失効した run-dev-graph-init の挙動面証跡 2 件 (live-trial verdict と criteria scenario receipt) を genuine な再取得で回復する。

## 背景と問題

dev-graph の証跡チェーンは、SKILL.md の内容面と挙動面を別々の digest で束縛している。

- `lint-content-review.py --all` … `target.skill_md_sha256` が現行 SKILL.md と一致するか
- `lint-live-trial-verdict.py --all` … `skill_dir_tree_sha` が現行 skill ディレクトリ tree と一致するか
- `test_skill_criteria_evidence.py` … criteria scenario receipt の `target.skill_md_sha256` 一致と、OUT1 が参照する live-trial verdict の実在

sgt の変更で 3 つが同時に失効した。1 番目は sgt 内で独立 SubAgent による再評価で回復済み。2 番目と 3 番目が残っている。**3 番目は 2 番目に依存する**: scenario receipt の OUT1 は `verify_by: live-trial` で `live_trial_verdict_ref` から live-trial verdict を指すため、live-trial を先に再取得しないと scenario receipt も正当に再取得できない。

## 現在の挙動

2026-07-25 実測。

- `lint-live-trial-verdict.py --all` → `[FAIL] 1 violation`。`dev-graph/run-dev-graph-init: 20260724T063927Z-init-wt1/verdict.json stale-sha` (記録 `ef1bd226…` != 現在 `41a7ee69…`)。
- `pytest plugins/dev-graph/tests` → `2 failed, 445 passed`。失敗は `test_skill_criteria_evidence.py` の C01 2 test。
- scenario receipt が pin している sha は `1db7dd6c…` で、これは sgt 着手前の SKILL.md の値である。

## 期待する挙動

`lint-live-trial-verdict.py --all` が run-dev-graph-init について stale-sha を報告せず、`pytest plugins/dev-graph/tests` の C01 2 test が pass する。

## 再現手順またはユースケース

1. `python3 scripts/lint-live-trial-verdict.py --all`
2. `python3 -m pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py -q`

## 影響と優先度

- 影響範囲: system。run-dev-graph-init の受入証跡チェーンが赤のままで、C01 の挙動保証が現行 SKILL.md に対して成立していない。
- 深刻度: high
- 緊急度: sgt の成果自体は文書面・script 面とも検証済みだが、挙動面証跡が古いままだと以後の変更で「どの版まで挙動が保証されていたか」が追えなくなる。

## スコープ

- In: run-skill-live-trial の再実行と新 run-id の verdict.json 保存、その verdict を参照する criteria scenario receipt (IN1 + OUT1..OUT5) の独立レビューによる再取得。
- Out: SKILL.md の追加変更 (sgt で確定済み)、content-review verdict の再取得 (sgt 内で完了済み)、live-trial verdict 不在 6 skill の解消 (D13 パイロットゲートの record-only 範囲)。

## 関連グラフ

- 原因/親ノード: `issue-repo-config-schema-validation-20260724`
- 関連仕様: `spec-dev-workflow`
- 関連アーキテクチャ: <該当なし>
- 解決タスク: <未起票>

## 受入条件

- [ ] `lint-live-trial-verdict.py --all` が dev-graph/run-dev-graph-init について stale-sha を報告しない
- [ ] scenario receipt の `target.skill_md_sha256` が現行 SKILL.md の実測 sha と一致する
- [ ] `pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py` が C01 について pass する
- [ ] scenario receipt の OUT1 が新 run-id の live-trial verdict を参照する

## 検証証跡

- コマンド/テスト: `python3 scripts/lint-live-trial-verdict.py --all` と `python3 -m pytest plugins/dev-graph/tests/test_skill_criteria_evidence.py -q`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-init/live-trial/<新 run-id>/verdict.json`、`eval-log/dev-graph/run-dev-graph-init/criteria-test/scenario-verdict.json`

## 禁止事項

`target.skill_md_sha256` や `skill_dir_tree_sha` を現行値へ手で書き換えて緑にするのは偽装であり禁止する (content-review-protocol L122 と同じ規律)。挙動面の証跡は、実際に skill を走らせた結果としてのみ正当性を持つ。
