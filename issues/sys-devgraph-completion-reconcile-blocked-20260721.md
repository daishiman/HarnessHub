---
graph_node_id: "issue-devgraph-completion-reconcile-blocked-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "governance"
tags: ["dev-graph","beads","completion-evidence","choke-point"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "dev-graph: task worktree から completion reconcile が実行できず PR merge が完了判定へ反映されない"
owners: ["daishiman"]
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-21T13:16:05Z"
status: "active"
depends_on: []
related_nodes: ["issue-hub-foundation-progress-reconcile-20260721"]
resource_scope: ["plugins/dev-graph/scripts/reconcile-github-lifecycle.py","plugins/dev-graph/scripts/resolve-repo-context.py","plugins/dev-graph/scripts/bd-bridge.py","plugins/dev-graph/references/github-lifecycle-contract.md","plugins/dev-graph/references/git-worktree-contract.md"]
purpose: "PR merge を completion_evidence へ反映する唯一の経路が task worktree から成立せず、policy=linked_pr_merged_all の課題が close 不能になっている状態を解消する"
goal: "merge 済み PR に紐づく task が、手動 close に頼らず正規の reconcile 経路で closed へ収束できている"
scope_in: ["C24 repository context の identity 欠落の原因特定と是正","PR 本文または Beads gh:pr gate による linkage 手順の確立","Beads 1.1.0 gate 出力との互換性是正","reconcile を実行すべき場所 (default branch の clean worktree) の運用上の明文化"]
scope_out: ["手動 bd close による回避","completion policy 自体の変更","guard-graph-schema の緩和"]
acceptance: ["task worktree から reconcile-github-lifecycle.py --mode check が identity エラーなく判定を返す","merge 済み PR を持つ node の pull_request_linkages が空でなくなる","reconcile 経由で beads が closed へ遷移した実例が 1 件記録されている"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-devgraph-completion-reconcile-blocked-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"issues/sys-hub-foundation-progress-reconcile-20260721.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-8bc の突合中に観測した completion reconcile 経路の不成立を追跡する派生 issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-devgraph-completion-reconcile-blocked-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-mhh","linked_at":"2026-07-21T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"linked_pr_merged_all","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-21T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`completion_evidence.policy: linked_pr_merged_all` の充足判定を行える唯一の経路である `reconcile-github-lifecycle.py` が、task worktree から実行すると identity 解決で停止する。merge 済みの PR があっても課題が close へ収束できない。

## 背景と問題

`HarnessHub-8bc` (feat-hub-foundation の進捗突合) の実行中に観測した。`HarnessHub-37h` 配下の 13 task は PR #21 で main へ取り込まれているが、完了判定を実行する手段が無いため beads は 0/13 complete のまま動かせない。

`reconcile-github-lifecycle.py` は完了判定に成功したとき自ら `bd-bridge.py --op close` を呼ぶ設計になっており、beads の close はこの経路に従属している。したがってこの経路が塞がると、正しい close 手段が存在しなくなる。

## 現在の挙動

```
$ python3 plugins/dev-graph/scripts/reconcile-github-lifecycle.py \
    --repo-root . --graph .dev-graph/state/graph.json \
    --graph-node-id SYS-HUB-FOUNDATION-P02 --pr 21 --mode check
C24 repository context omits required identity
```

加えて `SYS-HUB-FOUNDATION-P01`〜`P13` の `pull_request_linkages` はすべて空配列で、PR #21 の本文にも `dev-graph: <NODE_ID>` マーカーが無い。仮に identity が解決しても linkage 検証で eligible にならない。

## 期待する挙動

merge 済み PR を持つ node について、`--mode check` が identity エラーではなく完了判定 (complete / pending) を返し、`--mode reconcile` で `completion_evidence` と beads status が同時に収束する。

## 影響と優先度

- 影響範囲: `tracker_binding: beads` かつ `policy: linked_pr_merged_all` のすべての node
- 深刻度: medium — 実装は進むが完了が記録できず、進捗表示と ready 判定が実体から乖離し続ける
- 緊急度: `HarnessHub-37h` は 7 epic を blocks しており、close 不能が下流の着手判断へ波及する

## スコープ

- In: C24 identity 欠落の是正、PR マーカー付与手順の確立、reconcile 実行場所の明文化
- Out: 手動 `bd close` による回避、completion policy の変更、guard hook の緩和

## 関連グラフ

- 親 issue: `issue-hub-foundation-progress-reconcile-20260721` (`HarnessHub-8bc`)
- 影響 node: `SYS-HUB-FOUNDATION-P01`〜`P13`

## 受入条件

- [x] task worktree から `--mode check` が identity エラーなく判定を返す
- [ ] merge 済み PR を持つ node の `pull_request_linkages` が空でなくなる
- [ ] reconcile 経由で beads が `closed` へ遷移した実例が 1 件記録されている

## 検証証跡

- コマンド: 上記 `--mode check` の再実行
- 証跡 path: `issues/sys-hub-foundation-progress-reconcile-20260721.md` の「close を見送った理由」節
- 2026-07-22 認証済み環境での実測 (下記「2026-07-22 live 検証」節)

## 2026-07-21 実装結果

- C24 の `branch: null` を detached HEAD の正規状態として受理し、identity 欠落とは区別した。`check` は `policy_decision: pending` と `worktree_decision.branch: null` を返し、detached worktree から durable write は行わない。
- task projection に検証節が無い場合は、repository 内に限定した `source_lineage.source_path` から content-addressed published task spec の `Verification and evidence` を検証する。path escape・世代 digest 不一致・placeholder は fail-closed のまま。
- Beads 1.1.0 の gate 一覧が `await_type` を返し `blocks` を省略する実出力に合わせ、対象 issue の `blocks` dependency から gate を照合できるようにした。gate 不在は linkage 未成立として `pending` を返す。
- 共有 PR #21 について、DONE 判定済みの `HarnessHub-37h.2` (P02) にのみ `gh:pr` gate `HarnessHub-0be` を登録した。fixture による C12 merged fact と組み合わせた実ノード check では linkage が eligible となり、残る conflict は worktree 条件 1 件だけになった。

## 2026-07-22 live 検証

`gh auth login` (device flow) で認証を永続化し、fixture ではなく live GitHub の C12 lifecycle facts に対して `--mode check` を実行した。これにより「認証済み環境での再実行」という外部条件が解消し、本 issue の修正が実データで機能することを確認できた。

```
$ python3 plugins/dev-graph/scripts/reconcile-github-lifecycle.py \
    --repo-root . --graph .dev-graph/state/graph.json \
    --graph-node-id SYS-HUB-FOUNDATION-P02 \
    --repo daishiman/HarnessHub --pr 21 --mode check
```

判定結果の要点:

| 項目 | 値 | 意味 |
|---|---|---|
| `linkage_decision.eligible` | `true` | linkage 成立 |
| `linkage_decision.gh_pr_gate_verified` | `true` | 修正した C28 gate 照合が live Beads データで機能 |
| `linkage_decision.closing_reference_verified` | `true` | PR #21 の closing reference が一致 |
| `linkage_decision.marker_verified` | `false` | PR 本文に marker 無し (gate 経路で代替) |
| `ancestor_verified` | `true` | merge commit が HEAD の祖先 |
| `worktree_decision.clean` | `true` | 作業ツリーは clean |
| `worktree_decision.synced_default` | `false` | default branch と同期していない |
| `policy_decision` | `pending` | 下記 conflict 1 件のため |
| `conflicts` | `["worktree is not clean and synchronized on the remote default branch"]` | 残る唯一の阻害要因 |

`--mode check` が identity エラーではなく完全な判定を返すこと (受入条件 1)、および 1 PR が複数 task を実装する場合に `gh:pr` gate で linkage を成立させる設計 (本 issue の scope_in) が、いずれも live で成立した。

## 残る外部条件

`pull_request_linkages` と Beads close は C02 writer を伴う durable reconcile でのみ更新する。残る条件は **worktree 条件 1 件のみ**に縮小した。

- task worktree は clean だが default branch ではない (`devgraph/issue-devgraph-completion-reconcile-blocked-20260721`)
- main worktree は `main...origin/main [behind 9]` かつ `.beads/interactions.jsonl` に未コミット変更がある。同ファイルは beads 操作のたびに更新される passive export であり、beads を使いながら clean を保つこと自体に構造的な摩擦がある

既存変更を退避・上書きしてまで reconcile することは禁止し、受入条件 2・3 は未完了のまま維持する。解消手順は「main worktree で `git pull --rebase` して `origin/main` へ同期し、`.beads/interactions.jsonl` の扱いを確定したうえで `--mode reconcile` を実行する」。この操作は利用者の未コミット変更に触れるため、明示的な承認を得てから行う。
