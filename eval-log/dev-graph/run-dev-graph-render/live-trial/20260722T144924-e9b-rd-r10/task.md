# R9: render OUT1 適合（子 task 総数 Y == receipt applied_count）の実走

## fixture は用意済み。**一切作らず、一切変更しないこと**

fixture: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T144924-e9b-rd-r10-fixture`

この fixture は既に正規化済みで、次が実測確認されている。**再作成・修復・初期化は不要であり、行ってはならない。**

- `validate-graph-schema.py` が `valid: true` / violations 0 を返す
- registration receipt (`<fixture>/system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json`) の `graph_digest_after` が現 graph の canonical sha256 と一致している

**`graph.json` を書き換えると receipt が stale 化して render が落ちる。** 読むだけにすること。

## 前提: skill の実行契約を必ず通すこと

**下位 script (`render-graph-html.py`) を直接叩いて成果だけ出すのは不可。** SKILL.md の「ゴールシーク配線」を実行契約として全て履行すること。

1. 開始時に C24 `resolve-repo-context.py --mode read` の JSON receipt を取得し、`DEV_GRAPH_ROOT` を receipt の repo_root に固定する（cwd から再解決しない）
2. `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-render-goal-spec.json` に元のゴールを記録
3. `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-render-progress.json` に checklist の status/evidence を記録
4. **未達 responsibility の `prompts/<R-id>.md` を読み、`Agent` ツールで分離 context に fork する。** R1-elicit / R2-plan / R3-render の 3 本すべてについて fork すること。**prompts を Read しただけで同一 context で処理するのは契約違反**であり、それ自体で FAIL になる
5. 各周回末に `$DEV_GRAPH_ROOT/eval-log/run-dev-graph-render-intermediate.jsonl` へ 6 キー（original_goal / original_goal_hash / current_goal_snapshot / delta_from_original / merged_directive_for_next / drift_signal）を append
6. SKILL.md「ゴールシーク検証」の python ブロックを実行して exit 0 を確認

## evidence の記録規則（厳守）

`progress.json` の各 checklist の `evidence` には、**実際に実行したコマンドと、その exit code と、出力の該当部分**を書くこと。

- **別の検査の結果で代用してはならない。** 例: `validate-graph-schema.py` の結果を求められている箇所に `render-graph-html.py` の内部検証結果を書くのは evidence のすり替えであり FAIL 事由になる
- **実行していない検証を「実行した」と書いてはならない。** 実行できない場合は `status: blocked` とし、理由を evidence に正直に書くこと。正直な blocked は減点しないが、水増しは FAIL になる

## シナリオ本体

OUT1 は「feature ごとの子 task 進捗 X/Y のうち **総数 Y** が registration receipt の applied_count/expected_count と一致する（**done 数 X の一致は求めない**）」を要求する。

skill を実行する:

Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T144924-e9b-rd-r10-fixture"})

render 時に **`--registration-receipt` へ上記 receipt のパスを渡す**こと（無いと `render-metadata.registration` が null になり OUT1 の digest 対応を検証できない）。

## 検証項目

- V1: 生成 HTML に外部 `script`/`link` 参照が 0 件（IN1）。**検証方法**: 生成された `index.html` に対し `grep -c 'src="http\|href="http\|<script src\|<link '` 等で実測し、コマンドと出力を evidence に貼る
- V2: inline SVG に feature / task / edge が表示される。**検証方法**: `index.html` 内の `<svg` の存在と、feature/task node の id 文字列が含まれることを grep で実測する
- V3: feature の子 task の **総数が 13** であり、receipt の `applied_count`/`expected_count`（13/13）と一致する（OUT1）。**done 数は 0 で構わない**。**検証方法**: render の出力 JSON の `feature_progress.by_feature` と receipt の JSON を両方 evidence に貼って突き合わせる
- V4: `render-metadata` の `registration` が receipt の `source_digest` に対応する（null でない）
- V5: 追加 runtime 依存が無い（`self_contained: true`）
- V6: **ブラウザ表示の代替検証**。この環境に headless ブラウザは無いため、実ブラウザでの目視は行わない。`index.html` が単一ファイルで完結し外部依存 0 であることを V1/V5 で示したうえで、**「実ブラウザでの目視は未実施」と evidence に正直に記載する**こと。実施していない検証を実施したと書くと FAIL になる

## ゴールシーク配線の自己検査

skill 実行後、次を実行して exit 0 を確認し、出力を evidence に貼ること。

```bash
python3 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/plugins/harness-creator/skills/run-skill-live-trial/scripts/validate-goal-seek-evidence.py \
  --skill-dir /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/plugins/dev-graph/skills/run-dev-graph-render \
  --eval-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/live-trial-fixtures/20260722T144924-e9b-rd-r10-fixture/eval-log
```

## 厳守制約

- **fixture を変更しない**: `graph.json`・task md・receipt のいずれも書き換えない。render の出力 (`.dev-graph/render/index.html`) の生成のみ許容
- **C02 単一 writer**: `graph.json` への書込みは `upsert-node.py` / `register-package.py` 経由のみ。今回は書込み自体が不要
- **receipt 偽造の禁止**: receipt を手書きしない。digest を後から一致させない

## 出力

処理が終了（成功 / 失敗 / 中断いずれでも）したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260721-224927-wt-8/eval-log/dev-graph/run-dev-graph-render/live-trial/20260722T144924-e9b-rd-r10/out/status.json` **だけ**に完了マーカーを 1 ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR のいずれか", "scenario": "render-out1-total-matches-expected"}`
   **これを書かないと harness が完了を検知できず BLOCKED になる**
2. 「DONE: <status>」と 1 行だけ報告する。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと（中間生成物は skill 側の出力先 (WORK_DIR 外) へ — out/ に中間 Write させると poll が DONE 偽陽性を起こす）。
