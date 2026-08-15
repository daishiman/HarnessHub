---
graph_node_id: "SYS-HEARING-INTAKE-P13"
artifact_kind: "task"
artifact_subtypes: []
project_id: "feature-package-feat-hearing-intake"
domain: "operations"
tags: ["feat-hearing-intake","studio-extension","async-ai-queue","release-deploy"]
priority: null
start_date: null
target_date: null
iteration: null
title: "リリース/デプロイ — S10-S12 の Cloudflare Workers 本番反映とロールアウト確認"
owners: ["daishiman"]
created_at: "2026-07-19T14:14:59Z"
updated_at: "2026-08-08T05:23:16Z"
status: "closed"
depends_on: ["SYS-HEARING-INTAKE-P12"]
related_nodes: ["feat-hearing-intake","arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data"]
resource_scope: [".dev-graph/state/graph.json",".github/workflows/ci.yml","apps/hub/package.json","apps/hub/scripts/smoke-production-hearing-support.ts","apps/hub/scripts/smoke-production-hearing.ts","apps/hub/tests/auth-tenancy/wrangler-production-auth-config.test.ts","apps/hub/tests/ci/worker-secrets.test.ts","apps/hub/tests/hearing-intake/production-smoke-script.test.ts","apps/hub/wrangler.jsonc","architecture/harness-hub-infrastructure.md","docs/features/feat-hearing-intake/p13-spec-reflection-receipt.md","docs/features/feat-hearing-intake/release-notes.md","docs/infrastructure-spec.md","features/feat-hearing-intake.md","package.json","packages/db/__tests__/hearing-smoke.test.ts","packages/db/repository/composition.ts","packages/db/repository/hearing-smoke.ts","packages/db/src/index.ts","scripts/ci/check-worker-secrets.mjs","scripts/ci/worker-secrets-registry.json","specs/harness-hub-system-specification.md","system-spec/infrastructure.md","system-spec/spec-state.json","system-spec/testing-qa.md","tasks/feat-hearing-intake/sys-hearing-intake-p13.md"]
purpose: "feat-hearing-intake の P13 を実行する: リリース/デプロイ — S10-S12 の Cloudflare Workers 本番反映とロールアウト確認"
goal: "content-addressed published task spec の全責務・受入条件・検証・rollbackを満たし、再実行可能な証跡を残す"
scope_in: [".dev-graph/state/graph.json",".github/workflows/ci.yml","apps/hub/package.json","apps/hub/scripts/smoke-production-hearing-support.ts","apps/hub/scripts/smoke-production-hearing.ts","apps/hub/tests/auth-tenancy/wrangler-production-auth-config.test.ts","apps/hub/tests/ci/worker-secrets.test.ts","apps/hub/tests/hearing-intake/production-smoke-script.test.ts","apps/hub/wrangler.jsonc","architecture/harness-hub-infrastructure.md","docs/features/feat-hearing-intake/p13-spec-reflection-receipt.md","docs/features/feat-hearing-intake/release-notes.md","docs/infrastructure-spec.md","features/feat-hearing-intake.md","package.json","packages/db/__tests__/hearing-smoke.test.ts","packages/db/repository/composition.ts","packages/db/repository/hearing-smoke.ts","packages/db/src/index.ts","scripts/ci/check-worker-secrets.mjs","scripts/ci/worker-secrets-registry.json","specs/harness-hub-system-specification.md","system-spec/infrastructure.md","system-spec/spec-state.json","system-spec/testing-qa.md","tasks/feat-hearing-intake/sys-hearing-intake-p13.md"]
scope_out: ["published task spec の『スコープ外』節を正本とする"]
acceptance: ["release-notes.md に本番反映日時・smoke test 結果・ロールアウト確認結果が記載されている","現行feature context sha256:d186363b613242215867a3dabda3c9a25690f884d363ae23de6d492538a09507のscope_in/acceptance全件をP13責務として追跡し、未割当0件である","Normative closure: feature固有 AiJob schema や kind=hearing を作らず、共通 ai_jobs の kind=sheet_generation を consumer として使う。POST /api/v1/sheets は server-side packages/estimation の sheetEstimate を実行し estimate snapshot を保存してから、同一transactionでsheet_generationをenqueueする。共通 package/boundary の実装ownerは feat-hub-foundationであり、hearingは公開contractを消費する。P1は後発metrics完了を前提にしない。 Evidence: kind=sheet_generation、shared queue consumer、sheetEstimate server execution、estimate snapshot、tenant/role、enqueue/complete round-trip の contract testsを必須とする。"]
architecture_refs: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data"]
parent_feature: "feat-hearing-intake"
feature_package_id: "feature-package/feat-hearing-intake"
phase_ref: "P13"
file_path: "tasks/feat-hearing-intake/sys-hearing-intake-p13.md"
template_id: "task"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5","evaluator":"system-dev-plan-evaluator","evidence_ref":".dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/plan-findings.json"}
source_lineage: {"imported_at":"2026-07-19T14:14:59Z","origin_kind":"system-dev-planner","source_digest":"61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5","source_path":".dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/task-specs/phase-13-release-deploy.md","source_plugin":"system-dev-planner","source_version":"0.1.0"}
classification_confidence: 0.85
classification_reason: "P12 の runbook.md に基づき S10-S12 を feat-hub-foundation の既存 Cloudflare Workers パイプライン経由で本番反映し、feature 全体の完了を報告する P13 タスク"
classification_candidates: [{"artifact_kind":"task","candidate_path":"tasks/feat-hearing-intake/sys-hearing-intake-p13.md","confidence":0.85}]
issue_linkage: null
tracker_binding: "beads"
beads_linkage: {"bd_issue_id":"HarnessHub-o2i.13","linked_at":"2026-07-18T01:45:11Z","sync_state":"linked"}
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"in_progress"}
implementation_readiness: {"checked_at":"2026-07-19T13:26:55Z","missing_sections":[],"status":"complete"}
---

