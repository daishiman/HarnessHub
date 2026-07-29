# タスク: dev-graph:run-dev-graph-decompose の最終実走

scenario は `C14-OUT1-positive-macro-decomposition-r2` です。次の初期化済み独立 Git
repository だけを被験 fixture にしてください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-final`

入力 want は「ユーザー登録・ログインと、ログイン後のダッシュボードを持つ小規模 Web
アプリを作りたい」です。fixture に期待 node は存在しません。管理対象
graph/config/content root を手で直接編集してはいけません。

## goal-seek の開始

SKILL.md の original_goal を使い、fixture の `eval-log/` に次の 3 点を作成してください。

- `run-dev-graph-decompose-goal-spec.json`
- `run-dev-graph-decompose-progress.json`
- `run-dev-graph-decompose-intermediate.jsonl`

intermediate の 1 行目は Skill 実行前に作成し、実行後は 2 行目だけを append します。
各行には `original_goal`、`original_goal_hash`、`current_goal_snapshot`、
`delta_from_original`、`merged_directive_for_next`、`drift_signal` が必要です。
original_goal_hash は正本文の UTF-8 SHA-256 実値にしてください。

Skill 実行前に、次の登録済み共通監査ヘルパーで pre-state を取得してください。

```bash
python3 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py snapshot \
  --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-final \
  --output /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-final/eval-log/pre-state.json
```

## 被験 Skill

次を必ず Skill ツール呼出しで実行し、内部 script の直実行で代替しないでください。

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-final --binding none --dry-run"})

Skill が生成した feature / architecture / depends_on の preview を一度だけ次へ保存します。
別の graph や期待 node は手書きせず、`preview["nodes"]` を唯一の正本配列にしてください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-final/eval-log/macro-preview.json`

## publication gate の正負両経路

生成された feature の 1 件目だけを preview 内で次の完全昇格状態にし、他の少なくとも
1 件を draft / pending / incomplete のまま残してください。node の同一性や本文、
`updated_at` は変更せず、次の lifecycle 項目だけを変えます。

- `confirmation_status`: `confirmed`
- `evaluation_status`: `pass`
- `implementation_readiness`: `{"status":"complete","missing_sections":[],"checked_at":"<RFC3339 UTC>"}`
- `confirmation_evidence.evaluator`: 非空
- `confirmation_evidence.evidence_ref`: 非空
- `confirmation_evidence.evaluated_digest`: 下記の正準 SHA-256

digest は昇格後の node から `confirmation_evidence` だけを除外し、
`json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))` の UTF-8
bytes を SHA-256 化した実値です。すべての lifecycle 値を確定してから最後に計算し、
その後 node の他の field を変更しないでください。単なる 64 桁 placeholder は FAIL です。
便宜配列を併記する場合は `nodes[]` と lifecycle 値を完全一致させてください。

## 正準監査

preview 保存後、監査コードを作成・編集せず次を一度実行してください。

```bash
python3 /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py audit \
  --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-final \
  --preview /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-final/eval-log/macro-preview.json \
  --scenario /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json \
  --pre-state /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-final/eval-log/pre-state.json \
  --plugin-dir /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/plugins/dev-graph \
  --output /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/live-trial-fixtures/decompose-lp36-final/eval-log/decompose-audit.json
```

次の全条件を具体的な監査 field で確認してください。

- feature / architecture DAG が循環せず、feature 間依存 fan-out 最大値が 3 以下。
- `publication.discriminating=true` で promoted と blocked の両クラスが存在する。
- `eligible_by_binding.none` だけが昇格 node を含み、beads / github は 0 件。
- local / Beads / GitHub / Projects の write count がすべて 0。
- `evidence_binding.all_bound=true`。
- `gate_negative_controls.all_rejected=true`。
- `audit_implementation.provenance_valid=true` かつ全体 `pass=true`。

監査が false の場合は preview を都合よく書き換えて再実行せず FAIL にしてください。
ただし node 内容を変えず、計算順序ミスの digest だけを正準値へ直す場合は例外です。

監査後に intermediate の 2 行目だけを append し、progress の全 checklist を
completed / pass または根拠付き not_applicable に更新します。pending と evidence null
を残さず、goal-seek 3 点を読み戻して検証してください。

## 完了契約

成功・失敗・中断のいずれでも、最後に次の 1 ファイルだけを書いてください。

`/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260728-082322-wt-11/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260729T013604Z-lp36-decompose-final/out/status.json`

内容は `{"status":"PASS|FAIL|ERROR","scenario":"C14-OUT1-positive-macro-decomposition-r2"}`。
`out/` には status.json 以外を書かず、最後は `DONE: <status>` の 1 行だけを報告して
ください。途中で人間へ質問せず、fixture 以外の repository を変更しないでください。
