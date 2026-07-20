# System task overlay: 配布経路検証 (H7) 要件ベースライン確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "documentation", "requirements-baseline"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P01
- classification: confidence=0.9, reason="goal-spec (goal-spec.json) と features/feat-stage0-distribution-gate.md の purpose/goal/scope/acceptance/quality_constraints を要件ベースラインへ確定転記する P01 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p01.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

feat-stage0-distribution-gate の受入可能な要件ベースラインを確定し、以降の P02 以降の全 task が同一の合意事項 (Skill 配布の成立経路検証という本 feature の中心責務、URL 型 marketplace / npm source / Bootstrap Installer の 3 経路検証、macOS/Windows 実機 E2E、採用経路の decision record 登録) を参照できる状態にする。この task 完了時点で、goal-spec の purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件が machine-verifiable な baseline 文書として固定される。

## 背景

Harness Hub は Stage 1 (Publisher + Thin Dual Catalog MVP) へ投資する前に、Skill 配布が実際に成立する経路を確定する Stage 0 technical gate (仮説 H7) を通過する必要がある。system-spec/spec-state.json qa-003 は「Publisher / Skill の作者環境への配布は URL 型 marketplace (native source) または Bootstrap Installer の 2 経路を Stage 0 technical gate (H7) で検証し、成立した経路を採用する」と定め、system-spec/00-requirements-definition.md I9 は Stage 0 technical gate が H3/H6/H7 の成立検証と Stage 1 開始条件の判定を担うと定めている。npm source は system-spec/fetched-references.json の claude-code-plugins entry (2026-07-17 再確認) により github・git URL・git-subdir と並ぶ正式な source type として確認済みだが、remote URL 型 marketplace では marketplace.json しか取得されず相対パス source の plugin 本体は解決不能であるため、plugin 本体配布には外部 source が必須になるという制約がある。本 feature はこの npm source を URL 型 marketplace 経路内の source type として扱い、URL 型 marketplace / npm source / Bootstrap Installer の 3 経路について macOS + Windows (qa-001 により desktop Linux は対象外) の実機で検証を行う。検証体制は提供者 1 名 + AI のみで完結させ (C1)、検証費用は無料枠内でゼロ円とする (C2)。H7 が Stage 0 で成立確認されない限り Stage 1 へは進めない fail-closed ゲートであり、採用経路は system-spec/spec-state.json の decisions[] (D1-D6 と同形式) への登録を経路として確定させる。

本 feature は Hub 本体の実装や課金・商用配布を scope_out とする純粋な検証 (verification) feature であり、P05 (実装) は本番相当のコードではなく最小 skill package・marketplace.json・Bootstrap Installer 試作という検証用 artifact の作成、P06 (test-run) は実機での検証実行、P07 (acceptance) は 2 経路以上の実機検証記録と Windows E2E 成功の確認、P13 (release-deploy) は Hub 本体の実デプロイではなく採用経路の decision record C01 writer登録と Stage 1 開始条件判定として適用される。decision record の system-spec/spec-state.json decisions[] への実際の書込は C01 writer コンポーネントが所有しており、本 feature の各 task は登録内容の確定と引き渡しまでを担う。

## 前提条件

