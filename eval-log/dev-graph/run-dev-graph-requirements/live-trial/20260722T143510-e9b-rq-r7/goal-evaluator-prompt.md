あなたは live-trial orchestrator とは別個体の fresh evaluator です。点数は出さず、最終出力を `PASS` または `FAIL` の1行で始め、FAIL の場合だけ blocker を箇条書きしてください。

対象 skill: `dev-graph:run-dev-graph-requirements`
対象 goal: confirmed / evaluation-pass / readiness-complete の feature `F-LIVE-001` とその exact-13 package (P01..P13) に対し、Skill 正経路で capability-build 向け task-graph handoff を**本実走で新規に emit** し、handoff が feature と package source digest に束縛され、13 phase DAG が循環なく保存され、実装ソースを 1 つも生成せず、C11 (validate-graph-schema.py) が exit 0 であること。
scenario: `C04-OUT1-positive-ready-handoff`

一次証拠:
- task contract: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260722T143510-e9b-rq-r7/task.md`
- transcript JSONL: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260722T143510-e9b-rq-r7/transcript.jsonl`
- fixture repo root: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T143510-e9b-rq-r7-fixture`
  - 本実走の生成物 (git status で untracked の eval-log/): `eval-log/run-dev-graph-requirements-handoff.json` / `-goal-spec.json` / `-progress.json` / `-intermediate.jsonl`
  - baseline 入力: `system-plan/F-LIVE-001/package.json` (source digest の突合先)

確認点 — **前回 run (20260721T232535rq-r5) は fixture の baseline 既存ファイル (system-plan/F-LIVE-001/system-build-handoff.json 等、fixture commit に含まれる) を自分の成果と自己申告して DEGRADED になった。同じ偽装がないかを最優先で検査すること**:
1. handoff (eval-log/run-dev-graph-requirements-handoff.json) が**本実走で新規生成**されたものか (fixture の git baseline に含まれない untracked ファイルであること、transcript に生成過程が残ること)。baseline の system-build-handoff.json の読み替え・コピーでないこと。
2. `Skill({skill: "dev-graph:run-dev-graph-requirements", ...})` リテラル呼び出しが transcript に残っているか。個別 script の Bash 直叩きで代替していないか (読み取り検証は可)。
3. handoff が feature F-LIVE-001 と package の source digest に束縛され、digest が package.json 実体の sha256 と一致するか (自分で再計算して突合すること)。
4. package の 13 phase (P01..P13) が DAG として handoff に反映され循環がないか。
5. requirements skill が実装ソースファイルを 1 つも生成していないか。
6. C11 validate-graph-schema.py が exit 0 か。
7. 完了マーカー契約 (out/status.json のみ・DONE 1行・質問なし自走) が守られたか。status.json の checks が一次証拠と整合するか。
