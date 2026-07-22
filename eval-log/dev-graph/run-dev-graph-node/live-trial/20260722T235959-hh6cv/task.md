# タスク: dev-graph:run-dev-graph-node の通常5 artifact正経路実走

fixture repo内 `mixed-artifacts.json` に、内容から一意に分類できる issue、task、specification(API変更を含む)、architecture(backend+security)、document の5入力を1バッチで作成してください。次にdry-runではなくC02の正規経路で登録してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-041945-wt-4/de1ca9e4-7ac6-43b6-ae03-3033bff4f758/scratchpad/ltfix/node --input /private/tmp/claude-501/-Users-dm-dev-dev------HarnessHub--worktrees-task-20260722-041945-wt-4/de1ca9e4-7ac6-43b6-ae03-3033bff4f758/scratchpad/ltfix/node/mixed-artifacts.json"})

その後batch内issueだけ本文を追記して同じ呼出しで連続更新し、graph_node_idと正規pathが不変であることを確認してください。さらにfeatureらしい通常入力の直接addはC14 package契約なしとしてfail-closedになり、features/へ直登録されないことを確認してください。最終graphをC11で検証し、5 kindのfrontmatter/path、architecture subtype、API specificationの必須section、直接feature登録0件を機械確認してください。scenario IDは `C02-OUT1-positive-mixed-artifacts` です。

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260722-041945-wt-4/eval-log/dev-graph/run-dev-graph-node/live-trial/20260722T235959-hh6cv/out/status.json` だけに `{"status":"PASS|FAIL|ERROR","scenario":"node-five-artifact-positive"}` をWriteする。
2. `DONE: <status>` と1行だけ報告する。

途中で人間に質問せず最後まで自走し、skillの手順に忠実に従い人手の追加判断・省略をしないこと。out/に中間成果物を書かないこと。
