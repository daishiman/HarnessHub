# タスク: dev-graph:run-dev-graph-render の共有 hook 更新後実走

scenario は `C05-OUT1-positive-feature-progress` です。被験 fixture は次の独立 Git
repository です。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/render-lp36-hook-final`

次を必ず Skill ツールから起動し、内部 script の直実行で代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-render", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/render-lp36-hook-final --feature-id LT-FEATURE-001 --registration-receipt /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/render-lp36-hook-final/system-plan/LT-FEATURE-001/dev-graph-registration-receipt.json"})

必須観測:

- 生成 HTML/CSS は追加 runtime dependency なしで開き、SVG graph を表示する。
- denominator が registration receipt の applied_count / expected_count と一致する。
- numerator が graph store の done / closed child task 数の独立再計算値と一致する。
- render-metadata.registration は非 null で、render 対象が receipt の source_digest に
  対応する。

SKILL.md の original_goal を使い、fixture の `eval-log/` に goal-spec、progress、
intermediate.jsonl の 3 点を作ってください。intermediate の 1 行目は Skill 実行前、
2 行目は検証後に Python `json.dumps` と file mode `a` で追記し、既存行を置換しないで
ください。各行は必須 6 キーと正しい original_goal_hash を持ち、progress に
pending / evidence null を残さないでください。

成功・失敗・中断のいずれでも最後に次の 1 ファイルだけを書きます。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-render/live-trial/20260729T024000Z-lp36-render-hook-final/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C05-OUT1-positive-feature-progress"}`。
最後は `DONE: <status>` の 1 行だけを報告し、fixture 以外を変更しないでください。
