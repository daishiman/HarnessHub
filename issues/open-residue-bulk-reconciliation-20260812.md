---
graph_node_id: "issue-open-residue-bulk-reconciliation-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["dev-graph","beads","lifecycle","reconciliation"]
priority: "high"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "OR-003残置195件を正規writerで一括整合する"
owners: ["daishiman"]
created_at: "2026-08-12T07:25:30Z"
updated_at: "2026-08-12T07:28:55.256144Z"
status: "active"
depends_on: []
related_nodes: ["issue-lint-open-residue-ci-red-20260725"]
resource_scope: [".dev-graph/state/graph.json","issues/","tasks/","plugins/dev-graph/scripts/lint-open-residue.py"]
purpose: "live Dolt DBで再発したOR-003残置を、走査数やbaselineを減らさず正規C02 writerで収束させる"
goal: "lint-open-residueのbeads軸をscanned=450以上のままviolations=0へ戻し、再発原因と防止策を記録する"
scope_in: ["OR-003 195件のBeads close reasonと証拠の確認","C02 lifecycle reconciliation","全体lintとgraph schemaの再検証","再発経路の特定"]
scope_out: ["scanned対象の除外","baselineへの追加","未確認課題の自動close","今回のelegant-review差分への一括混在"]
acceptance: ["scannedを減らさずOR-003が0件になる","各node本文を保持してC02単一writerで更新する","BeadsとDev Graphのstatus・completion・依存が一致する","再発防止の回帰検査または運用契約を追加する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/open-residue-bulk-reconciliation-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"585de6a8c9e30fd825b8ffe230d3912d9f2858b985a992570f3ed31ba7731a83","evaluator":"elegant-review 30-thinking-method review","evidence_ref":"issues/sys-lint-open-residue-ci-red-20260725.md"}
source_lineage: {"imported_at":"2026-08-12T07:25:30Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "live Dolt DBでscanned=450、OR-003=195を再現し、今回の変更境界では0件と分離確認した大規模な既存整合作業"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/open-residue-bulk-reconciliation-20260812.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-76im","linked_at":"2026-08-12T07:28:45.091754Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T07:25:30Z","missing_sections":[],"status":"complete"}
---

# OR-003残置195件を正規writerで一括整合する

## 概要

live Dolt DBを使う全体走査で、BeadsはclosedだがDev Graphの実行状態がopenまたはin_progressのまま残るOR-003を195件再現した。今回のelegant-review対象では0件であり、既存負債を独立して扱う。

## 背景と問題

CIにはDolt DBが無いためBeads軸が未評価となり、ローカルでしか残置を検出できない。過去の一括整合後に再び195件へ増えたため、個別修正だけでなく再発経路の特定が必要である。

## 現在の挙動

`lint-open-residue.py`の実測はscanned=450、OR-003=195、exit=2である。レビュー対象ノードだけに絞ると違反0であり、今回の変更が新規残置を導入したわけではない。

## 期待する挙動

Beadsをclosedにする正規経路が、対応するDev Graph nodeとMarkdownのcompletion_evidenceをdoneまたはnot_applicableへ投影し、全体走査を違反0へ収束させる。

## スコープ

195件のclose reasonと証拠を確認し、本文を保持したままC02単一writerでlifecycleを再投影する。走査対象の削減、baseline追加、未確認課題の自動closeは行わない。

## 再現手順またはユースケース

live Dolt DBを利用できるworktreeで `python3 plugins/dev-graph/scripts/lint-open-residue.py --repo-root .` を実行する。2026-08-12時点ではOR-003が195件となる。

## 受入条件

scannedを450以上に保ったままOR-003を0件へ戻す。全更新はC02 writerを通し、graph schema、Markdown frontmatter、Beads statusの一致を再検証する。再発防止の回帰検査または運用契約も追加する。

## 影響と優先度

残置が常時赤だと次の1件を識別できず、品質ゲートの信号が失われる。実装差分とは独立だが参照整合性の基盤に関わるためpriorityはhighとする。

## 検証証跡

起点は `issues/sys-lint-open-residue-ci-red-20260725.md`。今回の実測値とレビュー境界はBeads notesにも記録する。

## 関連グラフ

先行ノード `issue-lint-open-residue-ci-red-20260725` の再発follow-upである。先行成果の完了履歴は変更せず、本ノードが新しい一括整合を所有する。
