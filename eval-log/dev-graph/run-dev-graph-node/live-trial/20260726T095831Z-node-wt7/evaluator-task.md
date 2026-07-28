# タスク: live-trial の独立 goal 判定 (fresh evaluator)

あなたは live-trial の **fresh evaluator** です。実走を指揮した orchestrator とは別個体として、独立に goal 適合を判定してください。

## 絶対制約

- **fixture repo は read-only**。fixture 配下のファイルを作成・編集・削除しない。汚すと証拠が壊れます。書き込んでよいのは最後の完了マーカー 1 ファイルだけです。
- **点数を出さない**。判定は `PASS` または `FAIL` と blocker の列挙のみ。スコア・%・10段階評価は禁止。
- 「起動したか」「完走したか」ではなく、**被験 skill が約束した成果が実際に出ているか**を問う。
- 被験セッションの自己申告 (`out/status.json`) を根拠にしない。
- 途中で人間に質問せず最後まで自走すること。
- 手順に忠実に従い、人手の追加判断・省略をしないこと。

## 効率上の必須指示

- `transcript.jsonl` は **769KB あります。Read ツールで開かないでください**。Bash から `python3` / `grep` で必要な要素だけ抽出してください。
- 各検査は 1 回の Bash 呼び出しにまとめ、出力を数十行以内に絞ってください。

## パス

- fixture repo (被験対象・独立 Git repo):
  `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-005248-wt-7/eval-log/dev-graph/live-trial-fixtures/node-wt7-r1`
- trial workdir:
  `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-005248-wt-7/eval-log/dev-graph/run-dev-graph-node/live-trial/20260726T095831Z-node-wt7`
- 被験 skill:
  `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260726-005248-wt-7/plugins/dev-graph/skills/run-dev-graph-node/SKILL.md`

最初に trial workdir の `task.md` (約 5KB) を読み、被験セッションへ与えた成功条件と禁止事項を把握してください。

## 判定条件 (すべて実ファイルを読んで実測)

1. **canonical kind path への routing**: fixture の `.dev-graph/state/graph.json` にある 5 node の `file_path` が `issues/` `tasks/` `specs/` `architecture/` `docs/` 直下に 1 件ずつで、実ファイルが存在するか。
2. **本文の byte-for-byte 保全**: fixture の `mixed-artifacts.json` の各 artifact の `body` 原文が、対応する保存 Markdown に**完全な連続文字列として 1 回以上**含まれるか。python で `stored.count(original)` を実測する。目視で「だいたい同じ」は不可。
3. **既知 blocker の非再発**: 過去の試行で、原文をシェル文字列に載せたためバッククォート内が command substitution として実行され API 識別子が消えた。次の 7 リテラルが保存後の Markdown に全件残るか実測する: `GET /api/v1/users` / `POST /api/v2/orders` / `items` / `line_items` / `X-API-Key` / `Authorization: Bearer` / `DELETE /api/v2/sessions/bulk`。
4. **連続 update の健全性**: transcript から `"operation": "updated"` を含む tool_result を抽出し、内容差分ありの更新が実走したか確認する。更新後の graph.json で `graph_node_id` / `artifact_kind` / `file_path` が条件 1 と整合し、保存 Markdown の frontmatter `kind` と格納ディレクトリが一致するか。
5. **C14 macro-feature 契約外の feature 非作成**: fixture の `features/` に feature ファイルが 0 件 (`.gitkeep` のみ) で、graph.json に `artifact_kind == "feature"` の node が 0 件か。
6. **goal-seek 3 点セット**: fixture の `eval-log/` に `run-dev-graph-node-goal-spec.json` / `run-dev-graph-node-progress.json` / `run-dev-graph-node-intermediate.jsonl` が実在するか。`intermediate.jsonl` の各行が必須 6 キーを持つか。SKILL.md の `original_goal` 文字列から UTF-8 SHA-256 を**あなた自身で再計算**し、intermediate 各行の `original_goal_hash` と一致するか確認する (transcript の記載を信用せず自分で計算する)。
7. **Skill ツール経由の起動**: transcript に `dev-graph:run-dev-graph-node` の Skill tool_use があるか。`plugins/dev-graph/scripts/` 配下の script を Bash から直接叩いて skill 本体を代替していないか (goal-seek 配線の書き出しに Bash/Write を使うのは task.md が許可している。skill 本体の処理を script 直叩きで置き換えていたら blocker)。
8. **fixture の汚染**: `git -C <fixture> rev-list --count HEAD` が 1 のままか (trial 由来の commit が無いか)。

## 完了時にすること

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. trial workdir 直下の `independent-verification.json` に完了マーカーを **1 ファイルだけ** Write する。形式:

```json
{
  "evaluator": "fresh-session-independent",
  "verdict": "PASS",
  "blockers": [],
  "checks": {
    "1_canonical_paths": {"result": "PASS", "observed": "..."},
    "2_body_preservation": {"result": "PASS", "observed": "..."},
    "3_api_literals": {"result": "PASS", "observed": "..."},
    "4_consecutive_update": {"result": "PASS", "observed": "..."},
    "5_no_feature_created": {"result": "PASS", "observed": "..."},
    "6_goal_seek_triplet": {"result": "PASS", "observed": "..."},
    "7_skill_tool_invocation": {"result": "PASS", "observed": "..."},
    "8_fixture_not_polluted": {"result": "PASS", "observed": "..."}
  },
  "notes": []
}
```

- `verdict` は `PASS` または `FAIL` のみ。
- 各 `result` は `PASS` / `FAIL` / `NOT_MEASURED` のいずれか。**実測できなかった条件を PASS と書かないこと**。
- `observed` には根拠となる実測値・パス・件数を簡潔に書く。
- `blockers` には受け入れ条件の不成立だけを入れる。改善提案や好みの指摘は入れない。
- `notes` は blocker ではないが記録すべき事項。

2. 「DONE: <PASS|FAIL>」と 1 行だけ報告する。

trial workdir には `independent-verification.json` 以外を書かないこと。