- Macro entry gate: `parent_feature.depends_on all done|closed`。canonical parent feature の現行depends_onを都度評価し、task edgeへ複製しない。

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: goal-spec.json の feature_context_digest が sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a に一致し、features/feat-stage0-distribution-gate.md の confirmation_status が confirmed であること。evaluation_status は本 task package 生成時点で pending であり、system-dev-plan-evaluator による C12 PASS 判定と C11 promotion を経て解決する
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は要件文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は要件文書化のみで backend 実装物を変更しない。本 feature は Hub 本体の backend も scope_out である
- API: N/A: 本 feature は API 契約の新設を伴わない検証 feature であり、本 task は要件記述のみ
- Data: N/A: 本 feature は永続データストアのスキーマ変更を伴わない。採用経路の記録先は system-spec/spec-state.json decisions[] であり、その実書込は C01 writer が所有する
- Infrastructure: applicable + change: URL 型 marketplace・npm source・Bootstrap Installer という 3 種の配布インフラの成立検証方式を本 task で要件確定する
- Security: N/A: 本 task は要件文書化のみ。検査対象 artifact のセキュリティ観点は P09 で扱う
- Quality: applicable + change: goal-spec acceptance 3 件と quality_constraints 8 件 (stage0-two-path-distribution-technical-gate-h7-qa003, stage0-technical-gate-h3-h6-h7-stage1-entry-condition-i9, author-environment-macos-windows-linux-out-of-scope-qa001, npm-source-official-support-changelog-recheck-claude-code-plugins, cost-zero-verification-within-free-tier-c2, solo-operator-ai-assisted-verification-c1, h7-unresolved-blocks-stage1-fail-closed-gate, adopted-path-decision-record-registration-spec-state-decisions) を machine-verifiable な受入基準として requirements-baseline.md に固定する
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/requirements-baseline.md を新規作成する
- Operations: N/A: 実機検証の運用手順の具体化は P12 で行う。本 task は要件確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (features/feat-stage0-distribution-gate.md architecture_refs の正本参照。I9・qa-001・qa-003 を含む)
- Deploy unit/environment: local-verification-only (本 feature は cloudflare-workers/hub への本番デプロイを持たない。検証は作者ローカル環境 macOS/Windows 実機で完結する)
- Compatibility/migration/backfill: N/A: 本 task は要件確定のみで実コードへの変更を伴わない (実変更は P05 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/requirements-baseline.md (要件ベースライン文書。purpose/goal/scope_in 5 件/scope_out 2 件/acceptance 3 件/quality_constraints 8 件の確定転記を含む)
- Consumed artifacts: goal-spec.json, features/feat-stage0-distribution-gate.md, features/feat-stage0-distribution-gate.context.json, system-spec/00-requirements-definition.md, system-spec/spec-state.json, system-spec/fetched-references.json
- Write scope/touches: docs/features/feat-stage0-distribution-gate/requirements-baseline.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p01) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p01 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p01) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on が空のため他 task との着手順序制約はない。resource_scope (docs/features/feat-stage0-distribution-gate/requirements-baseline.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- 実装コードの作成 (本 task は要件確定のみ。実装は P05 で扱う)
- 採用経路の decision record へのC01 writer内部実装の変更（scope out）。本featureはwriter実行とapplied receipt検証を担う

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: requirements-baseline.md への acceptance 3 件 + quality_constraints 8 件の過不足なき転記

## Rollout and rollback

- Rollout: requirements-baseline.md を作成し、feature-package.json の source_feature_digest と一致することを確認してから P02 へ引き継ぐ
- Rollback trigger and steps: goal-spec と features/feat-stage0-distribution-gate.md の内容不一致が判明した場合、requirements-baseline.md を作成前状態 (ファイル未作成) に戻し、goal-spec 側の再確定を dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-stage0-distribution-gate.context.json` (`sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance を要件ベースラインへ全件固定する。
- Purpose: Stage 1 へ投資する前に、Skill 配布の成立経路 (URL 型 marketplace / npm source / Bootstrap Installer) と Windows 実機 E2E を検証し、成立経路を確定する (仮説 H7)
- Goal: 最小 artifact で 2 経路以上の配布検証が完了し、採用経路が根拠付きで記録された状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- URL 型 marketplace 検証
- npm source 検証 (公式サポート確認済み)
- Bootstrap Installer 試作
- Windows/macOS 実機 E2E
- 採用経路の決定記録
- Scope out:
- Hub 本体の実装
- 課金・商用配布
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 2 経路以上の実機検証記録が存在する
- 採用経路が decision record として登録される
- Windows E2E が成功する
- Architecture/source refs:
- architecture/harness-hub-infrastructure.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Normative implementation closure (2026-07-19)

This section is normative for P01 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-stage0-distribution-gate.context.json; system-spec/spec-state.json decisions[] writer contract; H7 fail-closed contract
- Effective phase contract: P07は『P13で登録予定』をpass根拠にできない。採用経路decisionがC01単一writerへ登録され、writer receiptのstatus=applied、decision id/digest、spec-state after digestが確認されるまでP07/P10/P13とfeature完了をfail-closedにする。Stage1のPublisherとThin Dual Catalog双方のparent feature depends_onへ本featureを登録し、Beads edge parityまで確認する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `.dev-graph/cache/stage0-decision-registration-request.json`
- `.dev-graph/cache/stage0-decision-registration-receipt.json`
- `.dev-graph/cache/stage0-stage1-gate-receipt.json`
- Mandatory evidence: 2経路実機記録、Windows/macOS E2E、C01 writer receipt、decision exact lookup、Publisher/Dual Catalog feature dependency、Beads edge parityを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I9), system-spec/spec-state.json qa_log (qa-001, qa-003)
- Detailed authoritative source: system-spec/fetched-references.json claude-code-plugins entry
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: なし (P01 は本 package の起点 task)
