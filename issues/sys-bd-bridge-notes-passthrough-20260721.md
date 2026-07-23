---
graph_node_id: "issue-bd-bridge-notes-passthrough-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "documentation"
tags: ["bd-bridge","choke-point","dev-graph"]
priority: "low"
start_date: null
target_date: null
iteration: null
title: "bd-bridge 経由で beads の notes/design を更新できず進捗記録の経路が塞がっている"
owners: ["daishiman"]
created_at: "2026-07-21T00:00:00Z"
updated_at: "2026-07-22T05:49:40.634240Z"
status: "closed"
depends_on: []
related_nodes: ["issue-docs-recompose-followups-20260718"]
resource_scope: ["plugins/dev-graph/scripts/bd-bridge.py","plugins/dev-graph/hooks/guard-graph-schema.py"]
purpose: "guard-graph-schema が beads mutation を bd-bridge の単一チョークポイントに限定する一方、bd-bridge が notes/design を通さないため、エージェントが課題へ進捗メモを残せない不整合を解消する"
goal: "bd-bridge 経由で notes/design を更新でき、チョークポイントを迂回せずに進捗記録が残せている"
scope_in: ["bd-bridge.py --op update への --notes/--design パススルー追加","bd-bridge.py --op create への --priority パススルー追加","追加フィールドの回帰テスト"]
scope_out: ["guard-graph-schema の緩和 (チョークポイント自体は維持する)","bd CLI 側の変更"]
acceptance: ["bd-bridge --op update --bd-issue-id <id> --notes <text> が成功する","guard hook を迂回せずに notes 更新が完了する","回帰テストが plugins/dev-graph/tests に存在する"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-bd-bridge-notes-passthrough-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-21T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"issues/sys-docs-recompose-followups-20260718.md","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "issue HarnessHub-9ao (finding 4/5) の実行中に観測した bd-bridge のフィールド欠落を追跡する issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-bd-bridge-notes-passthrough-20260721.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-8ql","linked_at":"2026-07-21T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":"2026-07-21T04:00:00Z","evidence_refs":["plugins/dev-graph/tests/test_bd_bridge_update_field_passthrough.py"],"policy":"manual","reconciled_at":"2026-07-22T00:00:00Z","source":"manual","status":"done"}
implementation_readiness: {"checked_at":"2026-07-21T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 概要

`guard-graph-schema` が beads mutation を `bd-bridge.py` の単一チョークポイントに限定しているが、その `bd-bridge.py` が `--notes` / `--design` を通さないため、beads の notes を更新する正規経路が存在しない。

## 背景と問題

エージェントが課題の進捗メモ (`notes`) を残そうとすると、直接 `bd update --notes` は guard hook に遮断され、許可された `bd-bridge.py --op update` は `--notes` を受け付けない。結果として「記録すべきだが記録手段がない」状態になる。

HarnessHub-9ao (finding 4/5) の実行時に実際に発生し、作業完了メモを課題側へ残せなかった。

## 現在の挙動

```
$ bd update 9ao --notes "..."
[guard-graph-schema] BLOCKED: Beads mutation は scripts/bd-bridge.py の単一チョークポイント経由に限定
```

`bd-bridge.py` の `main()` が `--op update` に対して受け付けるのは `--status` / `--title` / `--description` のみ (`plugins/dev-graph/scripts/bd-bridge.py`)。`--notes` / `--design` の引数定義自体が存在しない。

同種の欠落として `--op create` にも `--priority` が無く、本 issue 自身の起票 (HarnessHub-8ql) で md の `priority: low` を beads へ伝達できず bd 既定の P2 になった。フィールド欠落は notes/design 単独ではなくチョークポイント全体の被覆問題として扱う。

## 期待する挙動

`bd-bridge.py --op update --bd-issue-id <id> --notes "<text>"` が成功し、guard hook を迂回せずに notes が更新される。

## 再現手順またはユースケース

1. 任意の beads 課題に対し `bd update <id> --notes "test"` を実行する
2. guard hook が BLOCKED を返す
3. `python3 plugins/dev-graph/scripts/bd-bridge.py --op update --bd-issue-id <id> --notes "test"` を実行する
4. `unrecognized arguments: --notes` で失敗する

## 影響と優先度

- 影響範囲: system (エージェントの課題記録ワークフロー)
- 深刻度: low
- 緊急度: 低 — 進捗は commit message と issue markdown に残せるため代替はある。ただしチョークポイント設計の穴なので、迂回運用が常態化する前に塞ぐのが望ましい。

## スコープ

- In: `bd-bridge.py --op update` への `--notes` / `--design` パススルー追加、`--op create` への `--priority` パススルー追加、回帰テスト
- Out: `guard-graph-schema` の緩和 (チョークポイント自体は維持する)、bd CLI 側の変更

## 関連グラフ

- 原因/親ノード: issue-docs-recompose-followups-20260718
- 関連仕様: —
- 関連アーキテクチャ: arch-harness-hub-dev-workflow
- 解決タスク: —

## 受入条件

- [ ] `bd-bridge --op update --bd-issue-id <id> --notes <text>` が成功する
- [ ] guard hook を迂回せずに notes 更新が完了する
- [ ] 回帰テストが `plugins/dev-graph/tests` に存在する

## 検証証跡

- コマンド/テスト: `python3 -m pytest plugins/dev-graph/tests -q`
- 証跡 path: (未取得)
