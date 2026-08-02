# タスク: dev-graph:run-dev-graph-system-spec の実走 (scenario C19-OUT1-positive-system-spec-lineage)

## 最重要 — Skill ツールの起動が本 trial の測定対象 (これを外すと trial 全体が無効)

被験 skill は必ず次の **Skill ツール呼出し**でロードしてください。task.md の Read を除く
最初の実行アクションはこの Skill 呼出しです。ロード直後は、委譲や system-spec 状態更新へ
進む前に、下記 goal-seek 1 行目を作ることを被験 skill の最初の手順にしてください。

```
Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-system-spec-r4"})
```

次の代替は**いずれも不可**です。これらで代替した場合、成果物が正しくても trial は launch=FAIL として破棄されます:

- SKILL.md や `prompts/R0-context.md` などを読んで手順を自分で再現する
- `plugins/dev-graph/scripts/` 配下の script を Bash から直接叩いて skill 本体を代替する
- Task / Agent ツールへ委譲して skill 起動を肩代わりさせる

transcript に `Skill` ツールの起動が **1 件以上**現れることが必須条件です。skill が内部で `upsert-node.py` などの script を Bash 実行するのは skill 手順の一部であり、迂回にはあたりません。

---

## この scenario の入力前提 (読み飛ばさないこと)

### r4 の再実走で守る短縮・再計算ルール

- r1 の成果物は **形状の参照だけ**に使ってよい。`foundation-input.json`、node input、
  node body の項目構成は参考にできるが、生成済み state/spec/node をコピーしてはならない。
  source digest、時刻、evaluator receipt は r2 の入力から必ず再計算する。
- requirements foundation の `objectives` は `{\"id\", \"text\", \"measure\"}` の object 配列、
  承認根拠は `approval_note` に置く。48 cell の確定は 1 cell ずつ繰り返さず、正規
  `chunk` 操作へまとめてよい。
- C02 import input は canonical `graph_node_id`、`confirmation_status=confirmed`、
  PASS/readiness の証拠、完全な `--body-file` を含める。登録は
  `upsert-node.py --body-file` の正規経路だけを使う。
- **最終配置先の `specs/` / `architecture/` に Write/Edit で本文を先置きしてはならない。**
  body source は `eval-log/node-bodies/specification.md` と
  `eval-log/node-bodies/architecture.md` に作り、`upsert-node.py --body-file` へ渡す。
  最終配置先を一度でも Write/Edit した run は、後から C02 で上書きしても FAIL である。
- `upsert-node.py` の canonical frontmatter 必須 field は、r2 の node input を形状参照して
  最初から全て含める。失敗を試してから target artifact を直す反復は行わない。
- schema-complete な形状参照は次の r3 input を使う。field の削減や型推測をせず、時刻・digest・
  source path だけを r4 の実測値へ置換する。
  - `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-system-spec-r3/eval-log/node-bodies/spec-node-input.json`
  - `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-system-spec-r3/eval-log/node-bodies/arch-node-input.json`
- **body source と source lineage は別物である。** `--body-file` は上記
  `eval-log/node-bodies/*.md` を使うが、`source_lineage.source_path` は specification node で
  `system-spec/index.md`、architecture node で `system-spec/backend.md` とする。それぞれの
  `source_digest` はその `system-spec/` 確定章を r4 fixture 内で sha256 再計算した値にする。
  `eval-log/node-bodies/*.md` を lineage source にした run は、6 field が埋まっていても FAIL。
- `confirmation_evidence.evaluated_digest` は r4 の
  `system-spec/completeness-report.json` の sha256 とする。r3 の digest/時刻は流用しない。
