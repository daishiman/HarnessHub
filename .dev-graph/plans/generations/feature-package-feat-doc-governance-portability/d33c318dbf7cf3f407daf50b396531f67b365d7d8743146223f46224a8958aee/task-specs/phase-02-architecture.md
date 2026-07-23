# System task overlay: 検査設計 — 300 行 lint・仕組み-ナレッジ境界検査・移植 opt-in 検査の入出力契約確定

## Machine-readable registration fields

- feature_package_id: feature-package/feat-doc-governance-portability (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-doc-governance-portability", "macro-feature", "doc-governance", "documentation"]
- related_nodes: ["feat-doc-governance-portability", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-doc-governance-portability
- phase_ref: P02
- classification: confidence=0.87, reason="qa-070 のドキュメント統治・移植性境界 3 検査のうち P02 責務 (検査設計 — 300 行 lint・仕組み-ナレッジ境界検査・移植 opt-in 検査の入出力契約確定) を実行する task", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-doc-governance-portability/sys-doc-governance-portability-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P01 baseline に基づき、lint-doc-line-limit.py / lint-mechanism-knowledge-boundary.py / lint-portability-knowledge-optin.py の入出力契約、doc-line-limit-allowlist.json の schema、hard-coded ナレッジ参照検出の false-positive 除外基準、移植チャネル (.claude-plugin/bundles.json・plugin.json の distributable フラグ・scripts/install-bundle.sh 等) の既定 mechanism-only/knowledge opt-in 検査契約を確定する。

## 背景

qa-070 は仕組み-ナレッジ境界とドキュメント規約の原則のみを定めており、具体的な検査アルゴリズムや allowlist の運用方式は本 feature 側で設計する必要がある。特に hard-coded 参照検出は、制御フロー・既定値として使われるリテラル (FAIL 対象) と、コメント・docstring 内の根拠引用 (PASS 対象) を区別しないと過検出 (Goodhart 化) を招くため、この判定基準を本 phase で確定する。extract-blueprint / install-bundle は qa-070 上では移植チャネルの例示として言及されているに過ぎず、現状 .claude-plugin/bundles.json と plugin.json の distributable フラグはプラグイン名 (仕組みの単位) のみを参照し、ナレッジ content-root を一切参照していないため、この現状を固定検査へ落とし込む設計を行う。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-doc-governance-portability, arch-harness-hub-dev-workflow
- Entry gate: goal-spec.json の feature_context_digest が sha256:6855a739f483347401636b9254be473536ac2d9168cc24470f1abf05bd9286fb に一致し、features/feat-doc-governance-portability.md の frontmatter と goal-spec の purpose/goal/scope_in/scope_out/acceptance が逐語一致すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない
- 直前 phase (SYS-DOC-GOVERNANCE-PORTABILITY-P01) の完了に依存する (直列 DAG)。

## Workstream applicability

- Frontend: N/A: 本 feature はドキュメント統治・移植性境界の検査追加であり frontend 実装物を変更しない
- Backend: N/A: Hub 本体の backend 実装物を変更しない (scope_out)
- API: N/A: Hub 本体の API を変更しない (scope_out)
- Data: N/A: Hub 本体の DB/schema を変更しない (scope_out)
- Infrastructure: N/A: デプロイ基盤を変更しない。CI workflow の lint 追加は Quality/Operations で扱う
- Security: applicable + review: hard-coded ナレッジ参照検出の false-positive/false-negative 境界設計を security 観点でレビューする
- Quality: applicable + change: 3 検査の入出力契約と fixture 設計指針を確定する
- Documentation: applicable + change: docs/features/feat-doc-governance-portability/design.md を新規作成する
- Operations: N/A: 本 phase は運用手順を確定しない (設計のみ)

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-dev-workflow (features/feat-doc-governance-portability.context.json architecture_refs の正本参照)
- Deploy unit/environment: dev-tooling/repository (scripts/・plugins/ の script・schema・規約文書。Cloudflare Workers へのデプロイは伴わない)
- Compatibility/migration/backfill: 既存 promoted package・証跡の digest を失効させない (quality_constraints digest-immutability)。実データ migration は P08 が所有する

## 成果物

- Produced artifacts:
- docs/features/feat-doc-governance-portability/design.md
- Consumed artifacts: goal-spec.json, features/feat-doc-governance-portability.context.json, architecture/harness-hub-dev-workflow.md, system-spec/dev-workflow.md (qa-070), docs/features/feat-doc-governance-portability/requirements-baseline.md, .claude-plugin/bundles.json
- Write scope/touches: docs/features/feat-doc-governance-portability/design.md

## Tracker publication and completion

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-doc-governance-portability-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-doc-governance-portability-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-doc-governance-portability-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: 直前 phase 完了後にのみ着手する (直列 DAG)。resource_scope (docs/features/feat-doc-governance-portability/design.md) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 規約自体の変更 (qa-070 で確定済み)
- 既存超過 6 文書の分割実施 (issue-doc-granularity-remediation-20260722 / HarnessHub-3d8 側)
- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- 本 phase の責務外の成果物生成 (他 phase の write scope への書込)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: design.md に 3 検査の入出力契約・allowlist schema・false-positive 除外基準・移植チャネル検査契約が過不足なく記載されていること

## Rollout and rollback

- Rollout: 成果物を write scope の範囲で作成・更新し、acceptance を満たしたことを確認してから次 phase へ引き継ぐ
- Rollback trigger and steps: 設計が既存 choke-point/単一 writer と衝突すると判明した場合、design.md を破棄し P01 baseline から再設計する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-doc-governance-portability.context.json` (`sha256:6855a739f483347401636b9254be473536ac2d9168cc24470f1abf05bd9286fb`)
- Phase responsibility: 現行 context の purpose・goal・scope・acceptance のうち本 phase 責務の部分集合を所有する。
- Purpose: qa-070 (appr-008 承認) で確定したドキュメント規約 2 件 — 仕組みとナレッジのオン・オフ分離・1 文書 300 行上限 — を機械的に強制する検査群を実装し、G1 (仕組みの持ち出しによる配布・運用効率)・G4 (fail-closed 品質ゲート)・G5 (ドキュメント管理の持続性) を支える
- Goal: 3 検査 (300 行 lint・仕組み-ナレッジ境界検査・移植導線 opt-in 検査) が CI で fail-closed に動作し、既存超過 6 文書の allowlist は縮小のみ許す ratchet で管理され、再実行しても同じ結果 (冪等) になる状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- markdown 正本文書 (system-spec 章・architecture・features・tasks・docs) の 300 行上限 fail-closed CI lint (既存超過 6 文書は縮小のみ許す remediation allowlist ratchet 付き)
- 仕組み側ファイル (plugins/・.claude/skills/ 等) への repo 固有ナレッジ (固有 node id・固有 path・固有 qa 番号) hard-coded 参照の検査
- extract-blueprint / install-bundle の『仕組みのみ既定 (オン)・ナレッジ同梱は明示 opt-in (オフ既定)』検査
- Scope out:
- 規約自体の変更 (qa-070 で確定済み)
- 既存超過 6 文書の分割実施 (issue-doc-granularity-remediation-20260722 / HarnessHub-3d8 側)
- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- 300 行超過の新規違反が CI で fail-closed に遮断され、allowlist は既存 6 文書のみ・縮小のみ許す ratchet として検査される
- 仕組み側ファイルへの repo 固有ナレッジ hard-coded 参照を検出する検査が存在し、検出時に exit 非 0 で停止する
- extract-blueprint / install-bundle がナレッジを既定で含めず、明示 opt-in なしの同梱を検査が遮断する
- 3 検査が CI ゲートへ組み込まれ、同一入力での再実行が差分 0 に収束する (冪等)
- Architecture/source refs:
- architecture/harness-hub-dev-workflow.md
- specs/harness-hub-system-specification.md
- system-spec/dev-workflow.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Phase acceptance

- design.md に lint-doc-line-limit.py / lint-mechanism-knowledge-boundary.py / lint-portability-knowledge-optin.py の入出力契約 (引数・exit code・検出条件・JSON 出力形状) が確定している
- scripts/doc-line-limit-allowlist.json の schema (path・baseline_line_count・縮小のみ許す ratchet 方式: 実測行数が baseline を上回れば fail-closed、baseline 未満へ縮小したら baseline も追随して更新する) が確定している
- hard-coded ナレッジ参照検出について、制御フロー・既定値として使われる repo 固有 node id/path/qa 番号のリテラル (FAIL 対象) と、根拠引用としてのコメント・docstring 内 qa 番号記載 (PASS 対象) を区別する判定基準が false-positive ケース付きで確定している
- .claude-plugin/bundles.json・plugin.json の distributable フラグ・scripts/install-bundle.sh の現状 (mechanism=plugin 名のみ参照、knowledge content-root 不参照) を lint-portability-knowledge-optin.py がどう固定検査するかの契約が確定している
- P01 の据置事項 4 点が全て確定し、未確定の持ち越しが 0 件である

## 参照情報

- goal-spec: goal-spec.json (parent_feature=feat-doc-governance-portability, feature_context_digest=sha256:6855a739f483347401636b9254be473536ac2d9168cc24470f1abf05bd9286fb)
- 仕様正本: system-spec/dev-workflow.md qa-070 (ドキュメント規約 2 件、appr-008 承認)
- trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.
