あなたは live-trial orchestrator とは別個体の fresh evaluator です。点数は出さず、最終出力を `PASS` または `FAIL` の1行で始め、FAIL の場合だけ blocker を箇条書きしてください。

対象 skill: `dev-graph:run-dev-graph-render`
対象 goal: 正規化済み fixture (feature 1 + task 13、registration receipt applied/expected=13/13) に対し Skill 正経路で render を駆動し、外部依存 0 の自己完結 HTML を生成し、OUT1 =「feature ごとの子 task 進捗 X/Y のうち総数 Y が receipt の applied_count/expected_count と一致する (done 数 X の一致は求めない = HarnessHub-rix で正文化された弱い読み)」を満たし、fixture を一切変更せず、ゴールシーク配線 (C24 receipt / goal-spec / progress / intermediate / R1-R3 の Agent fork) を履行すること。
scenario: `render-out1-total-matches-expected`

一次証拠:
- task contract: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-render/live-trial/20260722T144924-e9b-rd-r10/task.md`
- transcript JSONL: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-render/live-trial/20260722T144924-e9b-rd-r10/transcript.jsonl`
- fixture repo root: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T144924-e9b-rd-r10-fixture`
  - 生成物: `.dev-graph/render/index.html` / `eval-log/run-dev-graph-render-{goal-spec.json,progress.json,intermediate.jsonl}`
  - 入力: `.dev-graph/state/graph.json` / `system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json`

確認点 (起動・完走ではなく goal と task contract の充足を判定):
1. `Skill({skill: "dev-graph:run-dev-graph-render", ...})` リテラル呼び出しが transcript に残り、`--registration-receipt` に receipt パスが渡っているか。下位 script 直叩きでの代替がないか (skill 手順内の正規実行と検証読み取りは可)。
2. R1-elicit / R2-plan / R3-render の 3 責務が Agent fork として分離実行されたか (Read だけの同一 context 処理は契約違反)。
3. OUT1 (弱い読み): render 出力の feature_progress で LT-FEATURE-001 の子 task 総数 Y=13 が receipt の applied_count/expected_count=13/13 と一致するか。render-metadata.registration が null でないか。
4. IN1/V1/V5: index.html に外部 script/link 参照が 0 件で self_contained か。V2: inline SVG に feature/task/edge が描画されているか。
5. fixture 不変: graph.json・task md・receipt が書き換えられていないか (render 出力と eval-log 配線ファイルの生成のみ許容)。
6. progress.json の evidence が実コマンド+exit code+出力の実測か (別検査の結果の流用・実行していない検証の申告がないか。V6 のブラウザ目視は「未実施」と正直に記載されているか)。
7. validate-goal-seek-evidence.py が exit 0 か。
8. 完了マーカー契約 (out/status.json のみ・DONE 1行・質問なし自走) が守られたか。
