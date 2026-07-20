# System task overlay: ドキュメント/運用 — S17/S18運用手順・PIIガード運用・通知ディスパッチ運用のドキュメント化

## Machine-readable registration fields

- feature_package_id: feature-package/feat-user-org-admin (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-user-org-admin", "studio-extension", "security", "documentation-operations"]
- related_nodes: ["feat-user-org-admin", "arch-harness-hub-security", "arch-harness-hub-backend", "arch-harness-hub-frontend"]
- parent_feature: feat-user-org-admin
- phase_ref: P12
- classification: confidence=0.87, reason="P13の本番反映に先立ちS17/S18のPIIガード運用・通知ディスパッチ運用のrunbookを整備するP12タスク", candidates=[{artifact_kind: task, confidence: 0.87, candidate_path: tasks/feat-user-org-admin/sys-user-org-admin-p12.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

P13 の本番反映に先立ち、S17/S18 の運用 runbook (salary PII ガード運用手順・監査ログ確認手順・通知ディスパッチ障害時対応・ロールバック手順) を整備する。

## 背景

salary は PII 列として運用上の注意点 (admin 限定表示・export マスク・読取監査ログの定期確認) が継続的に発生するため、実装完了後も参照可能な運用文書が必要になる (SEC4)。通知ディスパッチは D6 の日次 100 通制限により週次サマリがバッチ分割+失敗リトライで送られる運用のため、その監視・再送手順も文書化する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-user-org-admin, sys-user-org-admin-p11
- Entry gate: docs/features/feat-user-org-admin/evidence/ が P11 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: N/A: 本 task は運用文書作成のみで frontend 実装物を変更しない
- Backend: N/A: 本 task は運用文書作成のみで backend 実装物を変更しない
- API: N/A: 本 task は運用文書作成のみでAPI契約を変更しない
- Data: N/A: 本 task は運用文書作成のみでスキーマを変更しない
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation の共通機構をそのまま利用する
- Security: applicable + change: salary PII ガードの運用手順 (読取監査ログの定期確認・export マスク動作確認) を文書化する (SEC4)
- Quality: N/A: 品質ゲート確認はP09で完了済み
- Documentation: applicable + change: docs/features/feat-user-org-admin/runbook.md を新規作成する
- Operations: applicable + change: 通知ディスパッチの日次100通制限に伴うバッチ分割・失敗リトライの監視手順 (D6/qa-027) と障害対応・ロールバック手順を文書化する

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-security, arch-harness-hub-backend
- Deploy unit/environment: cloudflare-workers/hub (運用文書作成のみでデプロイは行わない)
- Compatibility/migration/backfill: N/A: 本 task は運用文書作成のみで対象物への変更を行わない

## 成果物

- Produced artifacts: docs/features/feat-user-org-admin/runbook.md (PIIガード運用・監査ログ確認・通知ディスパッチ監視・障害対応・ロールバックの5手順)
- Consumed artifacts: docs/features/feat-user-org-admin/evidence/, docs/features/feat-user-org-admin/architecture-decision-record.md, docs/shared-layers.md
- Write scope/touches: docs/features/feat-user-org-admin/runbook.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-user-org-admin-p12) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-user-org-admin-p12 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-user-org-admin-p12) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-user-org-admin-p11] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- 共通層 (PIIガード/通知ディスパッチ) 自体の運用手順文書化 (feat-hub-foundation の write_scope。本 task は本 feature 固有の利用手順のみを扱う)
- 実際の本番デプロイ実施 (P13 で実施)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .`
- Required evidence: docs/features/feat-user-org-admin/runbook.md に PIIガード運用・監査ログ確認・通知ディスパッチ監視・障害対応・ロールバックの 5 手順が記載されている

## Rollout and rollback

- Rollout: runbook.md を作成し、P13 (release-deploy) へ引き継ぐ
- Rollback trigger and steps: runbook.md の記載内容が P09 の readiness 確認結果と矛盾する場合、矛盾箇所を記録した上で sys-user-org-admin-p09 を再確認対象として dev-graph へ差し戻す

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## Current canonical feature baseline

- Feature context: `features/feat-user-org-admin.context.json` (`sha256:4271086e4eacd8a7327ab3fc9b9e080b2d024ac66858b2a4965d0afbda33a265`)
- Phase responsibility: 検証済み実装の運用・runbook・handover を文書化し、先行 phase の前提にしない。
- Purpose: ユーザー管理 (S17) とアカウント設定 (S18) を提供し、role 管理 (qa-005 の 4 role と統合)・年収→時給換算の係数設定 (PII: admin 限定・API 非公開・export マスク = SEC4)・通知設定 (D6 Resend)・規約公開を確立する (I14)
- Goal: workspace-admin がユーザーの role・部門・年収係数を管理でき、salary が PII ガード (admin 限定表示・読取監査・export マスク) 下にあり、通知設定が通知ディスパッチ共通層と接続され、全利用者が規約・ポリシーを参照できる状態
- Scope in (all items are in-scope for the package; this phase owns the subset matching its responsibility):
- S17 ユーザー管理 + 個別ダッシュボード
- S18 アカウント設定 (プロフィール/通知/表示)
- S18 配下の /legal 規約・ポリシー静的ページ (全利用者が閲覧可能)
- User 拡張 (department/salary) + TenantCoefficient エンティティ
- PII ガード共通層 (salary の admin 限定・監査・export マスク)
- 通知設定と D6 (Resend) 通知ディスパッチの接続
- Scope out:
- 認証方式の変更 (D3 の IdP 委譲を維持。パスワード/2FA 自前実装は不採用)
- role 体系の再設計 (qa-005 の 4 role を維持)
- Acceptance (P04/P06/P07/P10/P11 must preserve exact coverage):
- salary が admin 以外の API/画面/export に露出しない (分離テスト + 監査記録)
- 係数変更が監査 event に記録される (SEC6)
- S17/S18 と /legal が axe 違反 0 で動作し、/legal は全利用者が閲覧できる
- Architecture/source refs:
- architecture/harness-hub-security.md
- architecture/harness-hub-backend.md
- architecture/harness-hub-frontend.md
- specs/harness-hub-system-specification.md

This section is the current source closure and supersedes older counts or wording in this task when they conflict with the pinned feature context.

## Current phase closure

- Required responsibility: 規約・ポリシー更新ownerと /legal 内容更新手順をrunbook/handoverへ含める。
- Dependency rule: this phase consumes only earlier P01..P11 outputs; later phase documentation or evidence is never an entry prerequisite.

## Normative implementation closure (2026-07-19)

This section is normative for P12 and replaces any earlier generic count, owner, artifact, write-scope, authentication, or evidence wording in this task that conflicts with the current canonical sources.

- Canonical sources: features/feat-user-org-admin.context.json; docs/frontend-spec.md S17/S18//legal; docs/security-spec.md PII/a11y contracts
- Effective phase contract: 現行 quality_constraints は legal-static-page-all-users を含む9件である。P01で9 IDをexact-set転記し、P04/P06は/legalの全role access・非ログイン方針・静的内容・axe=0・salary/PII非露出を検証する。P07/P09/P10/P11は第3 acceptanceと第9制約を同じevidence IDで追跡し、P05で実装、P12で内容更新owner、P13でroute smokeを確認する。
- Effective implementation/evidence paths (this phase writes only the subset appropriate to its responsibility):
- `apps/hub/src/app/legal/`
- `apps/hub/src/app/legal/__tests__/`
- Mandatory evidence: quality constraint 9 ID exact-set、current context digest、/legal role matrix、axe report、PII non-exposure、release smokeを必須とする。
- Trace rule: P04 defines executable test IDs; P05 implements their subjects; P06 executes them; P07/P10 adjudicate only executed evidence; P09 makes applicable checks fail-closed; P11 preserves source digest and rerun commands; P12/P13 cannot substitute documentation or planned work for missing implementation/evidence.

## 参照情報

- System specification: system-spec/security.md (qa-025 SEC4/SEC9), system-spec/00-requirements-definition.md (D6)
- Architecture: arch-harness-hub-security (architecture/harness-hub-security.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-frontend (architecture/harness-hub-frontend.md)
- Feature: feat-user-org-admin
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-user-org-admin-p11
