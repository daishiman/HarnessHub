---
graph_node_id: "arch-harness-hub-data"
artifact_kind: "architecture"
artifact_subtypes: ["data"]
project_id: "harness-hub"
domain: "data"
tags: ["system-spec-import","data"]
priority: "high"
start_date: null
target_date: null
iteration: null
title: "Harness Hub data アーキテクチャ (system-spec 取込)"
owners: ["daishiman"]
created_at: "2026-07-17T00:35:59Z"
updated_at: "2026-08-02T09:37:52.431478Z"
status: "active"
depends_on: ["spec-harness-hub-requirements"]
related_nodes: ["arch-harness-hub-frontend","arch-harness-hub-backend","arch-harness-hub-security","arch-harness-hub-infrastructure","arch-harness-hub-dev-workflow"]
resource_scope: ["architecture/harness-hub-data.md"]
purpose: "Turso Free (libSQL) + Drizzle ORM control-plane DB と D1 退避経路 (D2 ヘッジ)・SRE バックアップ検証の正本参照"
goal: "qa-004/qa-019 の確定要件 (SQLite 方言互換・日次 export・restore drill) に適合する data 層の指針を提供する"
scope_in: ["system-spec/database.md"]
scope_out: ["正本章の内容複製","未確定章の取込"]
acceptance: ["正本章が confirmed かつ evaluator PASS","source_digest が正本と一致"]
architecture_refs: []
parent_feature: null
feature_package_id: null
phase_ref: null
file_path: "architecture/harness-hub-data.md"
template_id: "architecture"
template_version: "1.0.0"
confirmation_status: "confirmed"
evaluation_status: "pass"
confirmation_evidence: {"evaluated_digest":"bda6fe3fb33ce9aaa79d6b29701c63e0b5803917b9bfcf797c72409fe365de36","evaluator":"validate-coverage-matrix.py --require-complete","evidence_ref":"system-spec/completeness-report.json"}
source_lineage: {"imported_at":"2026-08-02T09:32:20Z","origin_kind":"system-spec-harness","source_digest":"9ee58696d797a2fc235f290c4bdc77c3f16001080b39d341dd0cc8778eebafcb","source_path":"system-spec/database.md","source_plugin":"system-spec-harness","source_version":"0.1.0"}
classification_confidence: 0.95
classification_reason: "system-spec-harness 確定章の R3-import 正規取込 (confirmed + evaluator PASS)"
classification_candidates: [{"artifact_kind":"architecture","candidate_path":"architecture/harness-hub-data.md","confidence":0.95}]
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

# Harness Hub data アーキテクチャ (system-spec 取込)

> 本 artifact は system-spec 確定章への **参照型 wrapper** (R3-import)。内容は複製せず、正本の変更は source_digest 不一致として検出される。

## 正本 (source of truth)

- [system-spec/database.md](../system-spec/database.md) (sha256: `9ee58696d797a2fc…`)

- confirmation: `confirmed` / evaluator: `validate-coverage-matrix.py` → **PASS** (`system-spec/spec-state.json`)
- 再取込日時: 2026-08-02T08:12:28Z / plugin: system-spec-harness v0.1.0

## 要件定義書 (上位概念)

この wrapper は data 層の設計判断を上位要件へ追跡する索引であり、要件本文の正本は `system-spec/database.md` に置く。

### U1 本質的目的 (essential_purpose)

利用者の設定と実行履歴を、消失や tenant 間混同を防ぎながら継続的に保存する。

### U2 背景 (background)

単一サービスへの固定や復元未検証のバックアップは、障害時の継続性とデータ信頼性を損なう。

### U3 ゴール (goals)

SQLite 互換のデータ境界、移植可能な ORM、検証済みの export/restore 経路を維持する。

### U4 目標 (objectives)

Turso/libSQL を現行系、D1 を退避可能な経路とし、expand/contract で安全に schema を更新する。

### U5 成功基準 (success_criteria)

境界値・migration・tenant 分離試験と定期 restore drill が成功することを成功とする。

### U6 ステークホルダー (stakeholders)

利用者、Workspace 管理者、data/backend 開発者、バックアップと障害復旧の担当者を対象とする。

### U7 スコープ (scope)

control-plane DB、schema migration、保存形式、export、restore、データアクセス境界を扱う。

### U8 制約 (constraints)

破壊的 migration、検証されない JSON、復元不能なバックアップ、tenant 無指定アクセスを禁止する。

### U9 具体的にやりたいこと (concrete_intents)

通常運用では一貫して保存し、障害時には証跡付きで別経路へ復元できるようにする。

### 意思決定支援 (decisions)

固有機能と移植性が競合するときは、SQLite 方言互換と復元可能性を優先する。

## Architecture overview

正本: system-spec/database.md。Turso Free + Drizzle (D1 両対応で退避経路温存)、R2 = immutable PackageRegistry、日次 export + 四半期 restore drill (qa-019)。doctrine anchor: Clean Architecture (data-access) + Google SRE (reliability)。

## Context and drivers

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-08-02 / `HarnessHub-uk2i` / qa-126)**:

