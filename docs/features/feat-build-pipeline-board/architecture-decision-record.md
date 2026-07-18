---
status: confirmed
task: SYS-BUILD-PIPELINE-BOARD-P02
parent_feature: feat-build-pipeline-board
feature_package_id: feature-package/feat-build-pipeline-board
feature_context_digest: sha256:eeed295d50359e11ac8aee84800def3ad3399cee866ab5b4dc2712116c9a4441
depends_on: [SYS-BUILD-PIPELINE-BOARD-P01]
architecture_refs: [arch-harness-hub-backend, arch-harness-hub-frontend]
---

# feat-build-pipeline-board アーキテクチャ決定記録 (ADR)

> **位置づけ**: P02 の成果物。P01 の [requirements-baseline.md](./requirements-baseline.md) を入力に、Build/build_stage_events スキーマ・S13 画面構成・builds API 契約・工程遷移状態機械・PublishRequest 接続・B9 共有認可表を確定する。P03 レビューと P05 実装の入力。

## AD-1. Build / build_stage_events のカラム設計

配置は `packages/db/schema/build-pipeline-board/` (write_scope)。schema barrel 経由・qa-032 共通規約 (ULID PK・epoch ms)・D4 スコープ列必須。

### builds

| 列 | 型 | 制約・意味 |
|---|---|---|
| id | text PK | ULID |
| tenant_id / workspace_id | text | D4 必須。分離テスト CI 対象 |
| sheet_id | text NULL 可 | 起票元ヒアリングシート (feat-hearing-intake 連携点) |
| project_id | text NULL 可 | 対象 Project (公開工程までに必須化) |
| title | text | ボード表示名 |
| stage | text | `hearing/requirements/design/build/test/review/publish` の 7 値 (AD-4) |
| risk | text | `ok` / `warn` (リスク表示) |
| eta_date | integer NULL 可 | 完了予定 (epoch ms・日粒度) |
| assignee_user_id | text NULL 可 | 担当者 |
| publish_request_id | text NULL 可 | publish 工程の接続先 (AD-5)。**publish 遷移時に必須** |
| note | text | 備考 |
| created_at / updated_at | integer | epoch ms |

### build_stage_events (append-only・ボード履歴用)

| 列 | 型 | 制約・意味 |
|---|---|---|
| id | text PK | ULID |
| build_id | text | 対象 build (JOIN で tenant scope を継承。直接クエリはリポジトリ層で builds 経由に限定) |
| from_stage / to_stage | text | 遷移記録 (隣接のみ = AD-4 で強制済みの結果) |
| actor_user_id | text | 操作者 |
| created_at | integer | epoch ms |

- UPDATE/DELETE 関数を提供しない (append-only)。正式監査は別途 AuditRepo (AD-6)。

## AD-2. S13 画面構成 (受入基準となる構成表)

| 画面 | 構成要素 | 認可 |
|---|---|---|
| S13 ボード | 7 列ステージボード (共通部品消費)・カード (title/risk チップ/eta/担当/シート参照)・stage 別集計ヘッダ | member 以上 (閲覧) |
| S13 カード詳細 | 詳細フィールド編集 (title/risk/eta/assignee/note)・stage 履歴 (build_stage_events)・工程遷移ボタン (隣接のみ活性)・publish 工程は PublishRequest 状態表示 | 閲覧 member / 編集・遷移 workspace-admin |

- ステージボードは design system 共通部品を消費するのみ (qa-021/qa-022)。stage 別グルーピングはクライアント側 (backend-spec §4.4)。

## AD-3. builds API 契約 (5 endpoint・B1 zod 単一ソース)

zod は `packages/schemas/build-pipeline-board/` に配置。認可単一ミドルウェア (deny-by-default) 配下:

| endpoint | 認可 | 契約要点 |
|---|---|---|
| `GET /api/v1/builds` | member 以上 | 一覧 (cursor)。stage 別グルーピングはクライアント |
| `GET /api/v1/builds/:id` | member 以上 | 詳細 + stage 履歴 |
| `POST /api/v1/builds` | workspace-admin | sheet_id 紐付け起票 (feat-hearing-intake §5.2 との連携点) |
| `PATCH /api/v1/builds/:id` | workspace-admin | title/risk/eta/assignee/note のみ (stage は不可 = 専用 endpoint 経由) |
| `POST /api/v1/builds/:id/stage` | workspace-admin | 工程遷移 (AD-4 の状態機械検証 + AD-5 の publish ゲート)。監査 event (AD-6) |

## AD-4. 工程遷移状態機械 (隣接遷移のみ)

```text
hearing ⇄ requirements ⇄ design ⇄ build ⇄ test ⇄ review ⇄ publish
```

- 前進/差戻しとも**隣接工程間のみ**許可。非隣接遷移はリポジトリ層で 422 拒否 (backend-spec §5.3)。
- 遷移成功時に build_stage_events へ append + AuditRepo へ build.stage_change (AD-6) の 2 記録。

## AD-5. publish 遷移の PublishRequest 接続契約 (二重実装禁止・B4)

- `stage → publish` 遷移の前提条件: `builds.publish_request_id` が設定済みで、参照先 PublishRequest の status が **Published** であること (I2/I3 の既存状態機械の照会のみ・build 側に publish 独自状態を持たない)。
- 未接続 (publish_request_id NULL) または未 Published での publish 遷移は 422。publish フロー自体は feat-publish-pipeline の資源をそのまま使う (S13 からは publish 画面への導線のみ)。

## AD-6. build.stage_change 監査 event 契約と B9 共有認可表構造

- 監査: 工程遷移は feat-domain-model-db 所有の AuditRepo.append() で `build.stage_change` (summary_json = {from, to, build_id, sheet_id}) を記録する (SEC6)。build_stage_events はボード表示用の非正式履歴、AuditRepo が正式監査 (二層の役割分担)。
- **B9 共有認可表構造**: 工程操作の admin 判定は独自ロジックを新設せず、認可単一ミドルウェアの role×操作許可表に `builds.stage_transition` 操作を 1 行追加する形で実装する。Yellow review (I8) の承認 queue と同じ許可表テーブル (操作 id → 最小 role) を共有し、判定コードパスも共通化する (qa-023 B9)。

## 検証 (P02 required evidence)

- Build/build_stage_events カラム一覧 = AD-1 / S13 画面構成表 = AD-2 / builds API 契約 (5 endpoint・zod 配置・role×操作許可表) = AD-3 / 工程遷移状態機械 (隣接のみ) = AD-4 / PublishRequest 接続契約 = AD-5 / build.stage_change 監査 event 契約 + B9 共有認可表構造 = AD-6
