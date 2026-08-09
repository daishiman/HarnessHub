# タスク: dev-graph:run-dev-graph-node の実走 (scenario C02-OUT1-positive-mixed-artifacts)

この run は scenario C02-OUT1-positive-mixed-artifacts の充足を確認するものです。

必ず満たすべき観測項目 (scenario の required_observations の逐語転記):

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract

手順契約 (この順序どおりに実施すること。結果だけを合わせる別 operation への読み替えは禁止):

- 対象 fixture repository は `/Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T183301-wt27-c02-final/fixture-repo` (dev-graph 初期化済み。`.dev-graph/config.json`、空の `.dev-graph/state/graph.json` (graph_revision=0, nodes=[])、6 つの content root を持つ)。
- 入力バッチ `mixed-artifacts.json` は issue / task / specification / architecture / document を 1 件ずつ、計 5 件含む。
- 第 1 パス: 下記の Skill リテラル呼び出しを実行し、5 件すべてを登録する。5 件の保存先 path と graph.json 上の file_path を実測で記録する。
- 連続更新パス: 登録済みノードのうち最低 1 件を、**同じ skill をもう一度 Skill として呼び出して** 更新する (script 直叩きや手書き編集で代替しない)。更新後に、その artifact の frontmatter の kind と実際の保存 path が一致していることを確認する。
- 検証: `python3 /Users/dm/orca/workspaces/HarnessHub/wt-27-3/plugins/dev-graph/scripts/validate-graph-schema.py` を fixture repository の graph store に対して実行し、PASS することを確認する。あわせて fixture repository の `features/` 配下に C14 macro-feature 契約外のノードが生成されていないことを確認する。

以下を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T183301-wt27-c02-final/fixture-repo --input /Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T183301-wt27-c02-final/fixture-repo/mixed-artifacts.json"})

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. /Users/dm/orca/workspaces/HarnessHub/wt-27-3/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T183301-wt27-c02-final/out/status.json に完了マーカーを 1 ファイルだけ Write する。内容:
   {"status": "PASS|FAIL|ERROR のいずれか", "observations": {"1": "...", "2": "...", "3": "..."}}
   observations の各値には、その観測項目を満たしたことを示す実測の証跡 (5 件それぞれの kind と保存 path の対応、連続更新したノード ID と更新後の frontmatter kind / 保存 path の一致、features/ の検査結果と graph 上の feature ノード件数、validate-graph-schema.py の終了ステータス) を簡潔に書く。
2. 「DONE: <status>」と 1 行だけ報告する。

制約:
- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと (中間生成物は skill 側の出力先 (WORK_DIR 外) へ — out/ に中間 Write させると poll が DONE 偽陽性を起こす)。
