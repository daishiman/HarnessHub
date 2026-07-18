# System task overlay: アーキテクチャ設計 — HearingSheet/FormData/AiJob(hearing kind) スキーマ・受付番号採番・AI キュー API 契約の設計

## Machine-readable registration fields

- feature_package_id: feature-package/feat-hearing-intake (13 task で共有)
- owners: ["daishiman"]
- tags: ["feat-hearing-intake", "studio-extension", "async-ai-queue", "architecture"]
- related_nodes: ["feat-hearing-intake", "arch-harness-hub-frontend", "arch-harness-hub-backend", "arch-harness-hub-data"]
- parent_feature: feat-hearing-intake
- phase_ref: P02
- classification: confidence=0.9, reason="qa-024 の指示 (カラム定義の詳細設計は各 feature の P02 で行う) に従い HearingSheet/FormData/AiJob(hearing kind) のスキーマと受付番号採番・AI キュー API 契約を確定する P02 タスク", candidates=[{artifact_kind: task, confidence: 0.9, candidate_path: tasks/feat-hearing-intake/sys-hearing-intake-p02.md}]
- tracker_binding_intent: beads
- github_publication: mode=local_only, project_aliases=[], labels=[], milestone=なし (.dev-graph/config.json の execution_tracker.mode=beads、github.enabled=false に従う)
- pr_completion_policy: linked_pr_merged_all (.dev-graph/config.json github.completion_policy.required_pull_requests=all に従う)
- branch_policy: one-task-one-branch + worktree lease required + default-branch reconciliation + assignment_owner=dev-graph-scheduler

## 目的

S10 (4 ステップウィザード)・S11/S12 (シート一覧/詳細) の画面構成、HearingSheet/FormData/AiJob (hearing kind) のカラム設計、受付番号採番方式、AI キュー (D5 pull 型) ジョブ投入/書戻し受領 API の契約設計、ウィザード共通部品/Markdown レンダラ/通知ディスパッチ共通層への接続点を確定し、P05 実装が迷いなく着手できる設計成果物を作る。

## 背景

qa-024 は『カラム定義の詳細設計は各 feature の P02 で行う』と定めており、HearingSheet (受付番号・status・生成物参照)・FormData (ウィザード入力)・AiJob (D5 pull 型キュー: kind/status/payload/result) のカラム設計は本 task の責務である。全新規テーブルは tenant_id/workspace_id スコープ列を必須とする (D4)。試算表示はサーバ計算値の表示専用としクライアント再計算・自己申告を行わない (SEC5)。

**AiJob 共通層の扱い**: docs/shared-layers.md §2 は「AI 処理キュー (pull 型)」をシート生成・FB 対応・doc 下書きの job queue として追加共通層に位置づけ、同文書冒頭は複数 feature が使うものの実装 owner を feat-hub-foundation に一元化する方針を示す。同キューは feat-feedback-loop (FB 対応)・feat-docs-cms (doc 下書き) も消費予定であり、3 feature に共通する AiJob 汎化スキーマの確定は hearing-intake 単独では決定できない上流論点である。docs/shared-layers.md §5 は「共通層に第 3 の利用者が現れたときに初めて共通化する (2 回目までは重複を許す) — 早すぎる抽象化の禁止」と定めており、本 feature は 3 消費者中の最初期の実装であるため、AiJob の汎化スキーマを本 task で確定させることは早すぎる抽象化にあたる。よって本 task は packages/db/schema/hearing-intake/ 配下に hearing 用 job kind の投入/受領に必要な最小限のカラム (kind="hearing" 固定・payload/result の hearing 固有形状) のみを設計し、AiJob キュー共通層そのものの汎化・一般化は共通層 owner (feat-hub-foundation) が解決すべき未解決の上流設計論点としてスコープ外に明記する。

## 前提条件

- Required spec/architecture/phase/task nodes: feat-hearing-intake, sys-hearing-intake-p01
- Entry gate: docs/features/feat-hearing-intake/requirements-baseline.md が P01 で作成済みであること
- Source pin: system-spec-harness v0.1.0 / run-system-spec-compile / assign-system-spec-completeness-evaluator
- Repository context: repo_identity=github:daishiman/HarnessHub、root_resolution_source=explicit-cli (validate-system-plan.py 実行時に --repo-root を明示指定する運用)、config=.dev-graph/config.json。全 path は repository 相対とし absolute path は使用しない

## Workstream applicability

- Frontend: applicable + change: S10 (4 ステップウィザード: 課題入力→影響範囲→頻度/時間→確認、各ステップで packages/ui のステップウィザード共通部品を消費) と S11 (シート一覧)/S12 (シート詳細、status 変更は admin 限定) の画面構成を確定する
- Backend: applicable + change: 受付番号採番ロジック、AI キュー (D5 pull 型) ジョブ投入 API・Claude Code セッションからの書戻し受領 API のハンドラ構成 (認可・監査) を確定する
- API: applicable + change: packages/schemas/hearing-intake/ に HearingSheet/FormData/AiJob (hearing kind) の入出力契約を zod 単一ソースへ追加する設計を確定する (qa-023 B1)
- Data: applicable + change: HearingSheet (受付番号・status・生成物参照)・FormData (ウィザード入力)・AiJob (hearing kind: kind/status/payload/result) のカラム設計、tenant_id/workspace_id スコープ列必須化 (D4) を確定する (qa-024)
- Infrastructure: N/A: デプロイ単位・CI/CD は feat-hub-foundation が既に確立しており、本 feature は追加インフラを新設しない
- Security: applicable + change: AI キューの pull/書戻し認可を Device Flow token 保有者に限定し job payload に secret を含めない設計 (SEC8)、Markdown sanitize の適用点 (SEC7)、role×操作許可表における S11/S12 の status 変更 admin 限定の実装方針 (SEC2) を確定する
- Quality: applicable + change: S10-S12 の axe a11y 検査対象範囲と非同期 UI (受付番号+生成中ステータス) の状態遷移テスト観点を確定する
- Documentation: applicable + change: docs/features/feat-hearing-intake/architecture-decision-record.md を新規作成する
- Operations: N/A: 運用手順の具体化は P12 で行う。本 task は設計確定のみ

