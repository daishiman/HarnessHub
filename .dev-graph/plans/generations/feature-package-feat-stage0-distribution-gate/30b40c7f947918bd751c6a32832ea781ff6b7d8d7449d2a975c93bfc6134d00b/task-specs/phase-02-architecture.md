# System task overlay: 3 経路検証方式・最小 artifact 構成・実機 E2E 手順・decision record 登録経路の確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-stage0-distribution-gate (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-stage0-distribution-gate", "macro-feature", "infrastructure", "architecture-decision"]
- related_nodes: ["feat-stage0-distribution-gate", "arch-harness-hub-infrastructure"]
- parent_feature: feat-stage0-distribution-gate
- phase_ref: P02
- classification: confidence=0.88, reason="URL 型 marketplace・npm source・Bootstrap Installer の 3 経路検証方式、最小 artifact 構成、macOS/Windows 実機 E2E 手順、採用経路の decision record 登録経路を確定する P02 architecture decision タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-stage0-distribution-gate/sys-stage0-distribution-gate-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 で確定した要件ベースラインに基づき、(1) URL 型 marketplace 検証方式 (2) npm source の URL 型 marketplace 内 source type としての検証方式 (3) Bootstrap Installer 試作方式 (4) macOS/Windows 実機 E2E 手順 (5) 採用経路の decision record 登録経路 (C01 writer 経由で system-spec/spec-state.json decisions[] へ) の 5 件の architecture decision を確定し、architecture-decision-record.md として文書化する。

## 背景

