# System task overlay: リリース/デプロイ — apps/hub publish endpoint 本番デプロイと full smoke test

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "operations", "release-deploy"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P13
- classification: confidence=0.85, reason="apps/hub は cloudflare-workers/hub 上の実デプロイ単位であり、P13 は publish endpoint の本番デプロイと full smoke test を実施する release-deploy タスクとして literal に適用される", candidates=[{artifact_kind: task, confidence: 0.85, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p13.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P12 完了後、apps/hub の publish endpoint 群を cloudflare-workers/hub の本番環境へデプロイし、full smoke test サイクル (PublishRequest 作成から検査・promote/rollback までの一連の操作) を実行して release-record.md に結果を記録する。

## 背景

apps/hub は本 feature の deploy unit であり実デプロイ対象であるため、P13 は N/A としてではなく文字どおりの release/deploy task として適用される。smoke test は (1) PublishRequest 作成から submit までの検査結果が Green の場合に自動公開されること、(2) Yellow/Red の場合に Needs Fix へ差し戻り旧 stable が維持されること、(3) promote/rollback (rollback は 2 版目以降のみ) が正しく動作すること、(4) 監査 hash chain の整合性が本番環境でも保たれていること、(5) TargetChannel 直列化制約による 409 応答が本番環境でも機能すること、(6) R2 content-addressed storage への書込が正しく機能すること、の 6 項目を対象とする。デプロイは feat-domain-model-db・feat-auth-tenancy が提供するスキーマ・認可ミドルウェアが本番環境に既に存在することを前提とし、それらへの変更は本 task の対象外である。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Entry gate: goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P12 の docs/features/feat-publish-pipeline/runbook.md が完了していること。feat-domain-model-db・feat-auth-tenancy の本番デプロイが完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: applicable + change: apps/hub の publish endpoint 群を本番環境へデプロイする
- API: applicable + change: 本番環境で REST endpoint 12 操作を検査し、Bearer 対応 10 操作は成功、session 専用 2 操作は `credential_not_allowed` 403 になることを確認する。session での成功契約は local route/authz test で確認する
- Data: N/A: 本 task はデプロイ・smoke test のみでスキーマ変更を伴わない
- Infrastructure: applicable + change: cloudflare-workers/hub への本番デプロイを実施する
- Security: applicable + change: 本番環境での監査 hash chain 整合性・TargetChannel 直列化を確認する
- Quality: applicable + change: full smoke test サイクル 6 項目の pass を確認する
- Documentation: applicable + change: docs/features/feat-publish-pipeline/release-record.md を新規作成する
- Operations: applicable + change: runbook.md に基づく運用開始準備を完了する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はデプロイ・smoke test のみで packages/db/schema/ への変更を伴わない

## 成果物

- Produced artifacts: apps/hub/package.json (`smoke:publish-production` entrypoint), apps/hub/scripts/smoke-production-publish.ts (資格情報を環境変数だけから読み、12 API 操作・S1〜S6・必須監査 action 9 種を検査する fail-closed runner), apps/hub/tests/publish-pipeline/production-smoke-script.test.ts (entrypoint と必須検査契約), docs/features/feat-publish-pipeline/release-record.md (本番デプロイ結果と full smoke test 6 項目の pass 結果を含む), docs/backend-spec.md, docs/backend-spec-api-state.md, architecture/harness-hub-backend.md, architecture/harness-hub-security.md (production で判明した Bearer/authz と submit 時直列化契約の正本書き戻し)
- Consumed artifacts: docs/features/feat-publish-pipeline/runbook.md, evidence-summary.md, apps/hub/src/app/api/v1/publish/, packages/inspection/
- Write scope/touches: apps/hub/package.json, apps/hub/scripts/smoke-production-publish.ts, apps/hub/tests/publish-pipeline/production-smoke-script.test.ts, architecture/harness-hub-backend.md, architecture/harness-hub-security.md, docs/backend-spec.md, docs/backend-spec-api-state.md, docs/features/feat-publish-pipeline/release-record.md (デプロイ操作自体は cloudflare-workers/hub の既存デプロイ手順に従う)

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p13) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p13 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p13) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P12]。resource_scope (apps/hub/package.json, apps/hub/scripts/smoke-production-publish.ts, apps/hub/tests/publish-pipeline/production-smoke-script.test.ts, architecture/harness-hub-backend.md, architecture/harness-hub-security.md, docs/backend-spec.md, docs/backend-spec-api-state.md, docs/features/feat-publish-pipeline/release-record.md) は Write scope/touches および workstream-inventory.json の write_scope と同一集合であり、依存関係により他 task との同時変更を禁止する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- feat-domain-model-db・feat-auth-tenancy 自体の本番デプロイ (それぞれの owner feature が担う。本 task はそれらが完了済みであることを前提条件とする)
- Publisher クライアント側のリリース (owner=feat-publisher-plugin)
- カタログ UI・承認キュー UI のリリース (owner=feat-dual-catalog-web / feat-workspace-governance)

