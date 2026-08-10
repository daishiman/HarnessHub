---
graph_node_id: "issue-lint-open-residue-ci-red-20260725"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","ci","dev-graph","governance","completion-evidence"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "OR-003 残置 51 件がローカル品質ゲートで恒常 exit 2 / CI では beads 軸未評価のため素通りする"
owners: ["daishiman"]
created_at: "2026-07-25T02:55:00Z"
updated_at: "2026-07-28T04:10:37Z"
status: "closed"
depends_on: []
related_nodes: []
resource_scope: ["plugins/dev-graph/scripts/lint-open-residue.py",".github/workflows/dev-pipeline-lint.yml","tasks/","issues/"]
purpose: "OR-003 を検出できる唯一のゲートが merge をブロックしない位置にあるため、md/graph と beads の乖離が CI からは見えないまま積み上がる。この検出と遮断のズレを解消する"
goal: "OR-003 残置が 0 件になり、かつ残置が再び増えたときに merge 前に気づける状態"
mvp_alignment: null
scope_in: ["OR-003 違反 51 件 (tasks/ 45 件・issues/ 6 件) の completion_evidence.status を beads の終了状態へ整合させる","整合を C02 (upsert-node.py) 経由で行い、graph と markdown の同時更新を保つ","close 時に completion_evidence を進める経路の欠落を特定する (51 件が全て同一 detail のため個別ミスではなく経路の問題)","検出と遮断のズレ (CI では OR-003 未評価) をどう埋めるかを決める"]
scope_out: ["OR-003 以外のルール追加や lint-open-residue 自体の仕様変更","CI ワークフローの continue-on-error 化 (ゲートの無効化は本 issue の解ではない)","_BASELINE_RESIDUE への 51 件の追加 (shrink-only ratchet の趣旨に反する)"]
acceptance: ["Dolt DB のあるローカル環境で `python3 plugins/dev-graph/scripts/lint-open-residue.py --repo-root . --no-require-beads` が exit 0 (beads_axis=resolved であることを JSON で確認)","violations が 0 件、かつ scanned が減っていない (黙って対象を外していない)","_BASELINE_RESIDUE が増えていない (shrink-only)","再発経路を特定した場合は、その修正か、修正 issue の起票のいずれかが行われている","CI で OR-003 が未評価であることの扱い (許容する / beads 軸を CI へ供給する / 別ゲートを置く) が判断され記録されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-lint-open-residue-ci-red-20260725.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T02:55:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-57v (C28 draft status) の最終レビュー中に品質ゲートを再実行して判明した、本変更とは独立の既存 CI red。main でも同様に落ちることを確認済み"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-lint-open-residue-ci-red-20260725.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-wdpq","linked_at":"2026-07-25T02:59:35Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-25T17:35:42Z","evidence_refs":["issues/sys-lint-open-residue-ci-red-20260725.md"],"policy":"manual","reconciled_at":"2026-07-26T01:19:20.811908Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T02:55:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`lint-open-residue` の OR-003 が、**Dolt DB のあるローカル環境では 51 件で exit 2、CI では未評価で素通り**する。検出できる場所と merge を止める場所がズレている。

## 実測 (2026-07-25)

ローカル (Beads の Dolt DB あり):

```bash
python3 plugins/dev-graph/scripts/lint-open-residue.py --repo-root . --no-require-beads
# EXIT=2
```

| 指標 | 実測値 |
|---|---|
| beads_axis | `resolved` (`bd export` から解決) |
| scanned | 255 |
| violations | 51 |
| rule 内訳 | OR-003 が 51 件 (他ルールは 0) |
| path 内訳 | `tasks/` 45 件 / `issues/` 6 件 |

OR-003 の detail は全て同型:

> `beads=closed だが completion_evidence.status='in_progress' (解決済み事象が open のまま残置)`

つまり **Beads 側では閉じているのに、graph/markdown 側の `completion_evidence.status` が終了状態へ進んでいない**、片側だけの完了である。

## CI では落ちない (重要)

`.github/workflows/dev-pipeline-lint.yml` は同じコマンドを `continue-on-error: false` で実行するが、**CI checkout は Beads の Dolt DB を持たない**。lint 側は

```python
beads_axis = "resolved" if beads is not None else "unavailable"
```

で軸を決め、`unavailable` かつ `--no-require-beads` のときは OR-003/OR-004 を評価せず exit 0 で通す (ワークフロー冒頭のコメントにも明記された設計)。したがって **CI は green のまま**であり、赤くなっているのはローカル品質ゲートだけである。

## なぜ放置できないか

1. **検出と遮断のズレ** — OR-003 を検出できる唯一の実行環境 (ローカル) が merge をブロックしない。残置は CI に見えないまま増え続ける。
2. **ローカルゲートの信号消失** — ローカルで「常に 51 件赤」の状態が続くと、52 件目の新規違反に誰も気づかない。

`_BASELINE_RESIDUE` (既知残置の shrink-only allowlist) は `SYS-STAGE0-DISTRIBUTION-GATE-P01..P13` の 13 件だけで、今回の 51 件はそこに含まれない。つまり allowlist で意図的に許容されている残置ではない。

## 想定される根本原因 (未検証)

`bd-bridge.py --op close` が Beads 側の status を closed にする一方、対応する graph node の `completion_evidence.status` を同時に進める経路が無い、もしくは C10 close skill 側でしか進まない可能性がある。51 件が全て同じ detail である点は、個別のうっかりではなく**経路の欠落**を示唆する。

## 本変更 (HarnessHub-57v) との関係

無関係。57v 作業前の clean な main worktree (91b50c3) でも同じ lint が 50 件で exit 2 になることを確認した。57v の worktree で 51 件なのは、本セッションで 57v 自身を close したことによる +1 件。**既存不具合であり、57v が持ち込んだものではない。**

## 対処方針

1. 51 件の `completion_evidence.status` を C02 (`upsert-node.py`) 経由で beads の終了状態へ整合させる (graph と markdown を同時更新)。
2. close 経路のどこで `completion_evidence` が進むべきかを特定する。経路が欠落しているなら、その修正を本 issue か派生 issue で行う。
3. CI で OR-003 が未評価であることの扱いを決める。選択肢は (a) 設計どおりと許容してローカルゲート運用を明文化する、(b) CI へ beads 軸を供給する、(c) git 追跡成果物だけで等価判定できる別ルールを置く。
4. 一括整合の際、`scanned` が減っていないこと・`_BASELINE_RESIDUE` が増えていないことを必ず確認する (対象から外して緑にするのは Goodhart 的な偽の解決)。

## 再現コマンド

```bash
# ローカル (Dolt DB あり): beads_axis=resolved になり OR-003 が評価される
python3 plugins/dev-graph/scripts/lint-open-residue.py --repo-root . --no-require-beads

# JSON で軸と件数を確認
python3 plugins/dev-graph/scripts/lint-open-residue.py --repo-root . --no-require-beads \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['beads_axis'], d['scanned'], d['violation_count'])"
```

## 対処結果 (2026-07-26)

### 1. 一括整合 — OR-003 違反 70 件 → 0 件

最新 `origin/main` 取り込み後の Beads DB を正として再計測し、C02 の単一 writer
(`upsert-node.py`) 経由で 70 node の `completion_evidence` を終了状態へ整合させた。
起票時 51 件、先行実行時 55 件だったが、その後の main 追加・Beads close により
本作業開始時点では 70 件へ増えていた。

| 指標 | 整合前 | 整合後 |
|---|---:|---:|
| `beads_axis` | `resolved` | `resolved` |
| `scanned` | 299 | 299 |
| `violations` | 70 (全て OR-003) | **0** |
| `baselined_residue` | 12 | 12 |
| exit code | 2 | **0** |

`scanned` を減らして対象外にしたり、`_BASELINE_RESIDUE` を増やしたりして緑にしていない。
内訳は task 60 件・issue 10 件。全 70 件の受領書で
`body_source=preserved` / `replaced_body_lines=null` を確認し、本文 SHA-256 も前後一致した。
graph revision は 624 → 694 で、70 件ちょうど進んだ。

整合後の証跡は次の意味に統一した。

```json
{
  "policy": "manual",
  "status": "done",
  "source": "reconciliation",
  "completed_at": "<Beads の closed_at>",
  "reconciled_at": "<整合実行時刻>",
  "evidence_refs": ["issues/sys-lint-open-residue-ci-red-20260725.md"]
}
```

### 2. 再発経路 — `local_only` と PR 待機 policy の不一致

70 件すべてが `github_publication.mode=local_only` かつ PR 紐付け 0 件だった。
整合前 policy は `linked_pr_merged_all` が 64 件、`manual` が 6 件である。

`linked_pr_merged_all` は実 PR の merge を待つが、`local_only` node は PR を作らないため
条件が永久に成立しない。`bd-bridge.py --op close` も Beads だけを閉じ、
graph の `completion_evidence` を進める経路を持っていなかった。
個別ミスではなく、運用モードと完了 policy の構造的な不一致である。

恒久対処は Beads `HarnessHub-n7gw`
(`issue-completion-evidence-local-only-gap-20260726`) で追跡する。

### 3. CI での扱い — ローカルゲートを正とする

CI へ Dolt DB を復元せず、OR-003/OR-004 は Dolt DB のあるローカル環境の
`lint-open-residue.py --no-require-beads` が担う現行設計を維持する。

- `.beads/issues.jsonl` は受動エクスポートであり、状態判定の正本にはしない。
- CI に Dolt DB を復元すると、CI の成否が Beads 同期状態へ依存し、脆弱性と実行時間が増す。
- 残置を 0 件へ戻したため、次の +1 件をローカルゲートで即時検出できる。

この CI/ローカルの非対称は `.github/workflows/dev-pipeline-lint.yml` 冒頭の既存コメントどおりで、
CI は git 追跡成果物だけで判定できる OR-001/OR-002 を強制する。

## 最新 main 再統合後の再確認 (2026-07-26)

作業中に進んだ `origin/main` (`8e8f9a4`) を追加で fast-forward し、main 側の
新規 4 node・更新 8 node を C02 経由で意味的に統合した。全 12 node の本文は保持され、
`replaced_body_lines` は全件 `null` だった。

再統合後の `lint-open-residue.py --no-require-beads` は
`beads_axis=resolved`、`scanned=303`、`violations=0`、`baselined_residue=12`、
exit code 0 である。走査数は main の新規 Beads node 4 件分増えており、対象を減らして
緑にしたものではない。

再発防止課題 `HarnessHub-n7gw` では、既存 165 node と main 追加後に見つかった 2 node、
合計 167 node の PR 待機 policy を `manual` へ C02 移行した。完了状態は変更せず、
全件で本文 SHA-256 の前後一致を確認した。新規 package 登録も
`register-package.py` が local-only binding の PR 待機 policy を `manual` へ正規化するため、
移行後の到達不能 node は 0 件である。
