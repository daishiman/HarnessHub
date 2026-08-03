# 証跡固定記録 — feat-post-signin-scope-routing

> P11 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-11-evidence.md`
> 目的: 本 feature package の source digest と、P06・P09 の再実行コマンドを再現可能な形で固定する。全 path はリポジトリ相対とし、絶対 path は含めない。

## Source digest

- feature_package_id: `feature-package/feat-post-signin-scope-routing`
- confirmed digest: `sha256:ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa`
- feature context digest: `sha256:d2f1b1eafc3773a672b279d784dbe1fec10902d32a31643edd8d0bf8379cfcfb`（`features/feat-post-signin-scope-routing.context.json`）
- 正本 task-specs 配置: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/`

## P06 再実行コマンド (テスト実行)

```bash
cd apps/hub
node ../../node_modules/vitest/vitest.mjs run --coverage
```

補足: `apps/hub` をカレントディレクトリにすること（`apps/hub/vitest.config.ts` の `esbuild.jsx: 'automatic'` はネストした config として apps/hub 配下からの実行でのみ適用される）。

個別実行:

```bash
cd apps/hub
node ../../node_modules/vitest/vitest.mjs run tests/authz/scope-resolution.test.ts
node ../../node_modules/vitest/vitest.mjs run tests/auth/session-workspace-binding.test.ts
node ../../node_modules/vitest/vitest.mjs run tests/routing/post-signin-landing.test.ts
```

期待結果: 91 テストファイル / 1104 テストケース中、1103 PASS / 1 SKIP / 0 FAIL（[test-run-record.md](./test-run-record.md) 参照）。

## P09 再実行コマンド (変異検証)

P09 の変異検証は一時的なコード変更を伴うため、再実行手順として固定する（変異後は必ず元に戻すこと）。

1. 検査1 (deny-by-default 非退行): `apps/hub/src/middleware/authz.ts` の `if (scope.tenantId === null)` を `if (false && scope.tenantId === null)` へ変更 → `node ../../node_modules/vitest/vitest.mjs run tests/authz/scope-resolution.test.ts tests/security/authz-deny-by-default.test.ts tests/security/middleware-entry.test.ts` を実行 → 3 件 FAIL を確認 → 変更を revert
2. 検査2 (open redirect 防止): `apps/hub/src/lib/routing/post-signin-landing.ts` の `return parsed.origin === RESOLUTION_BASE_ORIGIN;` を `return true || parsed.origin === RESOLUTION_BASE_ORIGIN;` へ変更 → `node ../../node_modules/vitest/vitest.mjs run tests/routing/post-signin-landing.test.ts` を実行 → 2 件 FAIL を確認 → 変更を revert
3. 検査3 (所属検証 fail-closed): `apps/hub/src/lib/auth/session.ts` の `return memberWorkspaceIds.includes(requested) ? requested : null;` を `return true || memberWorkspaceIds.includes(requested) ? requested : null;` へ変更 → `node ../../node_modules/vitest/vitest.mjs run tests/auth/session-workspace-binding.test.ts tests/authz/scope-resolution.test.ts` を実行 → 1 件 FAIL を確認 → 変更を revert

詳細な実測結果は [quality-assurance-record.md](./quality-assurance-record.md) を参照。

## 証跡参照先一覧 (リポジトリ相対 path)

| Phase | 成果物 | 内容 |
|---|---|---|
| P04 | `docs/features/feat-post-signin-scope-routing/test-design.md` | TID 定義と acceptance 対応表 |
| P05 | (実装ファイル、下記「実装ファイル一覧」参照) | scope 解決・着地先解決の実装 |
| P06 | `docs/features/feat-post-signin-scope-routing/test-run-record.md` | テスト実行結果 |
| P07 | `docs/features/feat-post-signin-scope-routing/acceptance-record.md` | 受入判定 |
| P08 | `docs/features/feat-post-signin-scope-routing/refactoring-record.md` | リファクタリング棚卸し記録 |
| P09 | `docs/features/feat-post-signin-scope-routing/quality-assurance-record.md` | 変異検証記録 |
| P10 | `docs/features/feat-post-signin-scope-routing/final-review.md` | リリース可否判定 |
| P11 | `docs/features/feat-post-signin-scope-routing/evidence-record.md`（本ファイル） | 証跡固定 |

## 実装ファイル一覧 (P05 write scope、リポジトリ相対 path)

- `apps/hub/src/lib/auth/session.ts`
- `apps/hub/src/middleware/authz.ts`
- `apps/hub/src/lib/authz/resource.ts`
- `apps/hub/src/app/page.tsx`
- `apps/hub/src/app/[tenant_slug]/signin/tenant-oidc-signin-form.tsx`
- `apps/hub/src/lib/routing/post-signin-landing.ts`

## 秘密情報の混入確認

本記録および参照先の P06〜P10 各記録を確認し、token・cookie 値・session 識別子などの秘密情報は含まれていないことを確認した（テストで使用する値は `'valid-token'`, `'ws-1'` 等のダミー識別子のみ）。

## 再実行可能性の確認

上記コマンドは全て repository 相対 path のみで構成されており、絶対 path を含まない。本記録作成時点で P06 コマンドを再実行し、`test-run-record.md` と同一の結果 (1103 PASS / 1 SKIP / 0 FAIL) が再現することを確認済み。
