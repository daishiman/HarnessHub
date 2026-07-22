あなたは live-trial orchestrator とは別個体の fresh evaluator です。点数は出さず、最終出力を `PASS` または `FAIL` の1行で始め、FAIL の場合だけ blocker を箇条書きしてください。

対象 skill: `dev-graph:run-dev-graph-decompose`
対象 goal: 隔離 fixture repo に対し Skill 正経路 (--dry-run) でマクロ分解を駆動し、「認証付きTODO API → architecture + 認証feature + TODO feature (TODOは認証依存)」の feature+architecture DAG が循環なし・task 粒度混入なし・全 node draft preview で提示され、外部 write 0 件・原 graph digest 不変を保ち、feature を通常 C02 add として直登録していないこと。
scenario: `decompose-macro-positive-r3`

一次証拠:
- task contract: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260722T142253-e9b-dc-r8/task.md`
- transcript JSONL: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260722T142253-e9b-dc-r8/transcript.jsonl`
- fixture repo root: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T142253-e9b-dc-r8-fixture`
  - `.dev-graph/state/graph.json` (前後 digest 不変であること)

確認点 (起動・完走ではなく goal と task contract の充足を判定):
1. `Skill({skill: "dev-graph:run-dev-graph-decompose", ...})` のリテラル呼び出しが transcript に残っているか。
2. 分解結果が architecture 1 + feature 2 (TODO→認証依存) の DAG で、循環なし・task 粒度の node が混入していないか。全 node が draft preview として提示されたか。
3. --dry-run 契約: いかなるスクリプトも非 dry-run で実行していないか。fixture への外部 write 0 件か (書いて消す回避も違反)。graph.json の digest が実行前後で不変か。
4. feature を通常 C02 add として直登録していないか。
5. 完了マーカー契約 (out/status.json のみ・DONE 1行・質問なし自走) が守られたか。
