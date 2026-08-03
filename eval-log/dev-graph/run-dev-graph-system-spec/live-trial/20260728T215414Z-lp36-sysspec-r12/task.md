# タスク: dev-graph:run-dev-graph-system-spec の実走 (scenario C19-OUT1-positive-system-spec-lineage)

## 最重要 — Skill ツールの起動が本 trial の測定対象 (これを外すと trial 全体が無効)

被験 skill の実行は必ず次の **Skill ツール呼出し**で開始してください。これが最初の実行アクションです。

```
Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/system-spec-lp36-current-r12"})
```

次の代替は**いずれも不可**です。これらで代替した場合、成果物が正しくても trial は launch=FAIL として破棄されます:

- SKILL.md や `prompts/R0-context.md` などを読んで手順を自分で再現する
- `plugins/dev-graph/scripts/` 配下の script を Bash から直接叩いて skill 本体を代替する
- Task / Agent ツールへ委譲して skill 起動を肩代わりさせる

transcript に `Skill` ツールの起動が **1 件以上**現れることが必須条件です。skill が内部で `upsert-node.py` などの script を Bash 実行するのは skill 手順の一部であり、迂回にはあたりません。

---

## r12 の完全自走条件（operator nudge 0）

この trial は、成果物の正しさに加えて **人間からの追加メッセージなしで完走すること**を測定します。
最初の task 本文だけを入力として最後まで進め、確認質問や「続けてよいか」の待機を行わないでください。

- この session は Claude Code 2.1.62 / default effort で起動済みです。親 context の
  WebSearch は利用可能なので、doc-fetch では親 context から公式一次資料を当日実測してください。
- clone により `repository_id` が不一致なら、`.dev-graph/config.json` を Edit せず、
  sanctioned writer の `plugins/dev-graph/scripts/build-repo-config.py` を dry-run →
  update の順で使って修復してください。
- R3 では architecture と specification の node input 作成・全必須フィールド充足・
  schema 事前確認を両方とも済ませるまで `upsert-node.py` を一度も呼ばないでください。
  その後は必ず architecture の `Skill(run-dev-graph-node)` → dry-run → apply、
  specification の `Skill(run-dev-graph-node)` → dry-run → apply の順です。
  失敗する dry-run も Skill より前には実行禁止です。

- Agent fork は Claude Code 2.1.62 では非同期になる場合があります。通知だけに依存せず、
  現 session 配下の `subagents/*.jsonl` を read-only で最大 60 秒間隔に確認し、
  最終 assistant text が存在したら自律的に回収して次へ進んでください。
- 完了済み Agent を待ち続けないでください。固定の長い `sleep` は使わず、1 回 60 秒以下の
  poll にしてください。
- WebSearch が親 context で model 設定エラーになる場合は、正規 doc-fetch Skill を先に起動した
  うえで、取得専用 Agent を fork して公式一次資料を検索させて構いません。Agent は fixture を
  変更せず、取得 JSON だけを親へ返します。親は transcript の最終 assistant text を自律回収します。
- 最後まで operator からの nudge を待たず、全ゲート合格後に `out/status.json` を PASS で生成して
  自ら終了してください。

### r5 で独立監査が要求した first-pass 品質

r5 は最終的に内容上 PASS でしたが、最初の completeness 評価で修正往復が必要になりました。
r12 は requirements brief の記載を最初から具体的に反映し、可能なら最初の評価で次を満たしてください。

- `domain-model` は `todos` / `api_tokens` の名前だけで終えず、主キー、主要属性、関係、
  状態遷移、整合性制約を QA と確定セルへ接地する。
- `security-posture` は資産、脅威、信頼境界、保存時・通信時の扱い、監査ログ方針を具体化する。
- web / 非 web の質問は、採用・除外のどちらにも回答の足場がある非誘導形にし、40 個の対象外
  セルには個別の approval_ref を持たせる。
- 8 カテゴリすべてで project-specific knowledge candidate を
  `discovered -> qualified -> deepened` と正規 writer 経由で進め、各章へ適用・根拠・
  trade-off が描画されるようにする。
