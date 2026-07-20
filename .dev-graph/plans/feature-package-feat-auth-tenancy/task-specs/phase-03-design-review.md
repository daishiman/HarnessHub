# System task overlay: 独立設計レビュー — スキーマ owner 境界・role 分割線・単一ミドルウェア設計の妥当性確認

## Machine-readable registration fields

- feature_package_id: feature-package/feat-auth-tenancy (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-auth-tenancy", "macro-feature", "security", "design-review"]
- related_nodes: ["feat-auth-tenancy", "arch-harness-hub-security", "arch-harness-hub-backend"]
- parent_feature: feat-auth-tenancy
- phase_ref: P03
- classification: confidence=0.88, reason="P02 で確定したアーキテクチャ決定 (session_revocations/users スキーマ owner・role 3 値/4 値分割線・単一認可ミドルウェア) を P02 実行者から独立した視点で再検証する P03 タスク", candidates=[{artifact_kind: task, confidence: 0.88, candidate_path: tasks/feat-auth-tenancy/sys-auth-tenancy-p03.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし
- pr_completion_policy: linked_pr_merged_all
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P02 の architecture-decision-record.md を P02 実行と独立した視点でレビューし、(1) session_revocations/users/publisher_tokens/device_authorizations のスキーマ owner が feat-domain-model-db であるという architecture decision が同 feature の実際の write_scope と衝突しないこと、(2) role 4 種と users.role 列 3 値の分割線が docs/backend-spec.md §2.2/§3.3 と過不足なく一致すること、(3) 単一認可ミドルウェア設計が deny-by-default および qa-020 (認可判定の一箇所集約) を満たすこと、(4) OIDC 検証契約 (issuer/aud 厳密一致・nonce/state・PKCE S256・email_verified 必須・JIT 非自動昇格) が qa-005/qa-036 と一致すること、を確認し design-review-notes.md として記録する。

## 背景

feature-execution-package-contract.md は各 task が独立した検証可能な単位であることを要求しており、P02 のような cross-feature 境界に関わる判断 (特に session_revocations/users のスキーマ owner のような他 feature との境界判断) は実行者自身の確認だけでなく独立レビューを経ることで、write_scope 衝突や境界誤認による手戻りリスクを下げる。本 task は P02 の 3 系統の証跡 (①docs/backend-spec.md §2.2 が session_revocations/users/publisher_tokens/device_authorizations を feat-domain-model-db の write_scope であるコアドメイン 18 テーブルの一部として定義しているという文書証跡、②`.dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md` が既に users テーブルを含むコアドメイン 18 テーブル全体の owner を feat-domain-model-db と確定済みであるという先行 architecture decision との整合、③本 feature の write_scope が `packages/db/schema/` を明示的に不可侵と定めているという構造的制約) を再度独立に参照し、結論の再現性を確認する。あわせて、users.role 列が `provider-admin/workspace-admin/member` の 3 値のみであり owner は `projects.owner_user_id` との関係から認可判定時に合成される、という P02 の architecture decision が docs/backend-spec.md §2.2 (users 定義) および §3.3 (認可マトリクス, owner 列が「対象 Project」注記付きであること) と矛盾しないことを確認する。さらに、単一認可ミドルウェアへの判定集約が qa-020 (backend/security へのコード構造規約適用、認可判定の散在禁止) と一致することを確認する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-auth-tenancy, arch-harness-hub-security, arch-harness-hub-backend
- Entry gate: .dev-graph/staging/goal-spec.json の feature_context_digest が sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5 に一致し、confirmation_status=confirmed であること。P02 の docs/features/feat-auth-tenancy/architecture-decision-record.md が存在すること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli、config=.dev-graph/config.json

## Workstream applicability

- Frontend: N/A: 本 task は UI レビューを含まない
- Backend: applicable + change: architecture-decision-record.md の技術的妥当性 (Auth.js adapter 境界・単一認可ミドルウェア・Device Flow エンドポイント設計) をレビューする
- API: applicable + change: Device Flow エンドポイント契約の docs/backend-spec.md §4.1 との一致性をレビューする
- Data: N/A: 本 feature はスキーマ定義を持たない。owner 境界判断自体は Security 観点でレビューする
- Infrastructure: N/A: 新規インフラ変更なし
- Security: applicable + change: role 3 値/4 値分割線・OIDC 検証契約・session 数値契約・単一ミドルウェア deny-by-default 設計のレビューを行う
- Quality: applicable + change: session_revocations/users スキーマ owner 判断の再現性検証を行う (quality_constraints の必須解消事項)
- Documentation: applicable + change: docs/features/feat-auth-tenancy/design-review-notes.md を新規作成する
- Operations: N/A: 運用手順は本 task の対象外

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend (P02 の architecture decision をレビュー対象とする)
- Deploy unit/environment: cloudflare-workers/hub
- Compatibility/migration/backfill: N/A: 本 task はレビューのみで実装への変更を伴わない

## 成果物

- Produced artifacts: docs/features/feat-auth-tenancy/design-review-notes.md (レビュー観点ごとの判定結果と根拠、必要に応じた是正指摘事項を含む)
- Consumed artifacts: docs/features/feat-auth-tenancy/architecture-decision-record.md, docs/backend-spec.md, .dev-graph/plans/feature-package-feat-domain-model-db/task-specs/phase-02-architecture.md
- Write scope/touches: docs/features/feat-auth-tenancy/design-review-notes.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + graph_node_id (sys-auth-tenancy-p03) を本文に明記
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-auth-tenancy-p03 として払い出す
- Worktree lease: 実装着手前に graph_node_id (sys-auth-tenancy-p03) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[SYS-AUTH-TENANCY-P02]。resource_scope (docs/features/feat-auth-tenancy/design-review-notes.md) は他 task と重複しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) への reconciliation で durable done へ確定する

## スコープ外

- architecture-decision-record.md 自体の書き換え (是正が必要な場合は P02 への差し戻しを記録するのみで、本 task では編集しない)
- 実装コードのレビュー (実装は未着手のため対象外。実装レビューは P07/P10 で行う)
- feat-domain-model-db 側の architecture-decision-record.md の再レビュー (同 feature 自身の P03 が既に完了済みの責務)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: docs/features/feat-auth-tenancy/design-review-notes.md に 4 レビュー観点 (スキーマ owner 境界・role 分割線・単一認可ミドルウェア deny-by-default・OIDC 検証契約) それぞれの判定 (承認/要是正) が記録されていること

## Rollout and rollback

- Rollout: design-review-notes.md で全観点が承認された時点で P04 (テストファースト設計) へ引き継ぐ
- Rollback trigger and steps: いずれかの観点で要是正と判定された場合、P02 の architecture-decision-record.md への差し戻しを記録し、P02 再実行後に本 task を再度実行する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/00-requirements-definition.md (D3, D4, I7, I8, G4), system-spec/spec-state.json qa_log (qa-005, qa-006, qa-008, qa-020, qa-036)
- Detailed authoritative source: docs/backend-spec.md §2.2, §3.2, §3.3
- Architecture: arch-harness-hub-security, arch-harness-hub-backend
- Feature: feat-auth-tenancy
- Phase doc: N/A: feature-execution-package-contract.md §2 により個別 phase lifecycle 文書は生成しない
- Dependencies: SYS-AUTH-TENANCY-P02
