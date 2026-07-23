# System task overlay: 実装 — lint script 3 本・allowlist schema・回帰テスト・governance-check.yml 配線

## Machine-readable registration fields

- feature_package_id: feature-package/feat-doc-governance-portability (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-doc-governance-portability", "macro-feature", "doc-governance", "quality"]
- related_nodes: ["feat-doc-governance-portability", "arch-harness-hub-dev-workflow"]
- parent_feature: feat-doc-governance-portability
- phase_ref: P05
- classification: confidence=0.87, reason="qa-070 のドキュメント統治・移植性境界 3 検査のうち P05 責務 (実装 — lint script 3 本・allowlist schema・回帰テスト・governance-check.yml 配線) を実行する task", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-doc-governance-portability/sys-doc-governance-portability-p05.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 設計と P04 テスト設計に従い、lint-doc-line-limit.py / lint-mechanism-knowledge-boundary.py / lint-portability-knowledge-optin.py、scripts/doc-line-limit-allowlist.json のスケルトン、回帰テスト 3 本、.github/workflows/governance-check.yml への CI 配線を実装する。

## 背景

実装は既存 scripts/lint-*.py の慣例 (argparse・JSON 出力・exit code 契約・標準ライブラリのみ) に従う。quality_constraints の fail-closed-lint (exit 非 0) と single-writer-boundary (3 検査はいずれも読み取り専用の検査であり、graph は upsert-node.py、beads は bd-bridge.py 経由以外で書き込まない) をコードとして固定する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-doc-governance-portability, arch-harness-hub-dev-workflow
- Entry gate: goal-spec.json の feature_context_digest が sha256:6855a739f483347401636b9254be473536ac2d9168cc24470f1abf05bd9286fb に一致し、features/feat-doc-governance-portability.md の frontmatter と goal-spec の purpose/goal/scope_in/scope_out/acceptance が逐語一致すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない
- 直前 phase (SYS-DOC-GOVERNANCE-PORTABILITY-P04) の完了に依存する (直列 DAG)。

## Workstream applicability

- Frontend: N/A: 本 feature はドキュメント統治・移植性境界の検査追加であり frontend 実装物を変更しない
- Backend: N/A: Hub 本体の backend 実装物を変更しない (scope_out)
- API: N/A: Hub 本体の API を変更しない (scope_out)
- Data: N/A: Hub 本体の DB/schema を変更しない (scope_out)
- Infrastructure: N/A: デプロイ基盤を変更しない。CI workflow の lint 追加は Quality/Operations で扱う
- Security: N/A: 本 phase は認可・秘密情報の取り扱いを変更しない
- Quality: applicable + change: lint script 3 本と回帰テスト 3 ファイルを実装する
- Documentation: N/A: 本 phase の write scope に文書ファイルは含まれない (allowlist スケルトンは実装成果物として扱う)
- Operations: applicable + change: .github/workflows/governance-check.yml へ 3 検査を配線する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-dev-workflow (features/feat-doc-governance-portability.context.json architecture_refs の正本参照)
- Deploy unit/environment: dev-tooling/repository (scripts/・plugins/ の script・schema・規約文書。Cloudflare Workers へのデプロイは伴わない)
- Compatibility/migration/backfill: 既存 promoted package・証跡の digest を失効させない (quality_constraints digest-immutability)。実データ migration は P08 が所有する

## 成果物

- Produced artifacts:
- scripts/lint-doc-line-limit.py
- scripts/lint-mechanism-knowledge-boundary.py
- scripts/lint-portability-knowledge-optin.py
- scripts/doc-line-limit-allowlist.json (schema 準拠のスケルトン)
- tests/scripts-root/test_root__lint_doc_line_limit.py
- tests/scripts-root/test_root__lint_mechanism_knowledge_boundary.py
- tests/scripts-root/test_root__lint_portability_knowledge_optin.py
- .github/workflows/governance-check.yml の change-category-guard job への配線修正
- Consumed artifacts: goal-spec.json, features/feat-doc-governance-portability.context.json, docs/features/feat-doc-governance-portability/design.md, docs/features/feat-doc-governance-portability/test-plan.md, system-spec/dev-workflow.md (qa-070)
- Write scope/touches: scripts/lint-doc-line-limit.py, scripts/lint-mechanism-knowledge-boundary.py, scripts/lint-portability-knowledge-optin.py, scripts/doc-line-limit-allowlist.json, tests/scripts-root/test_root__lint_doc_line_limit.py, tests/scripts-root/test_root__lint_mechanism_knowledge_boundary.py, tests/scripts-root/test_root__lint_portability_knowledge_optin.py, .github/workflows/governance-check.yml

## Tracker publication and completion

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-doc-governance-portability-p05) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-doc-governance-portability-p05 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-doc-governance-portability-p05) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: 直前 phase 完了後にのみ着手する (直列 DAG)。resource_scope (scripts/lint-doc-line-limit.py, scripts/lint-mechanism-knowledge-boundary.py, scripts/lint-portability-knowledge-optin.py, scripts/doc-line-limit-allowlist.json, tests/scripts-root/test_root__lint_doc_line_limit.py, tests/scripts-root/test_root__lint_mechanism_knowledge_boundary.py, tests/scripts-root/test_root__lint_portability_knowledge_optin.py, .github/workflows/governance-check.yml) が他 task の active lease と重複しないことを確認する
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 規約自体の変更 (qa-070 で確定済み)
- 既存超過 6 文書の分割実施 (issue-doc-granularity-remediation-20260722 / HarnessHub-3d8 側)
- Hub プロダクト本体機能 (Web/API/DB) の変更
- dev-graph への新 verb 追加
- 本 phase の責務外の成果物生成 (他 phase の write scope への書込)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: pytest (新設テスト 3 ファイル) が全件 PASS し、governance-check.yml の dry 実行で 3 lint が起動すること

## Rollout and rollback

- Rollout: 成果物を write scope の範囲で作成・更新し、acceptance を満たしたことを確認してから次 phase へ引き継ぐ
- Rollback trigger and steps: lint の誤検出が既存 CI を赤化させた場合、CI 配線 commit のみを revert し script 本体は fixture 修正後に再配線する

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

- 3 lint script が P02 の入出力契約どおりに動作し、P04 の MUST_DETECT/MUST_PASS fixture を全件満たす
- scripts/doc-line-limit-allowlist.json が schema 準拠のスケルトン (6 文書分のエントリ枠) で作成され、baseline_line_count の実値投入は P08 へ引き継がれる
- hard-coded ナレッジ参照検査が false-positive guard ケースを PASS させたまま悪性ケースを全件検出する
- .github/workflows/governance-check.yml の change-category-guard job に 3 lint が fail-closed (exit 非 0 で job 失敗) で配線されている

## 参照情報

- goal-spec: goal-spec.json (parent_feature=feat-doc-governance-portability, feature_context_digest=sha256:6855a739f483347401636b9254be473536ac2d9168cc24470f1abf05bd9286fb)
- 仕様正本: system-spec/dev-workflow.md qa-070 (ドキュメント規約 2 件、appr-008 承認)
- trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.
