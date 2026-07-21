// 第 2 consumer 系統による auth adapter (apps/hub/src/shared/auth) の利用。
// 公開入口 index.ts のみを参照し、内部実装ファイルへ deep import しない。
import {
  type AuthProvider,
  type AuthRequestContext,
  createAuthAdapter,
  denyAllAuthProvider,
  type Principal,
  toAuthRequestContext,
} from '../../../src/shared/auth/index.js';

export const boundCreateAuthAdapter = createAuthAdapter;
export const boundDenyAllAuthProvider = denyAllAuthProvider;
export const boundToAuthRequestContext = toAuthRequestContext;

export const sampleRequestContext: AuthRequestContext = {
  headers: new Map([['x-harness-tenant-id', 'tenant-a']]),
  url: 'https://hub.example/api/v1/harnesses',
};

/** provider 未注入のまま使ったときに未認証へ倒れることを consumer 側からも確かめる */
export function resolveWithDefaultProvider(): Promise<Principal | null> {
  return createAuthAdapter().resolvePrincipal(sampleRequestContext);
}

/** 壊れた Principal を返す provider。境界が形を検証していることの確認に使う */
export const malformedProvider: AuthProvider = {
  name: 'malformed',
  authenticate: async () => ({ subject: '', tenantId: '', workspaceIds: [], roles: [] }),
};

export function resolveWithMalformedProvider(): Promise<Principal | null> {
  return createAuthAdapter(malformedProvider).resolvePrincipal(sampleRequestContext);
}
