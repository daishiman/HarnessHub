---
graph_node_id: "arch-harness-hub-infrastructure"
artifact_kind: "architecture"
artifact_subtypes: ["infrastructure"]
project_id: "harness-hub"
domain: "infrastructure"
tags: ["system-spec-import","infrastructure"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub infrastructure アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-07-26T06:10:00Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-security","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-infrastructure.md"]
purpose: "Cloudflare Workers 一体型 (OpenNext) + 無料枠運用・SLO 99.5%・エラーバジェット・監視/ポストモーテム運用の正本参照"
goal: "qa-003/qa-011/qa-019/qa-068 の確定要件 (D7: 常設 staging なし・production 1 組 + 使い捨て preview) に適合する infrastructure/運用の指針を提供する"
scope_in: ["system-spec/infrastructure.md","system-spec/maintenance-ops.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-infrastructure.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"dcaea21237f4c45e484054c3c1a3c00f04f92b40de5654cf625136d185e940bf","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260721-231238.json"}
source_lineage: {"imported_at":"2026-07-26T06:10:00Z","origin_kind":"system-spec-harness","source_digest":"37f83d648993da8f6b69ced5aca0d2cecd5d05dcb94c29ddbfd9dfce86642a55","source_path":"system-spec/infrastructure.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-infrastructure.md","confidence":0.95}]
issue_linkage: null
tracker_binding: "none"
beads_linkage: null
github_publication: {"labels":[],"milestone":null,"mode":"local_only","project_aliases":[]}
github_project_linkages: []
pull_request_linkages: []
execution_contexts: []
completion_evidence: {"completed_at":null,"evidence_refs":[],"policy":"manual","reconciled_at":null,"source":null,"status":"not_applicable"}
implementation_readiness: {"checked_at":"2026-07-17T00:35:59Z","missing_sections":[],"status":"complete"}
---

# Harness Hub infrastructure アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/infrastructure.md](../system-spec/infrastructure.md) (sha256: `e93554107124ea45…`)
- [system-spec/maintenance-ops.md](../system-spec/maintenance-ops.md) (sha256: `0329c87bf2e5be42…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`system-spec/completeness-report.json`)
- 再取込日時: 2026-07-26T06:10:00Z / plugin: system-spec-harness v0.1.0

## Architecture overview

正本: system-spec/infrastructure.md と system-spec/maintenance-ops.md。Workers Free (3MiB 制限)・R2/D1 無料枠・GitHub Actions CI/CD (pnpm 強制)・SLO 99.5% + エラーバジェット (qa-019)。doctrine anchor: Google SRE。

## Context and drivers

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Goals and non-goals

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: infrastructure — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Delivery, migration and rollback

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-25 / feat-domain-model-db P13 / `SYS-DOMAIN-MODEL-DB-P13`)** — 詳細正本は [docs/infrastructure-spec.md](../docs/infrastructure-spec.md) §7 / §10。

- **deploy パイプラインの段構成**: migrate (dry-run → 本適用) → build → `wrangler deploy` → `/health` → **本番スモーク 6 項目** → `if: failure()` rollback。単一 workflow (`ci.yml`) 内で連鎖させる制約 (qa-038【5】) を維持する。
- **migration の適用境界**: 適用台帳は drizzle 公式の `__drizzle_migrations` を単一の正とし、生 DDL の直接投入は採らない。台帳件数が journal 件数へ到達しない場合は fail-closed で deploy へ進ませない。
- **rollback の非対称性**: Worker は直前 version へ戻すが **DB は自動で戻さない**。migration が expand-only である限り旧 code は新 schema 上で整合するため、code のみ巻き戻す方が復旧が速く副作用が小さい。巻き戻しは「壊れた新 version が既に本番へ出ている」= deploy step success のときに限る。
- **バックアップの検証境界**: upload 成功ではなく **再取得したバイト列の一致**を成功条件に置く。日次保存形式を control-plane JSONL に統一し、同じ `restore-control-plane.ts` が header・schema・行数・audit chain・暗号断面を判定する。drill 専用の別形式は持たない。
- **Actions 設定境界**: secret / variable の用途・種類・必須度・利用 workflow は `scripts/ci/actions-secrets-registry.json` が正本。CI は workflow の実参照と双方向で突合し、手動 `--live` は GitHub 上の投入済み集合まで照合する。

**差分追記 (2026-07-26 / HarnessHub-b7ng)**:

- migration → 認証 Secret/環境設定確認 → Worker deploy → 2 tenant OIDC / Device Flow smoke の順で rollout する。
- migration は旧 publisher token を移送しないため、利用者告知と Device Flow 再認証を release 条件に含める。
- rollback は既存どおり DB を前進させたまま Worker code を戻す。

## Risks and verification

正本章 (system-spec/infrastructure.md, system-spec/maintenance-ops.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-25 / feat-domain-model-db P13)**

- **未達リスク**: `CLOUDFLARE_API_TOKEN` を Workers deploy と R2 write で共用しており、最小権限分離 (2 token) が未達。追跡: `issue-ci-token-least-privilege-20260725` (`HarnessHub-bda4`)。
- **未検証境界**: 更新版 `backup.yml` の成功と、main 上の `ci.yml` が migration → deploy → health → smoke を完走することは landing 後の GitHub Actions 実走待ち。追跡: `issue-actions-secrets-missing-20260725` (`HarnessHub-fnzl`)。
- **検証済み**: 本番 Turso 18 table / 12 index、D1 hedge 同一断面、R2 往復、スモーク 6/6、restore drill 2 段、rollback 3 分岐 (deploy 未成功 / rollback 成功 / rollback 失敗)。証跡は [docs/features/feat-domain-model-db/release-record.md](../docs/features/feat-domain-model-db/release-record.md)。
