# System task overlay: Hub 基盤 証跡収集

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hub-foundation (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hub-foundation", "stage-1", "infrastructure", "evidence"]
- related_nodes: ["feat-hub-foundation", "arch-harness-hub-infrastructure", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data", "arch-harness-hub-security", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-hub-foundation
- phase_ref: P11
- classification: confidence=0.86, reason="P06〜P10 の実行結果・判定記録を再現可能な証跡として収集・保存する P11 タスク", candidates=[{artifact_kind: task, confidence: 0.86, candidate_path: tasks/feat-hub-foundation/sys-hub-foundation-p11.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P06 (test-run)、P07 (acceptance)、P09 (quality-assurance)、P10 (final-review) それぞれの実行結果・判定記録を、再現可能な形式で docs/features/feat-hub-foundation/evidence/ 配下に集約保存する。この task 完了時点で、feature-execution-package-contract.md §7 が定める完了条件のうち P11 分の evidence が揃っている状態にする。

## 背景

qa-019 は「復元できないバックアップを成功と数えない」という検証可能性の原則を運用面で求めており、この原則は feature 完了判定においても同様に適用する。P07/P10 の判定文書はそれ自体が判断の要約であり、判断の根拠となった一次証跡 (CI run ログ、bundle サイズレポート、/health 応答ログ、restore drill readiness 記録) を分離して保存することで、後から第三者が同じ結論に再到達できる状態を作る。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hub-foundation, arch-harness-hub-infrastructure, arch-harness-hub-frontend, sys-hub-foundation-p10, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Entry gate: docs/features/feat-hub-foundation/final-review-notes.md が作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対

## Workstream applicability

- Frontend: N/A: 証跡収集のみを行い、対象物への変更は行わない
- Backend: N/A: 証跡収集のみを行い、対象物への変更は行わない
- API: N/A: 証跡収集のみを行い、対象物への変更は行わない
- Data: N/A: DB スキーマ実体は feat-domain-model-db の scope であり、本 task の証跡収集対象に含めない
- Infrastructure: applicable + change: CI run ログと bundle サイズレポートを docs/features/feat-hub-foundation/evidence/ 配下に保存する (対象物自体への変更なし)
- Security: applicable + change: npm 混入検知テストの実行ログを evidence/ 配下に保存する
- Quality: applicable + change: docs/features/feat-hub-foundation/evidence/ ディレクトリを新規作成し、証跡一覧を index 化する
- Documentation: applicable + change: docs/features/feat-hub-foundation/evidence/index.md を新規作成する
- Operations: applicable + change: /health 応答ログ、外部死活監視の疎通確認記録、restore drill readiness 記録を evidence/ 配下に保存する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure, arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data, arch-harness-hub-security, arch-harness-hub-dev-workflow
- Deploy unit/environment: cloudflare-workers/hub (証跡収集対象。本 task 自体はデプロイ単位を変更しない)
- Compatibility/migration/backfill: N/A: 新規 scaffold であり互換性・migration・backfill の対象がない

## 成果物

- Produced artifacts: docs/features/feat-hub-foundation/evidence/index.md、docs/features/feat-hub-foundation/evidence/ 配下の一次証跡ファイル群 (CI run ログ、bundle サイズレポート、/health 応答ログ、restore drill readiness 記録)
- Consumed artifacts: P06 のテスト実行結果、P07 の acceptance-report.md、P09 の quality-assurance-report.md、P10 の final-review-notes.md
- Write scope/touches: docs/features/feat-hub-foundation/evidence/

## Tracker publication and completion

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hub-foundation-p11) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hub-foundation-p11 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-hub-foundation-p11) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hub-foundation-p10] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 証跡から新たな不備が発見された場合の恒久修正 (該当する P02〜P10 の task へ差し戻して修正する)
- 業務ドメインロジックの証跡収集 (goal-spec scope_out)
- 運用ドキュメント・runbook の作成 (P12 の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-hub-foundation/evidence/index.md に、P06/P07/P09/P10 それぞれに対応する一次証跡ファイルへの参照が明記されていること. Normative evidence: 全登録共通層のowner/public API/consumer一覧、consumer contract tests、duplicate implementation scan=0、CI/bundle/SLO/healthの4 acceptance証跡を必須とする。

## Rollout and rollback

- Rollout: evidence/index.md と証跡ファイル群を作成した後、P12 (documentation-operations) へ引き継ぐ
- Rollback trigger and steps: 証跡不足で判定根拠が再現できない場合、不足している証跡の生成元 task (P06/P07/P09/P10) を evidence/index.md に記録し、該当 task を再実行対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-hub-foundation.context.json` (`sha256:938ecf38d145496bba7a439b829d3934718b8f43b4f4628d8ba821594d17062d`)
- Phase responsibility: P06・P07・P09・P10 の証跡を source digest 付きで集約する。
- Purpose: 費用ゼロ制約 (C2) 下で Hub の実行基盤 (Cloudflare Workers 一体型 + OpenNext) と CI/CD・監視・SLO 運用の土台を確立する
- Goal: pnpm 強制 CI → wrangler deploy が自動化され、/health・監視・SLO 99.5% 計測が稼働し、Worker 3MiB 予算内で Next.js と共通層の単一実装が動作する状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- Next.js + TypeScript + pnpm monorepo scaffold
- @opennextjs/cloudflare デプロイ
- GitHub Actions CI/CD (npm 混入 fail)
- /health + 外部死活監視
- SLO ダッシュボード + bundle サイズ予算 CI
- docs/shared-layers.md §1〜§3 の共通 UI・backend・CI/CD/運用層の実装 owner と package 境界
- Scope out:
- 業務ドメインロジック
- テナント固有の OIDC/role/Device Flow policy (共通 auth adapter・認可 MW の package 境界のみ対象)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- CI が test→deploy を完走する
- Worker bundle が 3MiB 以内で bundle 予算チェックが CI に存在する
- SLO 99.5% の計測と /health が稼働する
- shared-layers 登録済み共通層が単一 package/境界に実装され、消費 feature が同じ実装を参照する
- Architecture/source refs:
- architecture/harness-hub-infrastructure.md
- architecture/harness-hub-frontend.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-data.md
- architecture/harness-hub-security.md
- architecture/harness-hub-dev-workflow.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Current phase closure

- Required responsibility: 4 acceptance、共通package一覧、consumer contract test、duplicate 0 の証跡を集約する。
- Dependency rule: this phase consumes only earlier P01..P10 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P11 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-hub-foundation.context.json; docs/shared-layers.md §1-§3; architecture/harness-hub-{frontend,backend,data,security,infrastructure,dev-workflow}.md
- Effective phase contract: acceptanceは4件、quality_constraintsは9件。P05は雛形だけでなく、packages/ui・packages/schemas・packages/inspection・packages/estimation、auth adapter/認可middleware、audit/AiJob/Notification/PII共通adapterの公開contract実体、CI/運用共通境界を単一ownerとして実装する。domain-specific logicはconsumer featureに残す。P04/P06/P07/P09/P10/P11は複数consumer contract testと重複実装detector=0を第4 acceptanceとして実判定する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `packages/ui/`
- `packages/schemas/`
- `packages/inspection/`
- `packages/estimation/`
- `apps/hub/src/shared/`
- `apps/hub/src/middleware/`
- `.github/workflows/ci.yml`
- Mandatory evidence: 全登録共通層のowner/public API/consumer一覧、consumer contract tests、duplicate implementation scan=0、CI/bundle/SLO/healthの4 acceptance証跡を必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/infrastructure.md (qa-019), system-spec/00-requirements-definition.md (C1, C2)
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-hub-foundation
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成しない
- Dependencies: sys-hub-foundation-p10