- 複製検査の検索語は harness 側で N>0、dev-graph 側で 0 になる特徴的な関数名を
  elicitation と compile から 1 つずつ選ぶ。空振り検索を成功扱いしない。

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-system-spec-r4` にある dev-graph 初期化済みの独立 Git repository です。

この fixture の `system-spec/` に最初から存在する業務入力は
`requirements-brief.md` **1 ファイルだけ**です。`spec-state.json`、
`fetched-references.json`、確定章、`index.md`、`completeness-report.json` は
fixture が先回りして作ってはいません。これらを生成するところからが本 scenario の
測定対象です。

R0-context / R1-preflight を省略せず、その後に被験 skill の R2-delegate が宣言済みの
system-spec-harness を次の正規 entry point で委譲実行し、正規フローを最後まで完走させて
ください。

1. `system-spec-harness:run-system-spec-elicit`
2. `system-spec-harness:run-system-spec-doc-fetch`
3. `system-spec-harness:run-system-spec-compile`
4. `system-spec-harness:assign-system-spec-completeness-evaluator`

各 entry point は必ず `Skill` ツールで呼び出してください。script を Bash から直接叩いて
entry point の代替にしてはいけません。brief は U1-U9、48 セル、技術選定、公式出典、
一括承認を固定しているため、人間への質問は不要です。brief に記載済みの回答・承認を入力
として使い、未記載の最小判断が必要なら brief の U1-U9 と非対象範囲に照らした根拠を
状態成果物へ残してください。

doc-fetch は brief に列挙された公式 URL を入力とし、正規 skill の契約どおりに処理して
ください。外部取得が利用不能な場合も独自の偽 receipt を書かず、正規 skill が定める
失敗・再開契約に従ってください。正規フローが PASS になる前に R3-import へ進んでは
いけません。

### この再実走で必須の evaluator 契約

- doc-fetch は公式ページを実取得して現行 version を記録する。既知の古い値を固定しない。
- C08 が stale / FAIL / INDETERMINATE を返した場合、`completeness-report.json` を
  Edit して PASS にしてはならない。doc-fetch と compile をやり直した後、
  `system-spec-harness:assign-system-spec-completeness-evaluator` を再度 Skill 呼出しし、
  C06/C07/C08 の fresh 3監査をすべて再 fork する。
- boot 時に `SYSTEM_SPEC_AUDIT_FORK_LEDGER` は fixture 内
  `eval-log/system-spec-harness/audit-fork-ledger.jsonl` へ固定されている。監査台帳を
  Write/Edit/Bash redirect で手作りしてはならず、PostToolUse hook だけに書かせる。
- evaluator が作った `audit_delegations[]` の session id を読み、
  `aggregate-completeness.py --report <completeness-report.json>
  --fork-ledger <fixture-ledger> --session <receipt-session-id>` を実行する。
  exit 0 でなければ report を編集して緑化せず、この run を FAIL にする。
- completeness evaluator の最終PASSと上記 canonical report gate exit 0 が揃うまで、
  C02 importへ進んではならない。

---

## 第 1 段: preflight と正規 system-spec フローの完走

R0/R1 を実行し、次を**実測値で**報告してください。

- C24 `resolve-repo-context.py --mode write` の receipt の `repo_root` が fixture の realpath と一致すること (値を出す)
- `plugins/system-spec-harness/.claude-plugin/plugin.json` の `name` と `version` の実値、および `>=0.1.0 <1.0.0` を満たすかの判定
- `references/package-contract.json#entry_points.skills` に required 4 entry points (`run-system-spec-elicit`, `run-system-spec-doc-fetch`, `run-system-spec-compile`, `assign-system-spec-completeness-evaluator`) が揃っていること (実際に読み取った配列を出す)
- system-spec-harness の正規 4 entry point を `Skill` ツールで呼んだ実行記録
- 正規フロー完走後の次の実測値:
  - `system-spec/spec-state.json` のカテゴリごとの集約状態
  - `system-spec/completeness-report.json` の `verdict`
  - `system-spec/fetched-references.json` の件数
  - `system-spec/index.md` と各章 md の confirmed マーカー

---

## 第 2 段: C02 経由の取込みと source lineage の実測 (OUT1 第 1 分節)

R3-import を実行し、**specification node と architecture node をそれぞれ 1 件以上** dev-graph へ登録してください。登録は C02 (`dev-graph:run-dev-graph-node` およびその writer である `upsert-node.py`) 経由で行います。

登録後に次を実測値で示してください。

