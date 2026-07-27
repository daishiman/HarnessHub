---
graph_node_id: "issue-refresh-race-observability-20260726"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "security"
tags: ["follow-up","device-flow","audit","observability","auth-tenancy"]
priority: "medium"
start_date: null
target_date: null
iteration: null
title: "refresh rotation の CAS 敗北が監査に残らず Workers 本番経路の並行窓で窃取が観測できない"
owners: ["daishiman"]
created_at: "2026-07-26T00:00:00Z"
updated_at: "2026-07-26T00:00:00Z"
status: "draft"
depends_on: []
related_nodes: ["feat-auth-tenancy","issue-auth-tenancy-production-adapter-20260725"]
resource_scope: ["apps/hub/src/lib/auth/device-flow/service.ts","apps/hub/tests/auth-tenancy/","docs/backend-spec.md","docs/security-spec.md","docs/features/feat-auth-tenancy/runbook.md"]
purpose: "refresh() には同じ refresh token が 2 回提示されたときに落ちる分岐が 2 つある。(1) 失効済みを提示した再利用検知は family 全失効 + token.reuse_detected を残す。(2) 読んだ時点は生きていたが revokeIfActive の CAS に負けた側は invalid_grant を返すだけで監査に何も残らない。どちらに落ちるかは interleaving で決まり、負けた側の読みが勝者の CAS より後なら (1)、先なら (2)。単一プロセス (ローカル file backend + guardedWrite) の実測では (1) に落ちるが、Workers は isolate が複数でプロセス内の待ち行列を共有しないため本番では両者が生きた枝を読んで (2) に落ちる。つまり本番の主経路が監査に痕跡を残さない側である。HarnessHub-b7ng は escalate しない判断を採った (掃討が勝者の create と競走して決定論にならない。実測の監査行 revoked_family_size=1 / revoked_count=0 が掃討時点で勝者の枝が無いことの証拠。加えて CLI の並行 refresh ごとに利用者がログアウトする可用性の代償がある)。検知自体は負けた枝の再提示で (1) に落ちるので失われないが、client が invalid_grant で古い token を捨てて再提示しない場合その窓の窃取は観測されない。監査 action の語彙の正本は docs/backend-spec.md にあり b7ng の resource_scope 外だったため分離した"
goal: "rotation CAS 敗北が独立した監査 action として残り、運用側が token.reuse_detected と混同せずに並行窓の発生と窃取の兆候を切り分けられる状態"
scope_in: ["監査 action token.refresh_race を docs/backend-spec.md の action 列挙と docs/security-spec.md の監査 event 表へ追記する","apps/hub/src/lib/auth/device-flow/service.ts の rotation CAS 敗北分岐から同 action を記録する (metadata に family_id を含める)","docs/features/feat-auth-tenancy/runbook.md §2.5 へ token.refresh_race の切り分け手順を追加する","CAS 敗北を強制した統合テストで監査に 1 行残ることを検証する"]
scope_out: ["family 単位の墓標による決定論的な escalate (schema 追加を伴う別設計。必要になった時点で別 issue)","client 側の refresh single-flight 化 (feat-publisher-plugin の責務)","既存 token.reuse_detected の意味変更 (security-spec §2.2 の契約なので触らない)"]
acceptance: ["docs/backend-spec.md の監査 action 列挙と docs/security-spec.md の監査 event 表に token.refresh_race が追記されている","service.ts の rotation CAS 敗北分岐が token.refresh_race を記録し、metadata に family_id を含む","runbook.md §2.5 に token.refresh_race の切り分け手順があり token.reuse_detected と混同しない旨が書かれている","CAS 敗北を強制した統合テストで監査に当該 action が 1 行残ることを検証している","lint-doc-line-limit.py が exit 0 のままである"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-backend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-refresh-race-observability-20260726.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-07-26T00:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"apps/hub/src/lib/auth/device-flow/service.ts","source_plugin":null,"source_version":null}
classification_confidence: 0.85
classification_reason: "HarnessHub-b7ng で確定した rotation CAS 敗北の方針に付随する観測性の欠落を、action 語彙の owner が docs 側であることから分離した issue"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-refresh-race-observability-20260726.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-v22l","linked_at":"2026-07-26T06:24:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-07-26T00:00:00Z","missing_sections":[],"status":"incomplete"}
---

