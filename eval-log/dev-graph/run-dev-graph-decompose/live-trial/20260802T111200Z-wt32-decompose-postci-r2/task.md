# C14 live trial r14 — latest-main deterministic replay, paired beads/none, no nudge

scenario `C14-OUT1-positive-macro-decomposition-r7` を現行 behavior closure で実走する。
質問せず、この task.md だけで完了する。出力は最後に指定した status.json へ書く。\n**各 Skill tool の戻り値は中間結果であり final response ではない。Skill①が戻っても turn を終了せず、同じ outer turn で直ちに step 5 以降を続行し、全 2 系列・全工程・status 書込みまで完走すること。**

## 固定値

- plugin: `/Users/dm/orca/workspaces/HarnessHub/wt-32/plugins/dev-graph`
- scenario file: `/Users/dm/orca/workspaces/HarnessHub/wt-32/plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json`
- audit helper: `/Users/dm/orca/workspaces/HarnessHub/wt-32/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py`
- run workdir: `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T111200Z-wt32-decompose-postci-r2`
- beads fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-decompose-beads-postci-r2`
- none fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/live-trial-fixtures/20260802-wt32-decompose-none-postci-r2`
- want: `ユーザー登録とログインができて、ログイン後にダッシュボードで自分の利用状況を見られる小規模 Web アプリを作りたい。登録完了時と重要な変更時には通知メールを送りたい。運営者向けには全ユーザーの利用状況を集計したレポート画面もほしい。`
- goal hash: `ceef75f32843aae2bcbb0f4e2b638b0a419ff194320149e31390b65d2b98b795`
- replay bundle root: `/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T083500Z-wt32-decompose-final/replay`（以下の `replay/beads` / `replay/none` はこの絶対 root 配下を指す）

`replay/beads` と `replay/none` は、直前 run で canonical writer/schema/audit を通した
入力と本文の deterministic replay bundle である。fixture は graph node 0 件の初期状態で、
bundle は fixture 外にある。各 node はこの run の Skill①と Explore 完了後にのみ C02
`upsert-node.py --input` で登録する。graph を直接コピー・編集してはならない。

## 両 fixture の絶対順序

beads を 1〜13 まで完了後、none を同じ順で完了する。順番を変えない。

1. graph node が 0 件で、`resolve-repo-context.py --mode write` が成功することを確認する。
2. fixture の `eval-log/` を作る。bundle の `goal-spec.json` を
   `run-dev-graph-decompose-goal-spec.json` へコピーし、intermediate の先頭 1 行だけを
   `run-dev-graph-decompose-intermediate.jsonl` に書く。
3. audit helper `snapshot` で `eval-log/pre-state.json` を取得する。
4. **target Skill①** を次の正確な形で呼ぶ。
   `Skill({skill: "dev-graph:run-dev-graph-decompose", args: "<want> --repo-root <fixture>"})`
5. Skill①直後に `prompts/R2-plan.md` と `prompts/R3-decompose.md` を Read する。
6. `subagent_type: "Explore"` の Task を 1 回 fork する。prompt の先頭と末尾に次を逐語で置く。
   `STRICT READ-ONLY: Do not use Write, Edit, NotebookEdit, Bash redirection, heredoc output, tee, touch, mkdir, cp, mv, rm, git mutation, or any command/tool that creates or modifies a file. Do not write to /tmp. Return the analysis only in the Task response.`
   Task は Read/Grep/Glob と、必要なら読み取り専用 Bash の `ls` / `find` だけを使う。
   Bash の redirect、heredoc、tee、touch、mkdir、cp、mv、rm、git mutation、ファイルを
   生成・変更する interpreter は禁止する。ファイル変更 0 で response 本文へ結果を返す。
7. Explore へ次を明記する。
   - architecture は `arch-webapp-001` の正確に 1 件
   - feature は user-auth/dashboard/notification/admin-report の正確に 4 件、task 0 件
   - dashboard/notification/admin-report は user-auth に依存し、DAG 非循環、最大 depends_on 1
   - beads 系列では全 node `tracker_binding=beads`、none 系列では全 node `tracker_binding=none`
   - 両系列とも `beads_linkage=null`、`github_publication.mode=local_only`
   - github macro-only は schema が issue/issue_and_projects を要求するため到達不能
   - system-dev-planner 未起動なので P01..P13 は非適用
   Task response が件数・edge・その系列の binding と一致しなければ status=FAIL で終了する。
8. Task 完了結果を回収してから bundle の node JSON/body を fixture `eval-log/` へコピーする。
   architecture → user-auth → dashboard → notification → admin-report の順で、各 node を
   `scripts/upsert-node.py --repo-root <fixture> --input <node-json> --body-file <body>` により登録する。
   全件が成功し、receipt の operation が新規追加を示し、最終 node 数 5 を assert する。
   write_count は graph と artifact の実書込みを canonical receipt の値のまま保持し、
   1 件へ固定しない。最終 audit が pre/post state から実数を検証する。
9. 初回 5 node の graph を `eval-log/macro-preview.json` へコピーし、graph 内容を pipe して
   `validate-graph-schema.py --graph - --repo-root <fixture>` の stdin 経路で検証する。
