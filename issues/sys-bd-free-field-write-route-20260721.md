---
graph_node_id: "issue-bd-free-field-write-route-20260721"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "dev-workflow"
tags: ["bd-bridge","choke-point","dev-graph","beads"]
priority: "low"
start_date: null
target_date: null
iteration: null
title: "dev-graph: 契約が「bd 側自由領域」とする priority/assignee/labels が guard により全経路で更新不能"
owners: ["daishiman"]
created_at: "2026-07-21T01:21:36Z"
updated_at: "2026-08-04T03:43:28Z"
status: "closed"
depends_on: []
related_nodes: ["issue-bd-bridge-notes-passthrough-20260721","issue-doc-line-limit-followup-mfh7-20260728","arch-harness-hub-dev-workflow","feat-dev-pipeline-improvement"]
resource_scope: ["plugins/dev-graph/references/execution-tracker-contract.md","plugins/dev-graph/lib/bd_bridge_contracts.py","plugins/dev-graph/scripts/bd-bridge.py","plugins/dev-graph/tests/test_bd_bridge_update_field_passthrough.py","plugins/dev-graph/tests/test_bd_free_field_write_route.py","issues/sys-bd-free-field-write-route-20260721.md","docs/features/feat-dev-pipeline-improvement/dc7-bd-free-field-write-route-spec-reflection-receipt.md","docs/features/feat-dev-pipeline-improvement/feat-dev-pipeline-improvement-changelog.md","features/feat-dev-pipeline-improvement.md","system-spec/dev-workflow.md","specs/harness-hub-system-specification.md","architecture/harness-hub-dev-workflow.md","tasks/feat-dev-pipeline-improvement/sys-dev-pipeline-improvement-p13.md"]
purpose: "priority、assignee、labels を Beads 側の突合対象外に保ちながら、更新経路だけは単一チョークポイントへ統一し、到達不能な契約を解消する"
goal: "guard、実行契約、bd-bridge が自由フィールドの扱いで一致し、直接更新を許可せずに bridge 経由で決定論的に更新できる"
scope_in: ["bd-bridge update への priority、assignee、labels の追加","priority と labels の正規化および dry-run receipt への反映","guard、契約文書、bridge の三者一致を固定する回帰テスト","仕様・設計・feature・task への実装反映と受領書"]
scope_out: ["guard の直接 bd update 遮断の緩和","Beads CLI 本体の変更","priority、assignee、labels の graph parity 管理","先行して main へ統合済みの bd-bridge 責務分割そのもの"]
acceptance: ["priority、assignee、labels を bd-bridge update から更新できる","直接 bd update は自由フィールドを含め引き続き遮断される","labels は置換型 set-labels に正規化され、空入力と操作外引数を fail-closed に拒否する","契約文書、guard 案内、UPDATE_FIELDS の三者一致を contract test が固定する","task 仕様品質ゲートと repository 品質ゲートが統合後 tree で成功する"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-bd-free-field-write-route-20260721.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"feefe87306cadc6bc7406c3a6e22796c591088c92d5c7fdfb005d58f60046e69","evaluator":"beads-design-review + codex-final-review","evidence_ref":"docs/features/feat-dev-pipeline-improvement/dc7-bd-free-field-write-route-spec-reflection-receipt.md"}
source_lineage: {"imported_at":"2026-08-02T03:24:50Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "Beads HarnessHub-dc7 の実装・検証・仕様反映を追跡する repository development tooling issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-bd-free-field-write-route-20260721.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-dc7","linked_at":"2026-08-02T03:24:50Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-02T03:24:50Z","missing_sections":[],"status":"complete"}
---

# 概要

Beads の `priority`、`assignee`、`labels` は Dev Graph parity（グラフとの完全一致）の
管理対象外だが、直接の `bd update` は guard に遮断され、従来の `bd-bridge.py` にも
対応引数が無かったため更新経路が存在しなかった。本 issue は、guard を緩めずに
bridge の受理範囲を広げ、単一チョークポイント設計と実際の操作経路を一致させる。

## 背景と問題

`execution-tracker-contract.md` は三フィールドを「Beads 側自由領域」と定義していた。
ここでの自由は「Dev Graph との parity 突合をしない」という意味だが、更新手段まで
bridge の外にあるように読めた。一方、guard は全 `bd update` を fail-closed
（判断不能なら安全側で止める）に遮断するため、三フィールドは実質的に到達不能だった。

## 採用設計

- Beads mutation の入口は `bd-bridge.py` に一本化したままにする。
- `priority`、`assignee`、`labels` を update の許可フィールドへ追加する。
- `priority` は create と同じ正規化関数を再利用する。
- `labels` は冪等（同じ操作を繰り返しても結果が変わらない）な置換操作
  `--set-labels` だけを使い、差分型の add/remove は採用しない。
- 直接 `bd update` の guard は緩和しない。

## スコープ

対象は bridge の update ルート、guard の案内、実行契約、回帰テスト、仕様反映である。
Beads CLI 本体、graph parity の対象集合、製品 API・DB・認証認可・UI・deploy unit は
変更しない。

## 関連グラフ

- Beads: `HarnessHub-dc7`
- 関連 issue: `issue-bd-bridge-notes-passthrough-20260721`
- 500 行超過の分割担当: `issue-doc-line-limit-followup-mfh7-20260728`
- architecture: `arch-harness-hub-dev-workflow`
- feature trace: `feat-dev-pipeline-improvement`

## 受入条件

- `bd-bridge.py --op update` が三フィールドを正しい `bd update` 引数へ転送する。
- priority と labels の正規化結果が実行 argv と dry-run receipt で一致する。
- 空 labels、更新フィールドなし、非 update operation への更新専用引数を拒否する。
- guard は直接更新を遮断し、案内先として bridge と `bd help update` を示す。
- 契約文書、guard、bridge の三者一致が自動テストで固定される。
- 統合後 tree で task specification と repository の品質ゲートが成功する。

## 検証証跡

最終値は仕様反映受領書へ記録する。最低限、focused pytest、Dev Graph 全 pytest、
system plan validator、system-spec gate、graph schema、文書 lint、repository CI、
`git diff --check` を再実行する。

## 500 行境界

今回新規作成する手書きファイルは 500 行以下に保つ。既存 `bd-bridge.py` の分割は
`HarnessHub-w7n7` / draft PR #630 が担当しており、本 issue へ別タスクの大規模差分を
重複取り込みしない。両変更が main へ入る順序に応じて競合解消を行う。
