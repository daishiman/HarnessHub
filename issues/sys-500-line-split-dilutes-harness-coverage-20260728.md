---
graph_node_id: "issue-500-line-split-dilutes-harness-coverage-20260728"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","harness-coverage","ratchet","500-line-rule","goodhart"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "500 行分割が harness coverage の分母を希釈し ratchet を回帰させる"
owners: ["daishiman"]
created_at: "2026-07-28T00:20:00Z"
updated_at: "2026-07-28T00:22:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-hooks-entry-point-parity-generalization-20260728"]
resource_scope: ["scripts/validate-harness-coverage.py","eval-log/harness-coverage-floor.json","eval-log/coverage/scripts"]
purpose: "validate-harness-coverage.py の scripts/llm_eval は分母を scripts/*.py と plugins/*/**/scripts/*.py のファイル数、分子を code-review verdict が PASS のファイル数で数える。500 行分割規約に従って 1 実装を責務別ファイルへ割ると、分母だけが増えて分子は増えないため、コードの実質が変わらないまま率が下がり ratchet が回帰として検出する。2026-07-28 に実測で 64.1% -> 63.1% の回帰が発生し、7 件を除いた実測は 64.2% で floor 超えだったため、回帰の全量が分母希釈に由来することが確認された"
goal: "500 行分割で coverage 率が下がらない数え方を確定し、分割のたびに floor を手動 reset する運用を不要にする"
scope_in: ["分母の単位をファイル数から entry point 単位 (単体起動される script) へ変えるべきか評価する","import 専用 support module を分母から除外する場合の Goodhart リスク (測定対象を減らして率を上げる) を評価する","分割元 script の verdict を分割先へ引き継ぐ仕組みの是非を評価する","--update-floor が note を固定文字列で上書きし過去の baseline reset 経緯を消す問題を是正する"]
scope_out: ["llm_eval verdict そのものの生成 (workflow-code-review の実行)","80% 閾値の変更","mechanical 軸 (pytest-cov) の数え方"]
acceptance: ["500 行分割のみを行う変更で scripts/llm_eval の ratchet が回帰しないことが検証できる","分母定義を変更する場合、測定対象を減らすことで率が上がる Goodhart 経路が閉じていることが説明されている","--update-floor 実行後に floor note の履歴が失われない","本課題の判断が eval-log/harness-coverage-floor.json の note または architecture へ記録されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-500-line-split-dilutes-harness-coverage-20260728.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-28T00:20:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "500 行分割規約と harness coverage ratchet が構造的に衝突する再現可能な追跡課題"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-500-line-split-dilutes-harness-coverage-20260728.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-2mor","linked_at":"2026-07-28T00:22:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-28T00:20:00Z","missing_sections":[],"status":"complete"}
---

# 概要

500 行分割規約に従って 1 実装を責務別ファイルへ割ると、`validate-harness-coverage.py` の `scripts/llm_eval` は**分母だけが増えて分子は増えない**ため、コードの実質が変わらないまま率が下がり、`make harness-ratchet` が回帰として検出する。

## 背景と問題

`scripts/llm_eval` の算出は次のとおり。

- 分母 = `scripts/*.py` + `plugins/*/**/scripts/*.py` のファイル数
- 分子 = `eval-log/coverage/scripts/<slug>.json` の `llm_eval.verdict` が PASS のファイル数

したがって **1 ファイルを 5 ファイルへ分割すると、分母が +4、分子は +0** になる。分割は品質を下げていないのに、指標だけが下がる。

2026-07-28 (`HarnessHub-6in4` / PR #82) で実測された回帰は次のとおり。

| 項目 | 値 |
|---|---|
| 分母 / 分子 | 412 / 260 = **63.1%** |
| floor | 64.1% |
| 新規 7 件を除いた実測 | **64.2%** (floor 超え) |
| 分割元 `upsert-node.py` の verdict | PASS / score 91 (失われていない) |

**回帰の全量が分母希釈に由来する。**新規に加わった 7 件は次のとおり。

- `plugins/dev-graph/scripts/build-graph-store.py` — 新規 CLI writer
- `plugins/dev-graph/scripts/build-repo-config.py` — 新規 CLI writer
- `plugins/dev-graph/scripts/node_body.py` — 500 行分割の support module
- `plugins/dev-graph/scripts/node_lifecycle.py` — 同上
- `plugins/dev-graph/scripts/registration_preflight.py` — 同上
- `plugins/dev-graph/scripts/registration_schema.py` — 同上
- `scripts/lint-script-naming-pending-paths.py` — 命名例外台帳の分離

このうち後半 5 件は**単体起動されない import 専用 support module**であり、`hooks` 側で同型の問題を解いた `entry_points` の件（`HarnessHub-vf66`）と構造が一致する。

## 暫定対応 (2026-07-28)

先例 2 件（2026-07-12 の plugins/ 再編、2026-07-23 の `HarnessHub-aoe`）に倣い、floor を実測値へ手動 baseline reset した（64.1% → 63.1%）。

`--update-floor` は `max(old, 現値)` で回帰時は据え置く設計のため使えない。また `--update-floor` は floor note を固定文字列で上書きするため、**過去の baseline reset 経緯が消える**。今回は実行後に note を復元・追記している。

verdict を自分で書いて率を戻す道は取らない。floor note が明示するとおり、それは「evaluation の捏造による緑化」であり Goodhart そのものになる。

## 検討軸

| 軸 | 論点 |
|---|---|
| 分母の単位 | ファイル数から entry point 単位（単体起動される script）へ変えるか。`_is_import_only_support_module()` 相当の判定を共有できる |
| Goodhart リスク | 分母から除外する方向の変更は「測定対象を減らして率を上げる」経路になりうる。除外条件が実体（起動されない）に接地しているかが分かれ目 |
| verdict の継承 | 分割元の verdict を分割先へ引き継ぐ仕組みの是非。コードが変わっているのに verdict だけ複製すると、これも捏造に近づく |
| note の保全 | `--update-floor` が note を固定文字列で上書きする挙動そのものを直す |

## 影響

- 影響範囲: 500 行分割を行うすべての PR。分割のたびに floor の手動 reset が必要になり、そのたびに「本当に品質が下がったのか」の判断コストが発生する。
- 緊急度: 中。ratchet は回帰を正しく検出しており fail-open ではない。ただし手動 reset の反復は、いずれ「とりあえず下げる」運用へ退化する。

## 関連

- `HarnessHub-6in4` — 本課題を派生させた guard fail-open 是正（PR #82）
- `HarnessHub-vf66` — `hooks` 側の同型課題（entry point の宣言・登録 parity）
- `HarnessHub-aoe` — 2026-07-23 の同型 baseline reset
- `arch-harness-hub-dev-workflow` — 「500 行分割規約が entry point 宣言契約と衝突する」差分追記（2026-07-28）
- `HarnessHub-nq2` — 2026-07-28、C08 一次 GET 手段 (`validate-primary-source.py`) の 500 行超過分割
  (`primary_source_http.py` 切出し) による同型 4 例目の baseline reset (`scripts.llm_eval` 63.1% → 62.8%)
