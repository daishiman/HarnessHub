---
graph_node_id: "issue-init-closure-doc-debts-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","documentation","run-dev-graph-init","behavior-closure"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "dev-graph: run-dev-graph-init の closure 内文書に裏付けなき system_spec 断定と未文書化の初期 graph shape が残る"
owners: ["daishiman"]
created_at: "2026-07-25T03:10:00Z"
updated_at: "2026-08-04T03:15:48Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/skills/run-dev-graph-init/references/validation-contract.md","plugins/dev-graph/scripts/validate-repo-config.py","plugins/dev-graph/skills/run-dev-graph-init/prompts/R3-init.md"]
purpose: "init の closure 内文書が持つ 2 件の debt を、live-trial 再取得 1 回で同時に解消できる形にまとめておく"
goal: "system_spec の責務記述が姉妹 skill の実装と一致し、初期 graph.json の shape が実行者に推測させない形で明記された状態"
mvp_alignment: null
scope_in: ["`system_spec` の生成主体に関する断定を、run-dev-graph-system-spec の実際の責務 (解決と containment 検証) へ合わせる","初期 graph.json の shape を R3-init.md か references/validation-contract.md へ明記する"]
scope_out: ["SKILL.md 本文の再構成 (PD-001 の余裕が 1 行しか無く別課題)","guard-graph-schema の fail-open 修正 (issue-guard-graph-schema-timeout-fail-open-20260725)"]
acceptance: ["`system_spec` の記述が run-dev-graph-system-spec の SKILL.md と矛盾しない","初期 graph.json の shape が closure 内文書に書かれている","live-trial 再取得後の transcript で C11 が初回から exit 0 になる"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-init-closure-doc-debts-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T03:10:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "独立 content-review 2 者が一致して指摘した low/inconsistency と、fresh evaluator が live-trial transcript から検出した未文書化の初期 shape"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-init-closure-doc-debts-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-0jzd","linked_at":"2026-07-25T03:10:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T03:10:00Z","missing_sections":[],"status":"complete"}
---

# 概要

run-dev-graph-init の behavior closure に含まれる文書へ debt が 2 件残っている。どちらも single fix では緑を壊さないが、closure 内なので触ると `skill_dir_tree_sha` が動き live-trial の再取得が要る。**1 回の再取得でまとめて解消するために 1 課題にまとめる。**

## debt 1 — `system_spec` の生成主体を裏付けなく断定している

`references/validation-contract.md` L45-46 と `plugins/dev-graph/scripts/validate-repo-config.py` L163 が、同じ文言でこう書く。

> `system_spec` は `run-dev-graph-system-spec` が取込時に**用意する**別責務の root であり、init は作らない。

しかし `plugins/dev-graph/skills/run-dev-graph-system-spec/SKILL.md` の記述は次の 2 箇所だけで、いずれも「作る」とは言っていない。

- L24 `summary: "C24で呼出しrepoのsystem_spec rootを解決し、symlink元や別repoのsystem-specを読まないcontainmentを検証する"`
- L88 `- [ ] system_spec content root が caller repo 内で repository_id/common-dir と一致する`

姉妹 skill は `system_spec` root を **解決し containment を検証する**責務であって、生成主体だとは宣言していない。「用意する」は裏付けの無い断定である。

結論として **init が作らない** ことは正しい (だから 6 root を明示列挙する契約は妥当)。誤っているのは「では誰が作るのか」への答え方であり、そこは現状どの skill も引き受けていない。正確に書き直すか、生成主体が未定であること自体を明記する。

独立 content-review 2 者 (elegance / rubric) が一致して `[low/inconsistency]` として指摘した。

## debt 2 — 初期 `graph.json` の shape が未文書化

`validate-graph-schema.py` の `nodes_of()` は、graph が配列でも `nodes[]` を持つ object でもなければ `ContractError("graph must be an array or an object with nodes[]")` を投げる。

一方 `SKILL.md` と `prompts/R3-init.md` を grep しても `nodes` / `edges` の語は出てこない。**初期 graph store をどの shape で作るかが closure 内のどこにも書かれていない。**

2026-07-25 の live-trial 実走 (transcript idx 146-165) で、実行者はまず `nodes` を **dict (`{}`)** として graph store を書いた。C11 (`validate-graph-schema.py`) が `graph must be an array or an object with nodes[]` / exit 2 を返し、実行者は `validate-graph-schema.py` の実装を Read して初めて「`nodes` は list であって dict ではない」と理解し、同一 pass 内で `nodes: []` へ書き直して先へ進んだ。最終結果は PASS だが、これは **契約が exit code とスクリプト実装の読解経由で暗黙に伝わっている**状態であり、決定論的ではない。

## 期待する挙動

1. `system_spec` の責務記述が `run-dev-graph-system-spec` の実装宣言と矛盾しない。
2. 初期 graph.json の shape が closure 内文書に明記され、実行者が試行錯誤せずに正しい shape を作れる。

## 再現手順

```bash
# debt 1
grep -rn "system_spec" plugins/dev-graph/skills/run-dev-graph-system-spec/SKILL.md \
  plugins/dev-graph/scripts/validate-repo-config.py \
  plugins/dev-graph/skills/run-dev-graph-init/references/validation-contract.md

# debt 2 — closure 内に初期 shape の記述が無いことを示す
grep -rn "nodes\|edges" plugins/dev-graph/skills/run-dev-graph-init/SKILL.md \
  plugins/dev-graph/skills/run-dev-graph-init/prompts/R3-init.md   # 0 件
grep -n "must be an array or an object with nodes" plugins/dev-graph/scripts/validate-graph-schema.py
```

## 影響と優先度

- 影響範囲: component。init の実行成否は変わらないが、debt 2 は毎回 1 往復の無駄と非決定性を生む。
- 深刻度: low
- 緊急度: 単独では急がない。closure を触る次の周回 (guard 修正など) に相乗りさせるのが最も安い。

## スコープ

- In: 上記 2 文書の修正と、それに伴う live-trial 再取得。
- Out: SKILL.md 本文の再構成 (PD-001 の余裕が本文 99 行 / 上限 100 行しか無く、行数を増やす変更は別課題)。guard の fail-open 修正。

## 関連グラフ

- 原因/親ノード: <該当なし>
- 関連仕様: `spec-dev-workflow`
- 関連アーキテクチャ: <該当なし>
- 解決タスク: <未起票>

## 受入条件

- [ ] `system_spec` の記述が `run-dev-graph-system-spec/SKILL.md` の責務宣言と矛盾しない
- [ ] 初期 graph.json の shape が closure 内文書に明記されている
- [ ] live-trial 再取得後の transcript で C11 が初回から exit 0 になる
- [ ] `python3 -m pytest plugins/dev-graph/tests -q` が緑を維持する

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/dev-graph/tests -q`、`python3 scripts/lint-live-trial-verdict.py --all`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-init/content-review/{elegance,rubric}-verdict.json` (debt 1 の指摘元)、`eval-log/dev-graph/run-dev-graph-init/live-trial/20260725T014705Z-init-wt9/transcript.jsonl` (debt 2 の実測元)

## 注意

`references/validation-contract.md` と `validate-repo-config.py` はいずれも init の behavior closure (18 ファイル) に含まれる。触れば `skill_dir_tree_sha` が動き live-trial verdict が stale になるため、`issue-guard-graph-schema-timeout-fail-open-20260725` と同じ周回で扱うこと。`skill_md_sha256` は SKILL.md 単体の digest なので、SKILL.md に触れなければ content-review verdict と criteria receipt は失効しない。
