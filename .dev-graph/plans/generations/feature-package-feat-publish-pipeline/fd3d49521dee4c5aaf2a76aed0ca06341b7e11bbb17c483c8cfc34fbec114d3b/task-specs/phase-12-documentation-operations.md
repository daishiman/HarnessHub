# System task overlay: 文書化・runbook・引き継ぎ — orphan_candidate 処理・rollback 手順・ポーリング監視の運用手順確立

## Machine-readable registration fields

- feature_package_id: feature-package/feat-publish-pipeline (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-publish-pipeline", "macro-feature", "documentation", "operations"]
- related_nodes: ["feat-publish-pipeline", "arch-harness-hub-backend", "arch-harness-hub-security"]
- parent_feature: feat-publish-pipeline
- phase_ref: P12
- classification: confidence=0.84, reason="運用時の rollback 手順・ポーリング監視・orphan_candidate 処理を runbook として確立する P12 文書化・運用タスク", candidates=[{artifact_kind: task, confidence: 0.84, candidate_path: tasks/feat-publish-pipeline/sys-publish-pipeline-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P11 完了後、運用担当者向けの runbook.md を作成する。対象は (1) PublishRequest が Publishing で停止したまま完了しない orphan_candidate の検知と手動介入手順、(2) TargetChannel の rollback 実行手順 (2 版目以降限定の制約含む)、(3) publish endpoint のポーリング監視 (2 秒 exponential backoff) の運用上の監視ポイントである。

## 背景

docs/backend-spec.md §7 は監査 hash chain 検証や metrics 異常検知の cron job を定義しており、§8 はポーリング統一 (publish は 2 秒 exponential backoff、board/notifications は 30 秒) を確定している。運用担当者が日常的に参照する runbook には、これらの cron job が検知する異常 (hash chain 破損、metrics 異常) が発生した場合の一次対応手順、Publishing 状態で長時間停止した PublishRequest (orphan_candidate) を発見した場合の調査・手動介入手順、rollback 操作を実行する際の前提条件 (2 版目以降のみ、rollback 先の検査結果確認) を明記する。本 task は新規のコード実装を伴わず、既存の実装・テスト・証跡から運用手順を文書化する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-publish-pipeline, arch-harness-hub-backend, arch-harness-hub-security
- Entry gate: goal-spec.json の feature_context_digest が sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41 に一致し、confirmation_status=confirmed であること。P11 の docs/features/feat-publish-pipeline/evidence-summary.md が完了していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 feature は UI を持たない
- Backend: N/A: 本 task は運用文書化のみで実装物を変更しない
- API: N/A: 本 task は運用文書化のみ
- Data: N/A: 本 task は運用文書化のみ
- Infrastructure: N/A: 新規インフラのプロビジョニングは行わない
- Security: applicable + change: 監査 hash chain 異常検知時の一次対応手順を文書化する
- Quality: N/A: 品質保証自体は P09 で完了済み
- Documentation: applicable + change: docs/features/feat-publish-pipeline/runbook.md を新規作成する
- Operations: applicable + change: orphan_candidate 処理・rollback 手順・ポーリング監視の運用手順を確立する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-backend, arch-harness-hub-security
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task は運用文書化のみ

## 成果物

- Produced artifacts: docs/features/feat-publish-pipeline/runbook.md (orphan_candidate 検知・手動介入手順、rollback 実行手順、ポーリング監視ポイント、監査 hash chain/metrics 異常検知時の一次対応手順を含む)
- Consumed artifacts: docs/features/feat-publish-pipeline/evidence-summary.md, docs/backend-spec.md §7, §8
- Write scope/touches: docs/features/feat-publish-pipeline/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-publish-pipeline-p12) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-publish-pipeline-p12 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-publish-pipeline-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-PUBLISH-PIPELINE-P11]。resource_scope (docs/features/feat-publish-pipeline/runbook.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- cron job (監査 hash chain 検証・metrics 異常検知) 本体の実装 (実装は P05 の範囲外であり、既存の共通運用基盤機能を前提とする)
- feat-domain-model-db/feat-auth-tenancy 側の runbook 作成 (それぞれの owner feature が担う)
- 本番デプロイの実施自体 (owner=P13。本 task はデプロイ後の運用手順の文書化のみ)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-publish-pipeline/runbook.md に orphan_candidate 処理・rollback 手順・ポーリング監視・異常検知時対応手順の 4 項目全てが記載されていること

## Rollout and rollback

- Rollout: runbook.md の作成を完了してから P13 (リリース/デプロイ) へ引き継ぐ
- Rollback trigger and steps: runbook.md の手順が実装と矛盾することが判明した場合、該当箇所を修正し本 task を再実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-publish-pipeline.context.json` (`sha256:7a4625914be99dd47f51c4c92698737ad8fe431319995457a6cadc5fd39d2f41`)
- Phase responsibility: 検証済み実装の運用・runbook・handover を文書化し、先行 phase の前提にしない。
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

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P12 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-publish-pipeline.context.json; docs/backend-spec.md §4.6; system-spec/backend.md qa-059; docs/security-spec.md §6.3/§7.3
- Effective phase contract: endpoint別認証を固定する。POST /publish・PUT /publish/:id/package・POST /publish/:id/submit はsession(Web)+Bearer(CLI)のdual principal、session state-changing経路はOrigin/CSRF必須、BearerはCSRF非該当。GET list/idもdual。approveはsession/workspace-admin、cancelとprojects/:id/deploymentはBearer/owner。全経路が同一tenant/owner判定、zod contract、状態機械、Idempotency-Key/直列化を共有する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/api/v1/publish/`
- `apps/hub/src/lib/publish/auth-principal.ts`
- `packages/schemas/publish-pipeline/`
- Mandatory evidence: session/Bearer parity、session CSRF欠落403、Bearerでcookie/CSRF非依存、cross-tenant拒否、role matrix、状態遷移/property test、P12 runbookとP13 smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (G4), system-spec/spec-state.json qa_log (qa-011, qa-037)
- Detailed authoritative source: docs/backend-spec.md §7 (cron job), §8 (非機能予算・ポーリング統一)
- Architecture: arch-harness-hub-backend, arch-harness-hub-security
- Feature: feat-publish-pipeline
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-PUBLISH-PIPELINE-P11
