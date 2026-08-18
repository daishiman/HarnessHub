# タスク: dev-graph:run-dev-graph-system-spec の実走 (scenario C19-OUT1-positive-system-spec-lineage-r6-bounded)

<!-- live-trial-premise:begin scenario=C19-OUT1-positive-system-spec-lineage-r6-bounded contract-digest=bfe2cb37f544e7d2 -->

## この scenario の入力前提 (fixture 正本から生成。手で書き換えないこと)

被験 fixture は `/Users/dm/orca/workspaces/HarnessHub/card-closeout/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260818T000759Z-c19-pepx-r1/fixture-repo` にある dev-graph 初期化済みの独立 Git repository です。

fixture が最初から置く業務入力は次の 8 ファイルだけです:

- `system-spec/index.md`
- `system-spec/00-requirements-definition.md`
- `system-spec/backend.md`
- `system-spec/spec-state.json`
- `system-spec/fetched-references.json`
- `system-spec/completeness-report.json`
- `eval-log/system-spec-harness/audit-fork-ledger.jsonl`
- `system-spec/resume-receipt.json`

R0-context / R1-preflight で宣言済みの system-spec-harness と次の entry point の実在を確認してください。fixture の digest-bound PASS receipt は current なため、これら upstream entry point は呼び出さず、`validate-system-spec-resume.py` の `reuse-confirmed` 検証だけを実行します。

1. `system-spec-harness:run-system-spec-elicit`
2. `system-spec-harness:run-system-spec-doc-fetch`
3. `system-spec-harness:run-system-spec-compile`
4. `system-spec-harness:assign-system-spec-completeness-evaluator`

本 scenario の必須観測 (scenario 正本 required_observations):

- the declared system-spec-harness contract and digest-bound PASS receipt validate in reuse-confirmed mode without upstream regeneration
- the imported specification and architecture retain source lineage and evaluator evidence
- registration occurs only through C02 and no duplicate elicitation or compile logic appears in dev-graph

本 scenario の必須 task contract (次の文言を省略しないこと):

- upsert-node.py
- validate-system-spec-resume.py
- reuse-confirmed
- --resume
- 初回 runner の終了状態を終端結果とする
- 診断コマンド・個別 validator・依存 package 導入・runner 再実行を行わない
- canonical runner command の1行を文字どおり単独実行する

canonical runner command は以下です。この1行を文字どおり単独実行する:

```text
python3 plugins/dev-graph/scripts/build-system-spec-resume-import.py --repo-root '/Users/dm/orca/workspaces/HarnessHub/card-closeout/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260818T000759Z-c19-pepx-r1/fixture-repo'
```

<!-- live-trial-premise:end -->

## 実行契約

task.md の Read を除く最初の実行アクションとして、必ず次を Skill ツールでリテラル呼び出ししてください。

```text
Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/card-closeout/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260818T000759Z-c19-pepx-r1/fixture-repo --resume"})
```

この bounded scenario では、上記の被験 Skill 以外の Skill と Agent を呼び出してはいけません。人間へ質問せず、この 1 ターンで最後まで自走してください。時間上限は 360 秒、transcript token 上限は 2,000,000 です。上限を延長してはいけません。

Skill を読み込んだら、premise のコードブロックにある canonical runner command の1行を、raw文字列を一切変えず Bash `input.command` として1回だけ実行してください。prefix/suffix、cwd 変更、環境変数、shell wrapper、別の引用形式、空白変更、演算子、redirect、`echo EXIT`、末尾改行の付加を禁止します。

runner は `validate-system-spec-resume.py` の `reuse-confirmed` 検証、C02 の唯一の writer `upsert-node.py` による architecture/specification 登録、両 node のリテラル `source_lineage`・`confirmation_evidence`、schema・evidence ref・複製 0 の検証をまとめて行います。

初回 runner の終了状態を終端結果とすること。成否にかかわらず、後続の診断コマンド・個別 validator・依存 package 導入・runner 再実行を行わないでください。fixture 内の成果物や receipt を手編集してはいけません。

runner の stdout が `status=PASS`、`network_calls=0`、`upstream_skill_invocations=0`、登録 node が `arch-system-spec-overview` と `spec-system-spec-index` の2件、かつ12個の step がすべて exit code 0 なら、次の絶対パスへ Write ツールで `status.json` を1ファイルだけ保存します。

`/Users/dm/orca/workspaces/HarnessHub/card-closeout/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260818T000759Z-c19-pepx-r1/out/status.json`

内容は JSON object とし、`status: PASS`、`mode: reuse-confirmed`、`network_calls: 0`、`upstream_skill_invocations: 0`、`registered_nodes`、`runner_report`、上記3つの required_observations それぞれへの短い evidence を含めてください。runner が失敗した場合は緑化せず、後続実行は一切行わず、`status: FAIL` と blocker を記録します。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 最後の応答は `DONE: PASS` または `DONE: FAIL` の1行だけにすること。
