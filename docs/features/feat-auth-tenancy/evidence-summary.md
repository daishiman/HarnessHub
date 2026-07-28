---
status: confirmed
layer: feature-design
task: SYS-AUTH-TENANCY-P11
parent_feature: feat-auth-tenancy
feature_package_id: feature-package/feat-auth-tenancy
feature_context_digest: sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5
---

# feat-auth-tenancy P11 証跡サマリ

- graph_node_id: `sys-auth-tenancy-p11`
- feature_context_digest: `sha256:8ac2258f5c7d0d198374ebc66e51157b0af87fa9ff858a4fc61b4dd256d284a5`
- package digest: `sha256:98fd3cc31bb17e536f40d38cc09ef8c21116bae295e33adcd2c40df83b977f52`
- 本 task は**新規検証を行わない**。既存 4 成果物から、リリース判定に必要な事実だけを抽出する。

---

## 1. 参照元成果物

| Phase | 成果物 | 役割 |
| --- | --- | --- |
| P06 | `docs/features/feat-auth-tenancy/test-run-results.md` | 全 75 テスト ID の実行結果と設計逸脱 5 件 |
| P07 | `docs/features/feat-auth-tenancy/acceptance-record.md` | acceptance 3 項目の判定 |
| P09 | `docs/features/feat-auth-tenancy/quality-assurance-report.md` | 品質ゲート 6 件の実行結果 |
| P10 | `docs/features/feat-auth-tenancy/final-review-record.md` | quality_constraints 7 件の充足判定 |
| P02 | `docs/features/feat-auth-tenancy/architecture-decision-record.md` | 設計判断 AD-1〜AD-9 |
| P08 | `docs/features/feat-auth-tenancy/refactoring-migration-note.md` | CI 検査の設計と OIDC 登録手順 |

---

## 2. テスト結果

| 項目 | 値 |
| --- | --- |
| test-design.md のテスト ID 総数 | **75** |
| 実行系 (vitest) が担当する ID | 71 (`T-AUTHZ` 13 / `T-DEV` 14 / `T-DEV-E2E` 1 / `T-ISO` 7 / `T-OIDC` 18 / `T-SESS` 14 / `T-TOKC` 4) |
| 静的検査が担当する ID | 4 (`T-BND-01`〜`T-BND-04`) |
| vitest ケース数 (auth-tenancy) | 127 passed / 127 |
| vitest ファイル数 (auth-tenancy) | 7 passed / 7 |
| hub 全体の回帰 | 261 passed / 0 skipped (23 files、`pnpm verify` 内) |
| **fail 件数** | **0** |
| 設計 (P04) との逸脱 | 5 件 (すべて実装側を正とし理由を記録。P06 §5) |

---

## 3. acceptance 3 項目

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| AC-1 テナント越境アクセスが分離テストで 0 件 | ✅ pass | `T-ISO-01`〜`T-ISO-07` (12 ケース) |
| AC-2 Device Flow の E2E (承認→token→失効) が成功する | ✅ pass | `T-DEV-E2E-01` (9 工程) |
| AC-3 Auth.js 依存が adapter 境界に隔離されている | ⚠️ 条件付き | 境界検査 pass、実依存・runtime は `HarnessHub-b7ng` |

**AC-1 の「0 件」の定義**: provider-admin の越境は仕様上**許可**される (security-spec §3.1.3 / S-D9)。
したがって「越境 0 件」は「**認可されていない**越境が 1 件も成功しない」を意味する。
provider-admin の越境は許可・拒否にかかわらず監査 `provider.cross_tenant_access` を残す。

**AC-2 の所有境界**: 本 package が判定したのは Hub 側 Device Authorization Flow のみ。
OS 資格情報域保存 (macOS Keychain / Windows Credential Manager) は `feat-publisher-plugin` が所有し、
その E2E 証跡は publisher package 側を参照する (本 package は保存 API を実装していない)。

---

## 4. CI 品質ゲート

| ゲート | 結果 | CI 自動実行 |
| --- | --- | --- |
| G1 テナント分離テスト | ✅ pass | ✅ `test:tenant-isolation` として名指し |
| G2 Auth.js adapter 境界隔離 | ✅ pass | ✅ root `check:auth` / CI G12 |
| G3 認可判定の単一集約 + route 例外の厳密一致 | ✅ pass | ✅ root `check:auth` / CI G12 |
| G4 dev 専用 provider 非存在 | ✅ pass | ✅ root `check:auth` / CI G12 |
| G5 数値契約の単一集約 | ✅ 11 項目一致 (うち 1 項目は ADR 実装追補 §10.7 の決定値) | ✅ hub テストスイート |
| G6 secret scan | ✅ 走査 297 / 検出 0 / verdict=pass | ✅ `pnpm check:secrets` |
| (既存) `unwrapped-route-handler` (C2) | ✅ 走査 250 / 違反 0 | ✅ 既存 CI |

---

## 5. quality_constraints 7 件

