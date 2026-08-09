---
graph_node_id: "issue-verification-evaluator-cache-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["verification-tier","cache","performance","follow-up"]
priority: "medium"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "dev-workflow【2】の evaluator 結果 cache が未実装"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T03:47:47.430749Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["system-spec/dev-workflow.md","eval-log/verification-tier/"]
purpose: "tier 判定に依存せず即効性のある所要時間短縮策を実装する。"
goal: "同一入力に対する evaluator 再実行が cache で回避され、cache_hit と cache_key が run に記録されている。"
scope_in: ["eval-log/verification-tier/cache/<cache-key>.json の実装","cache_key = 対象実体 digest + evaluator 識別子/version + 評価に効く設定値 の sha256","cache hit 時も disposition=executed とし cache_hit/cache_key を併記","cache miss と cache 破損 (schema 不適合・digest 不一致) の区別"]
scope_out: ["tier 判定そのもの (HarnessHub-xcl3)","evaluator の rubric 変更"]
acceptance: ["同一入力の 2 回目 evaluator 実行が cache hit になり実測で短縮する","rubric 改訂で cache_key が変わり自動失効する","cache 破損時は cache を使わず再実行する (古い PASS を再利用しない)"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/verification-evaluator-cache-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "tier 判定に依存せず即効性のある所要時間短縮策を実装する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/verification-evaluator-cache-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-6nf1","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
---

## 背景

`system-spec/dev-workflow.md`【2. evaluator 結果の cache (施策2)】は確定仕様だが未実装である。

elegant-review run-20260809-remnants の SS-11 が指摘したとおり、この施策は **tier 判定に依存せず
独立に実装でき、即効性がある**。tier 側 (HarnessHub-xcl3) がまだ配線されておらず実測 0 秒短縮な
のに対し、cache は単体で効く。

## 仕様 (章より)

`cache_key` は次の 3 要素の sha256:

- 評価対象の実体 digest (対象 file 群の内容 sha256 を path 昇順で連結。mtime や path 単体は使わない)
- evaluator の識別子と version (rubric 改訂で cache が自動失効する)
- 評価に効く設定値 (tier、閾値、有効化した検査 id 集合)

## 注意

cache hit を採用した場合も `checks[].disposition` は `executed` とし、`cache_hit: true` と
`cache_key` を併記する。cache を根拠に「実行した」と申告しつつ、どの入力に対する結果かを
追えない状態を作らない。

cache miss と cache 破損 (schema 不適合・digest 不一致) は区別し、破損時は cache を使わず
再実行する (fail-open で古い PASS を再利用しない)。

## 進捗 (2026-08-09)

`scripts/build-evaluator-cache.py` は実装済みで、key 決定論・hit/miss/corrupt の区別・
同一 key への異結果 store の fail-closed 拒否まで `tests/scripts-root/test_root__build_evaluator_cache.py`
が固定している。

**ただし呼出元は tests のみで、実運用の cache hit は 1 件も発生していない。**
「cache 機構がある」ことと「cache が効いている」ことは別であり、前者だけを見て
所要時間が縮んだと読み違えないよう、script の docstring に配線状況を明記した。

残る作業は配線だけである。配線先は assign-*-evaluator 系の起動点
(completeness-evaluator / skill-design-evaluator)。そこで `--op lookup` の `status` で分岐し、
hit なら返却された `check_entry` をそのまま `checks[]` へ載せ、miss / corrupt なら実行後に
`--op store` する。`check_entry` の組立を呼出側でやり直さないこと。やり直すと
`disposition: "cached"` のような非仕様値が生まれ、「実行した」と「cache を使った」の区別が
台帳から失われる。
