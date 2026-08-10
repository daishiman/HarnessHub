---
graph_node_id: "issue-libsql-connection-recovery-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "data"
tags: ["follow-up","libsql","connection-layer","resilience","auth-tenancy"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "SQLITE_BUSY で壊れた libSQL ローカル接続を接続層で復旧する"
owners: ["daishiman"]
created_at: "2026-07-26T00:00:00Z"
updated_at: "2026-08-01T04:50:46Z"
status: "closed"
depends_on: []
related_nodes: ["feat-domain-model-db","issue-db-write-gate-sweep-20260726","issue-auth-tenancy-production-adapter-20260725"]
resource_scope: ["packages/db/connection/","packages/db/__tests__/"]
purpose: "HarnessHub-b7ng で導入した guardedWrite は書き込みを『プロセス内で』直列化するため、同一プロセス内の競合は消える。しかしローカル file backend を別プロセスが同時に触る場合 (テストの並行実行・restore drill と export の同時起動・開発中の CLI 併走) の SQLITE_BUSY は防げない。そして libSQL のローカル backend は BUSY で失敗した単発 execute() を後片付けしないため、踏んだ時点でその接続は未終了 statement を抱えて固まり、以降の書き込みが commit されない状態になる。復旧手段は接続を捨てて張り直すこと (Sqlite3Client.reconnect()) だけだが、これは driver 内部 API で drizzle 越しには届かない。よって現状『プロセス外の競合を踏んだら黙ってデータが失われる』穴が残っている。接続層 (packages/db/connection/) が接続の寿命を握っている唯一の層なので、そこで検知と張り直しを提供する必要がある"
goal: "ローカル file backend で SQLITE_BUSY を踏んだ接続が検知され、以降の書き込みが失われる前に接続が張り直されるか、少なくとも例外として観測可能になっている状態"
scope_in: ["packages/db/connection/turso.ts の adapter が、書き込みが SQLITE_BUSY で失敗したことを検知して raw client を張り直す (または adapter を fail-fast にする) 経路を持つ","張り直し後に drizzle instance が新しい raw client を指すこと (差し替えが adapter.client の同一性に依存する呼び出し側を壊さないこと) を確認する","別プロセスから同じ file を掴んで BUSY を誘発する回帰テストを追加し、復旧後の書き込みが別接続から見えることを検証する"]
scope_out: ["プロセス内の書き込み直列化 (HarnessHub-b7ng で guardedWrite として実装済み。残りの掃き出しは issue-db-write-gate-sweep-20260726)","本番 (Turso remote) の再試行方針 — remote は 1 文 = 1 HTTP 要求で接続に状態が残らないため現行の retryOnConflict で足りる","D1 経路"]
acceptance: ["別プロセスが同じ file に書き込みロックを保持した状態で adapter に書き込ませ、SQLITE_BUSY を踏んだ後の書き込みが『別接続から見える』ことを検証する回帰テストが pass する","復旧できない場合は成功を返さず例外になる (成功を返して行が無い状態にならない) ことがテストで示される","packages/db/repository/conflict.ts ヘッダの『復旧手段は接続を捨てることだけで drizzle 越しには届かない』という記述が、接続層で解決済みである旨へ更新されている","check:connection-isolation が exit 0 のままである (復旧を接続層の外へ漏らしていない)"]
architecture_refs: ["arch-harness-hub-data"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-libsql-connection-recovery-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"packages/db/repository/conflict.ts","source_plugin":null,"source_version":null}
classification_confidence: 0.85
classification_reason: "HarnessHub-b7ng で確認した『BUSY を踏んだ接続は復旧できない』という残余リスクを、接続層の責務として切り出した issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-libsql-connection-recovery-20260726.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-njkm","linked_at":"2026-07-26T06:24:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-26T00:00:00Z","missing_sections":[],"status":"incomplete"}
---

# 概要

`SQLITE_BUSY` を踏んだ libSQL のローカル接続は壊れたまま復旧できない。`guardedWrite` はプロセス内の競合しか防がないため、**プロセス外**の競合を踏むと黙ってデータが失われる。

