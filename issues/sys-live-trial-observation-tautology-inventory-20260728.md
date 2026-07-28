---
graph_node_id: "issue-live-trial-observation-tautology-inventory-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","live-trial","evaluation","goodhart"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "live-trial scenario の required_observations に残る恒真観測を棚卸しし、非空虚性・in-run negative control・恒真性の自己申告で解消する"
owners: ["daishiman"]
created_at: "2026-07-28T00:00:00Z"
updated_at: "2026-07-28T00:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-c14-publication-probe-tautology-20260726"]
resource_scope: ["plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json","eval-log/dev-graph/run-dev-graph-node/","eval-log/dev-graph/run-dev-graph-render/","eval-log/dev-graph/run-dev-graph-system-spec/"]
purpose: "HarnessHub-ojh6 で C14 の恒真式を解消した際、同じ欠陥型が他 scenario に残っていないかの棚卸しが scope_out として切り出されていた。棚卸しの結果 C02/C05/C19 に 3 件の恒真観測が実在し、いずれも被験 skill の実装を削除しても受領書が緑のままになる"
goal: "C02/C05/C19 の該当観測が、被験 skill の挙動を変えたときに赤くなる形へ書き換えられ、恒真な field は受領書自身が恒真であると自己申告している状態"
mvp_alignment: null
scope_in: ["C02-OUT1 obs2 の fixture へ feature 入力を加え、契約外 feature の拒否と契約内 feature の受理を両クラスで測る","C05-OUT1 obs1 に applied_count != expected_count の receipt を渡す in-run negative control を追加し、renderer の描画拒否を実測する","C19-OUT1 obs2 後半 (run 非依存の静的性質) を run の観測から分離し、静的検査として位置づけ直す","非恒真と判定した C15-OUT1 obs0 / C03-OUT1 obs1 の判定根拠を scenario 側へ記録し、将来 fixture を縮小したときに空虚化する退行を検出できるようにする"]
scope_out: ["被験 skill 本体 (C02/C05/C19 の SKILL.md) の挙動変更 — 検証側の欠陥であり skill の欠陥ではない","C14 の恒真式そのものの解消 (HarnessHub-ojh6 で完了済み)","graph-node.schema.json の制約緩和"]
acceptance: ["C02-OUT1 obs2 が、契約外 feature を含む入力に対して拒否を実測し、その実例が fixture に存在することがテストで示されている","C05-OUT1 obs1 が、成果物の存在から含意されない形 (独立再計算または in-run negative control) で測られている","C19-OUT1 obs2 の run 非依存部分が run の観測から分離されている","恒真性を排除できない観測については、受領書に恒真である旨の自己申告 field が出力され、evidence として使わない旨が task 契約に明記されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-live-trial-observation-tautology-inventory-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:00:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-ojh6 の残課題 #4 (同型の恒真 probe の棚卸し) の成果。ojh6 の scope_out が別課題として切り出していた範囲にあたる"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-live-trial-observation-tautology-inventory-20260728.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-31k5","linked_at":"2026-07-28T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`HarnessHub-ojh6` (C14 publication probe の恒真式) の解決時に、同じ欠陥型が他の
live-trial scenario に無いかを棚卸しした。ojh6 の `scope_out` が
「他 skill の live-trial 監査ヘルパーへの横展開 (別途棚卸しが必要)」として
切り出していた作業にあたる。

**欠陥型の定義**: ある観測 (`required_observations` の 1 項目) が、被験 skill の挙動と
無関係に真になる状態。典型は次の 3 形。

1. **入力起因の空虚性** — 判定対象の実例が fixture に 1 件も無く、「違反 0 件」が
   検査の成果ではなく入力の副産物になっている。実装を削除しても緑のまま。
2. **成果物の存在による含意** — 成果物が存在する時点で観測が既に真。
   「不一致なら生成を拒否する」機構の下流で不一致の不在を観測するのがこれ。
3. **run 非依存の静的性質** — run を 1 度も実行しなくても真偽が決まる
   リポジトリの性質を、run の観測として記載している。

# 棚卸しの範囲と方法

- 対象: `plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json` の
  全 9 scenario の `required_observations` と、その `fixture_contract`。
- 監査ヘルパー (`audit_*.py`) は `plugins/dev-graph/tests/fixtures/` の 2 本
  (`audit_decompose_live_trial.py` / `audit_live_trial_state.py`) のみで、
  他 plugin には存在しない。したがって **「同型の恒真 probe」は監査ヘルパー層には
  他に無く、リスクは scenario 契約の観測文側に移っている**。これが棚卸しの主結論。
- 判定は契約文の読解だけで終わらせず、非恒真と判断したものは実成果物で裏を取った。

# 検出結果

| scenario | 観測 | 判定 | 根拠 |
| --- | --- | --- | --- |
| `C02-OUT1-positive-mixed-artifacts` obs2 | "no feature is created outside the C14 macro-feature contract" | **恒真 (型 1)** | `fixture_contract` が供給するのは issue / task / specification / architecture / document の 5 種で **feature を 1 件も含まない**。よって「契約外の feature 作成 0 件」は入力の副産物。C02 側の feature 禁止実装を削除しても観測は緑のまま |
| `C05-OUT1-positive-feature-progress` obs1 | 進捗の分母 = registration receipt の `applied_count` = `expected_count` | **恒真 (型 2)** | 観測文自身が "which the renderer already refuses to render when they disagree" と述べている。描画物が存在する時点で等式は成立済み。同 scenario の obs2 は分子について "recomputed independently from the graph store rather than read back from the receipt" と型 2 を明示回避しており、分母だけ回避が漏れている |
| `C19-OUT1-positive-system-spec-lineage` obs2 後半 | "no duplicate elicitation or compile logic appears in dev-graph" | **run 非依存 (型 3)** | リポジトリの静的性質であり、live-trial を実行しなくても真偽が決まる。前半 ("registration occurs only through C02") は run の観測なので、後半だけ性質が異なる |
| `C15-OUT1-positive-ready-set-r16` obs0 | overlapping `resource_scope` の対が同一 batch に入らない | 非恒真 (問題なし) | 実成果物 `run-dev-graph-schedule-execution.json` を実測: `conflict_pairs` に `ready_pair(LT-SCHED-001, LT-SCHED-002)` が実在し、`batches.tasks` は `[001,003]` / `[002,006]` と両者を分離。`max_parallel=2` で batch サイズも 2 あり、「1 件ずつだから衝突しない」形にもなっていない |
| `C03-OUT1-positive-second-sync-zero` obs1 | 2 回目 sync が imports/exports ともに 0 件 | 非恒真 (問題なし) | `fixture_contract` が "one valid import and one valid export" を保証し、obs0 が 1 回目の非ゼロ適用を要求している。2 回目の 0 件は 1 回目の非ゼロと対で意味を持つ |
| その他の scenario の観測 | — | 非恒真 | 判定対象の実例が fixture 側で保証されているか、観測が独立再計算に基づく |

# 対処方針 (ojh6 で確立した型を流用する)

ojh6 で有効だった手当ては 3 つあり、そのまま適用できる。

1. **非空虚性を合格条件へ昇格する** — 「違反が無い」だけでなく「違反しうる実例が
   あったうえで違反が無い」を要求する。ojh6 の `publication.discriminating` に相当。
   C02 obs2 なら fixture へ feature 入力を 1 件加え、契約外の feature が拒否され、
   契約内 (C14 経由) の feature は通ることを両クラスで測る。
2. **in-run negative control** — 観測を待つ代わりに、その run の実データから違反の
   反例を合成して正準検査へ通し、拒否されることを確認する。ojh6 の
   `gate_negative_controls` に相当。C05 obs1 なら `applied_count != expected_count` の
   receipt を渡して renderer が描画を拒否することを in-run で確かめる。
3. **恒真性の自己申告** — 恒真な field を消せない場合は、受領書自身に
   「これは恒真であり証拠ではない」を出力させ、evidence に使わせない。ojh6 の
   `publication.gate_respected_vacuous` に相当。C19 obs2 後半は run の観測ではないと
   明記し、静的 lint として分離する。

# 参考

- 親課題: `HarnessHub-ojh6` / `issues/sys-c14-publication-probe-tautology-20260726.md`
- ojh6 の解決で追加した実装: `audit_decompose_live_trial.py` の
  `_projection_evidence` / `_evidence_binding` / `_gate_negative_controls`
- 恒真化の温床になる設計: 判定対象を SUT の produced artifact ではなく検査側が
  用意した値から導くこと。投影先を gate 述語から導くと blocked 集合と定義上素集合になり、
  「gate 違反 0 件」が構造的に決まってしまう (ojh6 残課題 #1 と同じ形)
