# タスク: dev-graph:run-dev-graph-init の実走 (scenario C01-OUT1-positive-idempotence-r17)

この run は scenario C01-OUT1-positive-idempotence-r17 の充足を確認するものです。

必ず満たすべき観測項目 (scenario の required_observations の逐語転記):

1. the first pass creates the six content roots, the routing policy and the graph store
2. the second pass re-invokes the skill and reports zero planned changes
3. the template edited between the passes still holds its edited bytes after the second pass, proving non-overwrite by running init rather than by inspecting the file alone
4. the plugin hook source is resolved and its receipt or rejection diagnosis is recorded
5. config stores no absolute path and no token or node id
6. C11 passes against a graph that contains at least one node

手順契約 (この順序どおりに実施すること。結果だけを合わせる別 operation への読み替えは禁止):

- 対象 fixture repository は `/Users/dm/orca/workspaces/HarnessHub/wt-27-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260808T113753-yq4k1/fixture-repo` (dev-graph 未初期化の git repository)。
- 第 1 パス: 下記の Skill リテラル呼び出しを実行する。
- パス間: scaffold された canonical template を 1 つだけ Edit し、そのバイト列 (編集後の全文と sha256) を記録する。続けて C02 (`dev-graph:run-dev-graph-node`) を Skill として呼び出し、同じ fixture repository へノードを最低 1 件登録する。
- 第 2 パス: **同じ Skill をもう一度呼び出す** (手書きの存在チェックや script 直叩きで代替しない)。zero planned changes になること、および編集済み template のバイト列が第 2 パス後も一致することを確認する。
- 検証: C11 (`plugins/dev-graph/scripts/validate-graph-schema.py`) を fixture repository の graph store に対して実行し、ノードが 1 件以上ある状態で PASS することを確認する。`.dev-graph/config.json` に絶対パス・token・node id が保存されていないことも確認する。
- plugin hook source の解決結果 (受理または拒否の診断) をそのまま記録する。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/wt-27-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260808T113753-yq4k1/fixture-repo --hook-source plugin"})

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/orca/workspaces/HarnessHub/wt-27-2/eval-log/dev-graph/run-dev-graph-init/live-trial/20260808T113753-yq4k1/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR のいずれか", "observations": {"1": "...", "2": "...", "3": "...", "4": "...", "5": "...", "6": "..."}}
   observations の各値には、その観測項目を満たしたことを示す実測の証跡 (作成されたパス一覧、第 2 パスの planned changes 件数、編集済み template の sha256 の前後一致、hook 解決の診断文、config の検査結果、C11 の終了ステータスとノード件数) を簡潔に書く。
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ — out/ に中間 Write させると poll が DONE 偽陽性を起こす)。
