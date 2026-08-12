---
graph_node_id: "issue-session-claims-stateless-ceiling-removal-20260812"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "backend"
tags: ["authentication","scalability"]
priority: "low"
start_date: "2026-08-12"
target_date: null
iteration: null
title: "所属数によらずサインインできるよう session claims の方式を変更する"
owners: ["daishiman"]
created_at: "2026-08-12T00:00:00Z"
updated_at: "2026-08-12T00:00:00Z"
status: "active"
depends_on: []
related_nodes: []
resource_scope: ["apps/hub/src/lib/auth/session.ts","apps/hub/src/lib/auth/jwt.ts","apps/hub/src/lib/auth/config.ts"]
purpose: "HarnessHub-alyy が記録に留めた上限 95 件を、方式変更によって実際に撤廃する。"
goal: "所属数がいくつでもサインインでき、workspace_ids を削らずに所属どおりの場所へ到達できる状態にする。"
scope_in: ["方式 A/B/C/D の選定","選定した方式の実装と移行","所属 100 件以上での回帰テスト"]
scope_out: ["workspace_ids をサイズを理由に削る実装 (到達可否が黙って減るため不正解)","上限の記録そのもの (HarnessHub-alyy で完了済み)"]
acceptance: ["所属 100 件以上の利用者がサインインでき、cookie が保存される","所属どおりの Workspace に到達でき、権限が黙って減らない","workspace_ids を削らずに達成されている"]
architecture_refs: ["arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/session-claims-stateless-ceiling-removal-20260812.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"0692f915228a40bcc6508cd3a05a2ea16217b9526392c2868bbccfa495c72026","evaluator":"2026-08-12 の alyy 実測 (二分探索で上限 95 件、Set-Cookie 4085 バイト)","evidence_ref":"apps/hub/tests/auth-tenancy/session-cookie-ceiling.test.ts"}
source_lineage: {"imported_at":"2026-08-12T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"apps/hub/src/lib/auth/session.ts","source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-alyy は上限の記録が目的だが acceptance に方式変更後の到達目標を抱えており、記録と実装が 1 課題に同居していた。実装側を分離した後続課題である。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/session-claims-stateless-ceiling-removal-20260812.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-12T00:00:00Z","missing_sections":[],"status":"complete"}
---


# 所属数によらずサインインできるよう session claims の方式を変更する

## 概要

session は署名付き JWT を cookie に載せる方式で、claims に所属 Workspace の識別子一覧 (`workspace_ids`) を焼き込んでいる。**所属 95 件で cookie が 4096 バイトの上限に達し、96 件からはブラウザがエラーを返さずに cookie を捨てる。** サインインしてもログイン画面へ戻され続け、画面にもログにも理由が出ない。

上限が実在することの記録は `HarnessHub-alyy` で完了した。本課題は**その上限を実際に撤廃する**ことを引き受ける。

## 背景と問題

`HarnessHub-alyy` は「上限を記録し、`workspace_ids` を安易に削る誤りを防ぐ」ことを目的に起票されたが、受入条件には「所属 100 件以上でサインインできる」という**方式変更後の到達目標**が入っていた。記録と実装が 1 課題に同居していたため、記録が完了しても課題を閉じられない状態が続いていた。実装側を本課題へ分離する。

### 確定している実測値

`apps/hub/tests/auth-tenancy/session-cookie-ceiling.test.ts` が二分探索で測り、T-ALYY-01/02/03 として固定している。

| 項目 | 値 |
| --- | --- |
| 上限となる所属数 | 95 件 |
| そのときの `Set-Cookie` | 4085 バイト |
| 超過し始める所属数 | 96 件 |

T-ALYY-02 は `workspace_names` を捨てても上限が動かないこと、T-ALYY-03 は超過が例外を投げず黙って捨てられることを固定している。

### `workspace_ids` を削ってはいけない理由

`workspace_names` は表示のためだけの情報なので、落としても到達できる範囲は変わらない。`workspace_ids` は**到達可否そのもの**で、削った瞬間「入れるはずの場所に入れない」状態になる。しかも利用者にはエラーが出ず、黙って権限が減ったように見える。`apps/hub/src/lib/auth/session.ts` の `buildSessionClaims` にある非対称性 (名前は落とすが識別子は落とさない) は正しく、変更してはならない。

## 現在の挙動

所属 96 件以上の利用者はサインインできない。症状は「サインインしても何も起きずログイン画面に戻り続ける」で、原因が一切表示されない。開発用アカウント (所属 1〜2 件) では絶対に再現しない。

## 期待する挙動

所属数がいくつでもサインインでき、`workspace_ids` を削らずに所属どおりの場所へ到達できる。

### 方式の候補

| 方式 | 内容 | 代償 |
| --- | --- | --- |
| A | 所属一覧を claims から外し、要求ごとに引く | 「認可判定で DB を引かない」前提を捨てる。読取が session 検証と同数になる |
| B | 所属の版 (件数 + hash) だけを claims に置き、実体はサーバ側に持つ | 無状態性を手放す。session store と失効・GC の運用が増える |
| C | cookie を分割する | 上限が 4096×N になるだけで、壊れ方 (黙って捨てられる) は変わらない |
| D | 所属数の上限を製品として決める | 実装は最小。上限に当たった利用者への運用上の答えが要る |

`HarnessHub-alyy` の整理では、実運用で 90 件超が起こり得るなら **B が現在の設計思想に最も近い**とされている。ただし選定には想定利用規模の実測が要り、`apps/hub/src/lib` に telemetry 経路が無いため 2026-08-12 時点では実行できない。

## 再現手順またはユースケース

所属 Workspace を 100 件持つ利用者でサインインする。`Set-Cookie` は返るが保存されず、次の要求で未サインインとしてサインイン画面へ戻る。

## 影響と優先度

**low。** 現在の想定規模で 96 所属が現実的かを判断する材料が無い。踏んだときの症状が「エラー無しで締め出される」であり、所属の多い利用者だけが踏む。想定規模が判明した時点で優先度を見直すこと。

## スコープ

- **含む**: 方式 A/B/C/D の選定、選定した方式の実装と移行、所属 100 件以上での回帰テスト。
- **含まない**: `workspace_ids` をサイズを理由に削る実装。上限の記録そのもの (`HarnessHub-alyy` で完了済み)。

## 関連グラフ

- `HarnessHub-alyy` (上限の記録。本課題の前提)
- `apps/hub/src/lib/auth/session.ts` (`CLAIMS_JSON_BUDGET_BYTES` / `buildSessionClaims`)
- `apps/hub/tests/auth-tenancy/session-cookie-ceiling.test.ts` (T-ALYY-01〜03)

## 受入条件

上記 acceptance のとおり。

## 検証証跡

2026-08-12 に二分探索で上限 95 件を確定し、test として固定した。定数を書き写すのではなく実際の `Set-Cookie` の長さを測っているため、cookie 名・属性・署名方式が変わっても測り直しになる。
