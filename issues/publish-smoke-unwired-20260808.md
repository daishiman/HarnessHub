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
updated_at: "2026-08-10T11:36:20.181914Z"
status: "active"
depends_on: []
related_nodes: ["issue-production-smoke-coverage-gaps-20260808"]
resource_scope: [".github/workflows/ci.yml","apps/hub/scripts/smoke-production-publish.ts","apps/hub/scripts/smoke-production-publish-support.ts","apps/hub/tests/publish-pipeline/production-smoke-script.test.ts","packages/db/repository/publish-smoke.ts","packages/db/__tests__/publish-smoke.test.ts","scripts/ci/actions-secrets-registry.json","docs/features/feat-post-signin-scope-routing/production-coverage-smoke-spec-reflection-receipt.md","specs/harness-hub-production-coverage-smoke-addendum.md","system-spec/testing-qa.md"]
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
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"3d69c1add514cdcba9f93562d8210ab8ff2f73b9a1fd6e38f4f224cb02720cc5","evaluator":"Device Flow 実装・CI 結線・focused contract review","evidence_ref":"issues/publish-smoke-unwired-20260808.md"}
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

## 起票時の挙動

- `apps/hub/scripts/smoke-production-publish.ts` は存在し、必要な環境変数を与えれば手動実行できる
- `.github/workflows/ci.yml` は OIDC / DB-R2 / hearing / coverage の 4 smoke を実行する
- publish smoke は deploy job と rollback 判定に含まれない
- publish pipeline が本番で壊れても、現在の自動 smoke だけでは検出できない

## 期待する挙動

publish の本番検証が「CI で走る」か「意図して走らせない」かのどちらかに確定し、実装、secret 台帳、仕様反映受領書、運用記録が同じ判断を示していること。

## 起票時の再現手順

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

## 決着（2026-08-10）

**選択肢 1（Device Flow 化）を採用した。** 理由は 3 点。

1. `HarnessHub-p0lr` の hearing / coverage smoke が既に「code 発行と token 交換は本番 Worker の public endpoint を通し、承認だけを DB probe の CAS（比較して一致したときだけ書き換える更新）へ委譲する」無人 Device Flow を確立している。同じ型に載せれば **新しい secret はゼロ**で結線できる。
2. publish は本 Hub で最も権限の強い操作（`minRole: owner` + `publish:write`）である。選択肢 2 はその資格情報を CI へ常置することになり、最も避けたい形の長命 secret を増やす。
3. 選択肢 3（廃止）は S1〜S6・409 直列化・R2 SHA-256・audit hash chain という本番でしか検証できない性質を失う。代替手段を別に作るコストのほうが大きい。

反映内容:

- `smoke-production-publish-support.ts` — `PUBLISH_ACCESS_TOKEN` の読み取りを削除。`HUB_BASE_URL` を既存の `HUB_PUBLIC_URL` へ統一。変更系要求へ `Origin` を付与（`withAuthz` の Origin 検査は認可判定より前にあるため、無いと全 POST が `untrusted_origin` で落ちる）
- `smoke-production-publish.ts` — 実行のたびに使い捨て tenant を作り、`acquireDeviceToken` で `publish:write` の短命 token を取得する。`publish.*` は `minRole: 'owner'` だが、`owner` は DB の列値ではなく資源との関係から合成される実効 role で、`ROLE_ORDER` 上は `workspace-admin` > `owner` > `member`。したがって fixture の `workerUserId`（role=workspace-admin）で通る
- `packages/db/repository/publish-smoke.ts` — `cleanupPublishTenant` を追加。identity 側の `cleanupTenant` は publish 領域の表を知らないため、両方呼ばないと projects / releases / publish_requests が孤児として本番に残ったまま `clean: true` になる。使い捨て tenant 化に伴い `archiveProject` は不要になったので削除した
- `smoke-production-publish-support.ts` — publish cleanup が throw または `clean: false` の場合は identity tenant の削除へ進まない `cleanupPublishThenIdentity` を追加。追跡キーとなる tenant を保持し、publish 行を復旧可能にした
- `.github/workflows/ci.yml` — `id: publish_smoke` で fail-closed 実行し、`PUBLISH_SMOKE_OUTCOME` を失敗時ロールバックの判定材料へ追加
- `scripts/ci/actions-secrets-registry.json` — **新規登録なし**。既存 `CLOUDFLARE_R2_API_TOKEN` / `TURSO_*` / `HUB_PUBLIC_URL` の `purpose` に publish smoke を追記しただけ

R2 実体と `packages` 表だけは残す。content-addressed で tenant 非スコープのため、消すと同一 hash を参照する他 tenant の Release を壊しうる。

## 検証証跡

- `.github/workflows/ci.yml` と `apps/hub/package.json` の呼び出し突合 — `smoke:publish-production` が deploy job の `publish_smoke` step から実行される
- `scripts/ci/actions-secrets-registry.json` に `PUBLISH_ACCESS_TOKEN` が **登録されないまま**であること（`node scripts/ci/check-actions-secrets.mjs` が参照 16 件 / 台帳 16 件で一致）
- `apps/hub/tests/publish-pipeline/production-smoke-script.test.ts` — help に長命 token 名が現れないこと、Device Flow 経路、後始末の対象表、rollback 判定への結線を静的に固定する。publish cleanup の throw / 残存行では identity cleanup を0回、正常時は1回にする正負検査を含む（6件 PASS）
- `packages/db/__tests__/publish-smoke.test.ts` — `cleanupPublishTenant` が対象 tenant の publish 行を 0 にし、他 tenant の行を消さないこと
- `HarnessHub-p0lr` の仕様反映受領書に、publish smoke を当時結線しなかった理由が記録されていること

新 SHA の production run による S1〜S8・rollback・残数0の証跡は未取得のため、本課題は open のまま維持する。`cancel-in-progress` で process 内 `finally` 自体が完走しない経路は、独立した信頼性課題 `HarnessHub-aauo` で追跡する。
