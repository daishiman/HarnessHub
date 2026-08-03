# C14 live trial r15 — current-closure deterministic paired replay

`C14-OUT1-positive-macro-decomposition-r7` を、この worktree の現行 behavior closure で実走する。
質問せず、この task.md だけで完了する。fixture 外の repository は変更せず、出力は指定した status.json だけへ書く。

## 固定値

- plugin: `/Users/dm/orca/workspaces/HarnessHub/wt-30/plugins/dev-graph`
- scenario file: `/Users/dm/orca/workspaces/HarnessHub/wt-30/plugins/dev-graph/tests/fixtures/live-trial-positive-scenarios.json`
- audit helper: `/Users/dm/orca/workspaces/HarnessHub/wt-30/plugins/dev-graph/tests/fixtures/audit_decompose_live_trial.py`
- run workdir: `/Users/dm/orca/workspaces/HarnessHub/wt-30/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T101500Z-cvli-decompose-r7`
- replay bundle: `/Users/dm/orca/workspaces/HarnessHub/wt-30/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T034300Z-dc7-decompose/replay`
- beads fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-30/eval-log/dev-graph/live-trial-fixtures/cvli-c14-r7-beads-20260802`
- none fixture: `/Users/dm/orca/workspaces/HarnessHub/wt-30/eval-log/dev-graph/live-trial-fixtures/cvli-c14-r7-none-20260802`
- want: `ユーザー登録とログインができて、ログイン後にダッシュボードで自分の利用状況を見られる小規模 Web アプリを作りたい。登録完了時と重要な変更時には通知メールを送りたい。運営者向けには全ユーザーの利用状況を集計したレポート画面もほしい。`
- goal hash: `ceef75f32843aae2bcbb0f4e2b638b0a419ff194320149e31390b65d2b98b795`

fixture はどちらも graph node 0 件の初期状態であり、replay bundle は fixture 外の決定論的入力である。各 node は各系列で target Skill① と Explore 完了後にのみ C02 `upsert-node.py --input` で登録する。graph JSON の直接コピー・直接編集は禁止する。

## 実行順序

beads を 1〜13 まで完了してから、none を同じ順で完了する。順序を変えない。series ごとに、下記以外の Task/Agent は作らない。

1. graph node が 0 件で、`resolve-repo-context.py --mode write --repo-root <fixture>` が成功することを確認する。
2. fixture の `eval-log/` を作る。`<replay>/<binding>/goal-spec.json` を `run-dev-graph-decompose-goal-spec.json` へコピーし、`intermediate.jsonl` の先頭 1 行だけを `run-dev-graph-decompose-intermediate.jsonl` に書く。
3. audit helper `snapshot --repo-root <fixture> --output <fixture>/eval-log/pre-state.json` を実行する。
4. **target Skill①** を次の正確な形で呼ぶ。
   `Skill({skill: "dev-graph:run-dev-graph-decompose", args: "<want> --repo-root <fixture>"})`
5. Skill①直後に `<plugin>/skills/run-dev-graph-decompose/prompts/R2-plan.md` と `R3-decompose.md` を Read する。
6. `subagent_type: "Explore"` の Task を **ちょうど 1 回** fork する。prompt の先頭と末尾に次を逐語で置く。
   `STRICT READ-ONLY: Do not use Write, Edit, NotebookEdit, Bash redirection, heredoc output, tee, touch, mkdir, cp, mv, rm, git mutation, or any command/tool that creates or modifies a file. Do not write to /tmp. Return the analysis only in the Task response.`
   Task は Read/Grep/Glob と、必要なら読み取り専用 Bash の `ls` / `find` だけを使う。Task response が次と一致しなければ FAIL で終了する。
   - architecture は `arch-webapp-001` の正確に 1 件
   - feature は user-auth/dashboard/notification/admin-report の正確に 4 件、task 0 件
   - dashboard/notification/admin-report は user-auth に依存し、DAG 非循環、最大 depends_on 1
   - beads 系列では全 node `tracker_binding=beads`、none 系列では全 node `tracker_binding=none`
   - 両系列とも `beads_linkage=null`、`github_publication.mode=local_only`
   - github macro-only は schema が issue/issue_and_projects を要求するため到達不能
   - system-dev-planner 未起動なので P01..P13 は非適用
7. Task 完了結果を回収してから、`<replay>/<binding>/node-*.json` と対応する `body-*.md` を fixture の `inputs/` へコピーする。architecture → user-auth → dashboard → notification → admin-report の順で、各 node を
   `python3 <plugin>/scripts/upsert-node.py --repo-root <fixture> --input inputs/node-<id>.json --body-file inputs/body-<id>.md`
   により登録する。全件が成功し、receipt が新規追加、最終 node 数 5 であることを assert する。write_count は canonical receipt の値を保持し、1 件へ固定しない。
8. 初回 5 node の graph を `eval-log/macro-preview.json` へコピーし、graph 内容を stdin に pipe して `validate-graph-schema.py --graph - --repo-root <fixture>` を成功させる。管理 repository 内に一時 graph を作らない。
9. `<replay>/<binding>/patch-promote-user-auth.json` の patch を C02 へ 1 回 upsert する。`confirmation_status=confirmed`、`evaluation_status=pass`、`implementation_readiness.status=complete` を assert する。最終 persisted node から `confirmation_evidence` だけを除外し、`json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(',', ':'))` の UTF-8 SHA-256 を再計算して、宣言 `evaluated_digest` と一致させる。
10. architecture は元 node、user-auth は C02 が返した full promoted node、残り 3 feature は元 nodeを同じ C02 writer へ再送する。全 5 件が `operation=noop` / `write_count=0`、graph revision/SHA 不変であることを assert する。
11. **target Skill②** を同じ want / 同じ fixture で呼ぶ。これが当該系列の最後の Skill。Skill②より後は `upsert-node.py`、node patch、graph writer を一切呼ばない。
12. canonical audit を実行する。
    `audit --repo-root <fixture> --preview <fixture>/eval-log/macro-preview.json --scenario <scenario file> --pre-state <fixture>/eval-log/pre-state.json --plugin-dir <plugin> --run-mode apply --run-binding beads|none --output <fixture>/eval-log/decompose-audit.json`
    audit の `pass=true` と `run_binding_attested=true` を assert する。
13. audit と Task response がすべて一致した場合だけ、`<replay>/<binding>/progress-final.json` を fixture の `eval-log/run-dev-graph-decompose-progress.json` へコピーする。`checklist` に `id=goal_seek_fork` が正確に 1 件、`status=pass`、pending 0、evidence null 0、`overall=pass` を assert する。次に replay `intermediate.jsonl` の 2 行を fixture へコピーし、goal spec の original_goal/hash と各行の original_goal/hash が一致し、必須 6 key が揃うことを検証する。

両系列の完了後、各 fixture を `<run workdir>/evidence/beads` / `evidence/none` へコピーする。両 audit の `audit_implementation.sha256` が一致すること、transcript 上の target Skill が beads=2 / none=2 / 合計4、Explore Task が beads=1 / none=1 / 合計2、Task の nested tool が Read/Grep/Glob と読み取り専用 ls/find だけで write 0、各 Skill②後の node writer が0であることを確認する。1つでも不一致なら PASS を書かない。

## required_observations

1. the produced feature and architecture nodes form an acyclic DAG whose inter-feature depends_on stays within declared_granularity_threshold.max_value measured by declared_granularity_threshold.metric
2. in a run that writes for real, pre-evaluation draft features publish zero issues, and every zero carries the reason it is zero, so suppression by the draft gate is never reported interchangeably with a binding route the configuration disables or with the absence of a live candidate
3. at least one actual produced draft feature remains excluded while one actual produced feature advanced to confirmed, evaluation-pass and readiness-complete becomes the sole publication candidate, so the exclusion is a decision of the implementation publication gate and not a side effect of a run that wrote nothing anywhere
4. the beads and none bindings are exercised as two separate runs whose recorded publication routes differ, while the github binding is recorded as unreachable for a macro-only run together with the schema rule that makes it unreachable, and every binding's figure is derived from the tracker binding actually persisted in the run's graph rather than from an argument supplied to the audit, so no binding's measurement is one value restated from the audit's own input
5. the local, Beads, GitHub and Projects write counts are derived by differencing repository state captured before and after the run rather than restated from the skill's own report, and the preview graph is validated through the stdin path so no temporary file is created inside the managed repository
6. the confirmation_evidence of every promoted feature is recomputed from the final persisted node content excluding only confirmation_evidence and matches, so a placeholder digest or a node edited after evaluation is rejected
7. gate violations synthesised from this run's final graph are rejected by the canonical schema validator, so the publication gate is falsifiable on the same data rather than inferred from a run where no forbidden publication happened

task contract の required fragments は `upsert-node.py --input`、`confirmation_status`、`evaluation_status`、`implementation_readiness`、`confirmation_evidence`、`evaluated_digest`、`sort_keys=True`、`separators=(',', ':')`。completion 専用の lifecycle-request operation は使わない。

全条件 PASS の場合だけ、次へ正確な JSON を書く。

`/Users/dm/orca/workspaces/HarnessHub/wt-30/eval-log/dev-graph/run-dev-graph-decompose/live-trial/20260802T101500Z-cvli-decompose-r7/out/status.json`

```json
{"status":"PASS","scenario":"C14-OUT1-positive-macro-decomposition-r7","binding":"paired:beads+none"}
```

最後の返答は `DONE: PASS` の 1 行だけ。質問せず、追加指示を待たず完了する。
