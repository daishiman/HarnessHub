---
graph_node_id: "issue-db-write-gate-sweep-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "data"
tags: ["follow-up","data-loss","libsql","concurrency","auth-tenancy"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "packages/db の書き込みのうち guardedWrite を通っていない経路が残っており監査 append と衝突しうる"
owners: ["daishiman"]
created_at: "2026-07-26T00:00:00Z"
updated_at: "2026-07-26T00:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-domain-model-db","feat-auth-tenancy","issue-auth-tenancy-production-adapter-20260725"]
resource_scope: ["packages/db/repository/","packages/db/__tests__/","scripts/ci/"]
purpose: "HarnessHub-b7ng で、libSQL のローカル backend は SQLITE_BUSY で失敗した文を後片付けしないため、負けた接続が『書き込みが自分からは見えるが commit されない』状態で壊れることを実測した (packages/db/repository/conflict.ts のヘッダに機序を記録)。対策として書き込みをプロセス内で直列化する guardedWrite を導入し、監査 append、device flow、users.insert、user-workspaces.add/remove はゲート内へ移した。監査 append はほぼ全ての状態変更に付随するため、guardedWrite を通っていない残りの書き込み (tenants / users の update / idp-connections / workspaces / packages / releases など) は同じ競合を踏みうる。失敗が例外ではなく『成功したのに行が無い』形で出るため、残りを掃き出し、新しい書き込みが素通りしないことを CI で機械検査する必要がある"
goal: "packages/db の全 repository の書き込みが guardedWrite を経由し、新規の write 実装がゲートを通さずに追加されたら CI が落ちる状態"
scope_in: ["packages/db/repository/ 配下の全 repository について insert/update/delete を列挙し、guardedWrite を通っていないものをゲート内へ移す","書き込み関数がゲートを通っているかを静的検査する CI スクリプトを追加する (repository/audit.ts と device-flow.ts が既に満たす形を基準にする)","packages/db/__tests__/write-conflict.test.ts と同じ形 (別接続の reader から commit 済み行だけを数える) の回帰テストを、掃き出した経路のうち代表 2-3 本へ広げる"]
scope_out: ["接続層の復旧 (壊れた接続の reconnect) — issue-libsql-connection-recovery-20260726 が所有する","guardedWrite そのものの設計変更 (WeakMap による adapter 単位の待ち行列という方式は HarnessHub-b7ng で確定済み)","D1 経路の並行性 (D1 には interactive transaction が無く BEGIN IMMEDIATE の競合が起きない)"]
acceptance: ["packages/db/repository/ 配下の全 write が guardedWrite 経由であることが、追加した CI スクリプトで exit 0 として示される","その CI スクリプトが、任意の write から guardedWrite を外した状態で実際に非ゼロ終了することを fixture または一時改変で確認済みである","別接続 reader から数える回帰テストが、掃き出した代表経路について pass する","packages/db/repository/conflict.ts のヘッダから『掃き出しは別 issue で行う』旨の記述が消え、現状 (全経路がゲート内) と一致している"]
architecture_refs: ["arch-harness-hub-data"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-db-write-gate-sweep-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"packages/db/repository/conflict.ts","source_plugin":null,"source_version":null}
classification_confidence: 0.9
classification_reason: "HarnessHub-b7ng の実装中に実測した silent data loss の残余リスクを、掃き出し + CI 機械検査として切り出した issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-db-write-gate-sweep-20260726.md","confidence":0.9}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-mb7c","linked_at":"2026-07-26T06:24:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-26T00:00:00Z","missing_sections":[],"status":"incomplete"}
---

# 概要

`packages/db` の書き込みのうち、`guardedWrite` (プロセス内直列化ゲート) を通っているのは監査 append、device flow、`users.insert`、`user-workspaces.add/remove` である。残りの write は監査トランザクションと書き込みロックを奪い合い、**成功を返したのに行が無い**という形で失われうる。