10. bundle `patch-promote-user-auth.json` の full node を C02 へ 1 回 upsert する。
    final persisted node から `confirmation_evidence` だけを除外し、
    `json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':'))`
    の UTF-8 SHA-256 を再計算する。宣言 `evaluated_digest` と一致し、
    `confirmation_status=confirmed`、`evaluation_status=pass`、
    `implementation_readiness.status=complete` を assert する。
11. architecture は元 node、user-auth は full promote node、残り 3 feature は元 nodeを
    同じ C02 writer へ再送し、全 5 件が `operation=noop` / `write_count=0`、
    graph revision/SHA 不変であることを assert する。
12. **target Skill②** を同じ want / 同じ fixture で呼ぶ。これが当該系列の最後の Skill。
    Skill②より後は `upsert-node.py`、node patch、graph writer を一切呼ばない。
13. canonical audit を実行する。
    - `audit --repo-root <fixture>`
    - `--preview <fixture>/eval-log/macro-preview.json`
    - `--scenario <scenario file>`
    - `--pre-state <fixture>/eval-log/pre-state.json`
    - `--plugin-dir <plugin>`
    - `--run-mode apply`
    - `--run-binding beads|none`
    - `--output <fixture>/eval-log/decompose-audit.json`
    audit の `pass=true`、`run_binding_attested=true` を assert する。

## progress / goal-seek の確定

各 Task response と audit が上記に一致した場合だけ、当該 bundle の
`progress-final.json` を fixture の
`eval-log/run-dev-graph-decompose-progress.json` へコピーする。コピー後に次を assert する。

- `checklist` に `id=goal_seek_fork` が正確に 1 件あり `status=pass`
- evidence は Explore response の architecture 1 + feature 4 + task 0、3 dependency edge、
  DAG、最大依存 1、当該系列の tracker binding、github schema risk、P01..P13 非適用、
  Task tool（Read/Grep/Glob および使った場合の読み取り専用 ls/find）と file write 0 を含む
- pending 0、evidence null 0、`overall=pass`

次に bundle `intermediate.jsonl` の 2 行を fixture の同名ファイルへコピーし、
goal spec の元ゴール/hash と各行の元ゴール/hash が一致し、必須 6 key が揃うことを検証する。

最後に両 audit の `audit_implementation.sha256` が同一であること、transcript 上の target
Skill が beads=2 / none=2 / 合計4、Task が beads=1 / none=1 / 合計2、Task の nested
tool が Read/Grep/Glob と読み取り専用 ls/find だけで write 0、各 Skill②後の当該 fixture node writer が0であることを
確認する。1つでも不一致なら PASS を書かない。

## required_observations

1. the produced feature and architecture nodes form an acyclic DAG whose inter-feature depends_on stays within declared_granularity_threshold.max_value measured by declared_granularity_threshold.metric
2. in a run that writes for real, pre-evaluation draft features publish zero issues, and every zero carries the reason it is zero, so suppression by the draft gate is never reported interchangeably with a binding route the configuration disables or with the absence of a live candidate
3. at least one actual produced draft feature remains excluded while one actual produced feature advanced to confirmed, evaluation-pass and readiness-complete becomes the sole publication candidate, so the exclusion is a decision of the implementation publication gate and not a side effect of a run that wrote nothing anywhere
4. the beads and none bindings are exercised as two separate runs whose recorded publication routes differ, while the github binding is recorded as unreachable for a macro-only run together with the schema rule that makes it unreachable, and every binding's figure is derived from the tracker binding actually persisted in the run's graph rather than from an argument supplied to the audit, so no binding's measurement is one value restated from the audit's own input
5. the local, Beads, GitHub and Projects write counts are derived by differencing repository state captured before and after the run rather than restated from the skill's own report, and the preview graph is validated through the stdin path so no temporary file is created inside the managed repository
6. the confirmation_evidence of every promoted feature is recomputed from the final persisted node content excluding only confirmation_evidence and matches, so a placeholder digest or a node edited after evaluation is rejected
7. gate violations synthesised from this run's final graph are rejected by the canonical schema validator, so the publication gate is falsifiable on the same data rather than inferred from a run where no forbidden publication happened

declared granularity threshold は
`metric=max_inter_feature_depends_on_per_feature`、`max_value=3`。実測期待値は1。

task contract の required fragments は
`upsert-node.py --input`、`confirmation_status`、`evaluation_status`、
`implementation_readiness`、`confirmation_evidence`、`evaluated_digest`、
`sort_keys=True`、`separators=(',', ':')`。

## 完了 marker

全条件 PASS の場合だけ次へ正確な JSON を書く。

`/Users/dm/orca/workspaces/HarnessHub/wt-32/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T111200Z-wt32-decompose-postci-r2/out/status.json`

```json
{"status":"PASS","scenario":"C14-OUT1-positive-macro-decomposition-r7","binding":"paired:beads+none"}
```

最後の返答は `DONE: PASS` の 1 行だけ。質問せず、追加指示を待たず完了する。