- OAuth password grant の現行根拠は RFC 6749 の定義だけで終えず、BCP 240 / RFC 9700
  §2.4 の MUST NOT を `fetched-references.json` と D3 の却下理由へ反映する。
- FastAPI の version は task の過去観測値で固定せず、公式ページの当日実測を優先する
  （r5 の実測は `0.140.6`）。

最初の evaluator が FAIL した場合も、下記 Section B の正規 Skill 再起動順で自律修正して
再評価してください。評価レポートを手修正してはいけません。

### r12 の C02 登録では追加 noop を行わない

architecture と specification の各 1 回について `Skill(run-dev-graph-node)` →
dry-run → apply だけを行います。apply 後の冪等確認用 noop、patch、update、再 upsert は
実行しないでください。最終的な `upsert-node.py` 呼出しは dry-run 2 回・apply 2 回だけ、
実書込みは `graph_revision 0 -> 1 -> 2` の 2 件だけにします。

---

## 前回 trial の blocker を解消するための追加制約

この r12 trial は、前回の fresh evaluator が検出した次の 3 blocker を解消できるかも測定します。

1. `R0-context` / `R1-preflight` / `R2-delegate` / `R3-import` の各 responsibility では、対応する `prompts/<R-id>.md` を読み、**各 responsibility ごとに Agent ツールで分離 context へ fork**してください。3 点セットを書くだけで Agent fork を省略してはいけません。
2. node 登録は必ず
   `Skill({skill: "dev-graph:run-dev-graph-node", args: "..."})`
   という正規 C02 entry point を実際に呼んで行ってください。親の
   `run-dev-graph-system-spec` から `upsert-node.py` を直接実行して代替してはいけません。
   `upsert-node.py` は、呼び出された C02 skill の内部 writer として実行される場合だけ許可します。
3. completeness evaluator が `doc_freshness` などを FAIL にした場合は、原因となる章を正規 compile skill で修正し、
   `system-spec-harness:assign-system-spec-completeness-evaluator` を **Skill ツールでもう一度実行**して PASS を得てください。
   `completeness-report.json` を Write / Edit / script で手修正して PASS に変えてはいけません。
   最終 PASS は evaluator が生成した dispatch の `session_id` を含み、正規 aggregate gate が exit 0 になることを実測してください。

上の 3 項目は transcript のツール履歴で確認します。成果物だけを同じ形に整えても、正規 entry point / Agent fork / evaluator 再実行が記録されていなければ FAIL です。

### r9 fresh evaluator の blocker を解消する固定条件

r9 では成果物の gate は通りましたが、実行順序・正規評価・OUT1 証明・node 本文が契約を
満たさなかったため FAIL でした。r12 では次を transcript と成果物の両方で証明してください。

1. 最初の `Skill(dev-graph:run-dev-graph-system-spec)` 起動直後、R0 / R1 / helper /
   responsibility Agent の実行より前に、goal-spec と最初の intermediate 行を作る。
   最初の intermediate 行は正しい `input_hash` / `output_hash` を持つこと。2 行目は
   R0 / R1 / R2 / R3 の実行後に append する。対象 Skill の起動自体は trial の最初の
   アクションなので、この時系列条件の違反には数えない。
2. R0 / R1 / R2 / R3 はそれぞれ別の Agent fork を実行する。R2 / R3 Agent は read-only
   分析だけを行い、親 context が 4 harness Skills と 2 回の C02 Skill を起動する。
3. OUT1 の AST 検査は、harness 正本と dev-graph production を**同じ Python AST script と
   同じ探索規則**で検査する。`run_chunk` と `compile_docset` について正本の定義数 `N>0`、
   dev-graph production の定義・呼出し数 `0` を一度の成功コマンド（exit 0）で確認する。
   広い grep の後に別 pattern・一部 directory の検索を行って代替してはいけない。
