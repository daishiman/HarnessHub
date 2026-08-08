---
graph_node_id: "issue-publish-smoke-unwired-20260808"
artifact_kind: "issue"
artifact_subtypes: []
project_id: "harness-hub"
domain: "operations"
tags: ["ci","smoke","publish","secrets","deployment-gate"]
priority: "medium"
start_date: "2026-08-08"
target_date: null
iteration: null
title: "smoke:publish-production を結線するか廃止するか決着させる"
owners: ["daishiman"]
created_at: "2026-08-08T09:53:00Z"
updated_at: "2026-08-08T09:53:00Z"
status: "draft"
depends_on: []
related_nodes: ["issue-production-smoke-coverage-gaps-20260808"]
resource_scope: [".github/workflows/ci.yml","apps/hub/scripts/smoke-production-publish.ts","scripts/ci/actions-secrets-registry.json","docs/features/feat-post-signin-scope-routing/production-coverage-smoke-spec-reflection-receipt.md"]
purpose: "登録済みだが CI から一度も呼ばれていない smoke:publish-production について、結線するか廃止するかを決着させ、実装・台帳・運用判断を一致させる。"
goal: "publish の本番検証が『走る』か『意図して走らせない』かのどちらかへ確定し、未結線の理由と退行検出手段を追跡できる状態にする。"
scope_in: ["Device Flow 化 / secrets 台帳登録 / 廃止 の 3 択の決着","決着に応じた ci.yml 結線または script 削除","仕様反映受領書と運用台帳の更新"]
scope_out: ["既に結線済み 4 smoke の再設計","wrangler rollback 判定ロジックそのものの変更"]
acceptance: ["3 択のいずれかへ決着し、実装・secret 台帳・運用記録が一致している","結線を選んだ場合は ci.yml から fail-closed で実行され、失敗時ロールバックの判定にも当該 outcome が追加されている","廃止を選んだ場合は publish pipeline の退行検出手段が別に存在し、その所在が記録されている"]
architecture_refs: ["arch-harness-hub-dev-workflow"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "issues/publish-smoke-unwired-20260808.md"
template_id: "issue"
template_version: "1.0.0"
confirmation_status: "draft"
evaluation_status: "pending"
confirmation_evidence: {"evaluated_digest":null,"evaluator":null,"evidence_ref":null}
source_lineage: {"imported_at":"2026-08-08T09:53:00Z","origin_kind":"manual","source_digest":null,"source_path":null,"source_plugin":null,"source_version":null}
classification_confidence: 0.95
classification_reason: "HarnessHub-p0lr が scope_out（新しい secret の追加）を理由に publish smoke の結線を保留した積み残し。"
classification_candidates: [{"artifact_kind":"issue","candidate_path":"issues/publish-smoke-unwired-20260808.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-pf5o","linked_at":"2026-08-08T09:53:00Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"open"}
implementation_readiness: {"checked_at":"2026-08-08T09:53:00Z","missing_sections":[],"status":"complete"}
---

# smoke:publish-production を結線するか廃止するか決着させる

## 概要

`apps/hub/package.json` に登録済みの `smoke:publish-production` は、CI（変更を自動検査する仕組み）の deploy job から呼ばれていない。書かれているのに本番で走らない smoke を、結線するか廃止するか決着させる。

## 背景と問題

`HarnessHub-p0lr` では OIDC、DB/R2、hearing、coverage の 4 smoke を本番 deploy 後へ fail-closed（失敗したら成功扱いにしない方式）で結線した。publish smoke は `PUBLISH_ACCESS_TOKEN` を要求するが、この secret は台帳にない。`p0lr` の対象外である「新しい secret の追加」を避けるため、publish の判断だけを本課題へ分離した。

`HUB_BASE_URL` は既存の `HUB_PUBLIC_URL` に統一できる。主な設計判断は、publish 権限を持つ資格情報を CI に常置するか、短命 token を取得する Device Flow へ変えるか、runner 自体を廃止して別の退行検出へ置き換えるかである。

## 現在の挙動

- `apps/hub/scripts/smoke-production-publish.ts` は存在し、必要な環境変数を与えれば手動実行できる
- `.github/workflows/ci.yml` は OIDC / DB-R2 / hearing / coverage の 4 smoke を実行する
- publish smoke は deploy job と rollback 判定に含まれない
- publish pipeline が本番で壊れても、現在の自動 smoke だけでは検出できない

## 期待する挙動

publish の本番検証が「CI で走る」か「意図して走らせない」かのどちらかに確定し、実装、secret 台帳、仕様反映受領書、運用記録が同じ判断を示していること。

## 再現手順またはユースケース

1. `.github/workflows/ci.yml` の deploy job 内を `smoke:` で検索する
2. OIDC / DB-R2 / hearing / coverage の 4 smoke が実行されることを確認する
3. `smoke:publish-production` が実行されないことを確認する
4. `apps/hub/package.json` と `apps/hub/scripts/smoke-production-publish.ts` には runner が残っていることを確認する

## 影響と優先度

publish pipeline の本番退行を自動検出できない。一方、既存の 4 smoke や deploy 自体はこの未結線から影響を受けないため、優先度は medium とする。未結線を暗黙状態にせず、Beads と dev-graph の両方から追跡できるようにする。

## スコープ

次の 3 択を設計判断し、その結果を反映する。

1. Device Flow で短命 token を取得し、新しい長命 secret を増やさず CI へ結線する
2. `PUBLISH_ACCESS_TOKEN` を正式に台帳登録し、最小権限・rotation（定期的な交換）手順とともに CI へ結線する
3. runner を廃止し、publish pipeline の退行を検出する代替手段を記録する

既に結線済みの 4 smoke の再設計と、rollback 判定ロジックそのものの変更は対象外とする。

## 関連グラフ

- `issues/production-smoke-coverage-gaps-20260808.md` — 本件を積み残しとして切り出した課題
- `docs/features/feat-post-signin-scope-routing/production-coverage-smoke-spec-reflection-receipt.md` — 未結線の理由と仕様影響を記録した受領書

## 受入条件

1. 3 択のいずれかへ決着し、実装・secret 台帳・運用記録が一致している
2. 結線する場合は CI から fail-closed で実行され、失敗時 rollback の判定にも結果が含まれている
3. 廃止する場合は publish pipeline の代替退行検出手段と所在が記録されている

## 検証証跡

- `.github/workflows/ci.yml` と `apps/hub/package.json` の呼び出し突合
- `scripts/ci/actions-secrets-registry.json` に `PUBLISH_ACCESS_TOKEN` が未登録であること
- `HarnessHub-p0lr` の仕様反映受領書に、publish smoke を今回結線しない理由が記録されていること
