---
status: recorded
layer: feature-design
updated: 2026-07-25
task: SYS-DOMAIN-MODEL-DB (最終レビュー / 仕様反映判定)
parent_feature: feat-domain-model-db
feature_package_id: feature-package/feat-domain-model-db
feature_context_digest: sha256:68f274de9cd604964c4499897cc3bf2efc88d09bdaf730db7640c5f09c9caffc
package_digest: sha256:6ac94e1d58326eb092a3e9e7b3a139d4041a0a2988faa3266e4a4eaceb84a73b
beads: HarnessHub-u6q
dev_graph_node: feat-domain-model-db
judged_at: 2026-07-24
reviewer: independent-fork (spec-impact 監査。read-only + digest 実測 + 検証コマンド実走)
---

# feat-domain-model-db 仕様反映 受領書

> **位置づけ**: beads `HarnessHub-u6q` (dev-graph node `feat-domain-model-db`) の実装 (packages/db) について、コミット前に「正本 spec (system-spec/・architecture/・features/) への反映が必要か」を独立コンテキストで判定した受領書。判定に用いた根拠と、反映を要さないと判断した理由、および spec 文書間の追従遅れを扱う follow-up の対応関係を記録する。

## 1. 判定結論

**正本 (system-spec/・architecture/・features/) への手編集を要する実質 drift: なし。**

実装は正本 spec および正本が参照する詳細定義 (`docs/backend-spec.md` §2.2/§5.1) と整合する。正本を手編集せず、既存の正規フロー (dev-graph follow-up) で追従を継続する。

## 2. 正本無改変の実測根拠 (fact)

- **正本 3 ファイルの digest 一致**: `system-spec/database.md` の実 sha256 = `0cc8dee5…` は wrapper `architecture/harness-hub-data.md` の記録値と一致。`system-spec/backend.md` の `f6ba2193…` も `architecture/harness-hub-backend.md` と一致。`git status --porcelain system-spec/ architecture/ features/` は空 = 本タスクで正本は未改変。
- **本コミットの変更集合は正本を含まない**: 変更は `packages/db/**`・`docs/features/feat-domain-model-db/**`・`.github/workflows/ci.yml`・`pnpm-lock.yaml` に限定 (74 files)。governed な `system-spec/`・`architecture/`・`features/`・`tasks/` への差分は 0。

## 3. 整合の確認 (実装 ↔ 正本)

| 契約 | 実装 | 正本 | 判定 |
|---|---|---|---|
| コアドメイン 18 テーブル | `schema/index.ts` coreTables = 18 / migration CREATE TABLE = 18 | `docs/backend-spec.md` §2.2 の 18 テーブル | 一致 |
| User 基底 (owner) | `schema/core/identity.ts` users に department/salary/role enum/status enum を含む完全基底 | §2.2 「既存確定・不変」の users 行 | 一致 (owner=feat-domain-model-db は ADR §1 で確定) |
| releases immutable (I3) | `repository/releases.ts` は status 以外の更新関数を非公開。status enum=available/suspended/deprecated | §2.2 immutable・更新は status のみ | 一致 |
| publish_requests 状態機械 | `schema/core/publish.ts` 9 状態 + partial UNIQUE (終端除外) | §5.1 の 9 状態機械 | 完全一致 |
| audit hash chain | `schema/core/security.ts` seq/prev_hash/event_hash + UNIQUE(tenant_id,seq)。repository は append/read のみ | §2.2 append-only hash chain | 一致 |
| 封筒暗号化 DEK | encryption_keys: purpose enum(salary/idp_secret) + UNIQUE(purpose,key_version)・DEK 平文非保存 | §2.2 封筒暗号化 | 一致 |
| 接続層隔離 (qa-020/D2) | `check-connection-layer-isolation.ts` が packages/db 外の driver import を fail-closed 禁止 (違反 0) | qa-020 | 一致 |
| D4 行レベルスコープ | tenant_id 保有 14 + TENANT_SCOPE_EXEMPT 4 = 18。全 repository 操作で WHERE tenant_id 強制 | qa-060 (P0 から必須) | 一致 |
| export マスク保持 (qa-019) | `backup/export.ts` は暗号文を暗号文のまま転写・decrypt 呼出 0 | qa-019「常にマスク」 | 一致 |
| qa-045 tenant_data_objects | schema/migration に不在 (本 digest スコープ外) | database.md qa-045 | scope-out 遵守 |

