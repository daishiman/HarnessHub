# タスク: dev-graph:run-dev-graph-init の実走 (scenario C01-OUT1-positive-idempotence-r17)

この run は scenario C01-OUT1-positive-idempotence-r17 の充足を確認するものです。

必ず満たすべき観測項目 (scenario の required_observations の逐語転記):

1. the first pass creates the six content roots, the routing policy and the graph store
2. the second pass re-invokes the skill and reports zero planned changes
3. the template edited between the passes still holds its edited bytes after the second pass, proving non-overwrite by running init rather than by inspecting the file alone
4. the plugin hook source is resolved and its receipt or rejection diagnosis is recorded
5. config stores no absolute path and no token or node id
6. C11 passes against a graph that contains at least one node

実行経路の必須契約:

- transcript に次の3回の Skill ツール呼び出しが、この順序で必ず残ること。いずれかを Bash で内部 script を直接呼ぶ形へ置き換えた場合、この trial は FAIL とする。
  1. 第1パス `Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-init/live-trial/20260808T113540Z-o4zi-c01r3/fixture-repo --hook-source plugin"})`
  2. パス間のノード登録 `Skill({skill: "dev-graph:run-dev-graph-node", args: "add --repo-root /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-init/live-trial/20260808T113540Z-o4zi-c01r3/fixture-repo --input /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-init/live-trial/20260808T113540Z-o4zi-c01r3/fixture-repo/.dev-graph/tmp/c01-seed-input.json"})`
  3. 第2パス `Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-init/live-trial/20260808T113540Z-o4zi-c01r3/fixture-repo --hook-source plugin"})`
- 第1パス終了後、scaffold 済み canonical template を1件だけ Editし、編集後全文と sha256 を記録する。
- 次に `.dev-graph/tmp/c01-seed-input.json` と必要な本文ファイルを作り、上記2番の Skill 呼び出しで最低1ノードを登録する。ノード登録のために `upsert-node.py` をあなた自身が Bash から直接実行してはならない。
- 上記3番の Skill 呼び出しで第2パスを行い、planned changes 0、編集済み template のバイト列維持、plugin hook の受理または拒否診断を確認する。第2パスを `build-repo-config.py` 等の直接実行へ置き換えてはならない。
- 最後に C11 をノード1件以上の graph に対して実行し、config に絶対パス・token・node id が無いことを確認する。
- goal-seek 証跡を作る各 Skill 呼び出しでは、`intermediate.jsonl` の `original_goal_hash` を推測値で書かず、対応する `goal-spec.json` の `original_goal` の UTF-8 SHA-256 を実際に計算した値と完全一致させる。

まず以下の第1パスを実行してください:

Skill({skill: "dev-graph:run-dev-graph-init", args: "--repo-root /private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-init/live-trial/20260808T113540Z-o4zi-c01r3/fixture-repo --hook-source plugin"})

処理が終了 (成功 / 失敗 / 中断いずれでも) したら:

1. `/private/tmp/harnesshub-o4zi.Gv5hFK/eval-log/dev-graph/run-dev-graph-init/live-trial/20260808T113540Z-o4zi-c01r3/out/status.json` に完了マーカーを1ファイルだけ Writeする。内容は `{"status":"PASS|FAIL|ERROR","observations":{"1":"...","2":"...","3":"...","4":"...","5":"...","6":"..."},"skill_invocations":["dev-graph:run-dev-graph-init","dev-graph:run-dev-graph-node","dev-graph:run-dev-graph-init"]}` とする。3回の Skill 呼び出しが transcript に無ければ status は必ず FAIL とする。
2. 「DONE: <status>」と1行だけ報告する。

制約:

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- out/ には status.json 以外を書かないこと。