## テスト戦略

- テストレベル選定: 単体・結合・境界値・回帰の 4 レベルを成果物の性質に応じて適用し、適用外のレベルは証跡内で理由を明記する。
- カバレッジ目標: 実行コードを変更する場合は既定 80% 以上を維持し、文書のみの場合も受入条件の全項目を検査する。
- 層別方針: applicable な Frontend は behavior、Backend・API・Data は API 契約と DB 結合、Infrastructure は IaC と smoke を検査する。N/A の層は `Workstream applicability` の理由を維持する。
- 保守性制約: pixel 位置依存と DOM 構造依存のテストを禁止し、公開契約ではなく実装詳細へ密結合する過剰なテストを作らない。

## Verification and evidence

- Automated commands:
  1. `pnpm --filter hub run build:worker`
  2. `cd apps/hub && pnpm exec wrangler deploy --config wrangler.jsonc`
  3. `curl -fsS "$HUB_BASE_URL/health"`
  4. `pnpm --filter hub run smoke:publish-production`
  5. `pnpm --filter hub exec vitest run tests/publish-pipeline`
  6. `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-publish-pipeline`
- Production smoke procedure: `HUB_BASE_URL`、owner `PUBLISH_ACCESS_TOKEN`、`TURSO_DATABASE_URL`、`TURSO_AUTH_TOKEN`、`CLOUDFLARE_API_TOKEN` を環境変数に設定し、`pnpm --filter hub run smoke:publish-production` を実行する。runner が disposable Project/TargetChannel と Green/secret ZIP を生成し、ID chaining を維持して (S1) request 作成、(S2) upload/hash、(S3) 422/needs_fix、Release/registry 非生成、旧 stable v1 維持、(S4) v1/v2 publish、後続 Draft の submit 時 409 `channel_busy`、(S5) rollback/promote/suspend/deployment register、R2 remote object 再取得 SHA-256、(S6) 共通 hash-chain 検証器と `publish.request`・`publish.package_upload`・`publish.submit`・`publish.approve`・`publish.cancel`・`channel.rollback`・`channel.promote`・`release.suspend`・`deployment.register` の全 9 action、finally cleanup を同じ fail-closed entrypoint で検査する。12 API 操作のうち Bearer 対応 10 操作は成功し、session 専用の approve/project releases は 403 `credential_not_allowed` になることを確認する。秘密値は引数・ログ・成果物に出力せず、成功時の非機密 JSON を release-record.md と照合する。
- Expected exit: build/deploy/health/production smoke/test/plan validator は exit 0。S1〜S6 は全て pass、後続 Draft の submit は 409、secret 入り ZIP は 422/needs_fix、旧 stable v1 は維持、12 API 操作の期待 status、必須監査 action 9 種、audit chain errors 0、R2 再取得 hash の API/DB 一致を全て確認し、Project は archived、非終端 request は cancel 済みである。検査または cleanup が1件でも失敗した場合は production smoke が非 0 で停止する。
- Required evidence: docs/features/feat-publish-pipeline/release-record.md に Worker version、100% 配信、本番デプロイ完了記録、S1〜S6、submit 時 409 直列化、旧 stable 維持、12 API 操作の status、必須監査 action 9 種、R2 SHA-256、監査 chain、smoke 資源 cleanup の実測結果が記載され、docs/backend-spec.md・docs/backend-spec-api-state.md・architecture/harness-hub-backend.md・architecture/harness-hub-security.md に Bearer JWT 検証と owner authz の二段階契約、invalid Bearer の cookie fallback 禁止、submit 時直列化が書き戻されていること. Normative evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。

