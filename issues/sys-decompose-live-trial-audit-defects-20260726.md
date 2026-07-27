---
graph_node_id: "issue-decompose-live-trial-audit-defects-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","decompose","live-trial","vacuous-pass","acceptance-criteria","follow-up","qa-6in4"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "audit_decompose_live_trial.py の 4 欠陥により OUT1 の live-trial 判定が検査として成立していない"
owners: ["daishiman"]
created_at: "2026-07-25T22:59:46Z"
updated_at: "2026-07-26T03:26:44.500539Z"
status: "draft"
depends_on: []
related_nodes: ["issue-guard-graph-schema-interpreter-write-coverage-20260726","issue-render-registration-receipt-contract-mismatch-20260726"]
resource_scope: ["plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py","plugins/dev-graph/tests/test_decompose_live_trial_audit.py"]
purpose: "OUT1 は verify_by:live-trial であり判定が本監査の pass に依存するが、検査の反転・トートロジー・偽の次元・write count の帰属誤りにより pass:true が OUT1 充足を意味しない。特に反転により昇格済み feature を足すと監査が落ちるため被覆改善が構造的に妨げられている"
goal: "監査の各検査が OUT1 の条件と同じ向きを向き、draft ゲートを壊した変異版で監査が落ちる状態にする"
mvp_alignment: null
scope_in: ["draft_candidates を draft ノード集合へ是正し draft_empty ゲートの意味を OUT1 に合わせる","readiness_probe を skill 実装側の述語呼出しへ置換する","binding 3 系列を実際に分岐させるか 1 系列へ畳む","write count を前後状態の差分から導出し dry-run 抑止とゲート抑止を区別する","draft ゲートを壊した変異版で落ちる mutation test"]
scope_out: ["run-dev-graph-decompose SKILL.md の変更 (本課題は tests/fixtures 配下のみ)","binding=beads / github の実 tracker への書込みを伴う live-trial (外部依存のため別課題)","OUT3 (--dry-run の write 0 件) の検証 (別 criteria であり verify_by:test)"]
acceptance: ["feature を confirmed/pass/complete へ昇格させた入力で監査が pass のまま維持される","readiness_probe が skill 実装側の述語を呼んでおり監査スクリプト内の再実装を検査していない","binding 3 系列が異なる観測値を返す入力が存在しテストで固定されている","draft ゲートを意図的に壊した変異版で監査が落ちる","write count が issues/ と .beads/ の前後差分から導出されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-decompose-live-trial-audit-defects-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T22:59:46Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "監査スクリプトのソースを行番号つきで読み、scratchpad 上で入力を昇格させた再実行により draft_empty ゲートが False へ落ちることを実測した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-decompose-live-trial-audit-defects-20260726.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-9ndl","linked_at":"2026-07-26T03:25:49Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-25T22:59:46Z","missing_sections":[],"status":"complete"}
---

## 概要

`plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py` は `run-dev-graph-decompose` の live-trial で `criteria:OUT1` の充足を判定する共通監査ヘルパーであり、`plugins/dev-graph/tests/test_decompose_live_trial_audit.py` が import している (Git index 登録済み)。この監査には 4 つの独立した欠陥があり、いずれも「検査が作動していないのに緑になる」方向へ効く。

OUT1 の正本文言 (SKILL.md 181 行):

> `feature+architecture` DAG は循環なし・task 粒度混入なしで、評価前 draft の Issue 起票は 0 件、tracker 投影は `confirmed/pass/readiness complete` だけに限定する。

## 欠陥 1: 検査の反転 (決定的)

`audit_decompose_live_trial.py:148-155` の `draft_candidates` は、変数名に反して `_is_publication_candidate(node)` (= `confirmed AND pass AND complete`) で絞り込んでいる。つまり「draft ノード」ではなく「**昇格適格ノード**」を数えている。

`audit:333-336` の `draft_empty` ゲートはこの `draft_candidates` が空であることを要求する。したがって:

- fixture 内の全 feature が draft のとき → `draft_candidates` = 0 → `draft_empty` = True → pass
- feature を 1 件でも confirmed/pass/complete へ昇格させると → `draft_candidates` = 1 → `draft_empty` = False → **pass:false**

scratchpad 上で `feat-user-auth-001` を confirmed/pass/complete へ昇格させて再実行し、none/beads/github の 3 系列すべてで `draft_candidates` が 1 になり pass が false へ落ちることを実測した。

すなわちこの監査は、OUT1 が本来要求する「昇格後は起票対象になる」状態では**構造的に合格できない**。「昇格適格ノードが 0 件」の fixture でしか緑にならない。条件の向きが逆になっている。

## 欠陥 2: トートロジー (自己充足)

`audit:158-184` の `readiness_probe` は次の順で動く。

1. `features[0]` を `deepcopy` する。
2. `confirmation_status = 'confirmed'` / `evaluation_status = 'pass'` を強制代入する。
3. 直後に `readiness['status'] = 'incomplete'` を強制代入する (`audit:164`)。
4. 自前の純粋述語 `_is_publication_candidate` が False を返すことを確認する。

これは skill の投影コード経路を一度も呼ばず、監査スクリプト内 5 行の述語関数を検査しているだけである。`excluded_only_by_readiness = true` は、入力を自分で作った上での自明な帰結であり、被験 skill の挙動について何も言っていない。

## 欠陥 3: 偽の次元 (fake dimensionality)

`draft_candidates` の内包表記は `for binding in BINDINGS` でループしているが、ループ変数 `binding` をフィルタ条件に使っていない。結果として `beads` / `github` / `none` の 3 系列は**同一リストを 3 回計算した値**になる。

出力上は独立した 3 観測として報告されるが、原理的に差が出ない。binding 別の挙動差 (OUT1 が要求する「binding=beads は C28 へ、github は C12 へ、none はローカルのみ」) を検査しているように見えて、実際には一度も binding で分岐していない。

## 欠陥 4: Issue 起票 0 件の帰属先誤り

`derived_write_counts` は `audit:329-332` で `int(not suppression_flag)` として算出される。`suppression_flag` は bridge が返す payload の `dry_run: true` / `mutation_suppressed: true` の**エコーを読んだ真偽値**であり、実際に作成された Issue を数えた値ではない。

さらに `audit:303` は draft ノード (`feat-user-auth-001`, `confirmation_status=draft`, `readiness=incomplete`) を `bd-bridge.py` / `gh-bridge.py` へ**ハードコードした `--dry-run` 付きで実際に投入している**。SKILL.md の gotcha は「draft を tracker へ投影しないこと」を求めるが、この構成で起票を止めているのは draft ゲートではなく `--dry-run` フラグである。つまり「ゲートが効いた」ことの証拠にならない。

draft ゲートが壊れていても `--dry-run` があるかぎり write count は 0 のままなので、この監査はゲートの退行を検出できない。

## 影響

- OUT1 は `verify_by: live-trial` であり、live-trial の判定はこの監査ヘルパーの `pass` に依存している。上記 4 欠陥により、`pass: true` は OUT1 の充足を意味しない。
- 特に欠陥 1 は向きが逆なので、**将来 fixture に昇格済み feature を足して OUT1 の肯定側を検証しようとすると監査が落ちる**。真面目に被覆を上げようとすると赤くなる構造になっており、被覆改善を妨げる。
- 欠陥 4 により、draft ゲートの退行が live-trial で検出されない。

## 修正方針

1. **欠陥 1**: `draft_candidates` を名前どおり「draft (= 昇格適格でない) ノード」の集合にする。そのうえで `draft_empty` ゲートを「draft ノードの起票が 0 件」へ読み替える。現在の「昇格適格ノードが 0 件」は OUT1 の要求と無関係なので削る。
2. **欠陥 2**: `readiness_probe` を、skill の投影経路 (実装側の述語) を実際に呼ぶ形へ置き換える。監査スクリプト内の再実装を検査対象にしない。
3. **欠陥 3**: `binding` でフィルタするか、3 系列に分ける意味がないなら 1 系列へ畳む。同一値を 3 つ並べて独立観測に見せない。
4. **欠陥 4**: write count を「bridge のエコー」ではなく「前後状態の差分 (issues/ のファイル数、`.beads/` の行数)」から導出する。draft ゲートの検査は `--dry-run` を外した経路で行い、ゲートが止めたことと dry-run が止めたことを区別できるようにする。

## 受入条件の候補

- `draft_candidates` が draft ノードを数えており、feature を confirmed/pass/complete へ昇格させた入力で監査が pass のまま維持される (現状は落ちる)。
- `readiness_probe` が skill 実装側の述語を呼んでおり、監査スクリプト内の再実装を検査していない。
- binding 3 系列が実際に異なる観測値を返す入力が存在し、テストで固定されている。
- write count が前後状態の差分から導出され、draft ゲートを意図的に壊した変異版で監査が落ちる (mutation test)。
- `--dry-run` なしの経路で draft 起票 0 件が観測できる。

## 検出経緯

2026-07-25 の live-trial 再取得 (HarnessHub-q5h9) で、`run-dev-graph-decompose` の run を独立評価者が検証した際に、監査の `pass: true` が OUT1 の充足を意味しないことが判明した。評価者は監査スクリプトのソースを読み、scratchpad 上で入力を変えた再実行で欠陥 1 の反転を実測した。

## 実行順序の制約

本課題の修正は `audit_decompose_live_trial.py` (tests/fixtures 配下) のみを触るため、`run-dev-graph-decompose` の `SKILL.md` は変わらない。したがって `skill_md_sha256` は動かない。ただし監査を直すと live-trial の判定基準が変わるため、修正後は `run-dev-graph-decompose` の live-trial を 1 回再取得すること。