- 登録した node の id 一覧と `artifact_kind` (specification / architecture の両方が含まれること)
- 各 node の `source_lineage` の 6 フィールド (`origin_kind` / `source_plugin` / `source_path` / `source_version` / `source_digest` / `imported_at`) の**実値**。null や空文字が 1 つでもあれば FAIL です
- `source_digest` が `source_path` の実ファイルの sha256 と一致すること。**あなた自身が `sha256sum` (または `python3 -c "import hashlib..."`) で再計算した値**と node の `source_digest` を並べて示してください
- 各 node の `confirmation_status` が `confirmed` であり、`confirmation_evidence` が evaluator の成果物 (`completeness-report.json`) を指していること
- `progress.json` の `registered_this_run` に登録 node id が入っていること
- 次の 2 script が exit 0 であること (コマンドと exit code をそのまま示す):
  - `python3 plugins/dev-graph/scripts/validate-source-digest.py --repo-root <fixture> --progress <fixture>/eval-log/run-dev-graph-system-spec-progress.json`
  - `python3 plugins/dev-graph/scripts/validate-evidence-refs.py --repo-root <fixture> --progress <fixture>/eval-log/run-dev-graph-system-spec-progress.json`

**登録 node が 0 件の場合は status=FAIL です。** 「取り込むべき確定章が無かった」という結論は本 fixture では成立しません (8 カテゴリすべて確定済みです)。

---

## 第 3 段: 「登録は C02 経由だけ」の全数検査 (OUT1 第 3 分節)

criteria:OUT1 は「登録は C02 経由だけにする」と要求します。これは否定形の主張なので、**書込み操作が 1 件も起きていない状態で「C02 以外の登録 0 件」を確認しても、検査が作動した証拠にはなりません。** 第 2 段で実際に登録が起きていることを前提に、次の 2 方向から実測してください。

### 3-a. 本 run の実行トレースの全数検査

本 run で fixture の `.dev-graph/state/graph.json` および `specs/` `architecture/` 配下を**変更した操作をすべて列挙**し、そのそれぞれが C02 (`run-dev-graph-node` skill / `upsert-node.py`) 経由であることを示してください。列挙は「変更した操作の集合」であり、この集合が空なら第 2 段が失敗しています。

- `Write` / `Edit` ツールで graph.json や node の Markdown を直接書いた操作が **0 件**であること
- `graph.json` の `graph_revision` が登録件数ぶん増えていること (before / after の実値)

### 3-b. writer 経路の静的確認 (陽性対照つき)

dev-graph plugin 内で `.dev-graph/state/graph.json` へ**書き込む**正規 script を列挙し、
役割分担を示してください。

- `build-graph-store.py`: graph store が存在しない初期化時だけ、canonical empty graph を生成
- `upsert-node.py`: 初期化後の node 登録・更新を担う唯一の mutation writer

**この検査は「検索語が実際にヒットしうる」ことを先に示してから行ってください。**
書込み述語 (`write_text` / `json.dump` / `open(..., "w")` など) で
`plugins/dev-graph/scripts/` を検索し、上記 2 script がそれぞれの責務でヒットすることを
陽性対照として示します。そのうえで、本 run は既に初期化済みの graph に対する node
登録なので、変更操作が `upsert-node.py` 経由だけであることを示してください。
何もヒットしない検索語で「0 件」と報告した場合、それは検査ではなく空振りであり
FAIL 扱いです。

---

## 第 4 段: 「同等ロジックの複製 0 件」の実測 (OUT1 第 2 分節・陽性対照必須)

criteria:OUT1 は「同等ヒアリング/compile ロジックが dev-graph 内に複製されていない」と要求します。これも否定形です。**「dev-graph 内を検索して 0 件でした」だけでは、検索語が悪くて空振りしただけの可能性と区別がつきません。**

次の手順で、**対照実験**の形にしてください。

1. system-spec-harness 側の elicitation / compile の中核実装を特定し、ファイル path と行数を実測で示す。少なくとも次は実在します:
   - `plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py` (ヒアリング状態遷移)
   - `plugins/system-spec-harness/skills/run-system-spec-compile/scripts/compile-spec-doc.py` (章 compile)
   - `plugins/system-spec-harness/scripts/validate-coverage-matrix.py` / `validate-source-citation.py` (coverage / 出典 gate)
