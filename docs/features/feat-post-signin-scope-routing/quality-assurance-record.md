# 品質保証記録 — feat-post-signin-scope-routing

> P09 成果物。正本: `.dev-graph/plans/generations/feature-package-feat-post-signin-scope-routing/ecbd1cbf87d9f34a5a8b88c455b1e17e6dddf9f8a9069381403ec78556181efa/task-specs/phase-09-quality-assurance.md`
> 目的: deny-by-default 非退行・open redirect 防止・所属検証の 3 検査を fail-closed の品質ゲートとして成立させ、検査を無効化した変異版でゲートが実際に反転することまで確認する。

## 判定サマリー

3 検査すべてを対象実装ファイルへ一時的な変異 (mutation) を注入して実測し、いずれも対応するテストが FAIL へ反転することを確認した。反転しない検査は 0 件。検査後は全ての変異を復旧し、`diff` によるバイト単位の一致と、フルテストスイート再実行 (1103 PASS / 1 SKIP / 0 FAIL) で原状回復を確認した。

## 検査 1: deny-by-default 非退行 (missing_tenant_scope)

- 対象: `apps/hub/src/middleware/authz.ts` の `authorize()` 内、`scope.tenantId === null` 判定
- 変異内容: `if (scope.tenantId === null)` を `if (false && scope.tenantId === null)` へ書き換え、tenantId 未申告時の拒否分岐を到達不能にした
- 実測結果 (反転): `tests/authz/scope-resolution.test.ts`, `tests/security/authz-deny-by-default.test.ts`, `tests/security/middleware-entry.test.ts` を実行し、**3 件 FAIL** を確認した
  - `TID-INT-05` の一部 (`/sheets` への session scope 無しアクセス) が `missing_tenant_scope` の代わりに `tenant_mismatch` を返すようになった (後続の tenant 一致チェックへフォールスルーしたため)
  - `authz-deny-by-default.test.ts` の「allowlist に無い path はテナントスコープ未申告なら拒否する」が同様に反転
- 復旧確認: 元ファイルへ復旧後、同 3 ファイルを再実行し **41 件 PASS** (反転前と同一件数) を確認

## 検査 2: open redirect 防止

- 対象: `apps/hub/src/lib/routing/post-signin-landing.ts` の `isSameOriginRelativePath()` 内、origin 一致判定
- 変異内容: `return parsed.origin === RESOLUTION_BASE_ORIGIN;` を `return true || parsed.origin === RESOLUTION_BASE_ORIGIN;` へ書き換え、origin 検証を無条件 true にした
- 実測結果 (反転): `tests/routing/post-signin-landing.test.ts` を実行し、**2 件 FAIL** を確認した
  - `TID-LAND-05` (`//evil.com`, protocol-relative) が既定着地へフォールバックせず `//evil.com` をそのまま返すようになった
  - `TID-LAND-06` (`/\evil.com`, バックスラッシュトリック) も同様に反転
  - 補足: `TID-LAND-03/04/07` (絶対URL・スキーム付き・資格情報付きURL) は `isSameOriginRelativePath()` 冒頭の `!value.startsWith('/')` ガードで先に弾かれるため、この変異では反転しない。これは origin 判定と先頭文字チェックが独立した 2 層の防御であることの裏付けであり、検査として成立しないことを意味しない
- 復旧確認: 元ファイルへ復旧後、同ファイルを再実行し **8 件 PASS** (反転前と同一件数) を確認

## 検査 3: 所属検証の fail-closed (workspace 束縛)

- 対象: `apps/hub/src/lib/auth/session.ts` の `resolveActiveWorkspaceId()` 内、所属一覧との照合
- 変異内容: `return memberWorkspaceIds.includes(requested) ? requested : null;` を `return true || memberWorkspaceIds.includes(requested) ? requested : null;` へ書き換え、所属チェックを無条件で通過させた
- 実測結果 (反転): `tests/auth/session-workspace-binding.test.ts`, `tests/authz/scope-resolution.test.ts` を実行し、**1 件 FAIL** を確認した
  - `TID-BIND-02` (`cookie が所属外の workspaceId -> null`) が `null` の代わりに所属外の `'ws-9'` をそのまま返すようになった
- 復旧確認: 元ファイルへ復旧後、同 2 ファイルを再実行し **21 件 PASS** (反転前と同一件数) を確認

## 原状回復の確認

3 検査すべての変異を復旧した後、対象 3 ファイルが変異前と完全に一致することを `diff` で確認し、`apps/hub` 全体のテストを再実行した。

```bash
diff apps/hub/src/middleware/authz.ts <backup>/authz.ts               # 差分なし
diff apps/hub/src/lib/routing/post-signin-landing.ts <backup>/post-signin-landing.ts  # 差分なし
diff apps/hub/src/lib/auth/session.ts <backup>/session.ts             # 差分なし
```

```bash
cd apps/hub
/opt/homebrew/bin/node ../../node_modules/vitest/vitest.mjs run
```

結果: **1103 PASS / 1 SKIP / 0 FAIL**（91 テストファイル / 1104 テストケース）— P06・P08 記録と完全一致。

## 反転しなかった検査

**0 件**。3 検査すべてが対応する変異で FAIL へ反転することを実測した。

## スコープ外の確認

- 本体実装の機能変更は行っていない (変異は検証目的の一時的なものであり、最終的に完全復旧している)
- 受入判定 (acceptance 8 件の PASS/FAIL) は P07 の判定を変更しない
- リリース可否判定は行っていない (owner=P10)
