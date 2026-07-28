---
graph_node_id: "issue-id-uniqueness-gate-generalization-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","validation","fail-closed","follow-up"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "同種の集合化による ID 重複無検出が他の validate-*.py にも無いかの点検 (HarnessHub-33ho scope_in 未消化分)"
owners: ["daishiman"]
created_at: "2026-07-28T01:25:04Z"
updated_at: "2026-07-28T01:25:04Z"
status: "draft"
depends_on: []
related_nodes: ["issue-qa-log-id-uniqueness-gate-20260726"]
resource_scope: ["plugins/plugin-dev-planner/skills/run-plugin-dev-plan/scripts/validate-task-graph.py","plugins/ubm-goal-setting/scripts/validate-consult-session.py","plugins/harness-creator/skills/run-build-skill/scripts/validate-route-build-reports.py"]
purpose: "issue-qa-log-id-uniqueness-gate-20260726 (HarnessHub-33ho) の scope_in には『同種の集合化による取りこぼしが requirement_ids など他の ID 集合にも無いかの点検』が含まれていたが、validate-coverage-matrix.py への fail-closed 検査追加のみで HarnessHub-33ho は close された。grep 実測で {x.get(\"id\") for x in ...} という同型の集合内包を validate-task-graph.py / validate-consult-session.py / validate-route-build-reports.py の3ファイルで確認した。これらは検査対象データの参照先ID一意性を暗黙に前提するバリデータであり、qa_log と同じ『重複IDが静かに1件へ畳み込まれ実在検査だけが通る』構造を持ちうる。"
goal: "3ファイルそれぞれについて、ID重複が実際に検査結果を偽陽性化しうるかを個別判定し、該当する場合は _collect_unique_ids 相当の fail-closed 検査と回帰テストを追加し、該当しない場合はその理由を記録する"
scope_in: ["validate-task-graph.py の node_ids/comp_ids が重複IDを畳み込むケースの要否判定","validate-consult-session.py の user_turn_ids が重複IDを畳み込むケースの要否判定","validate-route-build-reports.py の routes/known_ids が重複IDを畳み込むケースの要否判定","要検査と判定したファイルへの fail-closed 実装と正例=OK/負例=各違反の回帰テスト追加"]
scope_out: ["dev-graph 自身の graph.json 内 by_id ルックアップ (schedule-graph.py, render-graph-html.py 等。graph_node_id の一意性は validate-graph-schema.py が別途担保済み)","harness-creator の task-graph/handoff 系ルックアップ (accept-discovered-task.py, sync-task-state.py, build-script-route.py 等。内部状態の last-write-wins マージであり参照先一意性の検査ゲートではない)","qa_log 自体の内容修正 (HarnessHub-33ho の scope_out を継承)"]
acceptance: ["3ファイルそれぞれについて要検査/対象外の判定が根拠付きで本ドキュメントまたは後続ドキュメントに記録されている","要検査と判定したファイルに重複ID fixture の回帰テストが追加され、重複時に非0終了することを確認できる","対象外と判定したファイルについて、なぜ qa_log と同型の実害が無いかの理由が記録されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-id-uniqueness-gate-generalization-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T01:25:04Z","origin_kind":"manual","source_digest":null,"source_path":"issues/sys-qa-log-id-uniqueness-gate-20260726.md","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-33ho の最終レビュー中に scope_in の未消化項目を発見し、grep 実測で該当候補ファイルを特定した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-id-uniqueness-gate-generalization-20260728.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ory6","linked_at":"2026-07-28T01:25:04Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T01:25:04Z","missing_sections":[],"status":"complete"}
---

# 概要

`validate-coverage-matrix.py` の qa_log ID 重複無検出を fail-closed 化した際、元課題 `issue-qa-log-id-uniqueness-gate-20260726` (`HarnessHub-33ho`) の scope_in にあった「同種の集合化による取りこぼしが他の ID 集合にも無いかの点検」は未実施のまま `HarnessHub-33ho` が close された。本課題はその未消化分を引き継ぐ。

## 背景と問題

`{e.get("id") for e in entries}` という集合内包で ID を集めると、同じ ID を持つ別内容のエントリが複数あっても要素数 1 に畳み込まれ、「参照先が実在するか」の検査は通っても「参照先が一意か」は検査されない。`qa_log` ではこの構造が原因で、並行ブランチが同じ ID を異なる内容で二重採番する事故 (`docs/features/feat-task-spec-test-strategy/qa-id-renumbering-20260725.md`) が起きた。

repo 全体を grep した実測 (2026-07-28) では、同じ `{x.get("id") for x in ...}` 形の集合内包が以下を含む 20 箇所超で見つかった。

```
plugins/plugin-dev-planner/skills/run-plugin-dev-plan/scripts/validate-task-graph.py
plugins/ubm-goal-setting/scripts/validate-consult-session.py
plugins/harness-creator/skills/run-build-skill/scripts/validate-route-build-reports.py
plugins/dev-graph/scripts/schedule-graph.py
plugins/dev-graph/scripts/render-graph-html.py
plugins/harness-creator/scripts/sync-task-state.py
plugins/harness-creator/scripts/accept-discovered-task.py
... (他)
```

このうち `validate-` 接頭辞を持つ 3 ファイルは、名前どおり検査ゲートとして ID を参照実在チェックに使っている可能性が高く、qa_log と同型の実害を持ちうる。残りは dev-graph/harness-creator 内部の状態ルックアップ (`by_id` 辞書構築や既存 ID との差分検出) であり、参照先一意性を保証する検査ゲートではなく、後続の別処理 (`validate-graph-schema.py` 等) が一意性を別途担保している可能性がある。この切り分け自体がまだ検証されていないため、本課題の scope_in は「要否判定」を第一歩に置く。

## 再現手順 (validate-task-graph.py を例に)

1. `validate-task-graph.py` の入力 (`nodes` 配列) へ、既存 ID と同一だが内容の異なるノードを 1 件追加する。
2. `python3 plugins/plugin-dev-planner/skills/run-plugin-dev-plan/scripts/validate-task-graph.py` を実行する。
3. 重複が非 0 終了で報告されるか、素通りするかを確認する (現時点では未検証)。

## 影響と優先度

- 影響範囲: tooling / データ整合性。実害が確認されれば、対象プラグインの検証ゲートが「参照先は実在する」という偽陽性を返す。
- 優先度: medium。qa_log の事故のような具体的な実害はまだ観測されていないため high にはしないが、`HarnessHub-33ho` が「点検済み」を主張して close された経緯 (scope_in との齟齬) があるため、放置しない。

## 関連

- `HarnessHub-33ho` / `issue-qa-log-id-uniqueness-gate-20260726` — 本課題の起点。scope_in の未消化分を引き継ぐ
- `docs/features/feat-dev-pipeline-improvement/qa071-spec-reflection-receipt.md` — 仕様反映受領書の記載フォーマット参照元
