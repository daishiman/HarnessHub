---
graph_node_id: "issue-render-out1-unsatisfiable-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["dev-graph","live-trial","criterion","contradiction"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "run-dev-graph-render の OUT1 criterion が現行実装で論理的に充足不能"
owners: ["daishiman"]
created_at: "2026-07-21T18:30:00Z"
updated_at: "2026-07-21T18:30:00Z"
status: "draft"
depends_on: []
related_nodes: []
resource_scope: ["issues/sys-render-out1-unsatisfiable-20260721.md"]
purpose: "register-package.py L240 が 13 子すべてに status=active を要求し、render-graph-html.py L123 が receipt.graph_digest_after == sha256(現 graph) を要求するため、receipt が有効な状態で到達可能な進捗は 0/13 のみ。applied/expected=13/13 と一致させられず OUT1 は充足不能。"
goal: "register-package.py L240 が 13 子すべてに status=active を要求し、render-graph-html.py L123 が receipt.graph_digest_after == sha256(現 graph) を要求するため、receipt が有効な状態で到達可能な進捗は 0/13 のみ。applied/expected=13/13 と一致させられず OUT1 は充足不能。"
scope_in: ["issues/sys-render-out1-unsatisfiable-20260721.md"]
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-render-out1-unsatisfiable-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T18:30:00Z","origin_kind":"manual","source_digest":null,"source_path":"eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/verdict.json","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "run-dev-graph-render の OUT1 criterion が register-package.py の active 強制と render の digest 検査の組合せで論理的に充足不能であることを追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-render-out1-unsatisfiable-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-18T16:20:35Z","missing_sections":[],"status":"complete"}
---

# 概要

`run-dev-graph-render` の OUT1 criterion は、現行実装では到達不能な状態を要求しており、論理的に充足できない。

## 背景と問題

`plugins/dev-graph/skills/run-dev-graph-render/SKILL.md` の OUT1 は次を要求する。

> 生成した HTML/CSS をブラウザで開いた際に追加ランタイム依存なく SVG グラフが表示され、**feature ごとの子 task 進捗 X/Y が registration receipt の applied_count/expected_count と一致し**、表示対象が receipt の source_digest に対応することを受入テストが確認する

## 現在の挙動 (矛盾の証明)

| # | 実装上の制約 | 出典 |
|---|---|---|
| 1 | 登録時、13 子すべてが `status=active` でなければ `ContractError` で拒否される | `register-package.py` L240 |
| 2 | ゆえに登録直後の子進捗は必ず **0/13** | 1 の帰結 |
| 3 | `applied_count` / `expected_count` は **常に 13/13** | exact-13 契約 |
| 4 | render は `receipt["graph_digest_after"] == f"sha256:{graph_sha}"` を要求し、不一致なら落ちる | `render-graph-html.py` L123 `registration receipt graph digest is stale` |
| 5 | 進捗を 13/13 にするには子の status を `done` へ変える必要があり、それは graph の内容を変える | 進捗算出は `render-graph-html.py` L171-175 |

**1〜5 より**: receipt が有効な状態で到達可能な進捗は **0/13 のみ**。進捗を 13/13 にした瞬間に graph digest が変わり receipt が stale になって render 自体が落ちる。

## 期待する挙動

OUT1 が充足可能になり、正直な実走で live-trial が PASS を取れる状態。

## 再現手順またはユースケース

1. exact-13 package を `register-package.py register` で登録する (13 子は active 強制)
2. 進捗を 13/13 にするため 13 子を `upsert-node.py` で done へ変更する
3. `render-graph-html.py --registration-receipt <receipt>` を実行する
4. `registration receipt graph digest is stale` で `ContractError` になる

実測: `eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/pane.txt` L255-294。trial 自身が同じ分析に到達したうえで、**receipt を偽造して回避した** (`issue-live-trial-fixture-receipt-forgery-20260721`)。

## 影響と優先度

- 影響範囲: `run-dev-graph-render` の live-trial acceptance。**何回 trial を回しても PASS にならない**
- 深刻度: high
- 緊急度: 放置すると「正直にやれば必ず FAIL / 緑にするには偽造」という二択を実行者に強いる

## スコープ

- In: OUT1 の文言、または `render-graph-html.py` / `register-package.py` の該当検査
- Out: render の描画ロジック本体 (独立評価で本物と確認済み)

## 関連グラフ

- 発見元: `HarnessHub-s7b` の再々 trial
- 併発: `issue-live-trial-fixture-receipt-forgery-20260721`

## 受入条件

- [ ] 正直な手順 (証跡偽造なし・C02 準拠) で `run-dev-graph-render` の live-trial が goal_fit=PASS を取得できる
- [ ] 是正案 (a)(b)(c) のいずれを採るか決定し、根拠が記録されている

## 是正の選択肢 (いずれも設計判断を要する)

| # | 案 | 影響 |
|---|---|---|
| (a) **推奨** | OUT1 を「子の総数 Y が `expected_count` と一致」に限定し、done 数は問わない | criterion の意図 (登録した 13 件がすべて描画対象になっている) は保てる。最小変更 |
| (b) | render の digest 検査を緩め、登録以降の status 遷移は receipt の有効性を損なわないとする | `graph_digest_after` の意味が変わる。他の利用箇所の確認が要る |
| (c) | `register-package.py` が done 状態での登録を許す | exact-13 の「これから実行する 13 件」という前提が崩れる |

(a) を推す理由: OUT1 が本来確かめたいのは「render の表示が authoritative な receipt と対応している」ことであり、done 数の一致はその代理指標として機能していない (到達不能なので何も検証していない)。

## 検証証跡

- コマンド/テスト: `python3 scripts/lint-live-trial-verdict.py --plugin dev-graph`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/` および `issues/sys-live-trial-digest-rewrite-render-status-20260721.md` §3.4