## Inner goal-seek execution loop

- Methodology contract: `system-task-goal-seek/v1`
- Goal: 本 task の「目的」と「成果物」に定義した単一責務を、受入条件を削らず再実行可能な証跡とともに完了する。
- Generic execution prompt: 目的・背景・前提条件・スコープ・成果物を入力に、手段を固定せず最小の変更で実装と検証を行う。
- Rubric: 受入条件を全件満たし、必要なカバレッジが 80% 以上で、既存テストの回帰が 0 件、証跡が再実行可能で、宣言した write scope 外を変更していれば FAIL とする。
- Feedback loop: 実行後に独立評価し、finding を次の prompt へ反映して再実行する。`rubric verdict=PASS` まで反復し、上限到達時は fail-closed で停止する。
- P13 spec/architecture writeback: required。実行結果・判断・改善知見を docs/features/feat-publish-pipeline/release-record.md に証跡化し、production で判明した Bearer JWT 検証と owner authz の二段階契約、invalid Bearer の cookie fallback 禁止を docs/backend-spec.md と architecture/harness-hub-backend.md・architecture/harness-hub-security.md の正本へ反映する。意味変更がない項目も release-record.md に照合結果を記録する。

## Rollout and rollback

- Rollout: release-record.md で full smoke test 6 項目全ての pass を確認し、feature 全体の完了 (exact-13 全 task 完了) を確定する
- Rollback trigger and steps: smoke test のいずれかが fail した場合、本番デプロイを直前の安定版へロールバックし、release-record.md に原因を記録した上で該当する P05/P09 へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publish-pipeline.context.json` (`sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41`)
- Phase responsibility: release/deploy/close-out と rollback 証跡を残し、N/A でも理由を確定する。
- Purpose: 作者の自己完結 publish (G1) の中核として、PublishRequest 状態機械 (§7.2)・検査 pipeline (static validation/secret scan/policy)・stable pointer promote/rollback を実装する
- Goal: publish → 検査 → Ready → Publishing → Published が atomic に完走し、失敗時は旧 stable が無傷で残る状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- REST API (zod 単一ソース → OpenAPI)
- 状態機械 + TargetChannel 直列化
- 検査 pipeline (共有パッケージ化)
- R2 保存 + Catalog pointer の atomic 更新
- promote/rollback + 監査 event
- Scope out:
- Publisher クライアント側
- カタログ UI
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 状態遷移が §7.2 準拠で property test を通る
- 検査 FAIL 時に Needs Fix へ差し戻り旧 stable が維持される
- 全操作が append-only 監査 event に記録される
- Architecture/source refs:
- architecture/harness-hub-backend.md
- architecture/harness-hub-data.md
- architecture/harness-hub-security.md
- specs/harness-hub-system-specification.md
- Latest-main lineage pin: `specs/harness-hub-system-specification.md` = `sha256:8983a0e22cb4a91809cb87bc73ceaec32ed4998176280183c56e0f0911435e6d` (`origin/main` `19df7cbb4e5b5eea64ef01aa7ea7acccd9cf384c`)。追加内容は libSQL 接続復旧と dev-graph renderer 登録検証であり、publish pipeline の scope/acceptance/API/認可契約は変更しない。

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P13 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publish-pipeline.context.json; docs/backend-spec.md §4.6; system-spec/backend.md qa-059; docs/security-spec.md §6.3/§7.3
- Effective phase contract: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET publish list/idもdual。approve と project releases list は session 専用、cancel と projects/:id/deployment はBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key を共有し、TargetChannel 直列化は Draft 作成ではなく submit の `draft -> validating` 遷移で取得する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/publish/`
- `apps/hub/src/lib/publish/auth-principal.ts`
- `packages/schemas/publish-pipeline/`
- Mandatory evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I1, I2, I3, G1, G4), system-spec/spec-state.json qa_log (qa-002, qa-004, qa-009, qa-011, qa-033, qa-037)
- Detailed authoritative source: docs/backend-spec.md §4.6, §5.1, §6.1, §7, §8
- Architecture: arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P12
