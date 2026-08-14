---
graph_node_id: "issue-doc-internal-link-integrity-backlog-20260814"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["lint","documentation","pre-push","technical-debt"]
priority: "medium"
start_date: "2026-08-14"
target_date: null
iteration: null
title: "doc-internal-link-integrity の既存違反 354 件を解消し pre-push ゲートを緑に戻す"
owners: ["daishiman"]
created_at: "2026-08-14T00:07:17.875341Z"
updated_at: "2026-08-14T00:10:10.555691Z"
status: "draft"
depends_on: []
related_nodes: ["feat-hub-foundation"]
resource_scope: ["issues/doc-internal-link-integrity-backlog-20260814.md"]
purpose: "pre-push ゲートが常時赤で、新しい違反を混入させても気づけない状態を解消する。"
goal: "lint-doc-internal-link-integrity が違反 0 件で PASS し、pre-push を迂回せずに push できる状態にする。"
scope_in: ["repo root 相対でない参照表記の是正 (160 件)","実在しない参照の削除・付け替え (194 件)","再発防止の許容リスト方針の決定"]
scope_out: ["リンタ自体の判定規則の変更","文書の内容そのものの改稿"]
acceptance: ["lint-doc-internal-link-integrity が違反 0 件で PASS する","PUSH_SKIP_CI を使わずに pre-push が通る","是正が表記の付け替えか参照の削除かを違反ごとに区別して記録している"]
architecture_refs: ["arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/doc-internal-link-integrity-backlog-20260814.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"8947d6c299fafdb2d95892606b940258758c1ff3d84916453ed69d6ad192e2c1","evaluator":"PR #724 の pre-push で FAIL を観測し、git stash による baseline 比較で既存不良と確認","evidence_ref":"scripts/lint-doc-internal-link-integrity.py"}
source_lineage: {"imported_at":"2026-08-14T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.97
classification_reason: "品質ゲートが恒常的に赤のまま放置されている、文書側の技術的負債。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/doc-internal-link-integrity-backlog-20260814.md","confidence":0.97}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-tipx","linked_at":"2026-08-14T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":"manual","status":"open"}
implementation_readiness: {"checked_at":"2026-08-14T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`lint-doc-internal-link-integrity` が違反 354 件で恒常的に FAIL しており、pre-push ゲートが
常に赤い。新しい違反を混ぜても既存の赤に埋もれて気づけないため、ゲートとして機能していない。

## 背景と問題

PR #724 (2026-08-14) の push 時に pre-push が FAIL した。内訳を調べたところ、その PR に
由来する違反は 2 件だけで (修正済み)、残りは以前から積み上がったものだった。

```
FAIL: doc-internal-link-integrity (検査 611 文書 / 6106 参照, 違反 354 件, 許容 0 件)
```

`git stash` で自分の変更を外して同じ検査を流しても同一の FAIL が出ることを確認しており、
特定の変更に帰属しないリポジトリ全体の状態である。

結果として、push のたびに `PUSH_SKIP_CI=1` での迂回が常態化している。これはゲートを
無効化しているのと同じで、本来検出したい「新しく壊れた参照」を見逃す。

## 現在の挙動

1. `git push` すると pre-push が 142 検査を回す。
2. `lint-doc-internal-link-integrity` だけが FAIL する。
3. 迂回するしかないため `PUSH_SKIP_CI=1 git push` を使う。
4. その push に含まれる新しい違反も同時に見逃される。

## 期待する挙動

違反 0 件で PASS し、`PUSH_SKIP_CI` を使わずに push できる。以降は違反が出たら
それが新規混入であると判断できる。

## 違反の内訳 (2026-08-14 時点)

| 分類 | 件数 | 是正の方向 |
| --- | --- | --- |
| 参照先が別階層に実在する (repo root からのパス表記になっていない) | 160 | 表記の付け替え |
| 参照先が実在しない | 194 | 削除または現行 path への付け替え |

前者の典型は、実体が `apps/hub/tests/auth-tenancy/authjs-handler.test.ts` にあるものを
`apps` と `hub` を省いた形で書いている参照である。リンタは repo root 相対でしか
解決しないため、パッケージ内の相対表記がすべて dangling として数えられている。

違反が集中している場所は `issues/` (51)、`references/` (48)、
`docs/features/feat-dev-pipeline-improvement` (33)、
`docs/features/feat-post-signin-scope-routing` (30) など。

## 影響と優先度

- 影響範囲: push する全開発者 (と、参照を辿る読み手)
- 深刻度: medium (機能そのものは壊れないが、品質ゲートが 1 本死んでいる)
- 緊急度: 迂回が常態化しているため、放置するほど新規違反が混ざり分離が難しくなる

## スコープ

- In: 表記の付け替え (160)、実在しない参照の処遇決定と是正 (194)、再発防止の方針
- Out: リンタ自体の判定規則の変更、文書内容そのものの改稿

## 関連グラフ

- 関連ノード: `feat-hub-foundation`
- 検査 script: `scripts/lint-doc-internal-link-integrity.py`

## 受入条件

- [ ] `lint-doc-internal-link-integrity` が違反 0 件で PASS する。
- [ ] `PUSH_SKIP_CI` を使わずに pre-push が通る。
- [ ] 是正が「表記の付け替え」か「参照の削除」かを違反ごとに区別して記録している。

## 検証証跡

- コマンド/テスト: `LC_ALL=C python3 scripts/lint-doc-internal-link-integrity.py`
- 証跡 path: `scripts/lint-doc-internal-link-integrity.py`
