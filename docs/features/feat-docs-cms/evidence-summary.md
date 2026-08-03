---
status: confirmed
layer: feature-evidence
---

# feat-docs-cms 証跡サマリ (P11)

- graph node: `SYS-DOCS-CMS-P11` / beads: `HarnessHub-9wb.11`
- 集約日: 2026-08-03
- 消費: `test-run-report.md` (P06) / `acceptance-verification.md` (P07) / `ci-quality-gates-verification.md` (P09) / `independent-review-quality-constraints.md` (P10)

本書の目的は、goal-spec acceptance 3 件・quality_constraints 8 件の判定を**第三者が同じ手順で再現できる状態**にすること。

---

## 0. 実行前提

| 項目 | 値 |
|---|---|
| 実行位置 | リポジトリルート |
| Node | v22.21.1 (arm64。x64 スライスで rollup native がエラーになる既知差異があるため、vitest 直叩き時は `/opt/homebrew/bin/node` を明示する) |
| pnpm | 10.9.0 |
| git HEAD | `0c6fff58` (+ 本 feature の未コミット変更。`git status --short` で新規ファイル群 `apps/hub/src/__tests__/docs-cms/`・`apps/hub/src/app/(dashboard)/docs/`・`apps/hub/src/app/api/v1/docs/`・`apps/hub/src/features/docs-cms/`・`apps/hub/src/lib/ai-queue/`・`packages/db/migrations/0005_*` 等) |
| source digest | `sha256:a899e69eb999800a5869499783aad943cea65d394af3e3046fd6631532cf3a85` |
| 事前準備 | `pnpm install` |

> 本 feature の成果物は執筆時点で未コミットのため、HEAD だけを checkout しても再現しない。
> 再現時は本 feature の変更を含む状態で実行すること。

### 一括再現

```bash
pnpm install
pnpm -r typecheck
pnpm --filter hub test
pnpm --filter hub build
pnpm --filter @harness-hub/db run check:ddl
pnpm --filter @harness-hub/db run check:tenant-isolation-coverage
pnpm --filter @harness-hub/db run check:connection-isolation
pnpm --filter @harness-hub/schemas run check:drift
node packages/db/scripts/check-db-write-gate.mjs
node scripts/ci/check-tenant-isolation-gate.mjs
node apps/hub/scripts/check-single-authz-middleware.mjs
python3 plugins/system-dev-planner/scripts/validate-system-plan.py --repo-root . --feature-package feature-package/feat-docs-cms
```

### 実行結果 (2026-08-03)

| コマンド | 期待 | 実測 |
|---|---|---|
| `pnpm -r typecheck` | exit 0 (7 projects) | pass |
| `pnpm --filter hub test` | 全 pass + coverage 80%以上 | **Test Files 99 passed (99) / Tests 1136 passed \| 1 skipped (1137)** / coverage lines 80.03% / branches 85.8% / functions 82.5% / statements 80.03% |
| `pnpm --filter hub build` | production build | pass (compile + type check) |
| `DOCS-PAGE-001` | 1 件ずつの cursor pagination で重複なく全件到達 | pass (3 文書を 3 ページで取得) |
| `check:ddl` | 未承認の破壊的 DDL 0 件 | 6 migration / 単一 lineage / 違反 0 件 |
| `check:tenant-isolation-coverage` | fixture 網羅 100% | scoped=20 / fixture 網羅 20/20 (`documents` 未登録を検出・修正済み、§3 参照) |
| `check:connection-isolation` | driver 直接 import 0 件 | packages/db 外からの driver 直接 import 0 件 |
| `check:drift` (schemas) | 4/4 pass | pass |
| `check-db-write-gate.mjs` | write が全て guardedWrite 経由 | repository 配下 26 ファイル / write 81 件 (直接 78 / helper 経由 3) / 全て guardedWrite 経由 |
| `check-tenant-isolation-gate.mjs` | 必須 ID 7 種確認 | apps/hub/tests/auth-tenancy/tenant-isolation.test.ts 12 ケース / 必須 ID 7 種 |
| `check-single-authz-middleware.mjs` | 判定ロジックの複製 0 件 | 走査 292 ファイル / 違反 0 件 / allowlist 3 件 / route 例外 5 件が期待集合と一致 (DOCS-AUTHZ-007 テスト名の語彙衝突を検出・修正済み、§3 参照) |
| `validate-system-plan.py` | status: pass | status: pass / violations: [] |

---

## 1. acceptance 3 件 (goal-spec §4)

```bash
cd apps/hub
/opt/homebrew/bin/node ../../node_modules/.bin/vitest run \
  src/__tests__/docs-cms/tenant-isolation.test.ts \
  src/__tests__/docs-cms/markdown-sanitize.test.ts \
  src/__tests__/docs-cms/audit-events.test.ts
```

