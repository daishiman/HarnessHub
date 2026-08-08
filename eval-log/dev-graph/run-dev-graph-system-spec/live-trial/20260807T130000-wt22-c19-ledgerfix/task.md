# タスク: dev-graph:run-dev-graph-system-spec の実走 (scenario C19-OUT1-positive-system-spec-lineage-r2)

## 最重要 — Skill ツールの起動が本 trial の測定対象 (これを外すと trial 全体が無効)

被験 skill は必ず次の **Skill ツール呼出し**でロードしてください。task.md の Read を除く
最初の実行アクションはこの Skill 呼出しです。

```
Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-22/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260807T130000-wt22-c19-ledgerfix/fixture-repo"})
```

次の代替は**いずれも不可**です。これらで代替した場合、成果物が正しくても trial は launch=FAIL として破棄されます:

- SKILL.md や `prompts/R0-context.md` などを読んで手順を自分で再現する
- `plugins/dev-graph/scripts/` 配下の script を Bash から直接叩いて skill 本体を代替する
- Task / Agent ツールへ委譲して skill 起動を肩代わりさせる

transcript に `Skill` ツールの起動が **1 件以上**現れることが必須条件です。skill が内部で
`upsert-node.py` などの script を Bash 実行するのは skill 手順の一部であり、迂回にはあたりません。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

---

## この scenario の入力前提 (読み飛ばさないこと)

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-22/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260807T130000-wt22-c19-ledgerfix/fixture-repo`

FIXTURE は dev-graph 初期化済みの独立 Git repository で、**すでに用意済み**です
(`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind system-spec` が生成した正本形状)。
作り直さないでください。

この fixture の `system-spec/` に最初から存在する業務入力は `requirements-brief.md` **1 ファイルだけ**です。
`spec-state.json`、`fetched-references.json`、確定章、`index.md`、`completeness-report.json` は
fixture が先回りして作ってはいません。これらを生成するところからが本 scenario の測定対象です。
brief を state の代替として章へ直接転記してはいけません。

R0-context / R1-preflight を省略せず、その後に被験 skill の R2-delegate が宣言済みの
system-spec-harness を次の正規 entry point で委譲実行し、正規フローを最後まで完走させてください。

1. `system-spec-harness:run-system-spec-elicit`
2. `system-spec-harness:run-system-spec-doc-fetch`
3. `system-spec-harness:run-system-spec-compile`
4. `system-spec-harness:assign-system-spec-completeness-evaluator`

各 entry point は必ず `Skill` ツールで呼び出してください。script を Bash から直接叩いて
entry point の代替にしてはいけません。

### ヒアリング回答の唯一の情報源

`run-system-spec-elicit` が要求する回答は、**すべて `<FIXTURE>/system-spec/requirements-brief.md` に
記載されています**。brief は U1-U9、収集マトリクス、技術選定、公式出典、一括承認を固定しているため、
人間への質問は不要です。**利用者へ問い返さないでください** (`AskUserQuestion` を使わないこと)。
brief に書かれていない最小判断が必要な場合は、brief の U1-U9 と非対象範囲から導ける最も保守的な
解釈を採り、その根拠を状態成果物へ残してください。推測で新しい要求を足さないこと。

### この実走で必須の evaluator 契約

- doc-fetch は brief 第 4 節に列挙された公式 URL を入力とし、正規 skill の契約どおりに処理してください。
  **doc-fetch は公式ページを実取得して現行 version を記録する。既知の古い値を固定しない。**
- 外部取得が利用不能な場合も独自の偽 receipt を書かず、正規 skill が定める失敗・再開契約に従ってください。
  正規フローが PASS になる前に R3-import へ進んではいけません。
- C08 が stale / FAIL / INDETERMINATE を返した場合、`completeness-report.json` を Edit して PASS に
  してはならない。doc-fetch と compile をやり直した後、
  `system-spec-harness:assign-system-spec-completeness-evaluator` を再度 Skill 呼出しし、
  C06/C07/C08 の fresh 3 監査をすべて再 fork する。
- boot 時に `SYSTEM_SPEC_AUDIT_FORK_LEDGER` は fixture 内
  `<FIXTURE>/eval-log/system-spec-harness/audit-fork-ledger.jsonl` へ固定されています。監査台帳を
  Write / Edit / Bash redirect で手作りしてはならず、PostToolUse hook だけに書かせてください。
- evaluator が作った `audit_delegations[]` の session id を読み、
  `aggregate-completeness.py --report <completeness-report.json> --fork-ledger <fixture-ledger>
  --session <receipt-session-id>` を実行してください。exit 0 でなければ report を編集して緑化せず、
  この run を FAIL にしてください。
- completeness evaluator の最終 PASS と上記 canonical report gate の exit 0 が揃うまで、
  C02 import へ進んではいけません。

---

## required_observations (scenario 正本の逐語転記)

1. the declared system-spec-harness plugin is loaded and its canonical flow completes
2. the imported specification and architecture retain source lineage and evaluator evidence
3. registration occurs only through C02 and no duplicate elicitation or compile logic appears in dev-graph

---

## 第 1 段: preflight と正規 system-spec フローの完走 (observation 1)

R0/R1 を実行し、次を**実測値で**報告してください。

- C24 `resolve-repo-context.py --mode write` の receipt の `repo_root` が FIXTURE の realpath と一致すること (値を出す)
- `plugins/system-spec-harness/.claude-plugin/plugin.json` の `name` と `version` の実値、および `>=0.1.0 <1.0.0` を満たすかの判定
- `references/package-contract.json#entry_points.skills` に required 4 entry points
  (`run-system-spec-elicit`, `run-system-spec-doc-fetch`, `run-system-spec-compile`,
  `assign-system-spec-completeness-evaluator`) が揃っていること (実際に読み取った配列を出す)