4. writer 静的陽性対照は、AST または同等の構文検査で
   `build-graph-store.py` の `atomic_json(graph_path, document)` と
   `upsert-node.py` の `atomic_json(graph_path, proposed)` を同じ成功コマンド（exit 0）
   内で 1 件ずつ確認する。単なるファイル名列挙や `--help` は証明にならない。
5. completeness report は手動で Write / Edit せず、正規 completeness evaluator Skill に
   生成させる。その後、evaluator が返した現在の `session_id` を使い、少なくとも次と同じ
  意味の canonical aggregate command を実行し exit 0 を得る:
   `aggregate-completeness.py --report <fixture>/system-spec/completeness-report.json
   --fork-ledger <worktree>/eval-log/system-spec-harness/audit-fork-ledger.jsonl
   --session <current-session-id> --matrix <fixture>/system-spec/spec-state.json
   --require-complete --knowledge-graph`。
6. architecture / specification の node Markdown 本文には、brief と確定 system-spec に基づく
   実際の purpose / goal / scope / acceptance を記載する。`<!-- ... -->`、空見出し、
   template placeholder、後で埋める旨の文言を残してはいけない。
7. architecture node は未登録 specification を参照しない。specification node の
   `architecture_refs` は、1 件目で登録済みの architecture node ID を 1 件以上含める。
8. FastAPI 公式 docs から version / 更新日を確定できない場合は、doc-fetch Skill を起動した
   後、`official-source-catalog.md` の rule 2 に従って FastAPI 公式 GitHub organization の
   Releases を当日取得する。`fastapi` と bearer-token/security の両 target に、取得した
   現行 version、`official_host: github.com`、公式 organization の直接 source である説明を
   記録する。過去 trial の値を取得せずにコピーしてはいけない。

---

## r4 fresh evaluator の blocker も解消する r12 必須条件

前回 r2 では、上の 3 項目を満たした後にも次の blocker が残りました。r12 では以下を省略すると FAIL です。

### 0. responsibility Agent は分析専用、正規 Skill 起動は親 context が行う

R0 / R1 / R2 / R3 の Agent fork は必要ですが、R2 / R3 の Agent は **Read と分析・実行計画の返却だけ**を行います。fixture を変更する Bash、helper script 実行、Skill 起動を Agent に肩代わりさせてはいけません。

親の `run-dev-graph-system-spec` context は、R2 分析 Agent が返った後に次の 4 行をそれぞれ明示的な Skill ツール呼出しとして実行してください。各 phase について、対応 helper script より前にこの Skill 呼出しが transcript に現れる必要があります。

1. `Skill({skill: "system-spec-harness:run-system-spec-elicit", args: "..."})`
2. `Skill({skill: "system-spec-harness:run-system-spec-doc-fetch", args: "..."})`
3. `Skill({skill: "system-spec-harness:run-system-spec-compile", args: "..."})`
4. `Skill({skill: "system-spec-harness:assign-system-spec-completeness-evaluator", args: "..."})`

同様に R3 分析 Agent が返った後、親 context が specification / architecture 各登録の直前に
`Skill({skill: "dev-graph:run-dev-graph-node", args: "..."})`
を呼び、その Skill 内部だけで `upsert-node.py` の dry-run / apply を行ってください。

Agent が writer を実行してから親が Skill を後付けで呼んでも、正規起動の代替なので FAIL です。

### r4 で残った C02 順序違反を防ぐ固定登録手順

r4 は architecture の実 apply と specification patch を 2 回目の C02 Skill より先に実行し、
後から noop を行ったため FAIL でした。r12 では R3 の入力準備と schema 検査をすべて終えてから、
次の 2 登録だけを、この順序で実行してください。

1. architecture node:
   - `related_nodes: []`、`architecture_refs: []` とし、未登録 specification を参照しない。
   - 必須 frontmatter (`purpose` / `goal` / `scope_in` / `scope_out` / `acceptance` /
     `architecture_refs`) を node input に最初から含める。
   - 親 context が `Skill(dev-graph:run-dev-graph-node)` を呼び、その直後に同じ Skill context
     の内部手順として dry-run → apply を実行する。成功時 revision は `0→1`。
