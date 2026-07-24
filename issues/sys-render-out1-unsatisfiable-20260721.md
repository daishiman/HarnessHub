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
updated_at: "2026-07-23T10:25:46.615020Z"
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
beads_linkage: {"bd_issue_id":"HarnessHub-rix","linked_at":"2026-07-23T10:11:37Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-18T16:20:35Z","missing_sections":[],"status":"complete"}
---

# 概要

`run-dev-graph-render` の OUT1 criterion は文言が曖昧で、2 通りに読める。**強い読み**を採ると現行実装では到達不能な状態を要求することになり、論理的に充足できない。

## 背景と問題

`plugins/dev-graph/skills/run-dev-graph-render/SKILL.md` の OUT1 は次を要求する。

> 生成した HTML/CSS をブラウザで開いた際に追加ランタイム依存なく SVG グラフが表示され、**feature ごとの子 task 進捗 X/Y が registration receipt の applied_count/expected_count と一致し**、表示対象が receipt の source_digest に対応することを受入テストが確認する

### 「一致」の 2 通りの読み

| 読み | 要求 | 現行実装での成否 |
|---|---|---|
| **弱い読み** | Y (子の総数) == `expected_count` のみ。done 数は問わない | **既に成立** |
| **強い読み** | X (done 数) == `applied_count` かつ Y == `expected_count` | **到達不能** (下記 §現在の挙動) |

**実装は弱い読みで書かれている。** 根拠は 2 つある。

- `render-graph-html.py` L118-119 が照合するのは `len(child_nodes) != receipt["applied_count"]`、すなわち**子の総数**であり done 数ではない
- 既存テスト `plugins/dev-graph/tests/test_sync_render_schedule_v2.py` L207-240 は、`applied_count=13` の receipt に対し `{"done": 4, "total": 13}` を **exit 0 で期待**している。done 数が receipt と一致しない状態を正常系として固定している

したがって本 issue の本質は「criterion と実装の矛盾」ではなく、**criterion 文言の曖昧さである**。r7 の live-trial は task.md でこれを強い読みに固定した (`20260721T180000-r7/task.md` L18/L23/L29 が「13/13」を明示) ため到達不能に陥った。

## 現在の挙動 (強い読みを採った場合の矛盾の証明)

| # | 実装上の制約 | 出典 |
|---|---|---|
| 1 | 登録時、13 子すべてが `status=active` でなければ `ContractError` で拒否される | `register-package.py` L240 |
| 2 | ゆえに登録直後の子進捗は必ず **0/13** | 1 の帰結 |
| 3 | `applied_count` / `expected_count` は **常に 13/13** | exact-13 契約 |
| 4 | render は `receipt["graph_digest_after"] == f"sha256:{graph_sha}"` を要求し、不一致なら落ちる | `render-graph-html.py` L123 `registration receipt graph digest is stale` |
| 5 | 進捗を 13/13 にするには子の status を `done` へ変える必要があり、それは graph の内容を変える | 進捗算出は `render-graph-html.py` L171-175 |

**1〜5 より**: `register-package.py` が発行した receipt を保持したまま到達可能な進捗は **0/13 のみ**。進捗を 13/13 にした瞬間に graph digest が変わり receipt が stale になって render 自体が落ちる。

回避経路が無いことは独立検証で確認済み (fixture を複製して実走)。

| 試した経路 | 結果 |
|---|---|
| 13 子を done 化してから receipt 付き render | `registration receipt graph digest is stale` |
| done 化後に `register-package.py` を再実行して receipt を再発行 | L441-442 `duplicate node ids have different content for the same source digest` で拒否。冪等分岐 L412-433 は**古い receipt をそのまま返す**ため新 digest が出ない |
| 新世代 package として supersede 登録 | 登録は成功するが L449/L453-458 で 13 子が `active` に戻り、再び `{done: 0, total: 13}` |

## 期待する挙動

OUT1 の文言が一意に読める状態。**弱い読みを正文化すれば実装変更なしで充足可能**であり、その場合は正直な実走で live-trial が PASS を取れる。

## 再現手順またはユースケース

1. exact-13 package を `register-package.py register` で登録する (13 子は active 強制)
2. 進捗を 13/13 にするため 13 子を `upsert-node.py` で done へ変更する
3. `render-graph-html.py --registration-receipt <receipt>` を実行する
4. `registration receipt graph digest is stale` で `ContractError` になる

実測: `eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/pane.txt` L255-294。trial 自身が同じ分析に到達したうえで、**receipt を偽造して回避した** (`issue-live-trial-fixture-receipt-forgery-20260721`)。

## 影響と優先度

- 影響範囲: `run-dev-graph-render` の live-trial acceptance。**強い読みを採るシナリオで trial を回す限り PASS にならない**
- 深刻度: high
- 緊急度: 放置すると「正直にやれば必ず FAIL / 緑にするには偽造」という二択を実行者に強いる。r7 は実際に後者を選んだ
- 補足: シナリオ (task.md) を弱い読みに合わせて書き直せば PASS の余地はある。ただし criterion が曖昧なままだと**次の実行者がまた強い読みを採りうる**ため、文言の確定は依然として必要

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

(a) を推す理由は 2 つある。

1. OUT1 が本来確かめたいのは「render の表示が authoritative な receipt と対応している」ことであり、done 数の一致はその代理指標として機能していない (到達不能なので何も検証していない)
2. **(a) は実装変更ではなく実装意図の正文化にすぎない。** `render-graph-html.py` L118-119 は既に「子の総数 == `applied_count`」だけを照合しており、既存テスト `test_sync_render_schedule_v2.py` L207-240 は `{"done": 4, "total": 13}` を正常系として固定している。(b)(c) は挙動を変えるが、(a) は文言を実装に合わせるだけで済む

## 検証証跡

- コマンド/テスト: `python3 scripts/lint-live-trial-verdict.py --plugin dev-graph`
- 証跡 path: `eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/` および `issues/sys-live-trial-digest-rewrite-render-status-20260721.md` §3.4