- system-spec-harness の正規 4 entry point を `Skill` ツールで呼んだ実行記録
- 正規フロー完走後の次の実測値:
  - `system-spec/spec-state.json` のカテゴリごとの集約状態
  - `system-spec/completeness-report.json` の `verdict`
  - `system-spec/fetched-references.json` の件数と、各 record の `version` / `retrieved_at`
  - `system-spec/index.md` と各章 md の confirmed マーカー

---

## 第 2 段: C02 経由の取込みと source lineage の実測 (observation 2)

R3-import を実行し、**specification node と architecture node をそれぞれ 1 件以上** dev-graph へ
登録してください。登録は C02 (`dev-graph:run-dev-graph-node` およびその writer である
`upsert-node.py`) 経由で行います。

登録後に次を実測値で示してください。

- 登録した node の id 一覧と `artifact_kind` (specification / architecture の両方が含まれること)
- 各 node の `source_lineage` の 6 フィールド (`origin_kind` / `source_plugin` / `source_path` /
  `source_version` / `source_digest` / `imported_at`) の**実値**。null や空文字が 1 つでもあれば FAIL です
- `source_digest` が `source_path` の実ファイルの sha256 と一致すること。
  **あなた自身が `shasum -a 256` (または `python3 -c "import hashlib..."`) で再計算した値**と
  node の `source_digest` を並べて示してください
- 各 node の `confirmation_status` が `confirmed` であり、`confirmation_evidence` が evaluator の成果物
  (`completeness-report.json`) を指していること
- `progress.json` の `registered_this_run` に登録 node id が漏れなく入っていること
- 次の 2 script が exit 0 であること (コマンドと exit code をそのまま示す):
  - `python3 plugins/dev-graph/scripts/validate-source-digest.py --repo-root <FIXTURE> --progress <FIXTURE>/eval-log/run-dev-graph-system-spec-progress.json`
  - `python3 plugins/dev-graph/scripts/validate-evidence-refs.py --repo-root <FIXTURE> --progress <FIXTURE>/eval-log/run-dev-graph-system-spec-progress.json`

**登録 node が 0 件の場合は status=FAIL です。**「取り込むべき確定章が無かった」という結論は
本 fixture では成立しません。

