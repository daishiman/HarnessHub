---
graph_node_id: "issue-guard-fix-closure-verdict-refresh-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["quality","dev-graph","live-trial","content-review","behavior-closure","follow-up","qa-6in4"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "dev-graph: guard-graph-schema 修正で stale 化した 9 skill の live-trial verdict と run-dev-graph-init の content-review verdict を再取得する"
owners: ["daishiman"]
created_at: "2026-07-25T17:12:02Z"
updated_at: "2026-07-28T04:09:44Z"
status: "closed"
depends_on: ["issue-guard-graph-schema-timeout-fail-open-20260725"]
related_nodes: ["issue-live-trial-closure-stale-mvp-first-20260723","issue-init-live-trial-scenario-refresh-20260725"]
resource_scope: ["eval-log/dev-graph","plugins/dev-graph/tests/test_skill_criteria_evidence.py"]
purpose: "6in4 の hook 修正が behavior closure 経由で dev-graph 全 9 skill の live-trial verdict を stale 化し、SKILL.md 変更が run-dev-graph-init の content-review verdict 2 件を stale 化した。証跡を実走で再取得し、6in4 の受入条件 4 (再取得 transcript に guard 迂回が現れない) を機械証跡で満たす"
goal: "lint-live-trial-verdict.py --all と lint-content-review.py --all が exit 0 に収束し、pytest plugins/dev-graph/tests が 0 failed になる"
mvp_alignment: null
scope_in: ["dev-graph 9 skill (init/node/sync/requirements/render/decompose/schedule/status/system-spec) の run-skill-live-trial 実走と verdict.json 再生成","run-dev-graph-init の content-review (elegance / rubric) 再評価","再取得後の pytest plugins/dev-graph/tests 全件 PASS の確認"]
scope_out: ["verdict の digest 欄の手書き更新 (証跡改ざんのため受け入れ不可)","behavior_closure_files() から plugin hooks/ を外す変更 (hook は全 skill の観測挙動を変えるため closure から外すのは退行)","鮮度ゲート自体の緩和・skip 追加","guard-graph-schema.py と build-repo-config.py の実装変更 (6in4 で完了済み)"]
acceptance: ["lint-live-trial-verdict.py --all が dev-graph 9 skill について stale-sha を報告せず exit 0 になる","lint-content-review.py --all が run-dev-graph-init について exit 0 になる","pytest plugins/dev-graph/tests が 0 failed になる","再取得した各 verdict の skill_dir_tree_sha が現行 closure の実測値と一致し tier=live / downgrade_reason=null である","run-dev-graph-init の再取得 transcript に Write 遮断から Bash heredoc への迂回が現れない"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-guard-fix-closure-verdict-refresh-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-25T17:12:02Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "6in4 実装後に pytest と lint を実走し、10 件の鮮度ゲート失敗が behavior closure digest と SKILL.md sha の不一致であることを実測で確定した証跡再取得タスク"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-guard-fix-closure-verdict-refresh-20260726.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-q5h9","linked_at":"2026-07-25T17:14:18Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-26T00:10:49Z","evidence_refs":["issues/sys-lint-open-residue-ci-red-20260725.md"],"policy":"manual","reconciled_at":"2026-07-26T01:19:20.811908Z","source":"reconciliation","status":"done"}
implementation_readiness: {"checked_at":"2026-07-25T17:12:02Z","missing_sections":[],"status":"complete"}
---

# 概要

HarnessHub-6in4 の修正で `plugins/dev-graph/hooks/guard-graph-schema.py` と `plugins/dev-graph/skills/run-dev-graph-init/SKILL.md` を変更した結果、dev-graph の **全 9 skill** の live-trial verdict が behavior closure digest 不一致で stale になり、加えて run-dev-graph-init の content-review verdict 2 件が SKILL.md sha 不一致で stale になった。証跡の再取得が必要である。

6in4 の受入条件 4 は「再取得した live-trial verdict の transcript に guard 迂回が現れない」であり run-dev-graph-init 1 件だけを想定していた。実測では波及範囲が 9 skill 全部であることが確定したため、6in4 本体から分離してここで追跡する。

## 波及の原因 (構造)

`plugins/harness-creator/skills/run-skill-live-trial/scripts/live-trial-verdict.py` の `behavior_closure_files()` が、対象 skill のディレクトリに加えて **plugin の `hooks/` ディレクトリ全体** を closure に含める (`add_tree(hooks, "native plugin hooks")`)。したがって `plugins/dev-graph/hooks/` 配下の 1 ファイルを変更すると、dev-graph plugin が提供する 9 skill すべての `skill_dir_tree_sha` が動く。

- run-dev-graph-init の closure: 19 files (うち hooks 由来を含む)
- run-dev-graph-status の closure: 12 files (同上)
- いずれの closure にも `guard-graph-schema.py` が含まれることを実測で確認した

hook は全 skill が共有する native な実行時ガードであり、closure に含めるのは正しい (hook の挙動が skill の観測挙動を変えるため)。よって closure 定義を狭める方向の解決は退行である。

## 実測 (2026-07-26 / worktree task-20260726-002450-wt-6)

```
pytest plugins/dev-graph/tests
  -> 507 passed / 10 failed / 2 skipped (131.40s)
```

10 failed の内訳:

| 件数 | ゲート | 原因 |
| --- | --- | --- |
| 9 | live-trial closure digest 鮮度ゲート | 9 skill の verdict が旧 `skill_dir_tree_sha` を保持 |
| 1 | run-dev-graph-init の content-review 鮮度ゲート | SKILL.md sha 変更で elegance / rubric verdict が stale |

`lint-live-trial-verdict.py --all` は exit 1 (9 skill stale)、`lint-content-review.py --all` は exit 1 (init の verdict 2 件)。clean HEAD tree では両者 exit 0 であることを確認済みで、因果は本セッションの変更に限定される。

## 完了条件の考え方

- verdict の digest 欄を手で書き換えて緑化するのは証跡改ざんであり受け入れ不可。`run-skill-live-trial` の実走で新 run-id の verdict を取得する。
- content-review は run-dev-graph-init の SKILL.md 現行 sha に対する再評価を取得する。
- 再取得は tier=live / `downgrade_reason: null` を満たすこと。

## 進捗 (2026-07-26)

content-review 分は解消済み。run-dev-graph-init に対する focused combined review (4条件 + rubric) を 1 context で実行し、`eval-log/dev-graph/run-dev-graph-init/content-review/{elegance,rubric}-verdict.json` を現行 SKILL.md の sha (`6d01572a…`) で再取得した。`lint-content-review.py --all` は **exit 0 / 75 skill verified**、`pytest plugins/dev-graph/tests` は **509 passed / 9 failed / 2 skipped** となり、残る 9 failed は live-trial closure digest の 9 件だけになった。

この再評価中に C10 guard の Write 枝の遮断理由文が保護範囲を過大に名乗っていた (`.dev-graph/ 配下` と表記、実体は `state/` と `config.json` と `graph-node.schema.json` の 3 対象のみ) 不整合を検出して修正したため、`plugins/dev-graph/hooks/guard-graph-schema.py` の内容は再び変わっている。**live-trial の再取得はこの修正後の closure に対して行うこと。**

残りは live-trial 9 件のみ。

## 追記 (2026-07-28) — 依存プラグイン経由の別経路 stale 化と、証跡削除の誤りの訂正

本 issue のスコープに含まれる `run-dev-graph-system-spec` について、PR #499 (`system-spec-harness/scripts/` 配下の qa_log ID 重複チェック修正) の作業中に、hook 経由 (`plugins/<plugin>/hooks/`) とは別の stale 化経路が実際に発生した。

`plugins/dev-graph/references/package-contract.json` の `skill_dependencies.run-dev-graph-system-spec: ["system-spec-harness"]` により、`behavior_closure_files()` は `system-spec-harness/scripts/` を closure へ含める。このため `system-spec-harness/scripts/validate-coverage-matrix.py` 等の修正だけで `run-dev-graph-system-spec` の `skill_dir_tree_sha` が変わり、既存 live-trial 証跡 19 件 + `20260726T050519Z-sysspec-final2` (計 20 件) が一括で stale-sha 化した。

### 誤った対応と訂正 (重要な教訓)

最初、stale 化した 20 件を `.dev-graph/tmp/preserved-evidence/` へバックアップした上で `git rm -r` で削除する対応を取ったが、これは `scripts/lint-live-trial-verdict.py --check-provenance origin/main` の **evidence-removed** 違反 (「証跡は append-only。分岐点 (merge-base) に存在した証跡を消すのは digest 書き換えの履歴束縛を外す経路として拒否する」) を新たに引き起こすと判明した。

**正しい対応は「削除しない」**: stale な証跡は残したままでよい (`lint-live-trial-verdict.py --all` は辞書順最大の run-id の verdict.json だけを検査するため、stale な旧証跡は検査対象にすらならず無害)。新しい run-id で `run-skill-live-trial` を実走して PASS 証跡を追加するだけで十分。20 件は全て `git restore --staged --worktree` で復元し、新規 run-id `20260728T160623-sysspec-r2` (verdict: PASS、fresh evaluator で監査台帳偽装の再発なしも確認済み) を追加した。`scenario-verdict.json` の `OUT1.live_trial_verdict_ref` もこの新 run-id へ更新した。

なお C19 の live-trial (run-id `20260728T112105-sysspec-wt8`、別 issue `HarnessHub-3vmz` の発端) は本セッション内で新規作成後すぐ削除したもので、origin/main との分岐点に存在しないため `--check-provenance` の対象外であり、これは削除のままで問題ない。

### 今後への適用

本 issue が対象とする残り 8 skill (init/node/sync/requirements/render/decompose/schedule/status) の live-trial 再取得でも、既存 stale 証跡を削除せず残したまま新規 run-id を追加する方針を徹底すること。証跡削除は provenance ゲートの観点で常に誤りである。

## 関連

- HarnessHub-6in4 (`issue-guard-graph-schema-timeout-fail-open-20260725`) — 本 issue の発生源。実装は完了しており、受入条件 4 のみ本 issue の完了に従属する。
- HarnessHub-4y5 (`issue-live-trial-closure-stale-mvp-first-20260723`, closed) — 同種の 9 skill 一括再取得を MVP-first 実装で実施した先例。手順の参照元。
- HarnessHub-5pdc (`issue-init-live-trial-scenario-refresh-20260725`, closed) — SKILL.md 変更に伴う init の verdict / scenario receipt 追随の先例。
