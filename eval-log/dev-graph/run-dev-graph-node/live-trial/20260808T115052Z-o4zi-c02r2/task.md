# タスク: dev-graph:run-dev-graph-node の実走 (scenario C02-OUT1-positive-mixed-artifacts)

この run は scenario C02-OUT1-positive-mixed-artifacts の充足を確認するものです。

必ず満たすべき観測項目 (scenario の required_observations の逐語転記):

1. all five artifacts are routed to canonical kind paths
2. frontmatter kind and stored path agree after a consecutive update
3. no feature is created outside the C14 macro-feature contract

実行経路の必須契約:

- transcript に次の2回の Skill ツール呼び出しが、この順序で必ず残ること。連続更新を Bash から `upsert-node.py` を直接実行する形へ置き換えた場合、この trial は FAIL とする。
  1. 初回登録 `Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T115052Z-o4zi-c02r2/fixture-repo --input /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T115052Z-o4zi-c02r2/fixture-repo/mixed-artifacts.json"})`
  2. 連続更新 `Skill({skill: "dev-graph:run-dev-graph-node", args: "update --repo-root /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T115052Z-o4zi-c02r2/fixture-repo --input /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T115052Z-o4zi-c02r2/fixture-repo/.dev-graph/tmp/c02-update.json"})`
- fixture の `mixed-artifacts.json` は分類前の issue / task / specification / architecture / document 素材を1件ずつ含む。初回 Skill で5件すべての kind と canonical path を判定して登録する。
- 初回 Skill 終了後、登録済み node 1件を選び、既存本文を維持する patch を `.dev-graph/tmp/c02-update.json` に作る。その後、上記2番の Skill 呼び出しで更新する。更新のために `upsert-node.py` をあなた自身が直接呼ばない。
- 更新後の frontmatter kind、実保存 path、graph file_path の一致を確認する。C11 が PASS し、`features/` に C14 macro-feature 契約外のファイルも feature node も無いことを確認する。
- goal-seek 証跡では `intermediate.jsonl` の `original_goal_hash` を推測値で書かず、対応する `goal-spec.json` の `original_goal` の UTF-8 SHA-256 を実際に計算した値と完全一致させる。

まず以下の初回登録を実行してください:

Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T115052Z-o4zi-c02r2/fixture-repo --input /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T115052Z-o4zi-c02r2/fixture-repo/mixed-artifacts.json"})

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-node/live-trial/20260808T115052Z-o4zi-c02r2/out/status.json` に完了マーカーを1ファイルだけ Writeする。内容は `{"status":"PASS|FAIL|ERROR","observations":{"1":"...","2":"...","3":"..."},"skill_invocations":["dev-graph:run-dev-graph-node","dev-graph:run-dev-graph-node"]}` とする。2回の Skill 呼び出しが transcript に無ければ status は必ず FAIL とする。
2. 「DONE: <status>」と1行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
