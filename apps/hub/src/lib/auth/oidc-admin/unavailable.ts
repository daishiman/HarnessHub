/**
 * OIDC 接続管理が結線されていない runtime のための実体
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * 「何もしない」実装にしないこと。空配列を返す `list` を置くと、結線漏れが
 * 「接続が 1 件も無いテナント」に見えて画面上は正常に映る。呼ばれたら必ず落とす。
 *
 * **合成点 (`authz/runtime.ts`) ではなくここに置いてある**。認証・device flow だけを検査する
 * 既存テストは `vi.mock('authz/runtime.js')` でモジュールごと差し替えるため、この実体が
 * 同じ file に居ると、harness が実体を取れずに mock factory 側へ「呼ばれたら落ちる」性質を
 * 複製する羽目になる。複製した瞬間、本物と mock がずれても誰も気付けない。
 */

import type { OidcAdminService } from './service.js';

export function createUnavailableOidcAdminService(): OidcAdminService {
  const unavailable = async (): Promise<never> => {
    throw new Error('OIDC 接続管理サービスが結線されていません (createAuthRuntime の oidcAdmin が未指定)');
  };
  return {
    list: unavailable,
    register: unavailable,
    test: unavailable,
    stageRotation: unavailable,
    discardRotation: unavailable,
    activate: unavailable,
    disable: unavailable,
  };
}
