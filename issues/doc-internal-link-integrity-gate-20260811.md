---
graph_node_id: "issue-doc-internal-link-integrity-gate-20260811"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["governance","lint","fail-closed","documentation"]
priority: "medium"
start_date: "2026-08-11"
target_date: null
iteration: null
title: "md 本文の repo 内 path 参照 dangling を機械検査するゲートを新設する"
owners: ["daishiman"]
created_at: "2026-08-12T04:16:20.271143Z"
updated_at: "2026-08-12T04:16:20.271143Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["scripts/lint-doc-internal-link-integrity.py","tests/scripts-root/test_root__lint_doc_internal_link_integrity.py",".github/workflows/governance-check.yml","scripts/run-ci-checks.sh"]
purpose: "受入条件に掲げた lint が実在しないまま緑と称する状態を無くし、md 本文の dangling path 参照を人手 grep ではなく機械で継続検出する。"
goal: "docs/ と issues/ の md 本文にある repo 内 path 参照を走査し、実在しないものを検査母数つきで違反報告する fail-closed lint が CI と local gate の双方で常時走る状態にする。"
scope_in: ["inline code span と markdown inline link からの repo 内 path 参照抽出","検査文書数・検査参照数の zero attribution 出力","意図的 dangling fixture による gate liveness test","baseline dangling 件数の棚卸しと件数 ratchet による段階解消"]
scope_out: ["path 単位 allowlist の導入","外部 URL の到達性検査","fenced code block 内の例示 path の検査","検出済み 308 件の一括是正"]
acceptance: ["docs/ と issues/ の md 本文中の repo 相対 path 参照 (code span / markdown link) を走査し、実在しない path を violation として報告する","検査対象 0 件と違反 0 件を区別して出力する (checked 件数を必ず出す)","意図的に dangling を仕込んだ fixture で検査が反転することを test で固定する","既存 baseline の dangling 件数を棚卸しし、allowlist ではなく件数を記録して段階解消の方針を決める"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/doc-internal-link-integrity-gate-20260811.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"c080cad42309d3188a164816a35e6642544a89a19fb3d1cb6700398d49e1b78f","evaluator":"2026-08-11 実 repo 走査 (565 文書 / 5307 参照) と pytest 37 件","evidence_ref":"tests/scripts-root/test_root__lint_doc_internal_link_integrity.py"}
source_lineage: {"imported_at":"2026-08-11T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "既存 lint 35 本の走査で doc 本文リンク検査が不在であることを確認し、実装後に実 repo で 308 件の dangling を実測した。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/doc-internal-link-integrity-gate-20260811.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-j7a4","linked_at":"2026-08-11T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-11T00:00:00Z","missing_sections":[],"status":"complete"}
---

# md 本文の repo 内 path 参照 dangling を機械検査するゲートを新設する

## 概要

md 正本文書の本文に書かれた repo 内 path 参照のうち、実在しないもの (dangling) を検出する fail-closed lint を新設する。検査対象は docs/ と issues/ 配下の git 追跡済み md。

## 背景と問題

HarnessHub-ov4u で PR #60 由来の dangling 参照を是正した際、受入条件に「lint-doc-link-integrity 系のチェックが緑」とあったが、該当する lint が repo に実在しないことが判明した。

確認した事実は次の 3 点である。

- scripts/ の lint-*.py 35 本に doc 本文リンク検査は無い。`scripts/lint-doc-line-limit.py` は行数のみ、`scripts/lint-external-refs.py` は SKILL.md の外部 script 参照のみを見る。
- `plugins/dev-graph/scripts/validate-evidence-refs.py` は graph node の evidence_refs フィールドのみ検査する。対象 node の evidence_refs が null の場合、registered_dangling=0 は「検査対象外」であって合格ではない。
- 結果として md 本文の実在しない path は誰も検出しない。ov4u の 1 件は人手 grep で見つかったものであり、同型の残存が疑われた。

## 現在の挙動

md 本文に存在しない path を書いても、いかなる lint も CI も落ちない。人手 grep でのみ発見される。

## 期待する挙動

`scripts/lint-doc-internal-link-integrity.py` が docs/ と issues/ の md を走査し、実在しない repo 内 path 参照を検査母数つきで違反報告する。CI (`.github/workflows/governance-check.yml`) と local gate (`scripts/run-ci-checks.sh`) の双方で blocking として走る。

## 再現手順またはユースケース

lint を実行すると、検査した文書数・参照数と違反の一覧が出る。実在しない path を md 本文の code span か markdown link に書き足すと exit code が 0 から 1 へ反転する。

## 影響と優先度

正本文書が実体の無い成果物を指したまま「対応済み」と読める状態は、受入条件の検証可能性そのものを損なう。ただし本番稼働への直接影響は無いため medium とする。

## スコープ

inline code span と markdown inline link から repo 内 path 参照を抽出する。fenced code block (``` / ~~~) は実行例やログ貼付が主で、実在しない例示 path を意図的に書く場面があるため検査しない。外部 URL の到達性は対象外とする。

## 関連グラフ

HarnessHub-ov4u の受入条件が参照した実在しない lint を、事後に実体化するものである。HarnessHub-mfh7 の orphan external_ref 解消とも連動する。

Beads 課題は `HarnessHub-j7a4`。

## 受入条件

- docs/ と issues/ の md 本文中の repo 相対 path 参照 (code span / markdown link) を走査し、実在しない path を violation として報告する
- 検査対象 0 件と違反 0 件を区別して出力する (zero attribution。checked 件数を必ず出す)
- 意図的に dangling を仕込んだ fixture で検査が反転することを test で固定する (gate liveness)
- 既存 baseline の dangling 件数を棚卸しし、baseline 赤なら allowlist ではなく件数を記録して段階解消の方針を決める

## 検証証跡

2026-08-11 時点の実測は次のとおり。

```
$ python3 scripts/lint-doc-internal-link-integrity.py --repo-root . --max-violations 308
OK: doc-internal-link-integrity (検査 565 文書 / 5307 参照, 違反 308 件, 許容 308 件)
```

違反 308 件の参照先 top-level 内訳:

| top-level | 件数 |
| --- | --- |
| tests | 101 |
| scripts | 45 |
| apps | 34 |
| references | 26 |
| eval-log | 18 |
| packages | 18 |
| features | 15 |
| docs | 13 |
| plugins | 12 |
| その他 (.dev-graph / .beads / .claude-plugin / .github / system-spec / issues / doc / specs) | 26 |

検出の第 1 件目は ov4u で人手是正したのと同一の参照であり、本ゲートが当該欠陥を機械検出できることを実証している。

### baseline 赤への対処方針 (受入条件 4)

path 単位 allowlist は置かない。dangling はいずれも単なるバグであり、個別に許可すると恒久的な例外として正当化され是正の動機が消えるためである。代わりに `--max-violations` で総件数の上限だけを固定する ratchet を採る。件数は減る方向にしか動かせず、どの 1 件を先に直すかは実装者が選べる。

段階解消は参照先 top-level 単位で行う。最大母数の tests/ (101 件) は「文書が主張する test file が存在しない」型であり、test の実在確認と併せて別課題で扱う。

test は `tests/scripts-root/test_root__lint_doc_internal_link_integrity.py` に 37 件。gate liveness は実在 path のみの状態で exit 0、dangling を 1 件仕込むと exit 1 へ反転することを固定している。
