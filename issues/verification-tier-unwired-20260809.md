---
graph_node_id: "issue-verification-tier-unwired-20260809"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["verification-tier","ci","mvp-first","follow-up"]
priority: "medium"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "select-verification-tier の算出結果を消費する経路が無い"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-09T03:43:45.518537Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["scripts/select-verification-tier.py",".github/workflows/governance-check.yml","system-spec/dev-workflow.md"]
purpose: "算出済み tier を run へ記録・適用し、tiering 仕様の目的 (1 周の所要時間短縮) を実際に達成する。"
goal: "tier-decision.json が run ごとに生成され、記録された tier に応じて blocking 集合が切り替わっている状態にする。"
scope_in: ["CI か run 開始経路から --from-git で selector を呼び tier-decision.json を出す","checks[].disposition (executed/skipped/deferred) と deferred_issue_refs の受け皿","記録された tier に応じた blocking 集合の切替"]
scope_out: ["evaluator 結果 cache (dev-workflow.md【2】) の実装","tier 規則表そのものの見直し"]
acceptance: ["run ごとに eval-log/verification-tier/<run-id>/tier-decision.json が生成される","tier_selector に path と source_digest が入り absent が出ない","mvp tier の run で critical 専用検査が blocking から外れ、advisory として実行される","降格時は deferred_issue_refs が非空であることを機械検査する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/verification-tier-unwired-20260809.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "算出済み tier を run へ記録・適用し、tiering 仕様の目的 (1 周の所要時間短縮) を実際に達成する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/verification-tier-unwired-20260809.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-xcl3","linked_at":"2026-08-09T03:42:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
---

## 背景

`scripts/select-verification-tier.py` は実装され、変更 path 集合から mvp/standard/critical を
決定論的に算出できるようになった (HarnessHub-6fct)。しかし算出結果を消費する経路がまだ無く、
dev-workflow.md【1】が定める `eval-log/verification-tier/<run-id>/tier-decision.json` は
どの CI job / skill からも生成されていない。

このままだと「selector はあるが誰も呼ばない」状態で、tier 判定の根拠は run に残らず、
`tier_selector: "absent"` を書いていた頃と実質同じである。

## やること

1. CI か run 開始経路から `--from-git <base>` で selector を呼び、`--out` で tier-decision.json を出す
2. `checks[].disposition` (executed / skipped / deferred) と `deferred_issue_refs` を記録する受け皿を作る
3. 記録された tier に応じて blocking 集合を切り替える

(3) まで入って初めて qa-208/214 の目的 (1 周の所要時間短縮) が達成される。

## 注意

`skipped` と `deferred` を同じ値に潰さないこと。前者は「この tier では恒久的に実行しない」、
後者は「この周回では実行しないが後続で必ず実行する」で、issue 追跡義務を負うのは後者だけ。

## 進捗 (2026-08-09)

(1)(2) は完了。(3) は未着手で、本 issue に残る作業は (3) だけである。

**完了 (1)(2)**

- `.github/workflows/governance-check.yml` が `select-verification-tier.py --from-git <base> --derive-checks`
  を **1 回だけ**呼び、`eval-log/verification-tier/<run-id>/tier-decision.json` を生成する。
  tier 取得と checks 生成で 2 回起動すると同じ差分を 2 度測ることになり、その間に規則表が
  動けば 1 回目と 2 回目で tier がズレる。`--derive-checks` は tier 決定後に台帳を引く
  一方向の導出なので、この経路自体が生まれない。
- `validate-tier-decision.py --scan` が CI の hard gate として、`tier_selector: absent` の run・
  受け皿の無い `deferred`・`disposition` の非仕様値を落とす。
- 判定入力の取りこぼしを 2 つ塞いだ。変更 path 集合が空なら fail-closed で拒否する
  (取れなかった入力を既定 mvp へ潰さない)。`--from-git` は分岐点への二点 diff + untracked 合流に
  変え、未 commit / 未追跡の変更が判定入力から落ちないようにした。
- 台帳側の穴も塞いだ。`rerun_command` が gate の title と別の検査を指していた 4 件を実体へ直し、
  `tests/scripts-root/test_root__build_verification_plan.py` が参照先 (script path / pnpm script /
  make target) の実在を機械検査するようにした。非空文字列だけを見ていたことが、宣言と実体の
  乖離が同時に 4 件成立した単一根本原因だった。

**なぜ (3) を同じ周回で入れないか**

上記の記録経路は、まだ本番 run で 1 度も動いていない。記録が読めることを確認する前に
blocking 集合の切替を入れると、判定が壊れた瞬間に検査が黙って消える。「検査した」と
「検査したことになっていた」を事後に区別できない状態が、まさに今回塞いだ欠陥の型である。

**(3) の着手前に必要なこと**

1. 本番 run で tier-decision.json が生成され、`validate-tier-decision.py` を通ることを確認する
2. 現行 92 step のうち実際に時間を食っている step を実測する。所要時間の分布を見ずに
   切替を入れると、削っても縮まない step を削って検査だけ減る
3. 切替後に「blocking 集合に居る検査が実際に走った」ことを機械検査する経路を同時に用意する
   (切替と検算はセットで入れる。片方だけ入れると被覆の主張だけが残る)