| # | constraint | 判定 |
| --- | --- | --- |
| QC-1 | `tenant-oidc-dynamic-resolution-authjs-d3-qa005` | ✅ 充足 (`@auth/core` と tenant route を結線) |
| QC-2 | `role4-authorization-matrix-single-middleware-deny-by-default-sec2` | ✅ 充足 |
| QC-3 | `device-flow-os-credential-token-revocation-qa008` | ✅ 充足 (所有範囲において) |
| QC-4 | `auth-adapter-boundary-better-auth-migration-hedge-d3-qa020` | ✅ 充足 (adapter 隔離 + CI) |
| QC-5 | `tenant-workspace-row-level-scope-isolation-test-ci-d4` | ✅ 充足 (複合 PK + 実 DB 分離テスト + CI) |
| QC-6 | `no-hub-native-account-idp-delegation-i7` | ✅ 充足 (CI) |
| QC-7 | `session-jwt-staleness-emergency-revocation-qa036` | ✅ 充足 |

**2026-07-26 再評価: 充足 7 / 条件付き充足 0 / 未充足 0。**

---

## 6. リリース後に追跡すべき 2 件の設計判断

task spec が名指しで追跡可能性の担保を求めている 2 件。

### 6.1 スキーマ owner は `feat-domain-model-db` である

- **根拠文書**: `docs/features/feat-auth-tenancy/architecture-decision-record.md` §1 (AD-1)
- **内容**: `session_revocations` / `users` / `publisher_tokens` / `device_authorizations` / `idp_connections` の
  スキーマ owner は `feat-domain-model-db`。本 feature は **port 越しにのみ触る**。
- **初回 feature の帰結**: P08 時点では `packages/db/schema/` を変更しなかった。
  `HarnessHub-b7ng` では schema owner の変更として認証 port 差分を DB schema/migration へ正規反映した。
- **リリース後に効いてくる点**: 認証に必要な列を追加したくなったとき、
  変更するのは本 feature ではなく `feat-domain-model-db` である。ここを取り違えると、
  2 つの feature が同じテーブルを別々に定義する。
- **port 定義の実体**: `apps/hub/src/lib/auth/ports.ts`

### 6.2 role 4 種と `users.role` 列 3 値の分割線

- **根拠文書**: `docs/features/feat-auth-tenancy/architecture-decision-record.md` §3 (AD-3)
- **内容**: role は「**列 3 値 + 関係 1 値**」で 4 種を合成する。
  - `users.role` 列が取る値は 3 つ: `provider-admin` / `workspace-admin` / `member`
    (`sessionRoleSchema = z.enum([...])` で型固定)
  - `owner` は**列の値ではない**。`projects.owner_user_id` との一致という**関係**である。
- **全順序と単調性**: `member < owner < workspace-admin < provider-admin`。
  合成が必要なのは `member` のときだけ (それ以外は列の値が既に owner 以上)。
- **リリース後に効いてくる点**: 「owner を role 列に足そう」という変更は、
  この分割線を壊す。owner は資源ごとに変わる関係であり、利用者ごとに固定される属性ではない。
  列に持たせると、資源をまたいだ瞬間に嘘になる。
- **実装の実体**: `apps/hub/src/lib/authz/decide.ts` / `rules.ts`

---

## 7. 再実行コマンド (source digest 保存)

以下は本サマリ作成時点の作業ツリー (HEAD `47052fb` + 未コミット変更) で実行した内容と同一。

```bash
# --- 実行系テスト (T-AUTHZ / T-DEV / T-DEV-E2E / T-ISO / T-OIDC / T-SESS / T-TOKC) ---
cd apps/hub && pnpm exec vitest run tests/auth-tenancy
#   期待: Test Files 7 passed (7) / Tests 127 passed (127)

# --- 静的検査 (T-BND-01〜04 + SEC2 補強) ---
node apps/hub/scripts/check-auth-gates.mjs
#   期待: [auth-gates] OK: 3 ゲート全て pass

# --- 個別に実行する場合 ---
node apps/hub/scripts/check-auth-adapter-boundary.mjs      # T-BND-01 / T-BND-02
node apps/hub/scripts/check-dev-auth-provider-absence.mjs  # T-BND-03 / T-BND-04
node apps/hub/scripts/check-single-authz-middleware.mjs    # SEC2 補強

# --- 既存ゲート ---
pnpm check:secrets                                  # G6
node scripts/ci/check-shared-layer-duplicates.mjs   # C2 unwrapped-route-handler

# --- 回帰 (hub 全体) ---
pnpm --filter @harness-hub/hub run build:worker
pnpm --filter @harness-hub/hub test
#   期待: Test Files 31 passed (31) / Tests 351 passed (351) — 2026-07-28 実測

# --- plan 整合 ---
python3 plugins/system-dev-planner/scripts/validate-system-plan.py \
  --repo-root . --feature-package feature-package/feat-auth-tenancy
```

実行環境: Node.js v22.21.1 / vitest 3.2.7 (darwin-arm64) / pnpm workspace

