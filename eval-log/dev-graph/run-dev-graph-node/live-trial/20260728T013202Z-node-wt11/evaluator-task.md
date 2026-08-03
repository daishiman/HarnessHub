# goal verification: dev-graph:run-dev-graph-node の live-trial 実走

あなたは独立した評価者です。実走を行った orchestrator とは別個体で、実行過程を一切知りません。
成果物と transcript だけを一次情報として、**被験 skill の goal が達成されたか**を判定してください。

## 判定対象の goal (被験 skill の description が約束する成果)

> dev-graph artifact を種類別 content root と graph.json へ atomic 追加・差分更新する。
> 通常 5 artifact (issue / task / specification / architecture / document) を自動分類し、
> 正規 path へ保存し、graph / frontmatter / body / path の整合を保つ。

「起動したか」「完走したか」ではなく、**約束された成果が実際に出ているか**を問うこと。

## 読むべき一次情報

- 被験 skill 定義: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/dev-graph/skills/run-dev-graph-node/SKILL.md`
- 実走 transcript (ツール呼び・入れ子 Skill・エラーが残る): `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-node/live-trial/20260728T013202Z-node-wt11/transcript.jsonl`
- 与えたタスク定義: 同ディレクトリの `task.md`
- 完了マーカー: 同ディレクトリの `out/status.json`
- 実走先 fixture repository: `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/node-wt11`
  - 入力原文: `mixed-artifacts.json`
  - graph: `.dev-graph/state/graph.json`
  - goal-seek 配線: `eval-log/run-dev-graph-node-{goal-spec.json,progress.json,intermediate.jsonl}`

transcript は大きいので、`python3` で JSON 行を読み `tool_use` / `tool_result` を抽出して調べること。

## 検証すべき点 (自分で実測すること。transcript の自己申告を鵜呑みにしない)

1. 5 artifact が issue / task / specification / architecture / document の正規 content root へ保存されたか。
2. 保存された Markdown の本文に、`mixed-artifacts.json` の対応する `body` が**完全な連続文字列として**含まれているか (欠落・要約・改変がないか)。
3. graph.json の各ノードの kind / path が、実在する保存ファイルおよびその frontmatter と一致するか。
4. 初回 apply 後の同一 issue 再適用が真の no-op (`operation=noop`, `write_count=0`, ファイル SHA-256 と graph が前後同一) であったことが**実測されているか**。
5. C14 契約外の feature ノード / `features/` 配下 artifact が作られていないか。
6. goal-seek 配線 3 点が実在し、`intermediate.jsonl` の各行が 6 キー (`original_goal`, `original_goal_hash`, `current_goal_snapshot`, `delta_from_original`, `merged_directive_for_next`, `drift_signal`) を持ち、`original_goal_hash` が `sha256(original_goal)` と一致するか。1 行目作成後に 2 行目を append した履歴になっているか。
7. graph / artifact への書込みが C02 単一 writer (`upsert-node.py`) 経由か。graph.json を直接編集した迂回がないか。
8. 途中で人間へ質問して停止していないか (自走したか)。

## 出力形式 (厳守)

**PASS または FAIL のいずれか 1 語**と、**blocker の列挙のみ**を返すこと。

- 点数・スコア・パーセンテージ・評点は一切出力しない。
- blocker は「goal 未達を構成する具体的事実」だけを書く。改善提案・感想・褒め言葉は書かない。
- PASS の場合は blocker を空にする。goal 達成を妨げない軽微な観察は blocker に混ぜない。

出力例:
```
VERDICT: FAIL
BLOCKERS:
- specs/rest-api-v2-migration.md の body が入力原文と一致せず、末尾 3 行が欠落している
- 再適用が write_count=1 で no-op になっていない
```