3 経路はそれぞれ異なる検証方式を要する。URL 型 marketplace は marketplace.json を Git ホスティング上に配置し、Claude Code の `/plugin marketplace add` 相当の導線から native source として解決できるかを検証する。npm source は system-spec/fetched-references.json の claude-code-plugins entry が示す通り github・git URL・git-subdir と並ぶ正式な source type だが、remote URL 型 marketplace 経由では marketplace.json しか取得できず相対パス source の plugin 本体は解決不能という制約があるため、npm source は URL 型 marketplace の中で plugin 本体配布に使う外部 source type として位置づけ、単独の第 3 経路ではなく URL 型 marketplace 経路の一部として検証する。Bootstrap Installer は marketplace 機構を経由せず、install.sh/install.ps1 相当のスクリプトで直接 Skill をローカルに展開する経路である。macOS/Windows 実機 E2E は qa-001 (作者環境は macOS + Windows。desktop Linux は非エンジニアの業務 PC に存在しないため対象外) に基づき、両 OS で最低 1 回ずつ、Claude Code CLI の高頻度リリース (2026-07 時点 v2.1.21x 系) を踏まえ code.claude.com の changelog を実行直前に再照合した上で実施する。採用経路の decision record 登録経路は system-spec/spec-state.json decisions[] の既存形式 (id/question/status/options/recommendation/user_decision) に倣い、実書込自体は C01 writer コンポーネントが所有する前提を明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-stage0-distribution-gate, arch-harness-hub-infrastructure
- Entry gate: docs/features/feat-stage0-distribution-gate/requirements-baseline.md が P01 完了時点で存在し、goal-spec の feature_context_digest と整合していること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は検証方式の設計文書化のみで frontend 実装物を変更しない
- Backend: N/A: 本 feature は Hub backend の変更を伴わない
- API: N/A: 本 feature は API 契約の新設を伴わない
- Data: N/A: 永続データストアのスキーマ変更を伴わない
- Infrastructure: applicable + change: URL 型 marketplace・npm source・Bootstrap Installer の 3 経路検証方式と macOS/Windows 実機 E2E 手順を本 task で確定する
- Security: N/A: artifact のセキュリティ観点の詳細検証は P09 で扱う。本 task は方式の確定のみ
- Quality: applicable + change: 採用経路判定基準 (C1/C2 適合・運用負荷・保守性を最優先基準とすること) を architecture decision に含める
- Documentation: applicable + change: docs/features/feat-stage0-distribution-gate/architecture-decision-record.md を新規作成する
- Operations: N/A: 実際の運用手順 (onboarding/更新導線/障害時対応) は P12 で具体化する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-infrastructure (I9・qa-001・qa-003 を含む正本参照)
- Deploy unit/environment: local-verification-only (macOS/Windows 実機ローカル環境での検証。cloudflare-workers/hub へのデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は設計確定のみで実コードへの変更を伴わない (実装は P05 で扱う)

## 成果物

- Produced artifacts: docs/features/feat-stage0-distribution-gate/architecture-decision-record.md (5 件の architecture decision: URL 型 marketplace 検証方式・npm source の source type としての検証方式・Bootstrap Installer 試作方式・macOS/Windows 実機 E2E 手順・decision record 登録経路)
- Consumed artifacts: docs/features/feat-stage0-distribution-gate/requirements-baseline.md, system-spec/fetched-references.json, system-spec/spec-state.json
- Write scope/touches: docs/features/feat-stage0-distribution-gate/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-stage0-distribution-gate-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-stage0-distribution-gate-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-stage0-distribution-gate-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-STAGE0-DISTRIBUTION-GATE-P01] のため P01 完了後に着手する。resource_scope (architecture-decision-record.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- Hub 本体の実装 (goal-spec scope_out)
- 課金・商用配布 (goal-spec scope_out)
- 検証用 artifact の実作成 (本 task は方式確定のみ。実作成は P05 で扱う)
- 実機での検証実行そのもの (本 task は手順確定のみ。実行は P06 で扱う)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: architecture-decision-record.md に 5 件の architecture decision (URL 型 marketplace 検証方式・npm source の source type としての検証方式・Bootstrap Installer 試作方式・macOS/Windows 実機 E2E 手順・decision record 登録経路) が過不足なく記載されていること

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し P03 の独立レビューへ引き継ぐ
- Rollback trigger and steps: claude-code-plugins 公式ドキュメントの changelog 再照合で npm source の前提が変化したことが判明した場合、architecture-decision-record.md の該当箇所を修正し本 task を再実行する。再実行までは P03 以降の着手を保留する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-stage0-distribution-gate.context.json` (`sha256:6b7340ade5290ee9e3c5bb63d22d3381684b28817303152c6240906ff050fb0a`)
- Phase responsibility: 現行 architecture_refs と全 scope を実装境界・deploy unit・owner に割り当てる。
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

This section is normative for P02 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-stage0-distribution-gate.context.json; system-spec/spec-state.json decisions[] writer contract; H7 fail-closed contract
- Effective phase contract: P07は『P13で登録予定』をpass根拠にできない。採用経路decisionがC01単一writerへ登録され、writer receiptのstatus=applied、decision id/digest、spec-state after digestが確認されるまでP07/P10/P13とfeature完了をfail-closedにする。Stage1のPublisherとThin Dual Catalog双方のparent feature depends_onへ本featureを登録し、Beads edge parityまで確認する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `.dev-graph/cache/stage0-decision-registration-request.json`
- `.dev-graph/cache/stage0-decision-registration-receipt.json`
- `.dev-graph/cache/stage0-stage1-gate-receipt.json`
- Mandatory evidence: 2経路実機記録、Windows/macOS E2E、C01 writer receipt、decision exact lookup、Publisher/Dual Catalog feature dependency、Beads edge parityを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/00-requirements-definition.md (I9), system-spec/spec-state.json qa_log (qa-001, qa-003), system-spec/spec-state.json decisions[] (D1-D6 形式)
- Detailed authoritative source: system-spec/fetched-references.json claude-code-plugins entry
- Architecture: arch-harness-hub-infrastructure (architecture/harness-hub-infrastructure.md)
- Feature: feat-stage0-distribution-gate
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: SYS-STAGE0-DISTRIBUTION-GATE-P01
