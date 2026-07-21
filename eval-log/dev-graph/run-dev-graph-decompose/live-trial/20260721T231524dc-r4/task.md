# タスク: dev-graph:run-dev-graph-decompose の実走 (decompose-macro-positive-r3)

> **【最初に読むこと・完了条件】このタスクは、最後に `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260721T231524dc-r4/out/status.json` を Write し、`DONE: <status>` と 1 行報告するまで完了ではありません。検証結果を散文で報告して終わってはいけません。作業内容にかかわらず、必ず最後にこの 2 つを実行してください。詳細は末尾の「処理が終了したら」節にあります。**


対象 repository は dev-graph 初期化済みで、まだ分解対象が何も無い隔離 fixture です。分解する要望 (want) の正本は `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T231524dc-decompose/decompose-macro-want.md` の「want」節です。**まずこのファイルを読み、want 本文をそのまま skill の args へ渡してください。**

**最重要の制約: 分解は必ず `Skill(...)` リテラル呼び出しで行うこと。`upsert-node.py` などの個別 script を Bash で直接叩いて node を作ってはならない (検証のための読み取り実行は可)。**

Skill({skill: "dev-graph:run-dev-graph-decompose", args: "<want 本文> --repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T231524dc-decompose --dry-run"})

skill が返した分解結果について、次の 5 点を確認してください。**skill の出力を鵜呑みにせず、あなた自身が生成された node を読んで突き合わせること。**

1. architecture が 1 件と feature が複数件、マクロ粒度で生成されていること (実装粒度の task へ落ちていないこと)。
2. feature 間の depends_on が want の依存関係どおりの向きで張られており、循環が無いこと (has_cycle=False)。
3. `--dry-run` のため task が 1 件も作られておらず (task_count=0)、生成 node がすべて draft であること (all_draft=True)。
4. exact-13 package の登録 (register-package) が呼ばれていないこと。
5. C11 (validate-graph-schema.py) が生成 node 集合に対して exit 0 であること。

**さらに、C11 が空振りしていないことを負の対照で示してください**: 生成 node のコピーに対して (a) `purpose` を落とす (b) 逆向きの依存辺を足す の 2 つを別々に施し、それぞれ schema violation と dependency cycle が実際に検出されることを確認すること。fixture 本体の graph は書き換えないこと (コピーに対して行う)。

ゲートや手順が失敗したら、回避せずその事実をそのまま結果に記録すること。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260721T231524dc-r4/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "decompose-macro-positive", "checks": {"macro_granularity": true|false, "dependency_direction_correct": true|false, "has_cycle": false, "task_count_zero": true|false, "all_draft": true|false, "no_register_package": true|false, "c11_exit0": true|false, "negative_controls_detected": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略・代替実行をしないこと。
- out/ には status.json 以外を書かないこと。
- 対象 fixture repository 以外のファイルを変更しないこと。