2. これらの実装に特徴的な検索語 (関数名・状態値・schema key・CLI サブコマンド名など) を**自分で選び**、その検索語が **harness 側で N>0 件ヒットする**ことを実測で示す (陽性対照)。使った検索語とヒット数を明記すること。
3. **同じ検索語**を `plugins/dev-graph/` 全体へ適用し、ヒット 0 件であることを示す。
4. さらに、dev-graph 側が harness の成果物を「複製ではなく参照」していることを示す: 登録した node の本文に system-spec の章本文が丸ごとコピーされていないこと、参照は `source_lineage` と `architecture_refs` で行われていることを、実際の node Markdown の中身で示してください。

検索語を 1 語だけで済ませず、ヒアリング側と compile 側の**両方**から最低 1 語ずつ選んでください。

---

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-system-spec` は `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い、`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-system-spec-r4/eval-log/` へ 3 点セット (`run-dev-graph-system-spec-goal-spec.json` / `run-dev-graph-system-spec-progress.json` / `run-dev-graph-system-spec-intermediate.jsonl`、intermediate は必須 6 キー) をすべて書き出してください。

`intermediate.jsonl` は実行途中の証拠です。次を厳守してください:

1. 上記 Skill ツールで被験 skill をロードした直後、委譲・状態更新・検証など被験 skill の実作業より前に、SKILL.md の original_goal を goal-spec へ書き、その同じ文字列から UTF-8 SHA-256 を計算する。
2. 同じ時点で、計算済みの正しい hash を持つ最初の intermediate 行を新規作成する。transcript 上、最初の system-spec-harness Skill 呼出しより前であることを必須とする。
3. skill 実行と検証後に、結果を持つ 2 行目だけを append (末尾追加) する。
4. 2 行を後からまとめて書かない。既存行の Edit / Update / 全体上書きはしない。hash 検証に失敗した場合は書き換えず FAIL とする。

なお fixture の `eval-log/` には過去 run の 3 点セットが残っています。本 run の内容で上書き (新規 Write) して構いませんが、**intermediate.jsonl は本 run の 1 行目を Write した後、2 行目を append する**という順序を守ってください (過去 run の行を残したまま append すると時系列が混ざります)。

実行と全検証の後、fresh Agent を 1 つ fork して、3 個の
required_observations と goal-seek 証拠を独立評価させてください。親セッション自身の
自己評価で代替せず、Agent の PASS / FAIL、blocker、観測根拠を
`eval-log/independent-verification.json` に一字も改変せず保存してください。Agent が
FAILなら修正や再評価で上書きせず、このrunをFAILで終えてください。

---

## 成功条件 (すべて実測値で示すこと)

- 第 1 段: system-spec-harness plugin が version/entry-point 要件を満たし、正規 4 entry point が `Skill` 経由で完走し、coverage/source/evaluator gate が PASS
- 第 2 段: specification / architecture node が C02 経由で登録され、source_lineage 6 フィールドが全て非 null、source_digest が自力再計算と一致、validate-source-digest.py と validate-evidence-refs.py が exit 0
- 第 3 段: 本 run の書込み操作の全数検査で C02 以外の登録が 0 件、かつ writer 経路の静的確認が陽性対照つきで成立
- 第 4 段: 複製 0 件が陽性対照つきの対照実験として成立し、参照が lineage 経由であることを node 本文で確認できている
- goal-seek 3 点セットがすべて書き出され、intermediate は実行時系列どおりの append-only である

いずれかが実測できていない場合は、その旨を明示して status=FAIL としてください。**実測できていない項目を「問題なし」と報告しないでください。**

---

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260802T073722Z-wt32-system-spec-r4/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C19-OUT1-positive-system-spec-lineage"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと (ただし上記「入力前提」で固定した条件は本 scenario の入力であり、これに従うことは省略にあたらない)。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ)。
- 本 worktree の `plugins/` 配下と `.dev-graph/` 配下を変更しないこと。書込みは fixture repository の内部と上記 out/status.json だけに限る。

## scenario 契約

scenario_id: `C19-OUT1-positive-system-spec-lineage`

## required_observations（scenario 正本の逐語転記）

1. the declared system-spec-harness plugin is loaded and its canonical flow completes
2. the imported specification and architecture retain source lineage and evaluator evidence
3. registration occurs only through C02 and no duplicate elicitation or compile logic appears in dev-graph