`--json <path>` を付けると各検査スクリプトは機械可読な結果を出力する
(`scanned_files` / `violation_count` / `findings` / `excluded_from_scan` / `allowlisted_files`)。

---

## 8. リリース判定へ引き継ぐ未達事項

| 項目 | 状態 | 引き継ぎ先 |
| --- | --- | --- |
| `check-auth-gates.mjs` の CI 結線 (`apps/hub/package.json` + root `verify`) | ✅ **解消 (2026-07-25)** — `ci.yml` G12 + root `pnpm check:auth` | bd `HarnessHub-1f28` closed |
| 分離テストの CI 必須ゲート指定 | ✅ **解消 (2026-07-25)** — `check-tenant-isolation-gate.mjs` + `test:tenant-isolation` の名指し実行 | bd `HarnessHub-1f28` closed |
| ~~`validate-system-plan.py` が `status=fail` (violations 27 件)~~ | ✅ **解消**。2026-07-28 再実行で `status=pass` / violations **0 件** (§9) | bd `HarnessHub-mvdc` closed |
| ~~`next-auth` (または Better Auth) の導入と実結線~~ | ✅ **解消 (2026-07-26)**。`@auth/core` 0.41.3 を `adapter/authjs-handler.ts` へ実結線 | bd `HarnessHub-b7ng` closed |
| `AuthPorts` の本番 DB adapter と永続化契約差の解消 | ✅ **解消 (2026-07-26)**。実 DB 統合・並行 CAS・JIT 競合を検証 | bd `HarnessHub-b7ng` / [仕様反映受領書](./spec-reflection-receipt.md) |
| 本番 `idp_connections` への OIDC provider 登録 | ⏳ control-plane DB 確立が前提 | P13 |
| `test-design.md` の `T-SESS-05` 文言を実装へ追随 | ⏳ 次回改訂 | P04 改訂時 |
| ~~確定仕様を超えた 2 決定 (session claims の `workspace_ids` / polling 上限 60 秒・減衰) の仕様側確定~~ | ✅ R4-reopen とユーザー確認 `appr-010` を経て `qa-072` / `qa-073` として確定済み | bd `HarnessHub-l2g9` (closed) |

→ P12 の runbook 成果物は完成。

> **進捗追記 (2026-07-28)**: `HarnessHub-1f28` / `HarnessHub-b7ng` / `HarnessHub-mvdc` /
> `HarnessHub-l2g9` はすべて closed。親依存側も `HarnessHub-u6q.13` (control-plane DB リリース) が closed。
> **P13 の残ブロッカーはコード側に 0 件**で、本番 auth Secret / Variable / OIDC 資格情報の投入と
> R1〜R5 の本番実施だけが残る (`release-record.md` §6 に read-only 事前確認の実測を記録)。

---

## 9. plan 整合検査の結果 (`validate-system-plan.py`)

**結果 (2026-07-28 再実行): `status=pass` / violations 0 件 / exit 0。**

### 初回は fail だった — 何が起きていたか

初回集約時点では `status=fail` / violations **27 件**で、内訳は次のとおりだった。

| 違反コード | 件数 | 対象 |
| --- | --- | --- |
| `task-spec-section-missing` (Inner goal-seek execution loop) | 13 | `feature-package/feat-auth-tenancy/task-specs/phase-01〜13` 全件 |
| `inner-goal-seek-contract` | 13 | 同上 |
| `p13-spec-architecture-writeback` | 1 | `task-specs/phase-13-release-deploy.md` |

これは実装成果物の欠陥ではなく、**planner 版と validator 版の drift** だった。根拠は 3 点で、
(1) 違反対象は 27 件すべて `task-specs/*.md` で `apps/hub` / `packages` 配下は 0 件、
(2) `validated_digest` が package digest `sha256:98fd3cc3…` と一致しており検査対象は正しい、
(3) 13 task-spec は実装作業で一度も変更していない (plan 生成時点から fail だった)。

### 解消の機序 — 「節を追記した」のではない (誤読しないこと)

bd `HarnessHub-mvdc` (closed) の実測記録によれば、解消したのは **PR #60「validator 契約 version 台帳」**
のマージによる。13 task-spec の本文は**書き換えていない**。現在の validator 出力は
`contract_version: "1.0.0"` / `contract_baseline_exemption: true` を返しており、
**新契約が要求する Inner goal-seek 節は「新規 promote される package」に対してのみ強制され、
既存 baseline package は免除される**という設計になっている。

つまり pass の意味は「13 task-spec に節が備わった」ではなく
**「この package は新契約の適用対象外として扱われる」**である。記述の必須化そのものは
別課題 `HarnessHub-a4ks` 系で扱う。

**やらなかったこと**: validator の検査そのものを弱めることでの緑化。
上記は検査の削除ではなく、契約に version を持たせて適用範囲を明示する移行機構であり、
新規 package に対する検査強度は落ちていない。ただし
**本 package が実際に節を持つことを保証するものでもない**ため、ここを混同しない。