# リリース/デプロイ — S10-S12 の Cloudflare Workers 本番反映とロールアウト確認

> task projection (P13 / parent: feat-hearing-intake)。実装要件の正本は下記の content-addressed published task spec であり、このファイルは実行入口だけを保持する。

## 正本仕様書

- package: `.dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5`
- task spec: `.dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/task-specs/phase-13-release-deploy.md`
- package digest: `sha256:61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5`
- task spec SHA-256: `sha256:090425faac1c06e3dfe244bb99269e24f0d5ed9a16682f7ae3fe992e728b1e8f`
- registration receipt: `.dev-graph/plans/generations/feature-package-feat-hearing-intake/61fac79fec00ca6a6788ee4aa0ed2152e1ded2451ce3d8633e88c09149c96db5/dev-graph-registration-receipt.json`

## 依存

- `SYS-HEARING-INTAKE-P12`

## 実行契約

- claim: Beads issueをatomic claimし、並行実行時はworktree leaseを取得する。
- scope: frontmatter `resource_scope` と published task spec の Write scope/touches を両方守る。
- verification: published task spec の Automated commands と Required evidence を全件実行・保存する。
- rerun: published task spec 内の `validate-system-plan.py --repo-root . --staging .` は repository root から解決できない。再検証は世代非依存の `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-hearing-intake` を使い、current pointer から現行世代を再解決する。
- completion: linked PR merge authorityとdefault-branch reconciliationを満たすまでdurable doneにしない。
- source integrity: task spec SHA-256またはpackage digestが変わった場合は実行せず、current pointerから再解決する。

## P13 実行追補 (2026-08-01)

- PR #623 の docs-only main merge は `ci.yml` の `on.push.paths` 対象外で、production deploy run が発火しなかった。
- main の `workflow_dispatch` も deploy job の event 条件で skip されたため、P13 の「CI が本番反映を再実行」を
  再現可能にする最小差分として、main の push または明示 dispatch だけを deploy 対象にする。
- dispatch でも `needs: [static-gates, test]`、migration、health、OIDC / DB-R2 smoke、rollback を維持する。
- この追補は user 指示で拡張された P13 scope とし、仕様反映先・実測 run・最終完了証跡は
  `docs/features/feat-hearing-intake/p13-spec-reflection-receipt.md` と `release-notes.md` に集約する。

## P13 実行追補 (2026-08-02)

