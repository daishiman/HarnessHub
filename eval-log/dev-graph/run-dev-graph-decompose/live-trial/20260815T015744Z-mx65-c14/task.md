# 最初の tool call 制約（最優先）

この `task.md` の Read と同時に Claude Code が自動想起する既存
`memory/c14-decompose.md` の Read は 1 回だけ許可します（これは framework の読み取り専用 context
復元で、fixture の観測・変更ではありません）。その自動 Read がある場合も、直後の tool call は必ず
指定済み `preflight.py` の Bash、その次は必ず対象 Skill です。ほかの memory・project file・関連 script
を Read / recall / search してはいけません。

# タスク: dev-graph:run-dev-graph-decompose の実走 (scenario C14-OUT1-positive-macro-decomposition-r15)

この run は scenario `C14-OUT1-positive-macro-decomposition-r15` の充足を確認するものです。

FIXTURE_BEADS = `/private/tmp/claude-501/-Users-dm-orca-workspaces-HarnessHub-issue---/d644473e-e080-4321-9a75-e5ff62feb1dd/scratchpad/lt/20260815T015744Z-mx65-c14/fixture-beads`
FIXTURE_NONE  = `/private/tmp/claude-501/-Users-dm-orca-workspaces-HarnessHub-issue---/d644473e-e080-4321-9a75-e5ff62feb1dd/scratchpad/lt/20260815T015744Z-mx65-c14/fixture-none`

