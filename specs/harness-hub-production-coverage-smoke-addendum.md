---
graph_node_id: "spec-production-coverage-smoke"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "quality"
tags: ["production-smoke","post-signin","feedback-loop","docs-cms"]
priority: "high"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "Harness Hub production coverage smoke 仕様追補"
owners: ["daishiman"]
created_at: "2026-08-08T10:00:00Z"
updated_at: "2026-08-08T10:00:00Z"
status: "draft"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["issue-production-smoke-coverage-gaps-20260808","spec-post-signin-workspace-scope"]
resource_scope: [".github/workflows/ci.yml","apps/hub/scripts","packages/db/repository/hearing-smoke.ts","docs/features","features","tasks"]
purpose: null
goal: null
scope_in: []
scope_out: []
acceptance: []
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-production-coverage-smoke-addendum.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":"user final-review instruction + canonical system-spec qa-205","evidence_ref":"system-spec/testing-qa.md"}
source_lineage: {"imported_at":"2026-08-08T10:00:00Z","origin_kind":"manual","source_digest":null,"source_path":"system-spec/spec-state.json","source_plugin":null,"source_version":null}
classification_confidence: 0.99
classification_reason: "3 feature を横断する本番品質契約であり、500 行目前の総合仕様から独立した specification addendum として分離する。"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-production-coverage-smoke-addendum.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-08T10:00:00Z","missing_sections":[],"status":"complete"}
---

# Harness Hub production coverage smoke 仕様追補

## 目的と成功状態

post-signin scope、Feedback Loop、Docs CMS の「単体テストはあるが本番で一度も往復していない」穴を、毎回の production deploy で自動検査する。成功状態は S1〜S8、F1〜F5、D1〜D6 が同じ run で成功し、使い捨て tenant の関連行が 0 件まで削除されることである。

## スコープ

- 対象: 本番 Worker の認可拒否、Device Flow token、Feedback AI queue、Docs AI draft queue、試験データ cleanup、CI rollback 判断。
- 対象外: 認可ルール自体の変更、新しい GitHub Secret、production deploy の実行、publish smoke の CI 結線。

## 用語と主体

- coverage smoke: `smoke:coverage-production` で起動する横断スモークテスト。
- primary tenant / other tenant: 1 run のためだけに作る 2 個のテナント。
- session-only: ブラウザ session だけを許し、Bearer token を拒否する action。
- provider-admin: テナント横断管理者。`HarnessHub-stmx` 案(a)により、edgeは監査付きAPI routeへ越境要求を委譲し、routeが最終認可と監査を担う。

## ユースケースとユーザーフロー

CI は deploy、health、version、OIDC、data、hearing の順に検査した後、coverage smoke を起動する。runner は 2 tenant と必要な利用者を作り、本番 Device Flow で token を取得し、認可・Feedback・Docs の順に検査して、最後に全 tenant を削除する。

## 機能要件

- S1〜S8 は未認証、scope 欠落・衝突、tenant 越境、workspace 非所属、credential 不許可、scope 不足、provider-admin 越境到達点を観測する。
- OIDC O5 は外部 `returnTo` が遷移可能属性へ入らず `/sheets` へ落ちることを確認する。
- F1〜F5 は feedback create、queue pull、AI writeback、`open → in_progress → resolved` を往復する。
- D1〜D6 は document create、doc_draft enqueue/pull/complete、別 tenant 非可視、Bearer read 拒否を往復する。

## 非機能要件

- 新しい secret を要求しない。
- token、secret、試験本文を log へ出さない。
- 失敗時も cleanup を必ず試み、実行失敗と cleanup 失敗を両方報告する。
- runner と主要な変更ファイルは 500 行以下を維持する。

## UI・状態遷移

UI を追加しない。Feedback の状態は AI 完了だけでは `open` のままとし、人の操作に相当する service 呼出しで `in_progress`、`resolved` へ進める。Document は `draft` で作成し、AI 完了で本文だけを書き戻す。

## ビジネスルールと検証

- `tenant_mismatch` は存在秘匿のため 404。
- path と header の scope 不一致は `ambiguous_scope`。
- session-only action は十分な scope の Bearer token でも `credential_not_allowed`。
- 要求していない scope が token に付与された場合は scope 不足検査が無効になるため失敗する。

## API契約

新しい endpoint は追加しない。既存 `/api/v1/device/*`、`/api/v1/feedback`、`/api/v1/ai-jobs/*`、`/api/v1/docs` を使う。HTTP status と error code の組を検査し、既存 API response shape を変更しない。

## データモデル

schema 変更は無い。cleanup facade は既存 tenant 関連表に加え `feedbacks`、`documents`、`builds` を子から親の順に削除し、型付き select で残数を数える。

## 認証・認可

TOKEN / EITHER action は production Worker が発行した Device Flow access token を使う。SESSION action は Google OIDC 資格情報を CI へ追加せず、route と同じ service/repository と production DB adapter で再現し、HTTP 側では Bearer 拒否を実測する。

## エラー・例外・回復

本体失敗後も `finally` で tenant cleanup と adapter close を行う。cleanup も失敗した場合は `AggregateError` で両方を保持する。coverage smoke failure は既存 smoke と同じ rollback 判断へ渡すが、freshness gate で smoke 未実行のときは rollback しない。

## イベント・非同期処理

Feedback は `feedback_response`、Docs は `doc_draft` の `ai_jobs` を共有 pull/complete 経路で処理する。kind を明示して別種類の job を誤取得しない。

## 可観測性

成功時は status、origin、各 check の観測値、cleanup 残数を JSON で出す。provider-admin 越境 S8 は HTTP 200/204 に加え、対象actor・tenant・workspace・requested actionに一致する `provider.cross_tenant_access` の実行前件数0、実行後件数1、増分1を記録する。総件数の `>= 1` だけでは過去行による偽陽性を防げないため、baselineとdeltaを必須にする。

## 互換性・移行・リリース

schema migration と新しい secret は不要。CI の既存 deploy job へ additive に step を追加する。`smoke:publish-production` は `PUBLISH_ACCESS_TOKEN` の台帳・最小権限契約が整うまで手動 runner のままとする。

## テストと受入条件

- focused Vitest で OIDC O5、runner 構造、CI 結線、cleanup 対象を検査する。
- DB integration test は `feedbacks`、`documents`、`builds` の実データを作り、cleanup 後 0 件を確認する。
- Hub / DB typecheck、3 feature package の task spec validator、repository 品質ゲートを再実行する。
- production deploy 実走が無い状態では関連 P13 task を完了扱いにしない。

## 残る本番検証

- provider-admin 越境はrouteへ通して監査する案(a)へ統一済み。ローカル実装・回帰テストは完了しているが、新SHAをdeployしたproduction smoke S8は未実施であり、成功証拠が得られるまで `HarnessHub-stmx` / `HarnessHub-1vb.13` は完了扱いにしない。
- publish smoke の CI 結線は短命 owner token の発行・台帳・rotation 契約を別課題で確定する。
- U1〜U9 source-index 欠落により system-spec foundation gate が既存 `main` でも失敗する問題は別課題で追跡する。