2. specification node:
   - 既に存在する architecture node を `architecture_refs` で参照する。
   - 同じ必須 frontmatter を node input に最初から含める。
   - 親 context が 2 回目の `Skill(dev-graph:run-dev-graph-node)` を呼び、その直後に同じ
     Skill context の内部手順として dry-run → apply を実行する。成功時 revision は `1→2`。

node input の作成、template/schema の確認、参照先の解決は **各 Skill 呼出しより前**に完了させて
ください。1 回目と 2 回目の間、および 2 回目の後に追加 patch/update upsert を行ってはいけません。
最終 mutation trace は実書込み 2 件・`graph_revision 0→1→2` だけでなければ FAIL です。
Skill の後付け呼出しや noop 再実行は、先行した不正な apply を回復したことにはなりません。

第 3 段・第 4 段の検査は追加 Agent へ委譲せず親 context が実行し、writer 静的確認と AST
対照実験はこの worktree の
`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/`
だけを対象にしてください。親 repository
`/Users/dm/dev/dev/個人開発/HarnessHub/plugins/` を対象にしてはいけません。

### A. C01 の 5-loop 上限を各 invocation で守る

`apply-spec-transition.py chunk` は、1 回の呼出しにつき turn を最大 5 件だけ処理する契約です。

- すべての `chunk` 呼出しを `--max-loops 5` とし、渡す turns JSON も 1 ファイル最大 5 件に分割すること。
- web 8 セルの確定も、非 web 40 セルの対象外化も、5 件以下の複数 chunk に分割すること。`--max-loops 8` / `40` や 40 件一括は不可。
- 各 chunk 後に state が保存され、未収集が残る中間回では resume 可能であることを確認して次の chunk へ進むこと。
- 最終 `spec-state.json` の `hearing_progress.loop_count` が 5 以下、未収集 0、`complete=true` であることを実測すること。
- completeness evaluator の C06 hearing auditor が **PASS** であること。C06 FAIL を sub-input として格下げし overall PASS にしてはいけない。

### B. 鮮度修正も正規 Skill を再起動する

最初の doc-fetch では公式ページから現行値を確認してから receipt を assemble してください。2026-07-28 時点で直前 trial が確認した値は SQLite `3.53.4`、FastAPI `0.140.7` です。ページの実測が異なる場合は実測を優先します。

C08 が FAIL、または references / 章を修正する必要が生じた場合は、必ず次をこの順で **Skill ツールから再起動**してください。

1. `system-spec-harness:run-system-spec-doc-fetch`
2. `system-spec-harness:run-system-spec-compile`
3. `system-spec-harness:assign-system-spec-completeness-evaluator`

helper script の直接再実行だけで retry を代替してはいけません。最終 evaluator の C06 / C07 / C08 は全て PASS、3 receipt は hook 実 ledger と同じ現在 session_id に束縛し、aggregate gate exit 0 を確認してください。

### C. OUT1 の否定形検査を空振りさせない

#### C02-only writer

本 run の transcript から、fixture の graph / `specs/` / `architecture/` を変更した全操作を列挙してください。登録 apply は 2 件とも直前に `Skill(dev-graph:run-dev-graph-node)` が存在し、その skill 内部の `upsert-node.py` であることを示します。`upsert-node.py --help` や dry-run は変更操作へ数えません。graph revision は 0→1→2 を示してください。

静的陽性対照は、次の 2 実ファイルで実書込み call を個別に確認します。

- `build-graph-store.py`: `atomic_json(graph_path, document)` (初期化)
- `upsert-node.py`: `atomic_json(graph_path, proposed)` (C02 node mutation)

リポジトリ全体に `write_text|json.dump|open` を掛けて unrelated writer を大量に数え、それを「上の 2 経路だけ」の証明にしてはいけません。`register-package.py` や lifecycle consumer など別ユースケースが存在することは正直に区別し、本 scenario の変更操作集合が C02 upsert だけであることを transcript と before/after で証明してください。

