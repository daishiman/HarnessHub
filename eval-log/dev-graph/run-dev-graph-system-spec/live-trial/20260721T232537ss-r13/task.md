# タスク: dev-graph:run-dev-graph-system-spec の実走 (C19-OUT1 positive system-spec lineage)

> **【最初に読むこと・完了条件】このタスクは、最後に `/Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260721T232537ss-r13/out/status.json` を Write し、`DONE: <status>` と 1 行報告するまで完了ではありません。検証結果を散文で報告して終わってはいけません。作業内容にかかわらず、必ず最後にこの 2 つを実行してください。詳細は末尾の「処理が終了したら」節にあります。**


対象 repository は dev-graph 初期化済みの隔離 fixture で、system-spec workspace が用意してあります。

**最重要の制約: 実行は必ず `Skill(...)` リテラル呼び出しで行うこと。個別 script を Bash で直接叩いて代替してはならない (検証のための読み取り実行は可)。宣言済み依存 plugin (system-spec-harness) の entry point も、skill が呼ぶ正規経路を迂回しないこと。**

Skill({skill: "dev-graph:run-dev-graph-system-spec", args: "--repo-root /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/live-trial-fixtures/20260721T232537ss-system-spec"})

skill が返した結果について、次の 5 点を確認してください。**skill の出力を鵜呑みにせず、transcript の実際の tool 呼び出しと fixture の実ファイルで裏を取ること。**

1. 宣言済み plugin `system-spec-harness` が実際に load され、その 4 つの entry point が qualified Skill 呼び出しで駆動されて正規フローが完走したこと。どの entry point がどの順で呼ばれたかを記録すること。
2. import された specification と architecture が `source_lineage` (origin_kind / source_plugin / source_path / source_version / source_digest / imported_at) を保持していること。
3. evaluator evidence (confirmation_evidence) が実体として記録されていること。
4. graph への登録が **C02 経由のみ** で行われ、dev-graph 側に elicit / compile ロジックの重複実装が現れていないこと。
5. C11 (validate-graph-schema.py) が exit 0 であること。

ゲートや手順が失敗したら、回避せずその事実をそのまま結果に記録すること。

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/dev/dev/個人開発/HarnessHub/.worktrees/task-20260720-203452-wt-5/eval-log/dev-graph/run-dev-graph-system-spec/live-trial/20260721T232537ss-r13/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR", "scenario": "system-spec-lineage-positive", "checks": {"four_entry_points_driven": true|false, "source_lineage_preserved": true|false, "evaluator_evidence_present": true|false, "registration_via_c02_only": true|false, "no_duplicated_elicit_compile": true|false, "c11_exit0": true|false}}
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略・代替実行をしないこと。
- out/ には status.json 以外を書かないこと。
- 対象 fixture repository 以外のファイルを変更しないこと。
