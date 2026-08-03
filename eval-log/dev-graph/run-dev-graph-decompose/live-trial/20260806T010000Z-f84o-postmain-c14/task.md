# タスク: dev-graph:run-dev-graph-decompose の実走 (scenario C14-OUT1-positive-macro-decomposition-r9)

この run は scenario `C14-OUT1-positive-macro-decomposition-r9` の充足を確認するものです。

FIXTURE_BEADS = `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260806T010000Z-f84o-postmain-c14/fixture-repo`
FIXTURE_NONE  = `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260806T010000Z-f84o-postmain-c14/fixture-repo-none`

2 つの FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind decompose`
がそれぞれの path で生成した同一形状。graph store は空、feature / architecture / task ノードは 1 件も無い)。
**作り直さないでください** (repository_id は生成 path の SHA-256 に束縛されており、複製・移動すると壊れます)。
2 コピーは完全に同一で、**違いは実走中にノードが宣言する `tracker_binding` だけ**にしてください。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## r4 完了前の fail-closed 条件（省略禁止）

- transcript に、下記工程 1 と工程 2 の **literal `Skill(dev-graph:run-dev-graph-decompose)` tool_use が正確に 2 回**存在しなければ `FAIL` にすること。run B を Bash・Python・`upsert-node.py` の直接実行で代替してはいけない。
- run A の Skill が戻った後、必ず工程 2 の 2 個目の Skill を呼ぶこと。2 個目が戻る前に昇格・検証・完了報告へ進んではいけない。
- 工程 3 の昇格は **FIXTURE_BEADS と FIXTURE_NONE の両方**で行うこと。各 graph に「draft のまま残る実生成 feature が 1 件以上」かつ「confirmed / pass / complete の唯一候補が正確に 1 件」が無ければ `FAIL` にすること。
- 完了マーカー直前に、(a) literal Skill tool_use 2 回、(b) 両 graph の candidate_count=1、(c) 両 graph の draft_excluded_count>=1 を実測して記録すること。いずれか不一致なら PASS を書いてはいけない。

## required_observations (scenario 正本の逐語転記)

1. the produced feature and architecture nodes form an acyclic DAG whose inter-feature depends_on stays within declared_granularity_threshold.max_value measured by declared_granularity_threshold.metric
2. in a run that writes for real, pre-evaluation draft features publish zero issues, and every zero carries the reason it is zero, so suppression by the draft gate is never reported interchangeably with a binding route the configuration disables or with the absence of a live candidate
3. at least one actual produced draft feature remains excluded while one actual produced feature advanced to confirmed, evaluation-pass and readiness-complete becomes the sole publication candidate, so the exclusion is a decision of the implementation publication gate and not a side effect of a run that wrote nothing anywhere
4. the beads and none bindings are exercised as two separate runs whose recorded publication routes differ, while the github binding is recorded as unreachable for a macro-only run together with the schema rule that makes it unreachable, and every binding's figure is derived from the tracker binding actually persisted in the run's graph rather than from an argument supplied to the audit, so no binding's measurement is one value restated from the audit's own input
5. the local, Beads, GitHub and Projects write counts are derived by differencing repository state captured before and after the run rather than restated from the skill's own report, and the preview graph is validated through the stdin path so no temporary file is created inside the managed repository
6. the confirmation_evidence of every promoted feature is recomputed from the final persisted node content excluding only confirmation_evidence and matches, so a placeholder digest or a node edited after evaluation is rejected
7. gate violations synthesised from this run's final graph are rejected by the canonical schema validator, so the publication gate is falsifiable on the same data rather than inferred from a run where no forbidden publication happened

`declared_granularity_threshold` は scenario 正本 (`plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json`)
の該当 scenario に `metric = max_inter_feature_depends_on_per_feature`、`max_value = 3` として宣言されています。
測定はこの metric の定義どおり「1 feature が兄弟 feature へ張る depends_on の本数の最大値」で行ってください。

## 使用する want (2 run 共通・逐語で同一にすること)

```
社内向けの業務ポータルを作りたい。利用者は自分のアカウントでログインでき、ログイン後の
ダッシュボードで自分に割り当てられた作業と期限を一覧できる。期限が近い作業は通知として
届き、管理者は全社の進捗を集計したレポートを閲覧できる。
```

## 工程 0: 実走前の状態記録 (observation 5 に必須)

2 つの FIXTURE それぞれについて、**Skill を呼ぶ前に**次を記録してください。

- `.dev-graph/state/graph.json` の SHA-256 と node 件数
- FIXTURE 配下の全ファイル一覧 (`.git` を除く)
- Beads / GitHub / Projects 側の状態 (外部書込みが 0 件であることを後で差分で示すための基準)

write count は**必ずこの前後差分から導出**してください。skill 自身の report の数値を書き写してはいけません。

## 工程 1: run A (binding=beads)

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。**抑止フラグ (`--dry-run` 等) は付けないこと** —
書込みを抑止した run は全 binding の件数が 0 になり、draft gate が効いているのか
無効化されているのかを区別できなくなります。

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "社内向けの業務ポータルを作りたい。利用者は自分のアカウントでログインでき、ログイン後のダッシュボードで自分に割り当てられた作業と期限を一覧できる。期限が近い作業は通知として届き、管理者は全社の進捗を集計したレポートを閲覧できる。 --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260806T010000Z-f84o-postmain-c14/fixture-repo"})

この run で生成する node は `tracker_binding` に `beads` を宣言してください。

送信前の preview graph 検証は**必ず stdin 経路**で行い、管理対象 repository 内に一時ファイルを作らないこと。

```bash
python3 plugins/dev-graph/scripts/validate-graph-schema.py --repo-root <FIXTURE> --graph -   # preview を stdin で渡す
```

## 工程 2: run B (binding=none)

run A と**逐語で同一の want・同一の引数形**を FIXTURE_NONE に対して実行してください。

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "社内向けの業務ポータルを作りたい。利用者は自分のアカウントでログインでき、ログイン後のダッシュボードで自分に割り当てられた作業と期限を一覧できる。期限が近い作業は通知として届き、管理者は全社の進捗を集計したレポートを閲覧できる。 --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260806T010000Z-f84o-postmain-c14/fixture-repo-none"})

この run で生成する node は `tracker_binding` に `none` を宣言してください。
2 run の違いはこの 1 点だけです。

### github binding の扱い

`github` binding は macro-only run では**到達不能**です。未 publish の node は
`github_publication.mode` が `local_only` であり、graph-node schema の
tracker binding 規則は `github` binding に `issue` または `issue_and_projects` mode を要求するため、
その宣言は node が graph へ着地する前に拒否されます。
**この到達不能性を、schema 側の該当規則を実ファイルから引用して記録してください** (実行して失敗させる必要はありません)。

## 工程 3: 昇格 (draft gate と candidate gate の同時証明)

各 run で生成された feature のうち、

- **1 件以上を評価前の draft のまま残す** (draft gate が Issue 起票 0 件にすることの証明)
- **別の 1 件を、schema 妥当な confirmed / evaluation-pass / readiness-complete へ昇格させ、
  唯一の publication candidate にする** (candidate gate が働くことの証明)

昇格は **C02 の通常の node upsert** で行ってください。すなわち

```bash
python3 plugins/dev-graph/scripts/upsert-node.py --input <patch.json> --repo-root <FIXTURE> --body-file <本文>
```

の形で patch を渡します (`--body-file` を省略すると本文が全損します)。
completion 専用の lifecycle 遷移 operation は **task の durable-done 遷移しか受け付けず feature rollup を明示的に拒否する**ため、
本工程では使用してはいけません。

昇格 patch では `confirmation_status` を `confirmed`、`evaluation_status` を `pass`、
`implementation_readiness` の `status` を `complete` にし、`confirmation_evidence` を設定します。

`confirmation_evidence` の `evaluated_digest` は、**最終的に永続化された node の内容から
`confirmation_evidence` だけを除いた JSON の SHA-256** です。JSON 化は次の条件で行ってください。

```python
import hashlib, json
payload = {k: v for k, v in node.items() if k != "confirmation_evidence"}
digest = hashlib.sha256(
    json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode("utf-8")
).hexdigest()
```

64 桁 hex の placeholder や、lifecycle フィールドが確定する前に計算した digest は証拠になりません。

昇格させるのは**skill が生成した node だけ**です。fixture に種を置いてはいけません (帰属が壊れます)。

## 工程 4: 検証

1. 生成された feature / architecture ノードが循環のない DAG を成し、
   `max_inter_feature_depends_on_per_feature` が 3 以下であることを、graph store から実測して示す。
2. 実書込みを行った run で、評価前 draft feature の Issue 起票が 0 件であること、
   **かつその 0 件それぞれに理由が付いている**ことを示す。
   「draft gate による抑止」「binding route が到達不能」「live candidate 不在」を
   同じ 0 に潰さず、どの 0 がどの理由なのかを個別に帰属させること。
3. 実際に生成された draft feature が除外され、昇格させた feature が唯一の publication candidate に
   なったことを示す。「何も書かなかったから 0 だった」ではないことを、工程 0 との差分で示すこと。
4. beads / none の 2 run で記録された publication route が実際に異なることを、
   **各 run の graph に永続化された `tracker_binding` の実値**から導出して示す。
   引数として渡した値を言い換えてはいけません (それは run ではなく invocation を測っている)。
   github は到達不能として、根拠の schema 規則とともに記録する。
5. local / Beads / GitHub / Projects の write count を工程 0 の前後差分から導出する。
   Beads と GitHub の投影経路は各 adapter (`bd-bridge.py` / `gh-bridge.py`) の dry-run で
   **経路が到達可能であること**だけを示し、実トラッカーへは書かないこと。
   preview graph の検証が stdin 経路で行われ、管理対象 repository 内に一時ファイルが
   作られていないことも示すこと。
6. 昇格した全 feature について、最終的に永続化された node から
   `confirmation_evidence` を除いて digest を**再計算**し、記録値と一致することを示す。
7. 本 run の最終 graph から次の 2 つの negative control を**メモリ上で**合成し、
   正規 schema validator (`validate-graph-schema.py`、stdin 経路) が**拒否する**ことを示す。
   - evaluation が pass なのに readiness が complete でない状態
   - blocked な draft feature に publication intent がある状態

## 工程 5: goal_seek 配線 (必須)

`run-dev-graph-decompose` は `goal_seek` を宣言します。SKILL.md の該当節に従い、
**FIXTURE_BEADS** の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE_BEADS>/eval-log/run-dev-graph-decompose-goal-spec.json`
- `<FIXTURE_BEADS>/eval-log/run-dev-graph-decompose-progress.json`
- `<FIXTURE_BEADS>/eval-log/run-dev-graph-decompose-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は正本文の UTF-8 SHA-256 実値にしてください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260806T010000Z-f84o-postmain-c14/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition-r9"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は 2 つの FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- 実 GitHub / 実 Beads へ書き込まないこと (adapter の dry-run で経路到達性だけを示す)。
- graph store を正規 writer 以外で書かないこと。