## 4. 反映を要さない判断理由 (governance)

`system-spec/`・`architecture/`・`features/` は dev-graph が digest 付きで生成する **read-only な正本** である (`requirements-baseline.md` にも「features/ 配下は読み取り専用のため訂正は dev-graph への follow-up として申し送る」と明記)。実装が正本と整合している以上、正本の手編集は不要であり、かつ手編集は wrapper/completeness-report が保持する digest を破壊して validate 失敗 (既知の 27 violations クラス) を誘発するため行わない。spec 文書間に残る追従遅れは、正規フロー (dev-graph 再生成 / 該当 feature の再実行) で解消する。

## 5. spec 文書間の追従遅れと follow-up 対応 (既存 tracker へマップ)

| # | 追従遅れ | 是正経路 | 既存 tracker |
|---|---|---|---|
| G1 | `features/feat-domain-model-db.md` 上流未解決節が User owner「未確定」のまま stale (ADR §1 で確定済み) | dev-graph 再生成での features md 更新 | HarnessHub-4q8 / HarnessHub-8vx (promoted package 遡及契約失効の是正) |
| G2 | `feat-user-org-admin` plan が User 拡張列 (department/salary) を記述し owner 決定と矛盾 | 当該 feature (xwt) の P02 再設計 | HarnessHub-xwt.2 (アーキ設計: User拡張/TenantCoefficient・PIIガード, open) |
| G3 | qa-045 tenant_data_objects (本 digest スコープ外) | 別 feature で実装 | HarnessHub-47b (.1 要件 / .5 実装, open) |
| G4 | releases/target_channels の tenant_id 非正規化・encryption_keys の現行 tenant 非スコープ | 段階設計 (手編集不要。D4/qa-024 と整合) | HarnessHub-47b.8 (per-tenant DEK migration) |

いずれも実装 (packages/db) 側の是正は不要。新規 follow-up の起票は不要 (既存 open tracker が被覆)。

## 6. 環境制約の申し送り

- ~~**beads mutation 不可**~~ — **【2026-07-25 訂正: 誤診断だった】** guard hook (`plugins/dev-graph/hooks/guard-graph-schema.py:541`) は `BD_MUTATION.search(command) and "bd-bridge.py" not in command` という**部分文字列判定**であり、チョークポイント (検問所) スクリプト `plugins/dev-graph/scripts/bd-bridge.py` は worktree・origin/main とも tracked で実在する。「不在」と判定したのは root 直下 `scripts/bd-bridge.py` のみを見た誤りで、beads の update / close / note 追記は実行可能。実際に u6q へ PR link を追記して実証済み。唯一の制約は `--op create` (新規 issue 作成) が graph node を要求する点のみ。
- e9b / x4o は既に closed (受入確認済み・main 反映を merge 祖先確認済み) のため mutation 不要。

---

## 7. 追補: 2026-07-25 セッション変更分の仕様反映判定

前回 (2026-07-24) 判定後に本ブランチへ加わった変更について、同じ基準で再判定した。

**結論: 正本 (`system-spec/`・`architecture/`・`features/`・`tasks/`・`specs/`) への反映は不要 (spec_impact = none)。**

### 7-1. 判定対象の変更集合

