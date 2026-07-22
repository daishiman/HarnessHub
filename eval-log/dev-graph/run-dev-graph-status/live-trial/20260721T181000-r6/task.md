# R6: status current-closure read-only proof (skill 実行契約を通す版)

## 前提: 必ず skill の実行契約を通すこと

前回の r5 は **下位 script (status-graph.py) を直接叩き、SKILL.md のゴールシーク配線を全て省略した**ため goal 不適合と判定された。今回はそれを是正する。SKILL.md の「ゴールシーク配線」を実行契約として全て履行すること。最低限:

1. 開始時に C24 `resolve-repo-context.py --mode read` の JSON receipt を取得し、`DEV_GRAPH_ROOT` を receipt の repo_root に固定する (cwd や fixture path のハードコードは不可)
2. `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-status-goal-spec.json` に元のゴールを記録
3. `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-status-progress.json` に checklist の status/evidence を記録
4. 未達 responsibility の `prompts/<R-id>.md` を読み `Agent` で分離 context に fork する
5. 各周回末に `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-status-intermediate.jsonl` へ 6 キー (original_goal / original_goal_hash / current_goal_snapshot / delta_from_original / merged_directive_for_next / drift_signal) を append
6. SKILL.md 「ゴールシーク検証」の python ブロックを実行して exit 0 を確認

fixture は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r6-status` を使う。

## シナリオ本体

1. fixture に dev-graph の canonical graph/config を C02 契約に従って準備する (graph.json への書込みは upsert-node.py 経由のみ。直接編集禁止)
2. `Skill({skill:"dev-graph:run-dev-graph-status", args:"--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/live-trial-fixtures/r6-status"})` を実行する

## 検証項目

- V1: canonical graph/config の bytes を実行前後で snapshot し、**hash が完全一致** (read-only 証明)
- V2: 空でない実データの status summary が出力される
- V3: C11 (validate-graph-schema.py) が exit 0
- V4: **上記「実行契約」1-6 の成果物が $DEV_GRAPH_ROOT/eval-log/ 配下に実在する**

## 注記

`status-graph.py --no-eval-log` の使用自体は手順省略にあたらない (script header の write-scope が optional receipt only であり、authority digest の対象外)。ただし **skill のゴールシーク配線を飛ばすことは手順省略にあたる**。

## 出力

1. 実際に V1-V4 を全て充足した場合のみ `{"status":"PASS","scenario":"status-read-only-with-goalseek"}`、それ以外は `{"status":"FAIL",...}` を `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203343-wt-3/eval-log/dev-graph/run-dev-graph-status/live-trial/20260721T181000-r6/out/status.json` に Write する
2. `DONE: <status>` と1行だけ報告する

途中で人間に質問せず最後まで自走し、skill の手順を省略しないこと。out/ に中間成果物を書かないこと。
