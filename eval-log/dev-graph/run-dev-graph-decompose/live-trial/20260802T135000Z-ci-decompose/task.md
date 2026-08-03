# C14 live trial: run-dev-graph-decompose

質問せず最後まで自走し、この run 用の isolated fixture だけを変更する。最初の実行アクションは次の literal Skill 呼出しとし、script で代替しない。

```
Skill({skill: "dev-graph:run-dev-graph-decompose", args: "ユーザー登録とログインができて、ログイン後にダッシュボードで自分の利用状況を見られる小規模 Web アプリを作りたい。登録完了時と重要な変更時には通知メールを送りたい。運営者向けには全ユーザーの利用状況を集計したレポート画面もほしい。 --repo-root /Users/dm/orca/workspaces/HarnessHub/main-2/eval-log/dev-graph/live-trial-fixtures/decompose-ci-rerun-20260802"})
```

被験 skill の goal-seek 3成果物を fixture の `eval-log/` に保存する。実際に macro 分解を書き込み、draft と promotion を同じ run の出力 node に対して検証する。beads / none の2 binding を別々の実 run として検証し、GitHub は macro-only node の schema 上 unreachable となる理由を記録する。すべての required_observations を実測して fixture の `eval-log/independent-verification.json` に保存する。fresh Agent を1回以上 fork して独立検証し、親の自己評価で代替しない。

promotion patch は C02 の `upsert-node.py --input` 経由だけで登録する。node の `confirmation_status`、`evaluation_status`、`implementation_readiness`、`confirmation_evidence`、`evaluated_digest` を最終 persisted node と照合する。evaluated_digest は `sort_keys=True` と `separators=(',', ':')` による JSON の SHA-256 を使う。completion-only のライフサイクル操作は使わない。

1. the produced feature and architecture nodes form an acyclic DAG whose inter-feature depends_on stays within declared_granularity_threshold.max_value measured by declared_granularity_threshold.metric
2. in a run that writes for real, pre-evaluation draft features publish zero issues, and every zero carries the reason it is zero, so suppression by the draft gate is never reported interchangeably with a binding route the configuration disables or with the absence of a live candidate
3. at least one actual produced draft feature remains excluded while one actual produced feature advanced to confirmed, evaluation-pass and readiness-complete becomes the sole publication candidate, so the exclusion is a decision of the implementation publication gate and not a side effect of a run that wrote nothing anywhere
4. the beads and none bindings are exercised as two separate runs whose recorded publication routes differ, while the github binding is recorded as unreachable for a macro-only run together with the schema rule that makes it unreachable, and every binding's figure is derived from the tracker binding actually persisted in the run's graph rather than from an argument supplied to the audit, so no binding's measurement is one value restated from the audit's own input
5. the local, Beads, GitHub and Projects write counts are derived by differencing repository state captured before and after the run rather than restated from the skill's own report, and the preview graph is validated through the stdin path so no temporary file is created inside the managed repository
6. the confirmation_evidence of every promoted feature is recomputed from the final persisted node content excluding only confirmation_evidence and matches, so a placeholder digest or a node edited after evaluation is rejected
7. gate violations synthesised from this run's final graph are rejected by the canonical schema validator, so the publication gate is falsifiable on the same data rather than inferred from a run where no forbidden publication happened

すべて PASS のときだけ out/status.json に `{"status":"PASS","scenario":"C14-OUT1-positive-macro-decomposition-r9"}` を1ファイルだけ書き、最後は `DONE: PASS` の1行だけにする。未達なら理由を記録して FAIL にする。