| # | 変更 | 種別 | 仕様影響の判断 |
|---|---|---|---|
| A | `docs/features/feat-domain-model-db/session-handoff-20260724.md` の frontmatter へ `status: recorded` / `layer: session-handoff` を追加 | 文書メタデータ | **なし**。`scripts/lint-artifact-placement.py` が課す配置規約 (docs/*.md は status:/layer: 必須) への適合であり、本文の主張・実装契約・正本の内容には一切触れない。CI `change-category-guard` の唯一の赤を解消する修正。 |
| B | `issues/sys-test-coverage-enforcement-20260724.md` (新規) + `.dev-graph/state/graph.json` への issue ノード 1 件追加 (rev 523 → 524) | tracker 起票 | **なし**。「タスク仕様書がテスト網羅を機械強制する仕組み」の**起票**であって、仕様の変更ではない。実際の仕様変更 (template 正本 / validate-system-plan.py / vitest coverage 閾値) は当該 issue が別途担当し、その実施時に改めて spec 反映判定を行う。 |
| C | `main` (55e0440) の本ブランチへのマージ | 履歴統合 | **なし**。main 側で既に review・CI を通過した確定内容の取り込みで、本ブランチ由来の新規変更を含まない。graph.json は main 版 (279 node) を土台に採り、既存ノードの改変 0 件・追加 1 件のみであることを実測 (下記)。 |
| D | `session-handoff-20260724.md` の分割 → `session-handoff-20260725.md` (新規) | 文書分割 | **なし**。qa-070 の 1 文書 300 行上限 (`scripts/lint-doc-line-limit.py`) への適合措置。追補を足すと 334 行で超過するためセッション単位で責務分割した。本文の主張は無改変で移設のみ (20260724 版は §12 を後続文書への参照リンクへ置換)。allowlist 登録は `--ratchet-base` が新規追加を遮断する設計であり、規約の意図にも反するため採らない。 |

### 7-2. 無改変の実測根拠 (fact)

- `git status --porcelain` の変更集合に `system-spec/`・`architecture/`・`features/`・`tasks/`・`specs/` は **0 件** (本追補時点で実測)。
- graph.json の差分は機械的に「rev 523→524 / 追加ノード = `issue-test-coverage-enforcement-20260724` の 1 件 / 既存 279 ノードの改変 0 件」。手編集ではなく正規経路 `plugins/dev-graph/scripts/upsert-node.py` の transaction receipt (`operation: added` / `write_count: 2`) で適用しており、digest 整合を壊していない。
- 実装 (`packages/db`) は本セッションで一切変更していない (`git diff` に `packages/` の差分なし)。したがって §3 の整合表は**そのまま有効**であり、再検証を要しない。

### 7-3. 品質ゲート再実行の結果 (2026-07-25 実測)

| ゲート | 結果 |
|---|---|
| `pnpm --filter @harness-hub/db test` | ✅ 13 files / **62 tests pass / 0 fail** |
| `tsc --noEmit` | ✅ 0 error |
| `biome check packages/db` | ✅ 65 files / 0 diagnostics |
| `check:ddl` | ✅ 1 migration / 単一 lineage / 破壊的 DDL 0 |
| `check:tenant-isolation-coverage` | ✅ scoped=14 / exempt=4 / fixture 14/14 |
| `check:connection-isolation` | ✅ driver 直接 import 0 |
| `scripts/lint-artifact-placement.py` (**CI 赤の原因 1**) | ✅ self-test 緑 + 本検査 **exit 0** (修正前は 2 violations) |
| `scripts/lint-doc-line-limit.py --ratchet-base origin/main` (**CI 赤の原因 2**) | ✅ 345 文書検査 / **exit 0** (分割前は 334 行で 1 violation) |
| `pytest tests/scripts-root/test_root__lint_doc_line_limit.py` | ✅ **29 passed** (`test_cli_real_repo_exit_zero` を含む) |
| `validate-graph-schema.py` | ✅ `valid: true` / violations 0 |
| `lint-eval-log-layout.py` | ✅ 2389 走査 / violations 0 |
| `lint-handoff-disposition.py` | ✅ 123 findings 走査 / violations 0 |
| `lint-open-residue.py` | ⚠️ ローカルのみ 19 件 (§7-4) |

### 7-4. `lint-open-residue` 19 件の切り分け (本 PR 起因ではない)

ローカル実行では `violation_count: 19 / exit_code: 2` になるが、**本 feature 起因ではない**。

- 違反ノードは `SYS-DOC-GOVERNANCE-PORTABILITY-P01..P13`・`SYS-STAGE0-DISTRIBUTION-GATE-P02..P13`・独立 issue 6 件で、`feat-domain-model-db` 系および本セッション追加の `issue-test-coverage-enforcement-20260724` は **0 件** (node id 全件を grep して実測)。
- CI の同ステップは `continue-on-error: false` にもかかわらず PR #53 で **pass** している。差分の理由は **beads DB の有無**: ローカルは `beads_axis=resolved` で md / graph / beads の 3 表現の乖離まで検査するが、CI 環境には beads DB が無いためこの軸が評価されない。
- したがって本 PR のマージ可否には影響しない。既存 tracker (`HarnessHub-j71` 系 / doc-governance 系) の completion projection 残置として別途扱う。