## 背景と問題

`packages/db/repository/conflict.ts` のヘッダに記録した実測:

- libSQL のローカル backend は BUSY で失敗した**単発 `execute()`** を後片付けしない (`batch()` / `executeMultiple()` には `finally { ROLLBACK }` があるが `execute()` には無い)。
- 踏んだ接続は未終了 statement を抱えたまま固まり、以降の書き込みは自分からは見えるが他接続からは見えない。
- `ROLLBACK` では戻らない (`SQLITE_ERROR` = 有効なトランザクションが無い)。
- 復旧手段は接続を捨てて張り直すことだけ。`Client.reconnect()` 自体は公開 API だが、Drizzle が raw Client を内部に隠すため Drizzle instance からは届かない。

HarnessHub-b7ng では「踏ませない」側で解決した (`guardedWrite` によるプロセス内直列化)。これで同一プロセス内の競合は消えるが、**別プロセスが同じ file を触る場合は防げない**。

## 現在の挙動

プロセス外競合で BUSY を踏むと、その adapter は以降「成功を返すが commit しない」状態になる。呼び出し側は例外を受け取らないため、失敗に気付けない。

## 期待する挙動

接続層 (`packages/db/connection/`) が BUSY による接続破損を検知し、raw client を張り直す。張り直せない場合は成功を返さず例外にする (silent loss を作らない)。

## 再現手順またはユースケース

想定される併走:

- テストの並行実行が同じ temp file を掴む
- restore drill と export CLI の同時起動
- 開発中に CLI と dev server が同じ `file:` を触る

再現は、別プロセスから同 file に書き込みロックを保持させた状態で adapter に書き込ませる。

## 影響と優先度

- 影響: ローカル file backend のみ。本番 (Turso remote) は 1 文 = 1 HTTP 要求で接続に状態が残らないため対象外。
- 優先度: medium。本番影響が無く、プロセス内競合は既に解消済みのため。ただし失敗が silent なので、踏んだときの被害は大きい。

## スコープ

- in: `packages/db/connection/` での検知と張り直し (または fail-fast)、別プロセス競合の回帰テスト。
- out: プロセス内直列化 (実装済み)、Turso remote の再試行方針、D1 経路。

## 関連グラフ

- `feat-domain-model-db` (接続層の owner)
- `issue-db-write-gate-sweep-20260726` (同じ機序のプロセス内側)
- `issue-auth-tenancy-production-adapter-20260725` (発見元)

## 受入条件

1. プロセス外 BUSY を踏んだ後の書き込みが「別接続から見える」ことを検証する回帰テストが pass する。
2. 復旧できない場合は成功を返さず例外になることがテストで示される。
3. `conflict.ts` ヘッダの「drizzle 越しには届かない」記述が、接続層で解決済みである旨へ更新されている。
4. `check:connection-isolation` が exit 0 のまま (復旧ロジックを接続層の外へ漏らしていない)。

## 検証証跡

- 機序と実測: `packages/db/repository/conflict.ts` ヘッダ
- プロセス内側の回帰テスト: `packages/db/__tests__/write-conflict.test.ts`

## 実装結果 (2026-07-30 / `HarnessHub-njkm`)

- `packages/db/connection/recoverable-client.ts` が process-local 接続の lock conflict を検知し、read/write/transaction を `ConnectionPoisonedError` で fail-fast させる。
- `TursoAdapter.reconnect()` は raw client を factory から作り直すが、外側の Client 参照を変えないため既存 repository を再構築しない。
- request-bound の Turso remote は poison 対象外とし、従来の競合再試行を維持する。
- `packages/db/__tests__/connection-recovery.test.ts` は fake Client の状態遷移と、別プロセスが実 file DB の write lock を保持する経路の両方を検証する。
- DB schema / migration / API payload の変更はない。設計影響は qa-101 として `database.web` へ正規反映し、受領書は `docs/features/feat-domain-model-db/libsql-connection-recovery-spec-reflection-receipt.md` に記録する。