# 概要

refresh rotation の CAS に負けた要求は `invalid_grant` を返すだけで**監査に何も残らない**。
Workers ではこの分岐が本番経路になるため、並行窓で起きた窃取が観測されないまま通り抜けうる。

## 背景と問題

`apps/hub/src/lib/auth/device-flow/service.ts` の `refresh()` には、同じ refresh token が
2 回提示されたときに落ちる分岐が 2 つある。

| 分岐 | 条件 | 現在の扱い |
|---|---|---|
| 再利用検知 | `record.revokedAtSeconds !== null` (失効済みを提示) | family 全失効 + `token.reuse_detected` |
| rotation CAS 敗北 | 読んだ時点は生きていたが `revokeIfActive` に負けた | `invalid_grant` のみ (監査なし) |

どちらに落ちるかは interleaving で決まる。負けた側の**読み**が勝者の CAS より後なら前者、
先なら後者。単一プロセス (ローカル file backend + `guardedWrite`) の実測では前者に落ちるが、
**Workers は isolate が複数でプロセス内の待ち行列を共有しない**ため、本番では両者が生きた枝を
読んで後者に落ちる。つまり本番の主経路が「監査に何も残らない」側である。

HarnessHub-b7ng では escalate しない判断を採った。理由は決定論にならないこと (掃討が勝者の
`create` と競走する。実測の監査行 `revoked_family_size: 1 / revoked_count: 0` が、掃討時点で
勝者の枝がまだ無い = 後から生まれた枝を取り逃すことの証拠) と、CLI の並行 refresh ごとに
利用者がログアウトする可用性の代償。判断の全文は同ファイルの当該分岐に記録した。

検知自体は失われない (負けた枝を次に提示すれば再利用検知に落ちる) が、client が
`invalid_grant` を受けて古い token を捨て再提示しない場合、その窓の窃取は観測されない。

## 現在の挙動

CAS 敗北は監査に痕跡を残さず、運用側から並行窓の発生頻度も窃取の兆候も見えない。

## 期待する挙動

CAS 敗北が独立した監査 action として残り、`token.reuse_detected` と混同されずに切り分けられる。

## 再現手順またはユースケース

`refresh()` の読みと `revokeIfActive` の間に遅延を挟み、2 本の要求が両方生きた枝を読む状態を作る。

## 影響と優先度

- 影響: 観測性。窃取そのものを許すわけではないが、並行窓での窃取が記録に残らない。
- 優先度: medium。Workers で主経路になるため放置は避けたい。

## スコープ

- in: 監査 action `token.refresh_race` の追加 (backend-spec / security-spec の action 列挙が正本)、
  `service.ts` CAS 敗北分岐からの記録、runbook §2.5 の切り分け手順、CAS 敗北を強制する統合テスト。
- out: family 単位の墓標による決定論的 escalate (schema 追加を伴う別設計)、
  client 側の single-flight 化 (feat-publisher-plugin の責務)。

## 関連グラフ

- `feat-auth-tenancy` (device flow の owner)
- `issue-auth-tenancy-production-adapter-20260725` (= HarnessHub-b7ng、判断の出所)

## 受入条件

1. `docs/backend-spec.md` の監査 action 列挙と `docs/security-spec.md` の監査 event 表に
   `token.refresh_race` が追記されている。
2. `service.ts` の rotation CAS 敗北分岐が同 action を記録し、metadata に `family_id` を含む。
3. `runbook.md` §2.5 に `token.refresh_race` の切り分け手順があり、`token.reuse_detected` と
   混同しない旨が書かれている。
4. CAS 敗北を強制した統合テストで、監査に当該 action が 1 行残ることを検証している。
5. `lint-doc-line-limit.py` が exit 0 のままである。

## 検証証跡

- 判断と実測の根拠: `apps/hub/src/lib/auth/device-flow/service.ts` の rotation CAS 敗北分岐
- interleaving 依存の測り方: `apps/hub/tests/auth-tenancy/db-ports-integration.test.ts`
