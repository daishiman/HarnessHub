---
graph_node_id: "issue-production-oidc-smoke-landing-contract-20260813"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "auth-ci"
tags: ["oidc","cloudflare","ci-cd","smoke-test"]
priority: "high"
start_date: "2026-08-13"
target_date: null
iteration: null
title: "本番OIDCスモークの着地契約ドリフトを解消する"
owners: ["daishiman"]
created_at: "2026-08-13T10:20:00Z"
updated_at: "2026-08-13T11:42:29Z"
status: "closed"
depends_on: []
related_nodes: ["issue-elegant-home-review-20260813","spec-post-signin-landing-observability"]
resource_scope: ["apps/hub/scripts/smoke-production-oidc.mjs","apps/hub/tests/auth-tenancy/production-oidc-smoke.test.ts","apps/hub/tests/hub-foundation/production-coverage-smoke-script.test.ts"]
purpose: "既定着地を /dashboard へ変更した後も /sheets を直書きしていた本番OIDCスモークを、安全性という本来の契約へ整合し、正常なWorkerの誤ロールバックを止める。"
goal: "本番OIDCスモークが安全な同一origin相対パスとopen redirect防止を検証し、mainの自動デプロイを最後まで成功させる。"
scope_in: ["本番OIDCスモークの着地先検証","スモークの回帰テストと配線テスト","PR、main統合、本番デプロイの再検証"]
scope_out: ["既定着地 /dashboard の変更","OIDCプロバイダー設定やSecretの変更","DBスキーマ変更","認証方式の移行"]
acceptance: ["正常な /dashboard のSSR callbackUrlを本番スモークが受理する","外部URL、protocol-relative URL、敵対的returnToの遷移属性混入を拒否する","既定着地 /dashboard はアプリ側の単一定数テストで固定する","対象テストとCI品質ゲートがPASSする","mainのCloudflareデプロイ後スモークがPASSする"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-security","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/sys-production-oidc-smoke-landing-contract-20260813.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-13T10:20:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "本番デプロイを誤って失敗・ロールバックさせるOIDCスモークの単一契約ドリフトを修正するbug。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/sys-production-oidc-smoke-landing-contract-20260813.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-pfzn","linked_at":"2026-08-13T10:22:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-08-13T10:20:00Z","missing_sections":[],"status":"complete"}
---

# 概要

本番OIDCスモークに残った旧既定着地 `/sheets` の直書きを除去し、open redirectを防ぐ安全性契約へ整合する。

## 背景と問題

PR #720で既定着地は承認済み仕様どおり `/dashboard` へ変更された。一方、本番スモークとその自己検査は `/sheets` を重複定義したままで、正常な新Workerを異常と誤判定して自動ロールバックした。

## 改善前の挙動

新WorkerがSSR済み `callbackUrl=/dashboard` を返すと、本番スモークは `/sheets` でないことを理由に失敗する。CIはopen redirectではない正常な仕様変更でもWorkerを直前版へ戻す。

## 改善後の挙動

本番スモークはcallbackUrlが同一originの安全な相対パスであることと、敵対的returnToが遷移可能属性へ入らないことを検証する。業務上の既定値 `/dashboard` はアプリ側の単一定数テストで固定する。

## 期待する挙動

SSR済み `/dashboard` は受理される。絶対URL、protocol-relative URL、外部originへ解決される値、敵対的returnToの遷移属性混入は拒否される。

## 再現手順またはユースケース

1. mainのCloudflareデプロイを実行する。
2. `smoke-production-oidc.mjs` が本番サインインHTMLを取得する。
3. HTMLは `/dashboard` を返すが、旧検査は `/sheets` を要求して失敗する。
4. デプロイジョブが正常な新Workerを自動ロールバックする。

## 影響と優先度

- 影響範囲: mainの全Cloudflare自動デプロイ、OIDCサインイン後着地の本番検証
- 深刻度: high
- 緊急度: 正常な変更を本番へ反映できず、誤ロールバックが繰り返されているため即時修正する

## スコープ

- In: OIDC本番スモーク、回帰テスト、CI配線テスト、PRと本番再検証
- Out: 既定着地、OIDCプロバイダー、Secret、DB、認証方式の変更

## 関連グラフ

- 原因となった仕様変更: `issue-elegant-home-review-20260813`
- 関連仕様: `spec-post-signin-landing-observability`
- 関連アーキテクチャ: `arch-harness-hub-frontend`, `arch-harness-hub-security`, `arch-harness-hub-testing-qa`

## 受入条件

- [x] `/dashboard` のSSR callbackUrlを受理する。
- [x] 外部URLとprotocol-relative URLを拒否する。
- [x] 敵対的returnToが遷移可能属性へ入った場合に拒否する。
- [x] 対象テストとCI品質ゲートがPASSする。
- [ ] mainのCloudflareデプロイ後スモークがPASSする。

## 検証証跡

- 失敗run: GitHub Actions `hub-ci` #572 / run `31689347030`
- 原因: `server-rendered callbackUrl was not the safe default /sheets`
- ローカル結果: focused 22/22、Hub全体2189件PASS・8件todo、coverage 85.2%、typecheck・Biome・graph schema・artifact placement PASS。
- 本番旧版への新smoke実行: O1〜O5の5項目PASS。
- PR・新版デプロイ結果: 完了後に追記する。
