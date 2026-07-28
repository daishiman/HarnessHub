# タスク: dev-graph:run-dev-graph-system-spec の実走

## この scenario の入力前提 (必ず読むこと)

- `--repo-root` が指す repo はこの trial 専用の隔離 fixture であり、system-spec-harness の状態は一切存在しない (`system-spec/spec-state.json` も章 Markdown も `fetched-references.json` も `index.md` も無い)。
- 唯一の入力は `system-spec/requirements-brief.md` であり、対象システム (ローカル専用 TODO REST API) の上位概念 (U1-U9)・プラットフォーム方針・8カテゴリの確定回答・技術選定候補と公式出典・利用者の一括承認を、すべて固定文言で既に記述している。
- brief の §6 に明記されている通り、brief に答えがある問いは AskUserQuestion で人へ聞き返さないこと。brief に答えがない問いが生じた場合だけ、brief の U1-U9 と §5 (非対象) から導ける最小構成を採り、判断根拠を残すこと。
- 技術選定 (D1 `sqlite` / D2 `fastapi` / D3 `local-bearer-token`) は brief §4/§7 で利用者が事前承認済みなので再確認は不要。ただし公式出典の実 fetch (doc-fetch) は skill の正規フロー内で実施すること (これはこの scenario が観測したい対象そのものなので省略しないこと)。
- **spec-state.json や章を作文・捏造してはならない**。system-spec-harness の正規4エントリポイント (run-system-spec-elicit → 必要時 run-system-spec-doc-fetch → run-system-spec-compile → assign-system-spec-completeness-evaluator) を、対象 skill 自身の delegate 手順で実際に完走させ、その成果物を dev-graph へ C02 (upsert-node.py) 経由で登録すること。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-095531-wt-8/eval-log/dev-graph/live-trial-fixtures/system-spec-wt8-20260728T112037"})

Skill ツールでの起動をこの task の最初の実行アクションにすること (関連 script を直接叩いて代替しないこと。代替すると起動測定が FAIL 扱いになる)。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-095531-wt-8/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260728T112105-sysspec-wt8/out/status.json` に完了マーカーを1ファイルだけ Write する。内容:
   `{"status": "PASS|FAIL|ERROR", "specification_registered": <true|false>, "architecture_registered": <true|false>}`
2. 「DONE: <status>」と1行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には `status.json` 以外を書かないこと (中間生成物は WORK_DIR 外へ)。