- 受入条件「smoke test 結果が release-notes に記載されている」の残 2 件（実データ E2E / SEC8 本番挙動）は、
  §7.2 の手順書が**人手でしか実行できない形**だったため 5 セッション連続で未実施のまま滞留していた。
- 解消として、同じ手順を `pnpm --filter @harness-hub/hub run smoke:hearing-production` の 1 本へ落とし、
  `ci.yml` の deploy job（post-deploy 検証）へ常設した。**新しい CI secret は要求しない** — 既存の
  `TURSO_*` と `vars.HUB_PUBLIC_URL` だけで、Device Flow の実 access token まで取得できる。
- これに伴い `resource_scope` を超えて次を追加した。scope 外だが、追加しなければ受入条件が実行不能である。
  - `apps/hub/scripts/smoke-production-hearing.ts` / `-support.ts`（検査本体）
  - `apps/hub/tests/hearing-intake/production-smoke-script.test.ts`（構造の非退行）
  - `apps/hub/package.json`（script 登録）、`.github/workflows/ci.yml`（step 追加）
  - `packages/db/repository/hearing-smoke.ts` と composition / `src/index.ts` の再公開
    （`check-db-schema-boundary.mjs` が apps/hub からの schema deep import を禁じるため、DB probe は
    `packages/db` 側に置き facade 経由で公開する必要がある）
- 判明した契約上の注意（`aijob.complete` の `conflict` が 500 になる）は `release-notes.md` §7.4 に記録した。
  単独 bd issue 化は `bd-bridge.py --op create` が dev-graph node の登録を必須とするため見送っている。

## P13 実行追補 (2026-08-02 / 本番 secret の欠落と実投入ゲート)

- user 指示「デプロイしている環境でも使えるようにしたい / API key 等を本番設定したい」に応じて本番 Worker を
  実測した結果、`AUTH_ACCESS_TOKEN_SECRET` が**未投入**であることが判明した。TOKEN 資格の経路が本番で全滅して
  おり、上記 smoke は H1（実 access token 取得）で必ず落ちる状態だった。同日投入して解消（`release-notes.md` §7.5）。
- 再発防止として、GitHub 側の `check-actions-secrets.mjs --live` に対応する Cloudflare 側の等価物が無いという
  非対称を埋めた。`resource_scope` 外だが、投入だけで終えると同じ欠落が再発するため追加した。
  - `scripts/ci/worker-secrets-registry.json`（Workers Secret の機械可読な台帳）
  - `scripts/ci/check-worker-secrets.mjs`（台帳 ↔ `wrangler.jsonc` 宣言 ↔ 実投入の三方向突合）
  - `apps/hub/tests/ci/worker-secrets.test.ts`（**ゲートが各乖離を検出できること**の固定・15 tests）
  - `.github/workflows/ci.yml`（静的突合を静的ゲート job へ、`--live` を deploy 直前へ）、
    `package.json`（`check:worker-secrets` を `verify` へ）、`docs/infrastructure-spec.md` §2 と
    `architecture/harness-hub-infrastructure.md`（散文の正本）

## 最終レビュー追補 (2026-08-02)

- fixture を複数の独立 INSERT で作ると、中間失敗時は tenant ID が呼び出し側の cleanup 一覧へ入る前に
  例外となり、本番 DB へ部分行を残し得た。fixture 生成全体と cleanup 全体をそれぞれ 1 transaction にし、
  UNIQUE 違反による途中失敗の rollback と正常 cleanup 後の残行数 0 を libSQL 結合試験で固定した。
- `wrangler secret list` の JSON より後ろに `[WARNING]` が出る版でも一覧を抽出できるよう、閉じ括弧を
  stdout 最終位置に決め打ちせず JSON 配列候補を順番に解析する負例を追加した。
- 本番 smoke の tenant header 詐称は当初 `403` を期待していたが、既存の存在秘匿契約と矛盾するため
  `404 tenant_mismatch` へ修正し、静的契約テストで `403` への退行も検出するよう固定した。
- 仕様影響ありとして `infrastructure.web` / `testing-qa.web` を R4-reopen し、main の確定履歴を保持して
  `appr-024` を根拠に `qa-131` / `qa-132` へ再確定した。C02 writer で specification / infrastructure architecture /
  feature / 本 task projection を更新し、公開済み content-addressed task spec 自体は変更していない。