---

## 第 3 段: 「登録は C02 経由だけ」の全数検査 (observation 3 の前半)

observation 3 は「登録は C02 経由だけ」と要求します。これは否定形の主張なので、
**書込み操作が 1 件も起きていない状態で「C02 以外の登録 0 件」を確認しても、検査が作動した
証拠にはなりません。** 第 2 段で実際に登録が起きていることを前提に、次の 2 方向から実測してください。

### 3-a. 本 run の実行トレースの全数検査

本 run で FIXTURE の graph store および `specs/` `architecture/` 配下を**変更した操作をすべて列挙**し、
そのそれぞれが C02 (`run-dev-graph-node` skill / `upsert-node.py`) 経由であることを示してください。
列挙は「変更した操作の集合」であり、この集合が空なら第 2 段が失敗しています。

- `Write` / `Edit` ツールで graph store や node の Markdown を直接書いた操作が **0 件**であること
- graph store の `graph_revision` が登録件数ぶん増えていること (before / after の実値)

### 3-b. writer 経路の静的確認 (陽性対照つき)

dev-graph plugin 内で graph store へ**書き込む**正規 script を列挙し、役割分担を示してください。

- `build-graph-store.py`: graph store が存在しない初期化時だけ、canonical empty graph を生成
- `upsert-node.py`: 初期化後の node 登録・更新を担う唯一の mutation writer

**この検査は「検索語が実際にヒットしうる」ことを先に示してから行ってください。**
書込み述語 (`write_text` / `json.dump` / `open(..., "w")` など) で `plugins/dev-graph/scripts/` を
検索し、上記 2 script がそれぞれの責務でヒットすることを陽性対照として示します。そのうえで、
本 run は既に初期化済みの graph に対する node 登録なので、変更操作が `upsert-node.py` 経由だけで
あることを示してください。何もヒットしない検索語で「0 件」と報告した場合、それは検査ではなく
空振りであり FAIL 扱いです。

---

## 第 4 段: 「同等ロジックの複製 0 件」の実測 (observation 3 の後半・陽性対照必須)

observation 3 は「同等ヒアリング / compile ロジックが dev-graph 内に複製されていない」と要求します。
これも否定形です。**「dev-graph 内を検索して 0 件でした」だけでは、検索語が悪くて空振りしただけの
可能性と区別がつきません。**

次の手順で、**対照実験**の形にしてください。

1. system-spec-harness 側の elicitation / compile の中核実装を特定し、ファイル path と行数を実測で示す。
   少なくとも次は実在します:
   - `plugins/system-spec-harness/skills/run-system-spec-elicit/scripts/apply-spec-transition.py` (ヒアリング状態遷移)
   - `plugins/system-spec-harness/skills/run-system-spec-compile/scripts/compile-spec-doc.py` (章 compile)
   - `plugins/system-spec-harness/scripts/validate-coverage-matrix.py` / `validate-source-citation.py` (coverage / 出典 gate)
2. これらの実装に特徴的な検索語 (関数名・状態値・schema key・CLI サブコマンド名など) を**自分で選び**、
   その検索語が **harness 側で N>0 件ヒットする**ことを実測で示す (陽性対照)。
   使った検索語とヒット数を明記すること。
3. **同じ検索語**を `plugins/dev-graph/` 全体へ適用し、ヒット 0 件であることを示す。
4. さらに、dev-graph 側が harness の成果物を「複製ではなく参照」していることを示す: 登録した node の
   本文に system-spec の章本文が丸ごとコピーされていないこと、参照は `source_lineage` と
   `architecture_refs` で行われていることを、実際の node Markdown の中身で示してください。

検索語を 1 語だけで済ませず、ヒアリング側と compile 側の**両方**から最低 1 語ずつ選んでください。