| # | 受入基準 | 対象テスト | 実測 |
|---|---|---|---|
| 1 | tenant スコープ doc が他テナントから参照できない | `tenant-isolation.test.ts` (DOCS-TEN-001〜003, 101〜103) | 6/6 pass |
| 2 | Markdown 描画で XSS が sanitize される | `markdown-sanitize.test.ts` (DOCS-SEC7-001〜005, 101〜102) | 7/7 pass |
| 3 | 編集操作が監査 event に記録される | `audit-events.test.ts` (DOCS-AUDIT-001, 002, 101〜103) | 5/5 pass |

判定文書: `acceptance-verification.md`

---

## 2. quality_constraints 8 件 (goal-spec §5)

```bash
cd apps/hub
/opt/homebrew/bin/node ../../node_modules/.bin/vitest run src/__tests__/docs-cms/
```

| id | 対象テスト | 実測 |
|---|---|---|
| tenant-scope-d4-doc-entity | `tenant-isolation.test.ts` | 6/6 pass |
| markdown-sanitize-sec7-doc | `markdown-sanitize.test.ts` (DOCS-SEC7-001〜005) | 5/5 pass |
| markdown-common-component-qa021-qa022 | `markdown-sanitize.test.ts` (DOCS-SEC7-101, 102) | 2/2 pass |
| doc-edit-audit-sec6 | `audit-events.test.ts` | 5/5 pass |
| ai-queue-pull-type-d5-doc-draft | `ai-queue-contract.test.ts` (DOCS-QUEUE-001, 101, 102) | 3/3 pass |
| ai-queue-authz-payload-secret-ban | `ai-queue-contract.test.ts` (DOCS-SEC8-001〜003) | 3/3 pass |
| doc-edit-admin-only-qa021-sec2 | `authz-contract.test.ts` (DOCS-AUTHZ-001〜006) | 6/6 pass |
| b7-zod-single-source-authz-mw | `authz-contract.test.ts` (DOCS-AUTHZ-007) + `check-single-authz-middleware.mjs` | 1/1 pass + ゲート OK |

判定文書: `independent-review-quality-constraints.md`

---

## 3. P09/P10 で検出・修正した問題 3 件

3.1 と 3.2 は新規追加物に対するチェックスクリプト側の追随漏れである。3.3 は最終レビューで見つけた
実装上のページ送り不備である。いずれも修正後に該当ゲートと回帰テストを再実行した。

### 3.1 `check-tenant-isolation-coverage.ts` の宣言漏れ

```bash
git diff packages/db/scripts/check-tenant-isolation-coverage.ts
```

`SYMBOL_BY_TABLE` に `documents: 'createDocsCmsRepository'` が無く、fixture (`__tests__/fixtures/two-tenants.ts`) は既に seed していたにもかかわらず NG だった。1 行追加で修正。

### 3.2 `check-single-authz-middleware.mjs` の誤検出

```bash
git diff apps/hub/src/__tests__/docs-cms/authz-contract.test.ts
```

DOCS-AUTHZ-007 の `it()` テスト名 (人間向け説明文) に `ROLE_ORDER`/`ACTION_RULES` という語彙をそのまま含んでいたため、
静的スキャナがコードと文字列リテラルを区別できず誤検出した。テスト名の言い換えで修正 (検査対象のロジック自体は変更なし)。

### 3.3 `GET /api/v1/docs` の cursor 未適用

```bash
cd packages/db
/opt/homebrew/bin/node ../../node_modules/.bin/vitest run __tests__/docs-cms.test.ts
```

repository が `next_cursor` を返しながら、次回検索に cursor を適用していなかったため、二ページ目以降が
先頭ページを繰り返す状態だった。`WHERE documents.id < :cursor` と `ORDER BY documents.id DESC` を導入し、
ULID の安定した順序でページを進めるよう修正した。`DOCS-PAGE-001` は 3 文書を limit 1 で走査し、
重複なく全 ID に到達することを確認する。

---

## 4. 証跡ファイルの所在

| 証跡 | 場所 |
|---|---|
| テスト実行 (P06) | `apps/hub/src/__tests__/docs-cms/` (8 files) + `apps/hub/tests/docs-cms/a11y-screens.test.tsx` |
| coverage 実測 | `apps/hub/coverage/coverage-final.json` |
| DB migration | `packages/db/migrations/0005_common_stepford_cuckoos.sql` + `meta/_journal.json` (idx=5) |
| 判定文書 | `test-run-report.md` / `acceptance-verification.md` / `ci-quality-gates-verification.md` / `independent-review-quality-constraints.md` |
