# タスク: dev-graph:run-dev-graph-decompose の Skill 正経路・macro dry-run 実走

隔離 fixture repo `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-decompose` だけを対象にしてください。

## 必須の開始操作

あなたの**最初の workflow tool call** は、ロード済みの `Skill` tool による次の対象 Skill 呼び出しでなければなりません。SKILL.md を検索して手作業で再現することは代替になりません。

`Skill({skill: "dev-graph:run-dev-graph-decompose", args: "認証付きTODO APIをarchitecture、認証feature、TODO featureへマクロ分解する。TODOは認証に依存。全nodeはtracker_binding=none。 --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/live-trial-fixtures/20260721-r5-decompose --dry-run"})`

transcript にこの Skill 呼び出しが残らない場合は FAIL としてください。

## 証跡の作り方 (絶対規則 — 違反は即 FAIL)

1. **receipt はリダイレクトでのみ作る**: すべての receipt ファイルは `python3 <script> <args> > <receipt>.json 2>&1` の形で作成する。`cat <<EOF` / heredoc / Write tool による receipt の手書きは**禁止**。
2. **コマンドと exit code を残す**: receipt ごとに `<receipt>.cmd.txt` を作り、実行したコマンド行と `exit=<code>` の 2 行を書く。
3. **一切加工しない**: 保存した receipt のフィールドを削除・改名・追加しない。`verdict` や `valid_for_dry_run` のような**自分で導出した判定フィールドを足さない**。値が期待と違っても、そのまま提出する。
4. **検証対象と提出物を同一にする**: schema 検証は**提出する成果物ファイルそのもの**に対して行う。検証を通すために値を足した別ファイルを作って、そちらを検証してはならない。
5. **digest は実測値**: `input_digest.<key>` には `shasum -a 256 <保存済みファイル>` の出力をそのまま貼る。一時ファイルや graph の digest で代用しない。
6. **前回成果物を流用しない**: fixture の eval-log にある `-r7` / `-r8` のファイルを参照・コピーしない。すべて `-r9` suffix で新規生成する。

## schema 検証の合格定義

`--dry-run` では node の `.md` 実ファイルを書かないため、`validate-graph-schema.py` は全 node に `artifact_missing` を出し、**`"valid": false` と exit 1 を返します。これはこのシナリオの想定どおりの挙動です。** exit 1 を失敗と解釈して retry したり、出力を書き換えたり、判定フィールドを足したりしないでください。

このシナリオが本当に検出したい欠陥は `violations[]` の `code` が `schema_violation` または `missing_required_key` であるものだけです。

ただし**合否判定はあなたの仕事ではありません**。あなたは validator の生出力をそのまま提出し、加えて `violations[]` を `code` 別に数えた集計のみを `eval-log/run-dev-graph-decompose-schema-violation-counts-r9.json` に `{"<code>": <件数>, ...}` の形で保存してください。この集計に判定語 (`PASS` / `FAIL` / `valid` など) を含めないこと。合否は評価者が生出力から独立に判定します。

## 必須の実走と証跡

- C24 `resolve-repo-context.py --mode write` の JSON を**一切加工せず** `eval-log/c24-receipt-r9.json` に保存する (規則 1-3 適用)。
- architecture 1 件 + feature 2 件を生成する。**node JSON は `upsert-node.py --input <node>.json --dry-run` を 3 node 分実行し、その stdout をそのまま receipt として保存する** (`eval-log/run-dev-graph-decompose-upsert-<slug>-r9.json`)。手書きの node JSON を提出物にしない。TODO feature は認証 feature に依存する。task 粒度は混入させない。
- R2-plan は `Agent` macro auditor に分離し、DAG 循環 0・task 粒度混入 0・draft publication 0 を独立監査する。**Agent の model は指定しない** (親と同等の個体に監査させる)。`subagent_type` と返答全文を成果物に保存する。
- 3 node の actual preview graph を `eval-log/preview-graph-r9.json` に保存し、`validate-graph-schema.py` の**完全な JSON receipt** を `eval-log/run-dev-graph-decompose-schema-validation-r9.json` に保存する (規則 1-4 適用)。
- macro preview は `eval-log/run-dev-graph-decompose-macro-preview-r9.json`、publication preview は `eval-log/run-dev-graph-decompose-publication-preview-r9.json` に保存する。**`validation` の各項目を `pending` のまま終了したら FAIL**。publication preview は全 target / operation / input_digest / output_digest / local・Beads・GitHub・Projects write_count=0 を含める。
- R2-plan Agent とは別の fresh `Agent` receipt-reader に、上記 receipt 群と canonical graph の前後 digest を**実際に読ませて**独立監査させる。監査観点に「**各 receipt が script の生出力か、手書き・加工されていないか**」を明示的に含める。結果を `eval-log/run-dev-graph-decompose-independent-verifier-r9.json` に保存し、`verified=true` でなければ FAIL とする。
- canonical `.dev-graph/state/graph.json` は不変、feature の C02 add 直登録 0、tracker publication 0 を維持する。

scenario ID は `decompose-macro-positive-r3`。

処理が終了 (成功・失敗・中断のいずれでも) したら、`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203525-wt-6/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260721T135330/out/status.json` だけを out/ に Write し、`{"status":"PASS|FAIL|ERROR","scenario":"decompose-macro-positive"}` とする。最後は `DONE: <status>` と 1 行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