## Architecture and deploy unit

- Architecture decisions: arch-harness-hub-frontend, arch-harness-hub-backend, arch-harness-hub-data
- Deploy unit/environment: cloudflare-workers/hub (feat-hub-foundation が確立した既存 Worker 上に S10-S12 を追加する。本 task は設計確定のみでデプロイは行わない)
- Compatibility/migration/backfill: HearingSheet/FormData/AiJob (hearing kind 追加分) はいずれも新規テーブルであり既存データへの影響はない。migration 適用手順は P08 で扱う

## 成果物

- Produced artifacts: docs/features/feat-hearing-intake/architecture-decision-record.md (S10-S12 画面構成、HearingSheet/FormData/AiJob(hearing kind) カラム設計、受付番号採番方式、AI キュー API 契約、AiJob 共通層汎化に関する未解決論点の明記)
- Consumed artifacts: docs/features/feat-hearing-intake/requirements-baseline.md, system-spec/database.md, system-spec/security.md, system-spec/backend.md, docs/shared-layers.md, docs/screen-inventory.md, architecture/harness-hub-frontend.md, architecture/harness-hub-backend.md, architecture/harness-hub-data.md
- Write scope/touches: docs/features/feat-hearing-intake/architecture-decision-record.md

## Tracker publication and completion

> 本 spec は tracker_binding_intent と GitHub 公開 intent だけを宣言し、永続 binding の解決・起票・完了収束は dev-graph が所有する。

- Tracker binding intent: beads (.dev-graph/config.json execution_tracker.mode=beads)
- Publication mode: local_only
- Project aliases / labels / milestone: N/A: github.enabled=false のため GitHub 公開を行わない (.dev-graph/config.json)
- PR completion policy: linked_pr_merged_all
- PR body contract: Closes に紐づく beads issue 番号 + dev-graph graph_node_id (sys-hearing-intake-p02) を本文に明記し、default branch を対象にする
- Ownership boundary: system-dev-planner は intent の宣言のみを行い、dev-graph が実際の binding 解決・mutation・reconciliation を行う

## Branch and worktree execution

- Branch: dev-graph 登録後に C15 が devgraph/sys-hearing-intake-p02 として払い出す。system-dev-planner は事前に branch 名を確定しない
- Worktree lease: 実装着手前に graph_node_id (sys-hearing-intake-p02) の worktree lease を claim し、heartbeat 送出と完了時 release を行う
- Parallel safety: depends_on=[sys-hearing-intake-p01] が完了するまで着手しない
- Completion projection: feature branch 上の完了は pending event として記録され、default branch (main) へのクリーンな reconciliation で durable done へ確定する

## スコープ外

- AI 実行基盤のサーバ側実装 (D5 で不採用。goal-spec scope_out)
- AiJob キュー共通層そのものの汎化設計 (共通層 owner feat-hub-foundation が解決すべき未解決の上流論点。docs/shared-layers.md §2/§5。第 3 の利用者出現時に共通化する方針に従い本 feature では汎化しない)
- 構築工程の進行管理 (feat-build-pipeline-board の scope)
- 試算エンジン本体 (annualHours・分/回・削減率を用いた実際の削減額計算) の設計 (owner 未確定の上流論点。本 feature は TenantCoefficient 係数の読取消費のみを行う)
- 認証方式・role 体系そのものの設計変更 (feat-auth-tenancy の scope)

## Verification and evidence

- Automated commands: `python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --staging .dev-graph/staging`
- Required evidence: architecture-decision-record.md に HearingSheet/FormData/AiJob(hearing kind) のカラム一覧、受付番号採番方式、AI キュー API 契約、AiJob 共通層汎化の未解決論点の明記、S10-S12 の画面構成表が記載されている

## Rollout and rollback

- Rollout: architecture-decision-record.md を作成し、P03 の独立設計レビューへ引き継ぐ
- Rollback trigger and steps: P03 レビューで設計案が却下された場合、architecture-decision-record.md へ却下理由を追記し、本 task を再実行して代替設計を再評価する

## Handoff

- Executor: system build route (dev-graph 経由での実装 claim)
- Ready when: confirmed かつ evaluation pass かつ readiness complete かつ promoted digest 確定かつ dev-graph registration complete の 4 条件が揃った時点

## 参照情報

- System specification: system-spec/database.md (qa-024), system-spec/security.md (qa-025 SEC2/SEC5/SEC7/SEC8), system-spec/backend.md (qa-023 B1/B5), system-spec/00-requirements-definition.md (D4, D5), docs/shared-layers.md §2/§5
- Architecture: arch-harness-hub-frontend (architecture/harness-hub-frontend.md), arch-harness-hub-backend (architecture/harness-hub-backend.md), arch-harness-hub-data (architecture/harness-hub-data.md)
- Feature: feat-hearing-intake
- Phase doc: N/A: feature-execution-package-contract.md §2 により本 run は個別 phase lifecycle 文書を生成せず、13 task specs 自体が lifecycle を実行するため phase doc node を持たない
- Dependencies: sys-hearing-intake-p01
