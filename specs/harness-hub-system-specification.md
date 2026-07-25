---
graph_node_id: "spec-harness-hub-requirements"
artifact_kind: "specification"
artifact_subtypes: []
project_id: "harness-hub"
domain: "platform"
tags: ["system-spec-import","platform"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub システム要件仕様 (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-07-26T06:12:00Z"
status: "active"
depends_on: []
related_nodes: ["arch-harness-hub-backend","arch-harness-hub-data","arch-harness-hub-dev-workflow","arch-harness-hub-frontend","arch-harness-hub-infrastructure","arch-harness-hub-security","arch-harness-hub-testing-qa"]
resource_scope: ["specs/harness-hub-system-specification.md"]
purpose: "非エンジニアの AI 自己解決の実現 (U1) に向けた Harness Hub の要件正本への参照点を dev-graph に固定する"
goal: "全 feature/task が U1-U9 と G1-G4 へトレースできる状態を維持する"
scope_in: ["system-spec/00-requirements-definition.md","system-spec/index.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "specs/harness-hub-system-specification.md"
template_id: "specification"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"190b5c6131b7c7817919692648e4b4cecd7124a3b038dbaddc7d206c9dfe081b","evaluator":"assign-system-spec-completeness-evaluator","evidence_ref":"eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260724-testing-qa-r2.json"}
source_lineage: {"imported_at":"2026-07-24T12:35:34Z","origin_kind":"system-spec-harness","source_digest":"190b5c6131b7c7817919692648e4b4cecd7124a3b038dbaddc7d206c9dfe081b","source_path":"system-spec/00-requirements-definition.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"specification","candidate_path":"specs/harness-hub-system-specification.md","confidence":0.95}]
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

# Harness Hub システム要件仕様 (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/00-requirements-definition.md](../system-spec/00-requirements-definition.md) (sha256: `190b5c6131b7c78…`)
- [system-spec/index.md](../system-spec/index.md) (sha256: `862938b8c222c01c…`)

- confirmation: `confirmed` / evaluator: `assign-system-spec-completeness-evaluator` → **PASS** (`eval-log/system-spec-harness/assign-system-spec-completeness-evaluator/completeness-report-20260724-testing-qa-r2.json`、evaluated_digest `190b5c6131b7c78…`)
- 取込日時: 2026-07-24T12:35:34Z / plugin: system-spec-harness v0.1.0

## 目的と成功状態

要件の正本は system-spec/00-requirements-definition.md (U1-U9 憲法・意思決定 D1-D4) と各技術章。本 specification node は内容を複製せず正本を参照し、feature 分解の lineage 起点となる。

## スコープ

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 用語と主体

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## ユースケースとユーザーフロー

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 機能要件

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 非機能要件

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## UI・状態遷移

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## ビジネスルールと検証

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## API契約

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## データモデル

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 認証・認可

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**実装反映 (2026-07-26 / HarnessHub-b7ng)**:

- `qa-074`、`qa-075`、`qa-082`〜`qa-086` として auth / security / backend / database / infrastructure の web セルを R4 reopen →再確定した。
- Auth.js 本番 route、DB-backed AuthPorts、CAS 一回性、テナント付き所属主キー、Worker Secret、要求間 write 分離と rollout 順序を正本へ書き戻した。
- 反映先と検証の対応は [仕様反映受領書](../docs/features/feat-auth-tenancy/spec-reflection-receipt.md) を正とする。

## エラー・例外・回復

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## イベント・非同期処理

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 可観測性

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## 互換性・移行・リリース

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-25 / feat-domain-model-db P13 / `SYS-DOMAIN-MODEL-DB-P13`)** — 詳細正本は [docs/infrastructure-spec.md](../docs/infrastructure-spec.md) §7 / §10、実測証跡は [docs/features/feat-domain-model-db/release-record.md](../docs/features/feat-domain-model-db/release-record.md)。

- **リリースの成立条件**: production migration の台帳一致 → deploy → `/health` → 本番スモーク 6 項目 (接続 / ULID / release 不変性 / R2 往復 / audit chain / export-restore dry-run) の全 pass。1 項目でも欠ければリリース成功と数えない。
- **前方互換の約束**: schema 変更は expand-only。旧 code が新 schema 上で動作することを前提に、障害時は **code のみ巻き戻し DB は前進させたまま**とする。
- **バックアップの成功定義**: 「upload できた」ではなく「取り直したバイト列が一致した」。復元手順の正本は Turso CLI への標準入力 restore で、`--from-dump` は偽成功を作るため不採用。

## テストと受入条件

正本章 (system-spec/00-requirements-definition.md, system-spec/index.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-25 / feat-domain-model-db P13)**: P13 の受入 6 項目は文書上のチェックリストではなく `packages/db/scripts/smoke-production.ts` の exit code に係留する。検証で作成した行と R2 オブジェクトは `finally` で必ず削除し、**削除失敗自体をテスト失敗**として扱う (本番へ検証ゴミを残したまま緑にしない)。CLI の結合検査は `packages/db/__tests__/backup-restore.test.ts` が R2 CLI stub で機械検証する。

## 未決事項

- なし (C05 完成度評価 PASS 時点)
