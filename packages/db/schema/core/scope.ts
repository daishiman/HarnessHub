// D4 row-level scope の機械可読宣言 (ADR §2)。
// 分離テスト網羅チェック (scripts/check-tenant-isolation-coverage.ts) がこの宣言と実スキーマの差分を fail-closed で検査する。

/**
 * tenant_id 列を持たないテーブルと、その除外理由。
 * ここに列挙されないテーブルは全て tenant_id を持ち、分離テスト (DMDB-T03) の対象になる。
 */
export const TENANT_SCOPE_EXEMPT: Readonly<Record<string, string>> = Object.freeze({
  tenants: '自身がテナント境界のルート (行 = テナント)',
  user_settings: 'users 1:1 従属。tenant へは users 経由で辿る',
  packages: 'content-addressed 共有 (C4)。到達可能性は releases 経由の認可で制御',
  encryption_keys: 'システム全体の鍵台帳。行データではなく鍵素材のため D4 分離テスト対象外',
});
