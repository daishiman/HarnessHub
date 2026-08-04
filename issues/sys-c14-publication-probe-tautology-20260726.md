---
graph_node_id: "issue-c14-publication-probe-tautology-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","live-trial","evaluation","goodhart","schema"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "C14 scenario が canonical schema 上ありえない検体を要求しており OUT1 後半が原理的に検証不能な状態を解消する"
owners: ["daishiman"]
created_at: "2026-07-26T00:00:00Z"
updated_at: "2026-07-26T03:40:00Z"
status: "done"
depends_on: []
related_nodes: ["issue-bd-external-ref-orphan-nodes-20260725"]
resource_scope: ["plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json","plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py","plugins/dev-graph/schemas/graph-node.schema.json","eval-log/dev-graph/run-dev-graph-decompose/"]
purpose: "C14 OUT1 は 2 連言だが、後半 (昇格後だけ起票対象になる) を測る scenario 契約が canonical schema と矛盾して充足不能であり、監査はその状態を deepcopy + 強制代入でしか作れず恒真式になっている。結果として gate 実装を削除しても受領書が緑のままになる"
goal: "C14 OUT1 後半が schema-valid な検体で実測され、gate を壊したときに live-trial が赤くなる状態"
mvp_alignment: null
scope_in: ["scenario fixture_contract の要求検体を schema-valid な状態へ書き換える (例: confirmed + evaluation_status=pending + readiness incomplete は allOf[7] の制約外で成立しうる)","_publication_measurements の readiness_probe を deepcopy + 強制代入から実 preview node の判定へ変更する","audit が preview['nodes'] だけを見て preview['features'] を無視している点を、どちらが正本かを決めたうえで統一する","draft_candidates の内包表記が binding を実際に参照するよう修正する","gate を壊した preview で audit が pass=false になる negative control を追加する"]
scope_out: ["graph-node.schema.json allOf[7] の制約緩和 (evaluation_status=pass ⟹ readiness complete は健全な不変条件であり、テストの都合で緩めてはならない)","run-dev-graph-decompose SKILL.md 本体の変更 (skill の挙動ではなく検証側の欠陥である)","他 skill の live-trial 監査ヘルパーへの横展開 (別途棚卸しが必要)"]
acceptance: ["scenario が要求する検体状態が graph-node.schema.json で valid であることが検証されている","readiness_probe が deepcopy + 強制代入を行わず実 preview node を判定している","gate を満たす node を含む preview では draft_candidates が非空、満たさない preview では空になることがテストで示されている","draft_candidates が binding ごとに異なりうることがテストで示されている","preview['nodes'] と preview['features'] のどちらが監査の正本かが明文化され、両者が乖離した preview を audit が pass=false で拒否する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-c14-publication-probe-tautology-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T00:00:00Z","origin_kind":"generated","source_digest":"43336931b9d84c400dc5782da751ef86682e031b5169643c25778584c065cd86","source_path":"system-spec/dev-workflow.md","source_plugin":"dev-graph","source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-mfh7 の live-trial 再取得中に fresh evaluator が 2 回にわたり検出した検証系の欠陥。mfh7 の変更 (bd-bridge.py) とは無関係の既存不具合で resource_scope も重ならないため切り出した"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-c14-publication-probe-tautology-20260726.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-ojh6","linked_at":"2026-07-26T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-26T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`HarnessHub-mfh7` で C28 `bd-bridge.py` を変更した結果、C03/C14/C15 の
`skill_dir_tree_sha` (挙動閉包 digest) が変化し、live-trial 受領書の取り直しが必要になった。
その再取得中、C14 の独立判定者 (fresh evaluator) が **検証系そのものの欠陥** を検出した。

これは mfh7 の変更が壊したものではない。**以前から存在し、過去の受領書もこの欠陥の上に
乗っていた**。digest が変わって取り直しが発生したことで、はじめて露出した。

## 根本原因: scenario 契約が canonical schema と矛盾している

C14 OUT1 は 2 連言である (SKILL.md L70)。

> マクロ分解結果の DAG が循環なし・粒度閾値内で、**評価前 draft は Issue 起票 0 件**、
> **confirmed/pass/readiness complete への昇格後だけ起票対象になる**

後半を測るため、`live-trial-positive-scenarios.json` の C14 `fixture_contract` は
次の検体を run 中に作ることを要求する。

> The run must additionally promote at least one produced feature to **confirmed with
> evaluation-pass while its implementation_readiness stays incomplete**, so the
> publication-candidate gate has to evaluate readiness and exclude it;
> a candidate set that is empty only because every node is draft leaves the readiness
> condition untested and does not satisfy the contract.

ところが `plugins/dev-graph/schemas/graph-node.schema.json` の `allOf[7]` は、
`evaluation_status == "pass"` のとき次を**すべて**強制する。

- `confirmation_status == "confirmed"`
- `implementation_readiness.status == "complete"`
- `implementation_readiness.missing_sections` が空 (`maxItems: 0`)
- `confirmation_evidence.evaluator` / `.evidence_ref` / `.evaluated_digest` が非空文字列

つまり **「confirmed + evaluation pass + readiness incomplete」は schema-valid な node として
存在し得ない**。scenario の契約は充足不能である。

この不変条件そのものは健全であり、緩めてはならない (`scope_out`)。直すべきは契約側である。

## 派生している症状

### 1. `readiness_probe` が恒真式になっている

`audit_decompose_live_trial.py:_publication_measurements()` は、存在し得ない検体を
作るために `features[0]` を deepcopy して監査側で値を代入している。

```python
probe = copy.deepcopy(features[0])
probe["confirmation_status"] = "confirmed"
probe["evaluation_status"]   = "pass"
readiness["status"]          = "incomplete"   # ← 監査側が自分で代入
...
"excluded_only_by_readiness": (
    conditions["confirmation_confirmed"]      # 自分で代入したので必ず True
    and conditions["evaluation_pass"]         # 同上
    and not conditions["readiness_complete"]  # 自分で incomplete にしたので必ず True
    and not _is_publication_candidate(probe)  # readiness incomplete なので必ず True
)
```

4 連言がすべて自分の代入から導かれるため、`features` が非空なら **常に `true`**。
判定対象は skill が作った node ではなく監査自身が組み立てた dict であり、
**skill 側の publication gate は一度も呼ばれない**。gate 実装を丸ごと削除しても緑のままになる。

これは手抜きではなく、**充足不能な契約を満たしたことにするための唯一の手段**として
そうなっている。症状であって原因ではない。

### 2. `nodes[]` と `features[]` のどちらが正本か決まっていない

`audit_decompose_live_trial.py:289` は監査対象を `preview["nodes"]` から取る。

```python
features = [node for node in nodes if node.get("artifact_kind") == "feature"]
```

`preview["features"]` は一切読まれない。2026-07-26 の再実走ではこの乖離が実害を出した
(下記「観測された実害」)。

### 3. `draft_candidates` が binding を参照していない

```python
draft = {
    binding: [n["graph_node_id"] for n in features if _is_publication_candidate(n)]
    for binding in BINDINGS   # ← 本体で binding を使っていない
}
```

`none` / `beads` / `github` に同一集合が入る。「binding 別に 0 件」という証跡は、
1 つの集合を 3 回書き写しただけで、binding 別の投影規律を何も示していない。

## 観測された実害 (2026-07-26 の 2 回の再実走)

| run | 結果 | 内容 |
|---|---|---|
| `20260725T235607Z-mfh7-decompose-fixed` | FAIL | produced node が全て draft のまま。候補集合が「全部 draft だから空」で、契約が明文で不成立と定めた状態そのもの |
| `20260726T110000Z-mfh7-decompose-promote` | FAIL | task.md に昇格ステップを追加したが、監査が読まない `features[]` 側にしか昇格が入らなかった。さらに 1 回目 audit が schema_violation 5 件で `pass=false` になった後、**`nodes[]` の昇格だけを draft へ差し戻して 2 回目を `pass=true`** にしており、同一 `graph_node_id` が `nodes[]` で draft・`features[]` で confirmed という自己矛盾した成果物が残った |

2 本目は「昇格を指示すれば測れるはず」という仮説の反証になっている。**schema が禁じている
以上、run 側の工夫では到達できない**。契約と監査の両方を直す必要がある。

## 影響

- C14 OUT1 の受領書は「後半が未検証」のまま PASS になりうる。実際、過去の受領書は
  恒真 field の上に乗っていた。
- 恒真 field が evidence として `progress.json` に記録されるため、**証跡の見た目は厚いのに
  判別力がゼロ**という Goodhart 型の緑化になる。
- 同型の欠陥が他 skill の監査ヘルパーにもある可能性があり、棚卸しが要る (`scope_out`)。

## mfh7 側での扱い

当初の方針は「C14 の PASS 受領書は取得しない。捏造した緑より、原因が特定された赤のほうが
安全であるため」だった。その後、本 issue の修正を先に完了させたため、**修正後の検証系で
PASS 受領書を取得する**方針へ切り替えた。C03 / C15 の受領書は取得済みで緑。

# 解決 (2026-07-26)

## 契約側 (`live-trial-positive-scenarios.json`, C14 の 3 行のみ変更)

`fixture_contract` の要求を、schema で存在し得ない検体から**両クラスの実例**へ置き換えた。

- draft を 1 件以上残し、別の 1 件以上を schema-valid な confirmed / evaluation-pass /
  readiness-complete (`confirmation_evidence` 付き) へ昇格させる
- 「confirmed + pass + readiness incomplete」の検体は**要求してはならない**旨を明記した
  (allOf[7] が含意するため存在せず、監査に捏造を強いる)

`required_observations` も、昇格 node が候補になり draft は除外され続けること (= gate が
両クラスを判別すること)、および `--binding none` 下で beads/github の projection target が
空であることへ書き換えた。

## 監査側 (`audit_decompose_live_trial.py`)

`readiness_probe` と `copy.deepcopy` による合成検体を**削除**し、実 preview node だけから
導出する 4 関数へ置き換えた。

| 関数 | 責務 |
|---|---|
| `_gate_conditions` | 3 条件を個別に真偽で返す (どの節で落ちたかを保持) |
| `_is_publication_candidate` | 上記の全称 |
| `_resolved_binding` | `repo-config-default` 残留を `AuditError` で拒否 (binding 解決が走っていない徴候を黙って none へ倒さない) |
| `_publication_measurements` | promoted / blocked / binding 別 projection_targets / `discriminating` |
| `_preview_consistency` | `nodes` を唯一の正本と定め、mirror array との乖離と `absent_from_nodes` を検出 |

`passed` の判定に `gate_respected` / `discriminating is True` /
`external_projection_empty` / `preview_consistency["consistent"]` を追加した。

`discriminating` が非空虚性 (non-vacuity) の要である。全 draft でも候補集合は空になるが、
それは gate の成果ではなく「誰も昇格していない」の副産物なので、両クラスが揃ったときだけ
「gate を観測した」と認める。

## 述語の readiness 節の扱い

schema-valid な node では readiness 節は `evaluation_status == "pass"` から含意されるため、
「readiness だけで落ちた」は**原理的に観測不能**である。よって責務を分離した。

- live-trial → 実 node と実 receipt だけを測る
- pytest (`test_decompose_live_trial_audit.py`) → 合成入力で述語の readiness 節を単体検査
  (schema 検証前の preview に対する多重防御として、述語自体は readiness で落とせなければ
  ならない)

## 受入の充足状況

| acceptance | 充足 |
|---|---|
| scenario の要求検体が schema-valid | ✅ 実走で allOf[7] 充足 node を確認。negative control NC4 (pass のまま readiness incomplete) は `schema_violation` 2 件で落ちる |
| `readiness_probe` が実 node 判定 | ✅ `readiness_probe` 自体を削除。`_publication_measurements` は produced node のみ読む |
| gate を満たす preview で候補非空 / 満たさない preview で空 | ✅ `test_publication_gate_discriminates_promoted_from_draft` / `test_all_draft_preview_is_not_discriminating` / `test_all_promoted_preview_is_not_discriminating` |
| `draft_candidates` が binding ごとに異なりうる | ✅ `test_projection_targets_differ_per_binding` (同一 preview から none/beads/github で異なる集合が出る) |
| `nodes` と `features` の正本が明文化され乖離を拒否 | ✅ `_preview_consistency` + `test_mirror_array_*` 3 件。実走でも `canonical_array=nodes` / `consistent=true` |

## 証跡

- live-trial: `eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260726T031729Z-mfh7-decompose-gatefix/verdict.json`
  (launch/completion/goal_fit すべて PASS、`skill_dir_tree_sha=1909be59…`)
- 監査出力: `eval-log/dev-graph/live-trial-fixtures/decompose/eval-log/decompose-audit.json`
  (`pass=true` / `discriminating=true` / `preview_consistency.consistent=true` /
  `projection_targets` none 1 件・beads 0 件・github 0 件)
- 独立 fresh evaluator が 7 種の negative control (昇格差し戻し / binding=beads /
  mirror array のみ昇格 / schema 不能検体 / 全昇格 / sentinel 残留 / draft に
  `github_publication.mode=issue`) をすべて `pass=false` へ落として判別力を実証
- 単体: `plugins/dev-graph/tests/test_decompose_live_trial_audit.py` 13 件
- 全体: `plugins/dev-graph/tests` 512 passed / 0 failed

## 残課題 (2026-07-26 時点で本 issue では閉じないとした 4 件)

1. `publication.gate_respected` と `blocked_projected` は、`projection_targets` が
   promoted のみから構築される以上つねに true / 空であり恒真 field として残る。pass 判定は
   判別力を実証済みの `discriminating` と `external_projection_empty` にも依存するため
   受領書は無効化されないが、`progress.json` の該当 checklist がこの恒真 field を唯一の
   evidence にしている点は改善余地がある。
2. 昇格 node の `evaluated_digest` は 64 桁 hex の正規表現を通すだけの placeholder で、
   node 内容へ束縛されていない。
3. `live-trial-positive-scenarios.json` は provenance hash の対象外 (`AUDIT_MODULES` は
   監査 module 2 本のみ) で、契約の途中緩和は機械検出できない。
4. 同型の恒真 probe が他 skill の監査ヘルパーにも無いかの棚卸し (`scope_out`)。

# 残課題の解決 (2026-07-28)

上記 4 件をすべて着手した。**#1〜#3 は本 issue の範囲内で解決済み**、**#4 は棚卸しを完了し
検出結果を別 issue へ切り出した**。

監査コードを直すと `pre-state.json` が記録する合成 identity と一致しなくなり
`provenance_valid=false` に落ちる (「試験中に監査コードを書き換えた」を検出する機構が
正しく発火する)。そのため改修後に **live-trial を再実走**して整合した受領書を取り直した:
`eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260727T212131Z-mfh7-decompose-bind/`。

## #1 `gate_respected` の恒真性 — 解決 (3 段構え)

**原因**: 投影先集合を gate 述語の裏返し (`promoted` のみ) から構築していたため、
`blocked` 集合と投影集合が **定義上素集合**になり、`blocked_projected` は入力に関係なく空、
`gate_respected` は常に true になっていた。判定対象が「skill が produce した node」ではなく
「検査側が gate 述語から組み立てた集合」である限り、この形は避けられない。

**手当て**:

1. **観測面の付け替え** — 投影の有無を node 自身の投影面から直接読む
   `_projection_evidence()` を新設した。読む対象は
   `github_publication.mode` (`local_only` 以外) / `issue_linkage` / `beads_linkage` /
   `github_project_linkages` / `pull_request_linkages`。これで gate 述語と投影観測が
   独立になり、**原理的に反証可能**になった。あわせて `projection_targets` を
   `eligible_by_binding` へ改名した (資格 (eligibility) であって投影実績ではないことを
   名前で分離する)。
2. **恒真性の自己申告** — ただし `--binding none --dry-run` では誰も投影されないため、
   当該 run では依然として空虚 (vacuous) である。この事実を隠さず
   `gate_respected_vacuous=true` と `gate_evidence_note` として受領書自身に出力させ、
   **`gate_respected` を単独 evidence に使わない**ことを task 契約 (`task.md`) に明記した。
3. **in-run negative control** — 空虚な観測の代わりに、**その run の実 preview から
   gate 違反の反例を合成**して正準 `validate-graph-schema.py` へ通し、拒否されることを
   実行時に確認する `_gate_negative_controls()` を新設した。2 種類:
   - `readiness_clause`: blocked node を `confirmed` + `evaluation_status=pass` にしつつ
     readiness を incomplete のまま残す → `$.implementation_readiness.status` と
     `.missing_sections` が新規発火
   - `publication_intent_on_blocked_node`: blocked feature に
     `github_publication.mode=issue` を付与 → `$.artifact_kind` / `$.confirmation_status` /
     `$.evaluation_status` / `$.github_publication.mode` /
     `$.implementation_readiness.status` の 5 件が新規発火

   違反は **変異前 baseline との差分**で数えるため、「何を入れても拒否される」形ではない
   ことが同時に示される。実測は `executed=true` / `all_rejected=true` / 両 control とも
   `clause_fired=true`。

## #2 `evaluated_digest` の placeholder — 解決

正準レシピを定義し、監査と `task.md` の両方に明記したうえで、監査が**再計算して突合**する
`_evidence_binding()` を新設した。

```
sha256(json.dumps({k: v for k, v in node.items() if k != 'confirmation_evidence'},
       ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
```

除外は自己参照になる `confirmation_evidence` の 1 field のみ (`excluded_fields` として
受領書に出力)。昇格 node は evidence 3 field 非空 **かつ** `declared == expected` を要求し、
未昇格 node は「未申告 (null) は可、偽造は不可」を要求する。これにより
**昇格後に node 本文を書き換えると digest が外れる** (stale PASS の拒否) が実値として機能する。
実測: `all_bound=true`、`feat-user-auth-001` の declared=expected=`94aa7a23…`、
`feat-dashboard-001` は declared=null。

## #3 scenario 契約が provenance 対象外 — 解決

`AUDIT_PROVENANCE_FILES = AUDIT_MODULES + CONTRACT_FILES` として、監査 module 2 本に加え
`live-trial-positive-scenarios.json` を合成 identity に含めた。合格条件そのものの途中緩和が
`same_as_pre_state=false` として機械検出される。
実測: `provenance_valid=true` / `tracked_in_index=true` / `index_matches_worktree=true` /
`same_as_pre_state=true`、composite=`3a305363…` (3 ファイル)。

## #4 同型の恒真 probe の棚卸し — 完了 (検出結果は別 issue へ)

**結論: 監査ヘルパー層に同型の probe は他に無い。** `audit_*.py` は
`plugins/dev-graph/tests/fixtures/` の 2 本 (`audit_decompose_live_trial.py` /
`audit_live_trial_state.py`) のみで他 plugin には存在しない。したがって **リスクは
scenario 契約の観測文側へ移っている**。全 9 scenario の `required_observations` を読解し、
非恒真と判断したものは実成果物で裏を取った結果、次の 3 件が実在した。

| scenario | 観測 | 型 |
|---|---|---|
| `C02-OUT1` obs2 | 契約外 feature の作成 0 件 | 入力起因の空虚性 (fixture に feature が 1 件も無い) |
| `C05-OUT1` obs1 | 進捗の分母 = receipt の `applied_count` | 成果物の存在による含意 (観測文自身が「不一致なら描画を拒否する」と述べている) |
| `C19-OUT1` obs2 後半 | dev-graph に重複実装が無い | run 非依存の静的性質 |

`C15-OUT1` obs0 と `C03-OUT1` obs1 は実成果物で裏を取り**非恒真**と確認した。

C14 の範囲外のため別 issue として切り出した:
**`HarnessHub-31k5`** / `issues/sys-live-trial-observation-tautology-inventory-20260728.md`
(graph node `issue-live-trial-observation-tautology-inventory-20260728`)。

## 解決後の証跡

- live-trial: `eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260727T212131Z-mfh7-decompose-bind/verdict.json`
  (launch/completion/goal_fit すべて PASS、`skill_dir_tree_sha=1909be59…` は不変 —
  `tests/` と `docs/` は挙動閉包外のため今回の改修では動かない、
  `transcript_sha256=68533dc3…`)
- 監査出力: `eval-log/dev-graph/live-trial-fixtures/decompose/eval-log/decompose-audit.json`
  (`pass=true` / `provenance_valid=true` / `same_as_pre_state=true` /
  `discriminating=true` / `gate_respected_vacuous=true` /
  `evidence_binding.all_bound=true` / `gate_negative_controls.all_rejected=true`)
- 独立 fresh evaluator: PASS / blockers=[]。受領書の自己申告を信じず、
  (a) `evaluated_digest` を正準レシピから**自力で再計算**して `94aa7a23…` の一致を確認、
  (b) preview を複製して反例 4 本を自作 (digest 置換 / 昇格後の `goal` 書換 /
  昇格の draft 差し戻し / `repo-config-default` sentinel) しすべて `pass=false` または
  `AuditError exit 65` を実測、
  (c) 正準 validator を直接叩き「draft node を壊すと新規違反が出る一方、正しく完全昇格
  させると新規違反ゼロ」を確認して**拒否が変異起因である**ことを直接証明、
  (d) transcript 全 38 ツール呼びを追跡し「audit 失敗 → 昇格を差し戻して 2 回目を通す」型の
  緑化が無いことを確認
- 単体: `plugins/dev-graph/tests/test_decompose_live_trial_audit.py` 22 件
- 全体: `plugins/dev-graph/tests` 521 passed / 0 failed

## 解決後も残る留意点 (別課題または運用で扱う)

- 監査の `pass` 合議には恒真な `gate_respected` が連言として残る。これは**投影が発生する
  run では判定力を持つ必要条件**であり、同じ合議が `discriminating` と
  `gate_negative_controls.all_rejected` を同時に要求するため判定力は保たれる。恒真である
  事実は `gate_respected_vacuous` として受領書自身が申告し、evidence には使っていない。
- 昇格操作自体は C14 の dry-run に昇格経路が無いため被験者による preview JSON の書き換えで
  行われる。live-trial が skill 側について実証したのは分解・binding 解決・全 node
  `local_only`・stdin 検証・write 0 件であり、gate 述語そのものは監査側実装 + 単体検査で
  担保している。
- 実走セッションは skill 実行前に監査コードと scenario を読める構造にある
  (`task.md` は禁じていない)。metric 適合的な生成を招きうるため、次の改善候補として
  `task.md` からの監査実装参照の制限を記録する。
