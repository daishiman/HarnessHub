# R7: render OUT1 適合 (進捗 13/13 == receipt applied/expected) の実走

## 前提: 必ず skill の実行契約を通すこと

**下位 script (render-graph-html.py) を直接叩いて成果だけ出すのは不可。** SKILL.md の「ゴールシーク配線」を実行契約として全て履行すること。具体的には最低限:

1. 開始時に C24 `resolve-repo-context.py --mode read` の JSON receipt を取得し、`DEV_GRAPH_ROOT` を receipt の repo_root に固定する (cwd から再解決しない)
2. `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-render-goal-spec.json` に元のゴールを記録
3. `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-render-progress.json` に checklist の status/evidence を記録
4. 未達 responsibility の `prompts/<R-id>.md` を読み `Agent` で分離 context に fork する
5. 各周回末に `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-render-intermediate.jsonl` へ 6 キー (original_goal / original_goal_hash / current_goal_snapshot / delta_from_original / merged_directive_for_next / drift_signal) を append
6. SKILL.md 「ゴールシーク検証」の python ブロックを実行して exit 0 を確認

fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r7-render` を使う。

## シナリオ本体

OUT1 は「子 task 進捗 X/Y が registration receipt の applied_count/expected_count と一致」を要求する。receipt の applied/expected は register-package.py により **常に 13/13** なので、**13 子すべてが done の feature** を用意して進捗 13/13 を作ること。

1. fixture に exact-13 の feature package を用意し、`register-package.py register` で登録して **immutable な registration receipt** を得る。雛形として `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/.dev-graph/plans/feature-package-feat-stage0-distribution-gate/` の feature-package.json / dev-graph-registration.json を参照してよい (ID は fixture 用に置換すること)
2. 13 子タスクを全て status=done にする
3. skill を実行する: `Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r7-render"})`
   render 時に **`--registration-receipt` へ 1 で得た receipt を渡す**こと (これが無いと render-metadata の registration が null になり OUT1 の digest 対応を検証できない)

## 検証項目

- V1: 生成 HTML に外部 script/link 参照が 0 件 (IN1)
- V2: inline SVG に feature/task/edge が表示される
- V3: **feature の子 task 進捗が 13/13** であり、receipt の applied_count/expected_count と一致する (OUT1)
- V4: render-metadata の registration が receipt の source_digest に対応する (null でない)
- V5: 追加 runtime 依存が無い (self_contained: true)

## 厳守制約 (C02 単一 writer)

`.dev-graph/state/graph.json` を python・エディタ・sed 等で直接編集する C02 迂回は禁止。graph.json への書込みは upsert-node.py / register-package.py 経由のみ。

## 出力

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T180000-r7/out/status.json` だけに `{"status":"PASS|FAIL|ERROR","scenario":"render-out1-progress-13-13"}` を Write する
2. `DONE: <status>` と1行だけ報告する

途中で人間に質問せず最後まで自走し、skill の手順を省略しないこと。out/ に中間成果物を書かないこと。
