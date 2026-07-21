# タスク: dev-graph:run-dev-graph-render の実走

<!-- task-template.md 由来。task.md 契約 5 項目 (SKILL.md の表) をこの構造が満たす。項目の削除は契約違反。 -->

# R8: render OUT1 適合（子 task 総数 Y == receipt expected_count）の実走

## 前提: 必ず skill の実行契約を通すこと

**下位 script (`render-graph-html.py`) を直接叩いて成果だけ出すのは不可。** SKILL.md の「ゴールシーク配線」を実行契約として全て履行すること。最低限:

1. 開始時に C24 `resolve-repo-context.py --mode read` の JSON receipt を取得し、`DEV_GRAPH_ROOT` を receipt の repo_root に固定する（cwd から再解決しない）
2. `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-render-goal-spec.json` に元のゴールを記録
3. `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-render-progress.json` に checklist の status/evidence を記録
4. 未達 responsibility の `prompts/<R-id>.md` を読み `Agent` で分離 context に fork する
5. 各周回末に `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-render-intermediate.jsonl` へ 6 キー（original_goal / original_goal_hash / current_goal_snapshot / delta_from_original / merged_directive_for_next / drift_signal）を append
6. SKILL.md「ゴールシーク検証」の python ブロックを実行して exit 0 を確認

fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r8b-render` を新規に用意して使う。

## シナリオ本体

OUT1 は「feature ごとの子 task 進捗 X/Y のうち **総数 Y** が registration receipt の applied_count/expected_count と一致する（**done 数 X の一致は求めない**）」を要求する。

1. fixture に exact-13 の feature package を用意し、`register-package.py register` で登録して registration receipt を得る。雛形として `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/.dev-graph/plans/feature-package-feat-stage0-distribution-gate/` の feature-package.json / dev-graph-registration.json を参照してよい（ID は fixture 用に置換すること）
2. **登録後、`graph.json` を一切変更しない。** 子の status を done へ変えないこと。receipt の `graph_digest_after` が現 graph の digest と一致した状態をそのまま保つ
3. skill を実行する: `Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r8b-render"})`
   render 時に **`--registration-receipt` へ 1 で得た receipt を渡す**こと（無いと render-metadata の registration が null になり OUT1 の digest 対応を検証できない）

## 検証項目

- V1: 生成 HTML に外部 script/link 参照が 0 件（IN1）
- V2: inline SVG に feature / task / edge が表示される
- V3: feature の子 task の **総数が 13** であり、receipt の `applied_count` / `expected_count`（13/13）と一致する（OUT1）。**done 数は 0 で構わない**
- V4: render-metadata の registration が receipt の `source_digest` に対応する（null でない）
- V5: 追加 runtime 依存が無い（`self_contained: true`）

## 厳守制約

- **C02 単一 writer**: `.dev-graph/state/graph.json` を python・エディタ・sed 等で直接編集する C02 迂回は禁止。graph.json への書込みは `upsert-node.py` / `register-package.py` 経由のみ
- **receipt 偽造の禁止**: registration receipt を手書きしない。digest を後から一致させない。receipt は `register-package.py` の出力のみを使う。もし `registration receipt graph digest is stale` が出たら、**receipt を書き換えるのではなく**、登録後に graph を変更していないかを確認して原因を除去すること

## 出力

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/run-dev-graph-render/live-trial/20260721T232231-r8b/out/status.json` だけに完了マーカーを 1 ファイル Write する。内容:
   `{"status":"PASS|FAIL|ERROR","scenario":"render-out1-total-matches-expected"}`
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ — out/ に中間 Write させると poll が DONE 偽陽性を起こす)。
