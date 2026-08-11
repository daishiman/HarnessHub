---
graph_node_id: "arch-harness-hub-infrastructure-operations-addenda"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "harness-hub"
domain: "infrastructure"
tags: ["infrastructure","operations","document-split","traceability","ci-quality-gate"]
priority: "high"
start_date: "2026-08-09"
target_date: null
iteration: null
title: "Harness Hub infrastructure 運用追補"
owners: ["daishiman"]
created_at: "2026-08-09T00:00:00Z"
updated_at: "2026-08-10T00:00:00Z"
status: "active"
depends_on: ["arch-harness-hub-infrastructure"]
related_nodes: ["spec-harness-hub-requirements","spec-harness-hub-verification-tiering-20260809","issue-audit-fork-ledger-forgery-20260728","issue-shared-layers-registry-baseline-drift-20260724"]
resource_scope: ["architecture/harness-hub-infrastructure-operations-addenda.md","architecture/harness-hub-infrastructure.md","docs/features/feat-dev-pipeline-improvement/audit-ledger-transition-c19-final-review-20260808.md","package.json","docs/shared-layers.md"]
purpose: "infrastructure 本体を300行以下に保ちながら確定済み運用・CI 品質判断の追跡性を維持する"
goal: "SLO、OAuth rollout、deploy 鮮度、CI/local gate 同値の各判断から親 architecture、system-spec、受領書へ到達できる"
scope_in: ["確定済み SLO 運用","OAuth rollout","build identity と deploy 鮮度の運用履歴","CI と local verify の実装同値"]
scope_out: ["Cloudflare 構成変更","認証方式変更","SLO 値変更","新しい配備単位"]
acceptance: ["親文書との相互リンクがある","通常文書が500行を超えない","artifact placement と graph schema を通過する"]
architecture_refs: ["arch-harness-hub-infrastructure","arch-harness-hub-dev-workflow","arch-harness-hub-testing-qa"]
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-infrastructure-operations-addenda.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"1dd8b46509c53dec769288b60792b7f3bbd4e781842742b280ee131a092fa779","evaluator":"final-review","evidence_ref":"docs/features/feat-dev-pipeline-improvement/audit-ledger-transition-c19-final-review-20260808.md"}
source_lineage: {"imported_at":"2026-08-09T00:00:00Z","origin_kind":"manual","source_digest":"476b0ddc8e552604c5b4cf463dac4982a48c459136ad9e0d3ea00a67ec21a585","source_path":"architecture/harness-hub-infrastructure.md","source_plugin":"final-review","source_version":"0.1.0"}
classification_confidence: 0.99
classification_reason: "infrastructure 本体の行数上限を守るため、運用履歴を infrastructure subtype の追補へ責務分割する"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-infrastructure-operations-addenda.md","confidence":0.99}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-08-09T00:00:00Z","missing_sections":[],"status":"complete"}
---

# Harness Hub infrastructure 運用追補

本書は [infrastructure アーキテクチャ](harness-hub-infrastructure.md) から分離した運用履歴である。
製品要求の正本は各節から参照する `system-spec/` 文書に置く。

## Architecture overview

Harness Hub の infrastructure 本体から、確定済みの運用判断と rollout 記録を責務単位で分離する。

## Context and drivers

- 300行の文書上限を守りつつ、SLO、OAuth rollout、deploy 鮮度の履歴を失わない。
- 製品要求は `system-spec/`、現在の構成判断は親 architecture、履歴は本書に分ける。

## Goals and non-goals

- Goal: 親文書から各運用判断の正本と受領書へ追跡できるようにする。
- Non-goal: Cloudflare 構成、認証方式、SLO 値、配備単位を新たに変更すること。

## System context and boundaries

利用者、外部サービス、trust boundary は親文書を正とし、本書は CI・運用者・監視サービスの手順境界だけを索引化する。

## Container and component view

| Container/Component | Responsibility | Interface | Data owner | Deployment unit |
|---|---|---|---|---|
| operations addenda | 確定済み運用履歴の参照 | Markdown link | repository | N/A: 文書のみ |

## Cross-cutting contracts

- Identity/access: secret 値を repository へ保存しない。
- Observability/audit: 公開実測、release record、受領書を証拠として参照する。
- Compatibility/versioning: 親文書と system-spec の判断を上書きしない。

## Subtype architecture

- Infrastructure: 運用追補として親 `harness-hub-infrastructure.md` と組み合わせる。
- Frontend / Backend / Data / Security: N/A: 各 subtype の親文書を正とする。

## Architecture decisions

| ADR | Decision | Alternatives | Trade-on rationale | Consequences |
|---|---|---|---|---|
| OPS-SPLIT-001 | 運用履歴を登録済み追補へ分冊する | 親文書を上限超過のまま維持 | 読みやすさと追跡性 | 参照リンクと graph 登録が必須になる |
| OPS-CI-002 | CI gate と local `verify` は同じ package script を再利用する | CI 専用実装を別管理 | PR 前に同じ失敗を検知できる | root wrapper と gate 登録簿の同期が必要になる |

