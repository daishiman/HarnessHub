---
graph_node_id: "issue-flaky-guard-latency-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-workflow","testing","flaky","proxy-metric","dev-graph"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "遮断レイテンシ test が絶対時間 1.0s を代理指標にしており並列負荷で偽陽性になる"
owners: ["daishiman"]
created_at: "2026-07-28T06:23:05Z"
updated_at: "2026-07-28T06:23:05Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/tests"]
purpose: "test_guard_graph_schema_fail_open_window.py::test_denial_latency_does_not_depend_on_the_repository_graph が並列稼働下で assert 3.559 < 1.0 により失敗する。単独実行では 26 passed / 2 skipped で緑。テストが固定したい契約は「遮断が graph サイズに依存せず確定する」だが、assert が見ているのは絶対所要時間であり代理指標にすぎない。代理指標にはマシン負荷という契約外の変数が混入するため、20 以上の worktree が同時稼働する本リポジトリの運用条件では契約が破れていなくても赤になる。赤が情報を失い、同じ見た目の本物の退行を読み飛ばす習慣を生む点が有害である。"
goal: "graph サイズ非依存性という契約を、マシン負荷に汚染されない形で測るテストへ置き換え、並列全件実行でも単独実行でも安定して緑になる状態にする"
scope_in: ["絶対時間 assert を比 (巨大 graph と極小 graph の所要時間比) など負荷が相殺される指標へ置き換える設計と実装","構造検査 (test_semantic_contract_boundaries_c10_c11_c24.py が固定する subprocess 非起動) との責務分担の整理","並列全件実行と単独実行の双方での反復実行による安定性確認"]
scope_out: ["guard-graph-schema.py 本体の遮断ロジック変更","pytest の並列度やテスト実行基盤の変更","他の flaky テストの棚卸し"]
acceptance: ["graph サイズ非依存性が、絶対所要時間ではない指標 (所要時間の比、または構造検査) で固定されている","並列全件実行と単独実行の両方で反復実行し、安定して緑になることが確認されている","是正が既存 assert の閾値引き上げのみになっていないこと、および閾値を上げた場合に見逃す退行の範囲が広がる旨が根拠として記録されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-flaky-guard-graph-schema-latency-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T06:23:05Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "既存テストの判定基準に起因する再現性のある不安定化であり、リポジトリ運用上の追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-flaky-guard-graph-schema-latency-20260728.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T06:23:05Z","missing_sections":[],"status":"complete"}
---

# 概要

`plugins/dev-graph/tests/test_guard_graph_schema_fail_open_window.py::test_denial_latency_does_not_depend_on_the_repository_graph` が、並列稼働下で `assert 3.559258499997668 < 1.0` により失敗する。同ファイル単独実行では 26 passed / 2 skipped で緑になる。

## 契約と代理指標のずれ

テスト名と docstring が固定したい契約は「**遮断は graph サイズに依存せず**確定する」である。一方 assert が見ているのは「**絶対所要時間が 1.0 秒未満**」であり、これは契約そのものではなく代理指標 (proxy metric) にすぎない。

代理指標には契約に無い第三の変数、すなわち**マシン負荷**が混入する。本リポジトリは 20 以上の worktree が同時稼働する運用であり、その条件下では python インタプリタの起動時間だけで 1 秒を超えうる。結果として **契約は破れていないのにテストが赤になる**。

これが有害なのは、赤が情報を失う点である。「またこれか」と読み飛ばす習慣がつけば、同じ見た目をした本物の退行も同じ扱いで流れる。fail-open の窓を塞ぐための test が、運用上は fail-open の温床になる。

## 実測 (2026-07-28)

| 実行条件 | 結果 |
| --- | --- |
| `plugins/dev-graph/tests` 全件 (20+ worktree 稼働中) | 553 passed / 1 failed — 本 test、3.559s |
| 同 test ファイル単独 | 26 passed / 2 skipped |

失敗時も遮断自体は正しく機能しており (exit 2)、graph 全件検証へ退行した形跡はない。落ちているのは所要時間の絶対値だけである。

## 是正の方向

**閾値を 1.0 秒から引き上げるだけの対応は採らない。**それは代理指標の精度を下げるだけで、契約を測るようにはならない。負荷が上がればまた落ちるし、逆に「graph サイズ依存へ退行したのに閾値内に収まる」場合を見逃す幅が広がる。

契約を直接測る形へ寄せる。候補は次の 2 つ。

1. **比で表現する** — 巨大 graph を `--repo-root` に渡した場合と、ノード数個の極小 graph を渡した場合の所要時間の比を見る。マシン負荷は両者に等しく乗るため相殺され、「graph サイズに依存しない」が比≒1 として直接表現される。
2. **構造検査へ委ねる** — 「遮断経路が subprocess を起動しない」という構造的性質は既に `test_semantic_contract_boundaries_c10_c11_c24.py` が固定している。時間計測側は補助的な smoke に格下げし、契約の保証は構造検査に一本化する。

1 を主、2 を補完とするのが妥当と考えるが、比のばらつきも負荷で増えるため、実測してから決める。

## 関連

`architecture/harness-hub-dev-workflow.md` に記録済みの「代理指標が実態からずれても緑/赤を出す」系列の追加事例である。ただし従来の 4 例が **緑側の偽陰性** (実態が壊れているのに緑) だったのに対し、本件は **赤側の偽陽性** (実態は健全なのに赤) である点が異なる。方向は逆だが、いずれも「検査が何を含意しているか」の取り違えに由来する。
