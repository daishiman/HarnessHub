---
graph_node_id: "issue-crud-workspace-scope-gap-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "backend"
tags: ["authorization","database","multi-tenancy"]
priority: "high"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "汎用 CRUD が Workspace の絞り込みを無視する (渡しても効かない)"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-11T16:31:20.492611Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["packages/db/repository/crud.ts","packages/db/src/types.ts"]
purpose: "型が示す契約と実際のふるまいを一致させ、Workspace の絞り込みを渡した側の期待どおりに効かせる。"
goal: "createScopedCrud が context.workspaceId を他のリポジトリと同じ規約で述語へ反映する。"
scope_in: ["scopeWhere への workspace_id 述語の追加","workspace_id 列を持たないテーブルへ workspaceId を渡したときの扱いの決定"]
scope_out: ["呼び出し側が workspaceId を渡すべきかの棚卸し","認可層 (decide.ts) の所属判定そのものの見直し"]
acceptance: ["workspaceId を指定した context では別 Workspace の行が返らない","workspaceId 未指定の呼び出しは現行どおりテナントだけで絞る","workspace_id 列を持たないテーブルへ渡したときの挙動が決まり、テストで固定される"]
architecture_refs: ["arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/crud-workspace-scope-gap-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"b248b1704595cb2b12ccd6371a25c02b7fbc8bc29427350380e2bb226ae9be62","evaluator":"2026-08-12 の 62ah 第1段 実装時に scope 欠落として検出","evidence_ref":"issues/crud-workspace-scope-gap-20260812.md"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"packages/db/repository/crud.ts","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "リポジトリ層の scope 実装と型契約の不一致であり、認可の設計課題に該当する。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/crud-workspace-scope-gap-20260812.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-pwph","linked_at":"2026-08-12T00:00:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---

# 汎用 CRUD が Workspace の絞り込みを無視する (渡しても効かない)

## 概要

`packages/db/repository/crud.ts:53-54` の `scopeWhere` は `WHERE tenant_id = ?` だけを組み立て、
`RepositoryContext.workspaceId` を**受け取っておきながら一切使わない**。
呼び出し側は Workspace を渡して絞り込んだつもりでいるが、実際には同一テナント内の
全 Workspace の行が返る。

## 背景と問題

問題は「絞り込みが無い」ことではなく、**絞り込みが有るように見えて無い**ことにある。

1. `packages/db/src/types.ts:11` の `RepositoryContext` は `workspaceId?: string` を持つ。
   この型を見た実装者は「渡せば絞られる」と読む。
2. 手書きのリポジトリは実際にそう振る舞う。`context.workspaceId` が指定されていれば
   述語を足す実装が、少なくとも 6 ファイルにある
   (`feedback-loop.ts:74` / `feedback-loop-queue.ts:57` / `build-stage.ts:141,222` /
   `hearing-intake.ts:141,328,374` / `metrics-tracking.ts:153,159` /
   `publish-smoke.ts:110`)。**この扱いが事実上の規約になっている。**
3. `createScopedCrud` だけがこの規約から外れている。`scopeWhere` は `tenantCol` しか見ない。
4. 呼び出し側は規約どおりに渡している。`apps/hub/src/lib/publish/db-ports.ts:43-49` の
   `contextOf` は `workspaceId: scope.workspaceId` を載せており、**渡す側に落ち度は無い**。

つまり「規約に従って渡した値が、1 か所だけ黙って捨てられている」状態。
渡し忘れなら型やレビューで気づけるが、渡した上で無視されるのは呼び出し側から見えない。

## 現在の挙動

`createScopedCrud` を通っているのは `packages/db/repository/composition.ts:324-325` の 2 つ。

| repo | テーブル | `workspace_id` 列 |
|---|---|---|
| `projects` | `projects` | **あり** (`schema/core/catalog.ts:10`、NOT NULL) |
| `deploymentReferences` | `deployment_references` | あり (`schema/core/catalog.ts:92`、NOT NULL) |

`projects.findById(context, id)` は、`context.workspaceId` に何を入れても、
同一テナントであれば別 Workspace の Project 行を返す。

## いまそれが露出していない理由 (誇張しないための確認)

**現時点で「所属していない人に見えている」わけではない。** 認可層が別途止めている。

`apps/hub/src/lib/authz/decide.ts:47` が
`resource.workspaceId !== null && !principal.workspaceIds.includes(resource.workspaceId)`
で `workspace_not_member` を返す。`resource-resolver.ts:29` は `projects.findById` の結果から
`workspaceId` を取り出して認可資源へ載せるので、**所属外の Workspace の Project は
最終的に拒否される**。

ただしこの防御には 2 つの前提がある。

- **判定は「所属しているか」であって「いま選んでいる Workspace か」ではない。**
  ws-A と ws-B の両方に所属する利用者が ws-A を選んでいる状態で ws-B の Project ID を
  指定すると、認可は通る。これは security-spec §3.1.2 の「到達可否は所属単位」に沿った
  設計判断であって欠陥ではないが、**リポジトリ層に絞り込みが無いことで、この設計判断が
  唯一の防壁になっている**。
- **認可層を通らない新しい読み出しが 1 つでも増えると、そこには防壁が無い。**
  サーバ側で名前を引くだけの処理 (例: 表示名の解決) は `withAuthz` を通らないことがある。

## 期待する挙動

`createScopedCrud` が他のリポジトリと同じ規約に従う。すなわち
`context.workspaceId` が指定されていて、かつ対象テーブルが `workspace_id` 列を持つときは、
`WHERE tenant_id = ? AND workspace_id = ?` を組み立てる。
指定が無いときは現行どおりテナントだけで絞る (テナント横断の管理用途を壊さない)。

`workspace_id` 列を持たないテーブルに `workspaceId` を渡した場合の扱いは決める必要がある。
黙って無視すると同じ問題が別の形で残るため、**例外にする**のが第一候補。

## 再現手順またはユースケース

1. 同一テナントに Workspace A / B を作り、それぞれに Project を 1 件ずつ入れる。
2. `createRepositoryContext({ tenantId, workspaceId: A })` を作る。
3. `repositories.projects.findById(context, B の Project ID)` を呼ぶ。
4. **B の行が返る**。期待は `null`。

## 影響と優先度

いま実害が出ているわけではないので critical ではない。
一方で「型が示す契約とふるまいが食い違う」種類の欠陥は、次に触る人が
契約のほうを信じて実装するため、時間が経つほど踏みやすくなる。**high** とする。

具体的に踏みかけた例として、`HarnessHub-62ah` (識別子ではなく人が読める名前を出す) の
第 2 段でプロジェクト名の解決を `projects.findById` に載せる案があったが、
この scope 欠落のため**今回は実装を見送っている**。この課題が閉じるまで、
Project 名の表示は着手できない。

## スコープ

`createScopedCrud` の `scopeWhere` の修正と、`workspace_id` を持たないテーブルへ
`workspaceId` を渡したときの扱いの決定まで。

個々の呼び出し側が `workspaceId` を渡すべきかどうかの棚卸しは別課題とする
(まず「渡せば効く」状態を作るのが先で、順序を逆にすると挙動が二重に変わる)。

## 関連グラフ

- `packages/db/repository/crud.ts:53-54` (`scopeWhere`)、`packages/db/src/types.ts:11`
  (`RepositoryContext.workspaceId`)。
- 規約側の実装: `packages/db/repository/feedback-loop.ts:74` ほか 6 ファイル。
- 認可側の防壁: `apps/hub/src/lib/authz/decide.ts:47`。
- 呼び出し側: `apps/hub/src/lib/publish/db-ports.ts:43-49`、
  `apps/hub/src/lib/publish/resource-resolver.ts:29`。
- ブロックしている課題: `HarnessHub-62ah` 第 2 段 (Project 名の表示)。

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 に `packages/db/repository/crud.ts`・`packages/db/src/types.ts`・
`packages/db/repository/composition.ts`・`packages/db/schema/core/catalog.ts`・
`apps/hub/src/lib/publish/db-ports.ts`・`apps/hub/src/lib/publish/resource-resolver.ts`・
`apps/hub/src/lib/authz/decide.ts` を実読。
`context.workspaceId` を述語へ足しているリポジトリを grep で 6 ファイル確認し、
`createScopedCrud` だけが外れていることを突き合わせた。