## Delivery, migration and rollback

親文書から節を移し、親に追補リンクを残す。リンクまたは登録が壊れた場合は、修復完了まで文書変更を公開しない。

## Risks and verification

- Risk: 分冊が orphan artifact になる。
- Verification: artifact placement、graph schema、doc line limit を実行する。

## Infrastructure architecture

### Environments and topology

環境構成と network boundary は親文書を正とし、本書では rollout 順序だけを記録する。

### Compute and storage

runtime、D1/R2/KV、容量契約は変更しない。

### IaC and delivery

既存の CI/CD と配備証跡を参照し、新しい配備経路は追加しない。

### Secrets and access

secret authority と rotation の具体値を保存せず、既存 runbook への参照だけを持つ。

### Reliability and recovery

SLO、rollback、鮮度判断は以下の確定済み各節を正とする。

### Infrastructure verification

親文書との相互リンク、行数上限、Dev Graph 登録、関連受領書の存在を検査する。

## SLO 公開実測の差分追記 (2026-08-02 / `HarnessHub-37h.15` / qa-116)

- **実測境界**: Better Stack の設定申告ではなく、認証不要の status page `/index.json` を読み、resource `external_id` を主鍵に現在状態と日次履歴を突合する。取得不能は fail-closed とする。
- **観測窓**: UTC の完了日だけを数え、進行中の当日と `not_monitored` を除外する。30 日未満は `collecting`、外形単独の目標判定は `null` を維持する。
- **最終判定**: 30 日到達後も Workers Analytics 5xx 率が揃うまで `observation_complete_pending_application_error_rate` とし、外形監視だけで 99.5% 達成を主張しない。
- **再現性と秘密**: 検証 CLI は一致 0 / 不一致 1 / 取得・入力不能 2 を返し、公開 URL だけを読む。API token と heartbeat URL を証跡へ保存しない。
- 正本は [system-spec/infrastructure.md](../system-spec/infrastructure.md) の qa-116、実装・検証・残課題は [仕様反映受領書](../docs/features/feat-hub-foundation/slo-observation-spec-reflection-receipt.md) を参照する。

## Delivery closure と SLO verdict の分離 (2026-08-02 / qa-123)

- SLO target、観測窓、複合算定、エラーバジェットは qa-019 / qa-116 を維持する。
- feature / P13 の delivery lifecycle は exact-13、release、health、bundle、共通層の証跡で閉じ、ユーザーが不要とした運用 follow-up は `not_applicable` として非 blocker にする。
- waiver を稼働品質 PASS へ変換しない。観測再開時は同一 issue の reopen または新 issue と、既存 runbook / CLI / 生データを必要とする。
- この変更は acceptance governance の境界だけで、API、DB schema、認証認可、UI、Worker deploy unit の構造を変えない。詳細は [仕様反映受領書](../docs/features/feat-hub-foundation/feature-closeout-spec-reflection-receipt.md) を参照する。

## Shared Google rollout 追補 (2026-08-01 / `HarnessHub-fnej` / qa-113・qa-114)

- 環境ごとに Google OAuth client を 1 件作り、redirect URI は `AUTH_CANONICAL_ORIGIN + /api/auth/shared/callback/tenant-oidc` の 1 本に固定する。tenant 追加ごとの client/URI 登録は行わない。
- `SHARED_GOOGLE_OAUTH_CLIENT_ID` と `SHARED_GOOGLE_OAUTH_CLIENT_SECRET` は Cloudflare Worker の環境 secret とし、repository と GitHub Actions Secrets を受渡し元にしない。共有 tenant がない環境では未設定を許す。
- rollout は backup/dry-run → migration 0003 → secret 投入 → Worker deploy → tenant mode 変更 → 共有/顧客両方式 smoke の順。個人 Google、別 Workspace、tenant state 差し替えの拒否も確認する。
- rollback は tenant を customer mode へ戻し、旧 callback の成功を確認してから Worker code を戻す。DB migration と証跡は自動で戻さない。
- secret rotation は新 secret 投入 → Worker 反映 → login 確認 → 旧 secret revoke。手順と証跡は [rollout runbook](../docs/features/feat-auth-tenancy/runbook-shared-google-oidc-rollout.md) を正とする。

## 2026-08-07 稼働ビルドの素性と deploy 反映鮮度の設計反映

サインイン後に業務画面へ到達できない事象の原因究明 (qa-185〜qa-190) を受けて、確定章 [system-spec/infrastructure.md](../system-spec/infrastructure.md) の qa-187 が次を確定した。本節はその参照索引であり、内容の正本は確定章側にある。

