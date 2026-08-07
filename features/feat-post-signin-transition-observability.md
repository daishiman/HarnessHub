---
graph_node_id: "feat-post-signin-transition-observability"
artifact_kind: "feature"
artifact_subtypes: []
project_id: "harness-hub"
domain: "auth"
tags: ["post-signin","landing","observability","auth","web-only"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "サインイン後の遷移経路と縮退の記録"
owners: ["daishiman"]
created_at: "2026-08-07T11:12:00Z"
updated_at: "2026-08-07T11:12:00Z"
status: "draft"
depends_on: ["feat-runtime-env-resolution-discipline"]
related_nodes: ["spec-post-signin-landing-observability","arch-harness-hub-security","arch-harness-hub-frontend"]
resource_scope: ["apps/hub/src/lib/observability","apps/hub/src/middleware.ts","apps/hub/src/lib/authz"]
purpose: "認証に失敗すればサインイン画面へ戻るので気付ける。しかし『認証は成功したが意図しない場所へ着地した』は成功として通過し、痕跡が残らない。この静かな異常を記録の対象にする。"
goal: "縮退した事実と解決できなかった名前が 6 種を互いに区別できる形で記録され、着地先が既定値へ後退した事象を認証失敗と区別して事後に判別できる状態にする。"
scope_in: ["縮退の記録点の統一 (どこで縮退しても同じ形で残る)","縮退 6 種 (テナント未解決・テナント非 active・OIDC 接続未登録・環境値未解決 (名前)・cookie 不在・署名検証失敗) の相互区別","認証成功のまま着地先が既定値へ後退した事象の記録 (V2)","どの経路・どの environment から環境値を解決したかの記録","縮退の観測可能性そのものを検査する仕組み"]
scope_out: ["値の記録 (token・cookie 値・claim 本文・個人データは記録しない)","authorize() の判定順・role 判定の変更","着地画面の内容そのもの (feat-post-signin-landing-surface の担当)"]
acceptance: ["縮退時に、縮退した事実と解決できなかった名前が記録され、値は記録されない","縮退の記録が、テナント未解決・テナント非 active・OIDC 接続未登録・環境値未解決 (名前)・cookie 不在・署名検証失敗の 6 種を互いに区別できる","認証は成功したが着地先が既定値へ後退した事象が、認証失敗とは区別して記録される","縮退の記録に、どの経路・どの environment から環境値を解決したかが含まれる","scope 未解決時に生の 403 でなく回復手段が提示される","認証基盤が使えない状態が利用者の操作ミスに見える文言で表示されない","権限不足 (403) で再サインインへ誘導せずループを作らない","既定着地の値がテストで複製されず実装定数を import している"]
architecture_refs: ["arch-harness-hub-security","arch-harness-hub-frontend"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "features/feat-post-signin-transition-observability.md"
template_id: "feature"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-07T11:12:00Z","origin_kind":"system-spec-harness","source_digest":"e1ecf64f6bd0dfc66926fc252aae33dd70303563a0bfda48954e3f58f64a9146","source_path":"system-spec/spec-state.json","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "確定仕様追補 spec-post-signin-landing-observability (qa-170〜qa-199) を macro 分解した feature"
classification_candidates: [{"artifact_kind":"feature","candidate_path":"features/feat-post-signin-transition-observability.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-07T11:12:00Z","missing_sections":[],"status":"incomplete"}
---

# サインイン後の遷移経路と縮退の記録

## 0. なぜこの feature があるのか

本件で最も高くついたのは、**成功として通過する異常**だった。

認証は成功していた。Auth.js は指示された戻り先 `/` へ正しく着地させていた。壊れていたのは「どこへ着地させるか」の指示のほうで、その指示が既定値へ後退した事実はどこにも残らなかった。認証失敗なら signin へ戻るので気付ける。成功したまま意図しない場所へ着地するのは、気付けない。

本 feature は、この差を記録の上で埋める。

## 1. 目的

認証に失敗すればサインイン画面へ戻るので気付ける。しかし『認証は成功したが意図しない場所へ着地した』は成功として通過し、痕跡が残らない。この静かな異常を記録の対象にする。

## 2. ゴール

縮退した事実と解決できなかった名前が 6 種を互いに区別できる形で記録され、着地先が既定値へ後退した事象を認証失敗と区別して事後に判別できる状態にする。

## 3. 含むもの

- 縮退の記録点の統一 (どこで縮退しても同じ形で残る)
- 縮退 6 種 (テナント未解決・テナント非 active・OIDC 接続未登録・環境値未解決 (名前)・cookie 不在・署名検証失敗) の相互区別
- 認証成功のまま着地先が既定値へ後退した事象の記録 (V2)
- どの経路・どの environment から環境値を解決したかの記録
- 縮退の観測可能性そのものを検査する仕組み

## 4. 含まないもの

- 値の記録 (token・cookie 値・claim 本文・個人データは記録しない)
- authorize() の判定順・role 判定の変更
- 着地画面の内容そのもの (feat-post-signin-landing-surface の担当)

## 5. 受入基準

- 縮退時に、縮退した事実と解決できなかった名前が記録され、値は記録されない
- 縮退の記録が、テナント未解決・テナント非 active・OIDC 接続未登録・環境値未解決 (名前)・cookie 不在・署名検証失敗の 6 種を互いに区別できる
- 認証は成功したが着地先が既定値へ後退した事象が、認証失敗とは区別して記録される
- 縮退の記録に、どの経路・どの environment から環境値を解決したかが含まれる
- scope 未解決時に生の 403 でなく回復手段が提示される
- 認証基盤が使えない状態が利用者の操作ミスに見える文言で表示されない
- 権限不足 (403) で再サインインへ誘導せずループを作らない
- 既定着地の値がテストで複製されず実装定数を import している

## 6. 前提となる feature

- `feat-runtime-env-resolution-discipline`

## 7. 参照するアーキテクチャ

- `arch-harness-hub-security`
- `arch-harness-hub-frontend`

## 8. 補足

> **6 種を互いに区別できること**が要件である。テナント未解決とテナント非 active、環境値未解決と cookie 不在が同じ「認証できない」に潰れると、記録があっても切り分けに使えない。

> 記録するのは**名前と分類**であって値ではない。解決できなかった環境値の名前は残してよいが、その値は残さない (非記録契約)。

## 9. 出所

確定仕様追補 [`spec-post-signin-landing-observability`](../specs/harness-hub-post-signin-landing-observability-addendum.md) を macro 分解したもの。
正本は `system-spec/spec-state.json` (qa-170〜qa-199, digest `e1ecf64f6bd0dfc6…`)。
本 feature は仕様本文を複製せず、`architecture_refs` と source lineage で参照する。
