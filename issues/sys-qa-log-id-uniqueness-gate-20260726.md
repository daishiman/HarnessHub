---
graph_node_id: "issue-qa-log-id-uniqueness-gate-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "tooling"
tags: ["dev-graph","system-spec-harness","fail-closed","follow-up"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "validate-coverage-matrix が qa_log の ID 重複を検出できない (集合化で静かに潰れる)"
owners: ["daishiman"]
created_at: "2026-07-26T00:00:00Z"
updated_at: "2026-07-26T00:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["spec-harness-hub-requirements","arch-harness-hub-testing-qa"]
resource_scope: ["plugins/system-spec-harness/scripts/validate-coverage-matrix.py","plugins/system-spec-harness/tests/"]
purpose: "validate-coverage-matrix.py は qa_ids を {e.get(\"id\") for e in qa_log} と集合で構築するため、qa_log に同一 ID が複数存在しても例外にならず静かに 1 件へ潰れる。結果として 「qa_ref は全て実在する」と緑を返し、意味の壊れた仕様状態を機械ゲートが通してしまう。feat-task-spec-test-strategy のブランチが main と qa-070/qa-071 を二重採番した事故は、この無検出が原因で 3-way diff を人手で突き合わせるまで表面化しなかった。"
goal: "qa_log の ID 一意性が fail-closed で検査され、重複採番が commit 前に非 0 終了で止まる"
scope_in: ["validate-coverage-matrix.py への qa_log ID 一意性検査の追加 (重複時 exit 非 0)","重複 ID を含む fixture での回帰テスト追加","同種の集合化による取りこぼしが requirement_ids など他の ID 集合にも無いかの点検"]
scope_out: ["既存 qa_log の内容修正 (別課題)","qa ID の採番規則そのものの変更"]
acceptance: ["qa_log に重複 ID を含む入力で validate-coverage-matrix.py が非 0 終了する","重複が無い現行 system-spec/spec-state.json では従来どおり exit 0 を維持する","重複検出の回帰テストが plugins/system-spec-harness/tests/ に存在する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-qa-log-id-uniqueness-gate-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"system-spec/spec-state.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "feat-task-spec-test-strategy の origin/main マージ時に観測した qa ID 二重採番の根因分析 (docs/features/feat-task-spec-test-strategy/qa-id-renumbering-20260725.md §残課題 2) から起票した tooling の follow-up"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-qa-log-id-uniqueness-gate-20260726.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-33ho","linked_at":"2026-07-26T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-26T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`validate-coverage-matrix.py` が `qa_log` の ID 一意性を検査しないため、同じ qa ID を別内容で二重採番しても機械ゲートが緑を返す。

## 背景と問題

`plugins/system-spec-harness/scripts/validate-coverage-matrix.py` は参照検査の準備として

```python
qa_ids = {e.get("id") for e in data.get("qa_log", [])}
```

と **集合 (set)** で ID を集める。集合は重複を黙って畳み込むので、`qa_log` に同じ `id` の別エントリが 2 件あっても要素数 1 として扱われ、`qa_ref` の実在検査はそのまま通る。

「参照先が存在するか」だけを見て「参照先が一意か」を見ていない。ID が識別子として機能する前提が検査されていない状態である。

## 現在の挙動

`feat-task-spec-test-strategy` ブランチと `main` が、それぞれ別内容の `qa-070` / `qa-071` を確定していた。両者をマージするまで、どちらのブランチでも `validate-coverage-matrix.py` は exit 0 を返し続けた。衝突は 3-way diff を人手で突き合わせた時点で初めて表面化した。

経緯の全記録: `docs/features/feat-task-spec-test-strategy/qa-id-renumbering-20260725.md`

## 期待する挙動

`qa_log` に重複 `id` が存在する時点で、`validate-coverage-matrix.py` が非 0 終了し、どの ID が何件重複しているかを出力する。

## 再現手順またはユースケース

1. `system-spec/spec-state.json` の `qa_log` へ、既存 ID と同じ `id` を持つエントリを 1 件追加する
2. `python3 plugins/system-spec-harness/scripts/validate-coverage-matrix.py --matrix system-spec/spec-state.json` を実行する
3. 現状は exit 0 を返す (期待: 非 0 終了 + 重複 ID の報告)

## 影響と優先度

- 影響範囲: system / data (仕様の確定記録そのものの識別性)
- 深刻度: high
- 緊急度: 並行ブランチが同じ ID 空間へ確定を書き込む構造は継続しており、再発条件がそのまま残っている

## スコープ

- In: `validate-coverage-matrix.py` への一意性検査追加、重複 fixture の回帰テスト、他の ID 集合 (`requirement_ids` など) への同種検査の要否点検
- Out: 既存 `qa_log` 内容の修正 (`issue-qa070-qa-log-entry-missing-20260726` の担当)、qa ID 採番規則そのものの変更

## 備考

これは「機械ゲートが通っても意味は壊れうる」典型例である。集合による正規化は検査対象の性質 (一意性) を検査前に消してしまう。同種のパターンが他の validator に無いかを併せて点検すること。
