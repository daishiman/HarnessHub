# タスク: dev-graph:run-dev-graph-sync の実走 (scenario C03-OUT1-positive-second-sync-zero)

この run は scenario `C03-OUT1-positive-second-sync-zero` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260806T010000Z-f84o-postmain-c03/fixture-repo`

FIXTURE は**すでに用意済み**です (`plugins/dev-graph/tests/fixtures/build_live_trial_fixture.py --kind sync`
が生成した正本形状)。作り直さないでください。

**決定論 remote は fixture 内 `<FIXTURE>/.dev-graph/remote.json` です。**
実 GitHub API / `gh` / 実 Beads へは一切アクセスしないこと。skill の手順にある決定論試験用の
remote-state fixture adapter としてこのファイルを使い、外部依存ゼロで収束させてください。
last-synced snapshot は `<FIXTURE>/.dev-graph/state/sync-snapshot.json` です。

**この task.md を受け取った outer session 自身が、以下の全工程を連続して最後まで実行してください。
Skill 呼び出しが戻っても、親や利用者へ制御を返したり、途中報告で停止したりしてはいけません。
最後の完了マーカーを Write するまで、1 つのターンの中で走り切ってください。**

## required_observations (scenario 正本の逐語転記)

1. the first sync applies the expected import and export
2. the second sync reports imports changes=0 and exports changes=0
3. stable IDs and snapshots are unchanged on the second run

## 工程 1: 3 パスの実走 (同じ入力で dry-run → apply → 確認 dry-run)

次の Skill 呼び出しを最初の実行アクションにし、内部 script の直実行や Task / Agent への委譲で
skill 本体を代替しないでください。**3 パスとも同じ skill を呼ぶこと。**

パス 1 (プレビュー):

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260806T010000Z-f84o-postmain-c03/fixture-repo --dry-run"})

パス 2 (適用):

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260806T010000Z-f84o-postmain-c03/fixture-repo --apply"})

パス 3 (収束確認):

Skill({skill: "dev-graph:run-dev-graph-sync", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260806T010000Z-f84o-postmain-c03/fixture-repo --dry-run"})

3 パスとも同じ graph・snapshot・remote 入力で回すこと。

## 工程 2: 検証

1. パス 2 (apply) で **期待された import 1 件と export 1 件が実際に適用された**ことを、
   report の imports / exports と graph store・snapshot の実値の変化で確認する。
   何がどこから来て何がどこへ出たのかを具体的に示すこと。
2. パス 3 (2 回目の sync) で `imports changes=0` かつ `exports changes=0` になったことを確認する。
   report の該当フィールドの実値を示すこと。
3. stable ID (issue id / number / project item_id / field option_id など) と snapshot が
   2 回目の実行で変化していないことを、パス 2 直後とパス 3 直後の実値を突き合わせて確認する。
   「変わっていないはず」ではなく、前後の実値または SHA-256 の一致で示すこと。
4. パス 1 と パス 3 の `--dry-run` で local / Beads / GitHub / Projects への write が
   0 件だったことを確認する。

## 工程 3: goal_seek 配線 (必須)

`run-dev-graph-sync` は `goal_seek` を宣言します。SKILL.md の該当節に従い、
FIXTURE の `eval-log/` に次の 3 点を出力してください。

- `<FIXTURE>/eval-log/run-dev-graph-sync-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-sync-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-sync-intermediate.jsonl`

`intermediate.jsonl` は必須 6 キー (`original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal`) を持ち、
1 行目を Skill 実行前に作成し、検証後の 2 行目だけを append してください。
2 行を後からまとめて書くこと、既存行の上書き、hash 不一致の書換えは禁止です。
`original_goal_hash` は正本文の UTF-8 SHA-256 実値にしてください。

## 完了報告

全検証後、
`/Users/dm/orca/workspaces/HarnessHub/wt-29-2/eval-log/dev-graph/run-dev-graph-sync/live-trial/20260806T010000Z-f84o-postmain-c03/out/status.json`
に完了マーカーを 1 ファイルだけ Write してください。

```json
{"status": "PASS|FAIL|ERROR", "scenario": "C03-OUT1-positive-second-sync-zero"}
```

その後、「DONE: <status>」と 1 行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- 実 GitHub API / `gh` / 実 Beads へアクセスしないこと。remote は fixture の決定論 adapter のみ。
- graph store・snapshot を手作業で書き換えないこと (skill の apply が行う更新のみ許容)。
