---
graph_node_id: "doc-mx65-spec-reflection-receipt-20260815"
artifact_kind: "document"
artifact_subtypes: []
layer: "feature-spec-reflection"
project_id: "harness-hub"
domain: "operations"
tags: ["beads","github","tracker","spec-reflection"]
priority: "medium"
start_date: "2026-08-15"
target_date: null
iteration: null
title: "GitHub issue ミラーの退役 仕様反映受領書"
owners: ["daishiman"]
created_at: "2026-08-15T00:00:00Z"
updated_at: "2026-08-15T00:00:00Z"
status: "active"
depends_on: ["task-github-issue-mirror-retirement-20260815"]
related_nodes: ["task-github-issue-mirror-retirement-20260815","feat-dev-pipeline-improvement","arch-harness-hub-dev-workflow"]
resource_scope: ["docs/features/feat-dev-pipeline-improvement/mx65-github-issue-mirror-retirement-spec-reflection-receipt.md"]
purpose: "GitHub issue ミラー退役の仕様影響判断と写し先を HEAD に残す。"
goal: "確定章 reopen なしで tracker 権威関係の変更が追跡できる。"
scope_in: ["影響判断","写し先","検証結果","残課題"]
scope_out: ["製品 runtime の変更","GitHub issue の物理削除"]
acceptance: ["各層の反映または無変更理由がある","Beads ID と graph node が一致する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "docs/features/feat-dev-pipeline-improvement/mx65-github-issue-mirror-retirement-spec-reflection-receipt.md"
template_id: "document"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"a530a6dce3910df52dd3bafd85b6bcbc254f096f6eb587f6e0f162b3c6ac9ac1","evaluator":"final-review","evidence_ref":"tasks/feat-dev-pipeline-improvement/github-issue-mirror-retirement.md"}
source_lineage: {"imported_at":"2026-08-15T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "仕様反映受領書は document として feature docs へ置く。"
classification_candidates: [{"artifact_kind":"document","candidate_path":"docs/features/feat-dev-pipeline-improvement/mx65-github-issue-mirror-retirement-spec-reflection-receipt.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-15T00:00:00Z","missing_sections":[],"status":"complete"}
---

# GitHub issue ミラーの退役 — 仕様反映受領書

## 対象読者

最終レビューと PR を読む運用者・レビュアー。

## 要約

製品 runtime は変えていない。開発タスクの tracker 権威関係だけを是正し、GitHub への一方向投影を退役させた。

## 本文

### 何を言われて・何をやったか

「GitHub issues が管理しきれていない、完了分を消したい、そもそも GitHub issue 管理は必要か」という相談を起点に、`HarnessHub-mx65` として GitHub issue の権威関係を実測で確認し、完了済み 444 件を収束させ、再発源だった判定軸の誤りを仕様へ戻した。目的は、GitHub の open 件数が実態と乖離し続ける構造を、設定と契約の両方で断つこと。

### 結論

GitHub Issues は本リポジトリの課題の正本ではない。正本は beads (Dolt DB) であり、GitHub 側は逆流路を持たない投影だった。投影を `none` へ退役させ、GitHub Issues の用途を CI 通知と外部受付窓口に限定した。

### TL;DR

open 490 件のうち 444 件は既に終わっていた。原因は「送るだけで受け取らない」設定なので、その設定自体を止めた。

### 仕様影響の判断

| 層 | 判定 | 反映または無変更の理由 |
| --- | --- | --- |
| `system-spec/` | 無変更 | 確定章は製品仕様を扱う。開発 tracker の権威関係は製品要件ではないため reopen しない |
| `specs/` | 無変更 | 製品の公開契約・API・schema に変更が無い。writeback 対象となる実装差分が発生していない |
| `architecture/` | 反映済み | `harness-hub-dev-workflow.md` へ判定軸と退役の決定記録を追記した |
| `features/` | 無変更 | 新規 feature を作らない。既存 `feat-dev-pipeline-improvement` の配下 task として扱う |
| `tasks/` | 追加済み | `tasks/feat-dev-pipeline-improvement/github-issue-mirror-retirement.md` を追加した |
| `docs/` | 反映済み | `beads-operations-runbook.md` §1.1 に権威関係・禁止操作・正規経路を追記した |
| plugin 契約 | 反映済み | `execution-tracker-contract.md` §1 の判定軸を公開範囲から起票主体へ是正した |

影響が無いと言い切らない理由: 製品の公開契約は一切変えていないが、`execution_tracker` の既定を決める決定表そのものを書き換えている。これは今後の新規リポジトリ立ち上げに効く契約変更であり、無変更として扱うと同じ誤りが再生産される。

### 実装と検証の対応

- `.dev-graph/config.json` の意味的差分は `execution_tracker.beads.github_mirror` の 1 件のみ。残る 152 行の diff は唯一の sanctioned writer である `build-repo-config.py` によるキー順ソートと整形で、値の変更ではない。flatten した key 単位の比較で差分 1 件を確認した。
- close 対象は `bd` の `external_ref` による厳密突合で確定した。タイトル一致では 36 件が曖昧（同名で status が割れる）だったため採用していない。
- beads 側で closed と open が併存する 34 件は安全側に倒して close 対象から除外した。
- `Gate: gh:pr N` 35 件は対応 PR が全て merged であることを確認してから close した。
- 実行後の GitHub open は 46 件で、内訳は beads `open` 25 / `in_progress` 20 / CI 通知 1。想定集合と完全一致した。
- 物理削除はしていない。beads の `external_ref` 463 件が GitHub issue の URL を参照しているため、削除するとリンクが解決不能になる。

### 残課題

- `plugins/dev-graph/templates/repo-config.example.json` と `plugins/system-dev-planner/assets/default-project-config.json` の既定値は `bd_github_push_only` のままである。新規リポジトリの既定を `none` へ寄せるかはテンプレート利用側への影響評価が必要で、本変更の scope 外とした。
- 定期 reconcile を実装して push-only を安全に再開する選択肢は未着手。現時点では `none` で足りている。

## 決定事項

`execution_tracker.mode` と GitHub ミラーの選択軸は、repository の公開範囲ではなく「実行タスクを誰が起票し誰が読むか」とする。public であっても起票が owner と AI エージェントだけなら `beads` / `local_only` を既定とする。

## 運用・更新方法

GitHub issue を一括で閉じる必要が生じた場合は `gh-bridge.py --op issue-close` を使う（冪等なので再実行可能）。`bd-bridge.py --op github-push` は投影を再開させるため実行しない。手順は [beads-operations-runbook §1.1](../../beads-operations-runbook.md)。

## 関連資料

- [execution-tracker-contract §1](../../../plugins/dev-graph/references/execution-tracker-contract.md)
- [architecture/harness-hub-dev-workflow.md](../../../architecture/harness-hub-dev-workflow.md)
- [task 仕様書](../../../tasks/feat-dev-pipeline-improvement/github-issue-mirror-retirement.md)

## 変更履歴

- 2026-08-15: 初版。`HarnessHub-mx65` の最終レビューとして作成。