- migration 0004 は既存行を active のまま保つ expand-only の 10 列追加とする。
  管理 API の新規行だけは pending を明示する。
- 現行 credential と staging を別列に保持し、テスト済みの client ID・暗号化 secret・方式・
  許可ドメインを 1 UPDATE で昇格する。取消は staging だけを消す。
- `allowed_workspace_domains` は NULL 許容で、顧客方式では未検査、共有方式では拒否を意味する。
  JSON は read 境界で schema 検証する。

## Goals and non-goals

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## System context and boundaries

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Container and component view

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Cross-cutting contracts

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Subtype architecture

- subtype: data — 詳細は正本章を参照 (複製しない)

## Architecture decisions

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

**差分追記 (2026-07-26 / HarnessHub-b7ng)**:

- `user_workspaces` の主キーを `(tenant_id,user_id,workspace_id)` とし、別 tenant の同一 ID 組を許容する。
- Device Flow / refresh token の状態遷移は DB の CAS へ集約し、新規認証 write は競合ゲートを通す。
- ローカル libSQL のゲートは process 内だけで共有し、Workers の Turso/D1 は要求間 Promise を共有しない。
- 旧 publisher token は Workspace 帰属を復元できないため移送せず、Device Flow 再認証で再発行する。

**差分追記 (2026-07-30 / `HarnessHub-njkm` / qa-101)**:

- **障害隔離境界**: process-local libSQL が `SQLITE_BUSY` を返した接続は、未終了 statement を抱えた可能性があるため poisoned として隔離する。read も止め、未 commit 行を正常データとして観測させない。
- **復旧境界**: `TursoAdapter.reconnect()` が古い raw client を捨てて factory から再生成する。外側の Client / Drizzle / repository 参照は安定させ、consumer の再構築を要求しない。
- **環境分離**: request-bound の Turso remote / D1 は隔離対象にせず、競合再試行と DB 側 CAS を維持する。自動 reconnect は並行 transaction を巻き込み故障の観測を消すため採用しない。
- **検証**: fake Client の状態遷移だけでなく、子プロセスが同じ file DB の write lock を保持する実 libSQL テストで silent loss 防止と明示 reconnect 後の可視性を固定する。

**Publish pipeline 差分追記 (2026-07-30 / `HarnessHub-dfm` / qa-105)**:

- 本 feature は `publish_requests`、`target_channels`、`releases`、`packages`、
  `deployment_references` の schema owner ではなく、`packages/db` の repository
  公開入口だけを使う consumer とする。Hub から schema subpath へ直接到達させない。
- Release と package object は immutable（作成後に内容を書き換えない）とし、
  content hash を同一性の根拠にする。stable の変更は Release を更新せず、
  TargetChannel の pointer だけを原子的に差し替える。
- 同一 channel の未完了 PublishRequest は DB の partial UNIQUE 制約を最終防衛線とする。
  サービス層の先読みは早期拒否の最適化であり、競合保証の正本にはしない。
- rollback は R2 の旧 package を現行検査規則で再検査してから pointer を戻す。
  検査失敗・object 不在・CAS 競合では stable を変更しない。
- production smoke も schema table を deep import せず、`createPublishSmokeDbProbe`
  facade へ fixture 準備・証跡読取・cleanup を閉じる。運用検証を理由に
  consumer 境界を例外化しない。
- 仕様遷移と証拠は
  [仕様反映受領書](../docs/features/feat-publish-pipeline/spec-reflection-receipt.md) を参照する。

**共有 Google OIDC 差分追記 (2026-08-01 / `HarnessHub-fnej` / qa-112)**:

- **schema**: `idp_connections` へ `credential_mode` (TEXT NOT NULL DEFAULT
  `customer_google`) と `allowed_workspace_domains` (TEXT NOT NULL DEFAULT `[]`) を
  追加する。既存行は migration 後も `customer_google` として意味を変えず、許可ドメイン
  JSON は読取境界で schema 検証する。
- **保存不変条件**: `customer_google` は従来どおり `client_id` と `client_secret_enc` を
  持つ。`shared_google` は共有 credential を tenant 行へ複製せず両列を空 sentinel とし、
  issuer は Google 固定、`allowed_workspace_domains` を最低 1 件持つ。方式ごとの必須項目は
  repository の discriminated input で分ける。
- **read/decrypt**: primary connection の決定順序と tenant scope を維持する。shared 行は
  環境 client_id を合成して auth port へ返し、`decryptClientSecretForTenant` は shared 行を
  復号対象として受け付けない。未知 mode・不正 JSON・空 allow-list は runtime で fail closed
  にする。
- **migration/rollback**: 0003 migration は ADD COLUMN 2 本のみで既存データを移送・削除
  しない。旧 Worker へ戻す前に shared 行を `customer_google` へ戻すか削除し、旧コードが空
  credential を読む状態を作らない。

## Delivery, migration and rollback

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。

## Risks and verification

正本章 (system-spec/database.md) の該当節を参照。feature 分解時に本節へ差分追記する (全書換禁止・要件 C18/C19)。