---

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-system-spec` は `goal_seek` を宣言します。SKILL.md の該当節に従い、
`<FIXTURE>/eval-log/` へ次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-system-spec-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-system-spec-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-system-spec-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ちます。次を厳守してください:

1. 上記 Skill ツールで被験 skill をロードした直後、委譲・状態更新・検証など被験 skill の実作業より前に、
   SKILL.md の original_goal を goal-spec へ書き、その同じ文字列から UTF-8 SHA-256 を計算する。
2. 同じ時点で、計算済みの正しい hash を持つ最初の intermediate 行を新規作成する。
   transcript 上、最初の system-spec-harness Skill 呼出しより前であることを必須とする。
3. skill 実行と検証後に、結果を持つ 2 行目だけを append (末尾追加) する。
4. 2 行を後からまとめて書かない。既存行の Edit / Update / 全体上書きはしない。
   hash 検証に失敗した場合は書き換えず FAIL とする。

`progress.json` の `registered_this_run` には本 run で登録した node id を漏れなく記録してください
(第 2 段の 2 script の入力になります)。

---

## 成功条件 (すべて実測値で示すこと)

- 第 1 段: system-spec-harness plugin が version / entry-point 要件を満たし、正規 4 entry point が
  `Skill` 経由で完走し、coverage / source / evaluator gate が PASS
- 第 2 段: specification / architecture node が C02 経由で登録され、source_lineage 6 フィールドが
  全て非 null、source_digest が自力再計算と一致、validate-source-digest.py と
  validate-evidence-refs.py が exit 0
- 第 3 段: 本 run の書込み操作の全数検査で C02 以外の登録が 0 件、かつ writer 経路の静的確認が
  陽性対照つきで成立
- 第 4 段: 複製 0 件が陽性対照つきの対照実験として成立し、参照が lineage 経由であることを
  node 本文で確認できている
- goal-seek 3 点セットがすべて書き出され、intermediate は実行時系列どおりの append-only である

いずれかが実測できていない場合は、その旨を明示して status=FAIL としてください。
**実測できていない項目を「問題なし」と報告しないでください。**

---

## 完了報告

全検証後、**次の絶対パスへそのまま**完了マーカーを 1 ファイルだけ Write してください。

```
/Users/dm/orca/workspaces/HarnessHub/wt-22/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260807T130000-wt22-c19-ledgerfix/out/status.json
```

**この 3 点を必ず守ってください (過去の run はここで失敗しました):**

1. **`Write` の `file_path` には上の絶対パスを一字一句そのまま貼ること。**
   `out/status.json` のような相対パスで書いてはいけません。作業中に cwd が FIXTURE 側へ移っているため、
   相対パスで書くと `<FIXTURE>/out/status.json` に落ちて harness が完了を検知できず、
   同時に「FIXTURE には skill の正規成果物以外を作らない」制約にも違反します。
2. **書き出し先ディレクトリはすでに存在します。`mkdir` は不要です。**
   とくに `<FIXTURE>/out` を作らないでください。
3. **中身は次の 2 キーだけにすること。** 検証の詳細・observation の内訳・要約を
   このファイルに含めてはいけません (報告は最後の 1 行で行います)。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C19-OUT1-positive-system-spec-lineage-r2"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること (`AskUserQuestion` を使わない)。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと (ただし上記「入力前提」で固定した条件は
  本 scenario の入力であり、これに従うことは省略にあたらない)。
- 上の run 用 `out/` ディレクトリには `status.json` 以外を書かないこと。
- **FIXTURE の中に `out/` ディレクトリを作らないこと。** FIXTURE に置いてよいのは
  skill の正規フローが生成する成果物 (`system-spec/` 配下の state・章・report、`.dev-graph/` 配下、
  `eval-log/` の goal_seek 配線 3 点と監査台帳) だけです。
- 被験 repository は FIXTURE だけ。HarnessHub 本体の `plugins/` 配下と `.dev-graph/` 配下を
  変更しないこと。書込みは FIXTURE の内部と上記 out/status.json だけに限る。
- graph store を正規 writer (`upsert-node.py`) 以外で書かないこと。

## scenario 契約

scenario_id: `C19-OUT1-positive-system-spec-lineage-r2`