#### 同等ロジック複製 0

字面検索で test fixture / コメントの 1 hit を拾ったまま「0 件」と報告してはいけません。Python AST などを使い、次の実装識別子を**実行可能な Python ロジック**について同じ方法で比較してください。

- hearing 側: `run_chunk`（正本 `apply-spec-transition.py` では定義数 1 以上）
- compile 側: `compile_docset`（正本 `compile-spec-doc.py` では定義数 1 以上）

陽性対照として harness 側の AST 定義数が各 `N>0`、陰性側として `plugins/dev-graph/` の production Python (`tests/` と `tests/fixtures/` を除外) の AST 定義・呼出し数が各 0 であることを同じ script で実測してください。最後に node Markdown が章本文を複製せず `source_lineage` / `architecture_refs` で参照していることも確認してください。

---

## この scenario の入力前提 (読み飛ばさないこと)

被験 fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/system-spec-lp36-current-r12` にある dev-graph 初期化済みの独立 Git repository です。

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
2. Python AST を使う 1 本の検査 script で `run_chunk` と `compile_docset` を対象にし、
   harness 正本側の関数定義数がそれぞれ **N>0** であることを示す（陽性対照）。
3. **同じ AST script・同じ識別子・同じ探索規則**を dev-graph production Python
   (`tests/` と `tests/fixtures/` を除外) へ適用し、関数定義数と呼出し数がそれぞれ
   0 であることを示す。検査 command 全体が exit 0 で終了すること。
4. さらに、dev-graph 側が harness の成果物を「複製ではなく参照」していることを示す: 登録した node の本文に system-spec の章本文が丸ごとコピーされていないこと、参照は `source_lineage` と `architecture_refs` で行われていることを、実際の node Markdown の中身で示してください。

広い字面検索と、別 pattern・一部 directory だけの後続検索を組み合わせて 0 件の証明に
してはいけません。上記 AST 検査そのものの結果を報告してください。

---

## goal-seek 配線の必須履行 (省略禁止)

`run-dev-graph-system-spec` は `goal_seek` を宣言します。SKILL.md の `## ゴールシーク実行` に従い、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/system-spec-lp36-current-r12/eval-log/` へ 3 点セット (`run-dev-graph-system-spec-goal-spec.json` / `run-dev-graph-system-spec-progress.json` / `run-dev-graph-system-spec-intermediate.jsonl`、intermediate は必須 6 キー) をすべて書き出してください。

`intermediate.jsonl` は実行途中の証拠です。次を厳守してください:

1. 最初の `Skill(dev-graph:run-dev-graph-system-spec)` 起動直後、R0 / R1 / R2 / R3 や
   helper の実行より前に、SKILL.md の original_goal を goal-spec へ書き、その同じ
   文字列から UTF-8 SHA-256 を計算する。
2. 同じ時点で、計算済みの正しい hash を持つ最初の intermediate 行を新規作成する。
3. responsibility / skill 実行と検証後に、結果を持つ 2 行目だけを append (末尾追加) する。
4. 2 行を後からまとめて書かない。既存行の Edit / Update / 全体上書きはしない。hash 検証に失敗した場合は書き換えず FAIL とする。

なお fixture の `eval-log/` には過去 run の 3 点セットが残っています。本 run の内容で上書き (新規 Write) して構いませんが、**intermediate.jsonl は本 run の 1 行目を Write した後、2 行目を append する**という順序を守ってください (過去 run の行を残したまま append すると時系列が混ざります)。

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

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260728T215414Z-lp36-sysspec-r12/out/status.json` に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "scenario": "C19-OUT1-positive-system-spec-lineage"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと (ただし上記「入力前提」で固定した条件は本 scenario の入力であり、これに従うことは省略にあたらない)。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ)。
- 本 worktree の `plugins/` 配下と `.dev-graph/` 配下を変更しないこと。書込みは fixture repository の内部と上記 out/status.json だけに限る。