2 つの FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind decompose`
がそれぞれの path で生成した同一形状。graph store は空で、feature / architecture / task ノードは 1 件も無い)。
**作り直さないでください** (repository_id は生成 path の SHA-256 に束縛されており、複製・移動すると壊れます)。
2 コピーは同じ builder shape です。path に束縛された `repository_id` / git SHA と、実行時刻を表す
timestamp は異なり得ます。それ以外の**意味上の node 内容は同一**にし、意図した publication route の
違いは実走中にノードが宣言する `tracker_binding` だけにしてください。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。Task / Agent は一切
呼び出さず、工程 0〜5、昇格、検証、adapter dry-run、証拠作成をすべて outer session 自身で行ってください。**

この run dir 以外の `eval-log/dev-graph/run-dev-graph-decompose/live-trial/*` を Read / Grep / Glob / Bash
で参照してはいけません。過去 run の入力、成果物、patch、検証結果をコピーまたは流用したら FAIL です。

## 最初の tool call 順序（例外なし）

この task.md（および上記で許可した自動 memory Read 1 回だけ）を Read した直後、次の
**2 tool call だけ**を順番どおり実行してください。

1. `Bash(python3 /private/tmp/claude-501/-Users-dm-orca-workspaces-HarnessHub-issue---/d644473e-e080-4321-9a75-e5ff62feb1dd/scratchpad/lt/20260815T015744Z-mx65-c14/preflight.py)`
2. 下記工程 1 の literal `Skill(dev-graph:run-dev-graph-decompose)`

この 2 call の間に Read / Bash / Grep / Glob / Task / Agent / その他 tool を挟んだら即 FAIL です。
preflight.py が工程 0 の prestate、goal-spec、pending progress、intermediate 1 行目を一括作成します。
同時に `support/external-snapshot.py` を subprocess で実行し、その実測 stdout を
`external-before.json` と `pre-state.json#external` へ保存します。固定値ではありません。
target Skill が load された後は、その Skill 自身の手順に従って preview を作り、stdin validator を
**最初の graph 書込み前**に実行してください。

preview JSON は最初から標準出力または shell pipe 内の変数だけで扱い、FIXTURE 配下にも RUN 配下にも、
一度も file として作らないでください。`preview-graph.json`、`preview-beads.json`、
`preview-none.json` 等を作って後から削除する方法も明示的に禁止します。validator の出力 receipt は
保存できますが、入力 preview 本体を receipt として保存してはいけません。preview の内容を証跡へ
残したい場合も、件数・digest・validator 結果だけを保存してください。
node input JSON / body Markdown / apply-order は C02 の永続 staging 入力なので作成可能ですが、preview
全体をどの directory にも materialize（ファイル化）してはいけません。preview 前後の
`find <FIXTURE> -type f` 差分が 0 であることを記録してください。

## 完了前の fail-closed 条件（省略禁止）

- transcript に、下記工程 1 と工程 2 の **literal `Skill(dev-graph:run-dev-graph-decompose)` tool_use が正確に 2 回**存在しなければ `FAIL` にすること。run B を Bash・Python・`upsert-node.py` の直接実行で代替してはいけない。
- run A の Skill が戻った後、必ず工程 2 の 2 個目の Skill を呼ぶこと。2 個目が戻る前に昇格・検証・完了報告へ進んではいけない。
- 工程 3 の昇格は **FIXTURE_BEADS と FIXTURE_NONE の両方**で行うこと。各 graph に「draft のまま残る実生成 feature が 1 件以上」かつ「confirmed / pass / complete の唯一候補が正確に 1 件」が無ければ `FAIL` にすること。
- 完了マーカー直前に、(a) literal Skill tool_use 2 回、(b) 両 graph の candidate_count=1、(c) 両 graph の draft_excluded_count>=1 を実測して記録すること。いずれか不一致なら PASS を書いてはいけない。
- `out/status.json` は全検証、`independent-verification.json`、goal-seek 2 行目の**追記**、goal-seek validator PASS の後にだけ書くこと。

### 完了直前の固定 2-call（数値の直書き禁止）

全検証を終えたら、最後の 2 tool call は必ず次の順にしてください。

1. `Bash(python3 /private/tmp/claude-501/-Users-dm-orca-workspaces-HarnessHub-issue---/d644473e-e080-4321-9a75-e5ff62feb1dd/scratchpad/lt/20260815T015744Z-mx65-c14/final_check.py)`
2. 上記が exit 0 / `pass=true` の場合だけ、`Write` で `out/status.json` を作る

この 2 call の間に別の tool call を挟んではいけません。`final_check.py` はこの session の実 transcript
JSONL を直接読み、literal Skill 回数・引数・Task/Agent 0 回、両 graph の候補数、goal-seek 2 行、
preview input file 0 件、status がまだ存在しないことを測定します。回数を Python 内へ固定値として
書いた別コマンドで代替してはいけません。
- `intermediate.jsonl` 1 行目を作った後は上書き・Update を禁止する。2 行目は shell の `printf ... >>` 等で append-only に追記し、追記前後の行数 1→2 を transcript に記録すること。

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
さらに FIXTURE_BEADS の goal-spec / progress / intermediate 1 行目をこの工程で作成する。
工程 0 の prestate と goal-seek 初期行だけが、最初の target Skill より前に許される実行アクションです。

write count は**必ずこの前後差分から導出**してください。skill 自身の report の数値を書き写してはいけません。

## 工程 1: run A (binding=beads)

工程 0 完了後、次の Skill 呼び出しを最初の対象操作にし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。**抑止フラグ (`--dry-run` 等) は付けないこと** —
書込みを抑止した run は全 binding の件数が 0 になり、draft gate が効いているのか
無効化されているのかを区別できなくなります。

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "社内向けの業務ポータルを作りたい。利用者は自分のアカウントでログインでき、ログイン後のダッシュボードで自分に割り当てられた作業と期限を一覧できる。期限が近い作業は通知として届き、管理者は全社の進捗を集計したレポートを閲覧できる。 --repo-root /private/tmp/claude-501/-Users-dm-orca-workspaces-HarnessHub-issue---/d644473e-e080-4321-9a75-e5ff62feb1dd/scratchpad/lt/20260815T015744Z-mx65-c14/fixture-beads"})

この run で生成する node は `tracker_binding` に `beads` を宣言してください。

この Skill 呼出しの内部手順として、送信前の preview graph 検証を**実 graph 書込みより前に必ず stdin 経路**で行い、
管理対象 repository 内に一時ファイルを作らないこと。preview validator の完了時刻と最初の graph revision 変更時刻を記録し、
両 fixture で preview が先だったことを transcript から確認できるようにすること。

```bash
python3 plugins/dev-graph/scripts/validate-graph-schema.py --repo-root <FIXTURE> --graph -   # preview を stdin で渡す
```

## 工程 2: run B (binding=none)

run A と**逐語で同一の want・同一の引数形**を FIXTURE_NONE に対して実行してください。

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "社内向けの業務ポータルを作りたい。利用者は自分のアカウントでログインでき、ログイン後のダッシュボードで自分に割り当てられた作業と期限を一覧できる。期限が近い作業は通知として届き、管理者は全社の進捗を集計したレポートを閲覧できる。 --repo-root /private/tmp/claude-501/-Users-dm-orca-workspaces-HarnessHub-issue---/d644473e-e080-4321-9a75-e5ff62feb1dd/scratchpad/lt/20260815T015744Z-mx65-c14/fixture-none"})

この run で生成する node は `tracker_binding` に `none` を宣言してください。
2 run の違いはこの 1 点だけです。
この Skill 呼出しでも、内部手順の preview stdin 検証を最初の graph 書込みより前に行うこと。

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
   local write count は「作成・変更された管理対象ファイル数」の整数として、両 fixture それぞれに記録する。
   external 側は工程 0 と工程 4 で同じ決定論的 snapshot 取得コマンドを実行し、before / after の実値と
   差分 0 を記録する。adapter が error を返しただけでは到達性の証拠にしない。dry-run が exit 0 し、
   preview/write_count を返す入力を使うこと。

   工程 4 では検証 script より前に、工程 0 と同じ
   `python3 /private/tmp/claude-501/-Users-dm-orca-workspaces-HarnessHub-issue---/d644473e-e080-4321-9a75-e5ff62feb1dd/scratchpad/lt/20260815T015744Z-mx65-c14/support/external-snapshot.py`
   を実行し、その stdout を RUN 直下の `external-after.json` へ保存する。`external-before.json` と
   `external-after.json` の各 count・path・artifact 配列を比較し、完全一致を確認すること。

   Beads は run dir 配下（2 fixture の外）の `support/bd` に決定論的 preflight shim を作ってよい。
   shim は `version` に `bd version 1.1.0`、`where --json` に固定の database_path / prefix /
   schema_version を返し、それ以外は exit 2 にする。`DEV_GRAPH_BD=<shim>` を設定して、登録済みの
   beads node への `bd-bridge.py --op create --dry-run` が exit 0・registration=registered・外部 write 0
   を返すことを示す。shim の database_path は実在させず、その不在を同じ snapshot コマンドで前後確認する。
   GitHub は `gh-bridge.py --op issue-create --repo fixture/offline --title ... --dry-run`、Projects は
   `gh-bridge.py --op project-item-add --project-id PVT_fixture --content-id I_fixture --dry-run` を用い、
   どちらも exit 0・mutation_suppressed=true を示す。これら dry-run では実 CLI / network を呼ばない。
6. 昇格した全 feature について、最終的に永続化された node から
   `confirmation_evidence` を除いて digest を**再計算**し、記録値と一致することを示す。
7. 本 run の最終 graph から次の 2 つの negative control を**メモリ上で**合成し、
   正規 schema validator (`validate-graph-schema.py`、stdin 経路) が**拒否する**ことを示す。
   - evaluation が pass なのに readiness が complete でない状態
   - blocked な draft feature に publication intent がある状態

工程 4 の実測結果は
`/private/tmp/claude-501/-Users-dm-orca-workspaces-HarnessHub-issue---/d644473e-e080-4321-9a75-e5ff62feb1dd/scratchpad/lt/20260815T015744Z-mx65-c14/independent-verification.json`
へ 1 ファイルにまとめて Write してください (observation 1-7 を key にした JSON)。

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
`/private/tmp/claude-501/-Users-dm-orca-workspaces-HarnessHub-issue---/d644473e-e080-4321-9a75-e5ff62feb1dd/scratchpad/lt/20260815T015744Z-mx65-c14/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C14-OUT1-positive-macro-decomposition-r15"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は 2 つの FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- 実 GitHub / 実 Beads へ書き込まないこと (adapter の dry-run で経路到達性だけを示す)。
- graph store を正規 writer 以外で書かないこと。
- `Task` / `Agent` tool、過去 run 参照、事後に preview 実行を pre-write と表現することを禁止する。
