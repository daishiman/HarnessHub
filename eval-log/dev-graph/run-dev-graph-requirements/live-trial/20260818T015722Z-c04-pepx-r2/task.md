# タスク: dev-graph:run-dev-graph-requirements の実走 (scenario C04-OUT1-positive-ready-handoff)

この run は scenario `C04-OUT1-positive-ready-handoff` の充足を確認するものです。

FIXTURE = `/Users/dm/orca/workspaces/HarnessHub/card-closeout/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260818T015722Z-c04-pepx-r2/fixture-repo`

FIXTURE は `build_live_trial_fixture.py --kind requirements` が生成した隔離 repository です。
作り直さず、feature `F-LIVE-001` と、fixture 内の promotion 済み
`feature-package/F-LIVE-001` を使ってください。

**この task.md を受け取った outer session 自身が、以下の全工程を1つのターンで
連続実行してください。対象 Skill の呼び出しは1回だけとし、戻り後も最終検証と
status.json の Write が終わるまで、親や利用者へ制御を返さないでください。**

## required_observations (scenario 正本の逐語転記)

1. a capability-build task-graph handoff is emitted for the exact-13 package
2. the handoff remains bound to the feature and source digest
3. the handoff is bound to a current C19 resume receipt, completeness report, and full system-spec artifact snapshot
4. the requirements skill generates no implementation source file

## 工程 1: Skill の単発実走

最初の実行アクションは次のリテラル Skill 呼び出しにしてください。
内部 script の直実行や Agent への代替で Skill 本体を省略せず、この Skill 呼び出しを繰り返さないこと。

Skill({skill: "dev-graph:run-dev-graph-requirements", args: "--repo-root /Users/dm/orca/workspaces/HarnessHub/card-closeout/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260818T015722Z-c04-pepx-r2/fixture-repo --feature-id F-LIVE-001"})

Skill は `SKILL.md` の正規経路で次の5 gateをすべて実行し、その実出力と
exit code に基づいて判定してください。

1. C11: `validate-graph-schema.py --graph <FIXTURE>/.dev-graph/state/graph.json --repo-root <FIXTURE>`
2. C02 saved state: 選択 feature、その `architecture_refs`、同一 package の P01..P13 task すべてが
   `confirmation_status=confirmed` / `evaluation_status=pass` / `implementation_readiness.status=complete`
   であり、C11 report と一致すること
3. source lineage: 上記15 node の lineage closure を重複除去・node ID 昇順で
   `validate-source-digest.py --registered` へ全件渡して exit 0。task 13件だけに縮めないこと
4. exact-13 plan: `validate-system-plan.py --repo-root <FIXTURE> --feature-package feature-package/F-LIVE-001`
   が P01..P13 exact 13・共通 parent/package・機能内前方 dependency を確認して exit 0。
   `--staging` や package 無しに読み替えないこと
5. C19 snapshot: `validate-requirements-system-spec-snapshot.py --repo-root <FIXTURE>` が exit 0。
   この adapter の結果から `resume_receipt_sha256` / `completeness_report_sha256` /
   `artifact_snapshot_sha256` の3実値を得て、upstream 成功後の post-validation rehash が
   current かつ安定であること

5 gate がすべて PASS の場合だけ、少なくとも次の C04 所有成果物を FIXTURE 内へ
実ファイルとして atomic emit してください。既存の system-dev-planner 入力
`system-build-handoff.json` / `task-graph.json` を C04 出力と読み替えないでください。

- requirements document
- readiness matrix
- capability-build/task-graph handoff

handoff は feature `F-LIVE-001`、`feature-package/F-LIVE-001`、P01..P13 exact 13、
package/source/graph snapshot digest、および上記 C19 の3 digest 実値に束縛してください。
gate 通過の申告や progress.json の記載だけでなく、成果物ファイルの実在までを完了条件とします。

## 工程 2: 実測検証

Skill から戻ったら、FIXTURE 内の成果物と baseline receipt
`<FIXTURE>/.git/dev-graph/live-trial-baseline.json` を読み、次を実測してください。

1. capability-build/task-graph handoff が実ファイルとして新規生成され、参照 task が
   `SYS-LIVE-001-P01` .. `SYS-LIVE-001-P13` の exact set であること。
2. handoff 内の feature/package/source digest が graph node、`staging-manifest.json`、registration receipt
   の実値と一致すること。
3. handoff 内の C19 3 digest が、工程1 gate 5 の実出力とすべて一致すること。
4. `git status --short` と untracked 一覧で、実走による実装 source file の新規生成が0件であること。

## 工程 3: goal-seek 配線の確認

Skill の正規手順が FIXTURE の `eval-log/` に次の3点を作ったことを確認してください。

- `<FIXTURE>/eval-log/run-dev-graph-requirements-goal-spec.json`
- `<FIXTURE>/eval-log/run-dev-graph-requirements-progress.json`
- `<FIXTURE>/eval-log/run-dev-graph-requirements-intermediate.jsonl`

`intermediate.jsonl` の各行は `original_goal` / `original_goal_hash` / `current_goal_snapshot` /
`delta_from_original` / `merged_directive_for_next` / `drift_signal` の6 key を持ち、すべての
`original_goal_hash` が goal-spec の `original_goal` UTF-8 SHA-256 と一致すること。

## 完了マーカー

全工程が終わったら、次の1ファイルだけを `out/` へ Write してください。

`/Users/dm/orca/workspaces/HarnessHub/card-closeout/eval-log/dev-graph/run-dev-graph-requirements/live-trial/20260818T015722Z-c04-pepx-r2/out/status.json`

```json
{"status":"PASS|FAIL|ERROR","scenario":"C04-OUT1-positive-ready-handoff"}
```

その後、`DONE: <status>` と1行だけ報告してください。

## 制約

- 途中で人間に質問せず最後まで自走すること。
- skill の手順に忠実に従い、人手の追加判断・省略をしないこと。
- `out/` には `status.json` 以外を書かないこと。
- 被験 repository は FIXTURE だけ。HarnessHub 本体のファイルを変更しないこと。
- 実 GitHub API / `gh` / 実 Beads へアクセスしないこと。
- fixture の graph store、package、registration receipt、C19 receipt/report を手作業で書き換えないこと。
- 実装コードを生成しないこと。実装は capability-build/task-graph build へ handoff すること。