- **isolate 再利用と環境値の stale 化 (qa-187-a/-b)**: binding だけを変更する deploy では Cloudflare が実行中の isolate を再利用し得るため、env 由来の値を module 最上位 (global scope) で保持すると、binding 差し替え後も stale な値が持続し得る。公式が名指しする anti-pattern であり、正しい形は request ごとに解決することである。
- **断定の強さと根拠の強さを揃える (qa-187-c)**: 上記は「機序として公式記述で確認済み」であって「本番でそれが起きた」ことの確認ではない。本番の isolate 生成時刻と secret 投入時刻の前後関係は取得していないため、未ゲート経路など他の候補も併存させる。
- **設計への反映 (qa-187-d)**: 認証に関わる構築物を module scope に保持せず request ごとに解決することを acceptance に置き、module 最上位での環境値依存構築を検査で検出する。検査の説明文には「何を防ぐ検査か」(isolate 再利用による stale) を書き添える。

本設計を実行へ落とす macro feature は `feat-build-identity-deploy-freshness` (稼働ビルドの素性確認 V6 と deploy 反映鮮度検出 V7) および `feat-runtime-env-resolution-discipline` (実行時環境変数の解決規律) である。

## 2026-08-08 稼働ビルドの素性と反映鮮度 — 実装確定

上節の macro feature `feat-build-identity-deploy-freshness` を実装した。要点は 5 つ:

1. `/health` へ optional `commit` (40 桁 hex) を載せ、deploy 時 `--var HUB_COMMIT_SHA` で注入する。
2. version gate 直後に鮮度検査を置き、deploy 経路自体の長期停止を捉える。
3. 不一致ではなく HEAD 到達からの乖離継続時間で判定し、しきい値正本は script 定数 1 箇所に置く。
4. 鮮度検査失敗は rollback 対象外とする（smoke 未実行＝新版故障の証拠なし）。
5. `HarnessHub-u9zq` では、鮮度検査の後・最初の smoke の前に deployment version と `/health.version` の連続一致を再確認する。colo 間の伝播ムラ、不一致、通信失敗、version 欠落は fail-closed とし、smoke 未実行なので rollback は打たない。

契約正本: [build-identity 実装追補](../specs/harness-hub-build-identity-deploy-freshness-addendum.md) / 判断根拠: [architecture decision](../docs/features/feat-build-identity-deploy-freshness/architecture-decision.md)。本番実測は未取得であり、deploy 後に `release-record.md` へ追記する。

## 2026-08-10 CI 品質ゲートと local `verify` の同値化

`system-spec/dev-workflow.md` の `qa-216` が継承する CI/local 同値契約を、既存の
package script を再利用する構成として具体化した。root `package.json` の wrapper は
G7、G7b、G9、G14 の各実装へ委譲し、package script が存在しない場合は
fail-closed にする。検査ロジック自体を root や workflow へ複製しない。

G11 は main 反映後の定期 Core Web Vitals 計測なので、PR 前の `pnpm verify` には
含めない。正確な対応表は [検証 tier 仕様追補](../specs/harness-hub-verification-tiering-addendum.md)、
実装・検証・影響判断は [仕様反映受領書](../docs/features/feat-hub-foundation/ci-local-gate-registry-spec-reflection-receipt.md)
を参照する。製品 API、DB schema、認証認可、UI、Cloudflare deploy unit は変更しない。

## 2026-08-11 ローカル開発ランタイムの監視境界

macOS のローカル検証は `launchd → local-dev-supervisor → sqld / Next.js` の二段監視とする。
`.local-state/hub/` を DB・秘密設定・PID・ローテーション済みログの単一 owner とし、起動時は
sqld readiness 後に Next.js を開始する。両 server は loopback だけで待ち受ける。

障害判定は process の存在だけでなく、sqld `/health`、Hub `/health`、Hub `/`、認証・tenant・
workspace scope 付き `/api/v1/sheets` の3件応答までを分けて行う。Cookie 発行は read-only とし、
seed 再投入を復旧手順にしない。詳細は [運用手順](../docs/features/feat-hub-foundation/local-development.md) と
[仕様反映受領書](../docs/features/feat-hub-foundation/local-dev-runtime-reliability-spec-reflection-receipt.md) を参照する。

## 2026-08-11 system-spec 移行後 backfill 境界

schema 1.1 の確定 QA へ設計知識を遡及反映するとき、matrix の reopen や Q&A 原文の複製は行わない。
単一 writer の `set-qa-design-applications` が既存 QA を ID で解決し、検証済みの設計適用だけを
追記する。同一 payload は再実行可能、異なる既存 payload は上書き拒否とし、成功時だけ一時的な
`legacy_exempt` metadata を除去する。この writer は免除フラグと理由を持つ旧 QA に限定し、
対話時に作成済みの解釈を事後補完扱いに変えない。事後補完であることは `design_application_provenance` に残し、
対話時取得と区別する。compiler は `unrecorded|dialogue|legacy_backfill` の3値を描画し、
completeness evaluator は未記録を PASS にせず、事後補完は回答との適合を再照合する。
validator は未参照 QA も含む全 provenance の完全一致を検査する。これにより、履歴の不変性・由来追跡・strict completeness を両立する。