## 背景と問題

HarnessHub-b7ng で実測した機序 (`packages/db/repository/conflict.ts` のヘッダが正本):

- 監査 append は hash chain (`prev_hash`) を繋ぐため read-modify-write を `BEGIN IMMEDIATE` で直列化する (ADR §7)。
- libSQL のローカル backend はこのトランザクションを**別接続**で開く (`Sqlite3Client.transaction` が保持していた接続をトランザクションへ渡し、以降の素の文には新しい接続を開く)。
- したがって同一プロセスの素の `INSERT` / `UPDATE` と本当に競合し `SQLITE_BUSY` が返る。
- **`SQLITE_BUSY` で失敗した単発 `execute()` は後片付けされない**。`batch()` / `executeMultiple()` には `finally { if (db.inTransaction) ROLLBACK }` があるが `execute()` には無い。
- 結果その接続は未終了 statement を抱えたまま固まり、以降の書き込みは自分からは見えるが他接続からは見えない (= commit されない)。接続が差し替わると丸ごと消える。`ROLLBACK` では戻らない。

**監査 append はほぼ全ての状態変更に付随する。** つまり「監査を書く経路」と「状態を変える経路」が並走する箇所すべてがこの競合の候補である。

## 現在の挙動

| 経路 | ゲート |
|---|---|
| `repository/audit.ts` の `append` | 通っている (トランザクション全体がゲート内) |
| `repository/device-flow.ts` の 6 write | 通っている |
| `repository/users.ts` の `insert` | 通っている |
| `repository/workspaces.ts` の `userWorkspaces.add/remove` | 通っている |
| `tenants` / `users.update` / `idp-connections` / `workspaces` / `packages` / `releases` 等の残る write | **通っていない** |

未通過の write が監査 append と同時に走ると、`SQLITE_BUSY` を踏んだ側の接続が壊れる。失敗が例外にならないため、テストでも運用でも検出できない。

## 期待する挙動

`packages/db/repository/` 配下の全 write が `guardedWrite` を経由する。加えて、ゲートを通さない write が新規追加されたら CI が落ちる。

## 再現手順またはユースケース

`packages/db/__tests__/write-conflict.test.ts` と同じ形で、対象 repository の write N 本と `audit.append` N 本を `Promise.all` で同時に走らせ、**別接続の reader** から commit 済み行を数える。同一接続から数えると commit されていない行まで見えるため破綻を検出できない (これがテストの成立条件)。

## 影響と優先度

- 影響: 監査と並走する任意の状態変更が silent に失われる。監査は全機能に付随するので影響範囲は `packages/db` の consumer 全体。
- 検出困難性: 例外ではなく「成功したのに行が無い」形で出る。
- 優先度: high。ただし本番 (Turso remote) は 1 文 = 1 HTTP 要求で接続に状態が残らないため、この破綻はローカル file backend (テスト・restore drill・開発) に限られる。

## スコープ

- in: `packages/db/repository/` の掃き出し、CI 静的検査の追加、代表経路への回帰テスト追加。
- out: 壊れた接続の復旧 (別 issue)、`guardedWrite` の設計変更、D1 経路。

## 関連グラフ

- `feat-domain-model-db` (repository 層の owner)
- `feat-auth-tenancy` / `issue-auth-tenancy-production-adapter-20260725` (発見元)

## 受入条件

1. 全 write が `guardedWrite` 経由であることを CI スクリプトが exit 0 で示す。
2. その CI スクリプトが、write からゲートを外した状態で実際に非ゼロ終了する (ゲートが発火することの確認)。
3. 別接続 reader で数える回帰テストが代表経路について pass する。
4. `conflict.ts` のヘッダから「掃き出しは別 issue で行う」旨が消え、現状と一致する。

## 検証証跡

- 機序と実測: `packages/db/repository/conflict.ts` ヘッダ
- 既存の回帰テスト: `packages/db/__tests__/write-conflict.test.ts`
