// auth adapter 境界。Auth.js への依存をこの層だけに閉じ込め、上位は Principal のみを見る (shared-layers §2 / D3)

/** 認証済み主体。テナント固有の role 語彙は feat-auth-tenancy が拡張する */
export interface Principal {
  /** IdP 側の一意識別子 */
  readonly subject: string;
  /** 所属テナント。Principal は必ず単一テナントに束縛される */
  readonly tenantId: string;
  /** アクセス可能な Workspace。空配列は「Workspace スコープを一切持たない」を意味する */
  readonly workspaceIds: readonly string[];
  /** 共通境界では文字列として扱い、意味付けは feat-auth-tenancy に委ねる */
  readonly roles: readonly string[];
}

/** 認証で参照する最小の要求表現。Request 実体に依存させないための境界型 */
export interface AuthRequestContext {
  readonly headers: ReadonlyMap<string, string>;
  readonly url: string;
}

/**
 * 認証 provider。Auth.js / OIDC / Device Flow などの実装差はこのインタフェースの裏に隠す。
 * 実体の provider 実装は feat-auth-tenancy が提供する。
 */
export interface AuthProvider {
  readonly name: string;
  authenticate(context: AuthRequestContext): Promise<Principal | null>;
}

export interface AuthAdapter {
  readonly providerName: string;
  /** 認証できない場合は例外ではなく null を返す。判定は認可層 (src/middleware) が行う */
  resolvePrincipal(context: AuthRequestContext): Promise<Principal | null>;
}

/**
 * 既定 provider。provider 未設定のまま本番に出た場合に全要求を未認証として扱う (fail-closed)。
 * これを差し替えないと誰もログインできないのは意図した挙動。
 */
export const denyAllAuthProvider: AuthProvider = {
  name: 'deny-all',
  authenticate: async () => null,
};

export function createAuthAdapter(provider: AuthProvider = denyAllAuthProvider): AuthAdapter {
  return {
    providerName: provider.name,
    async resolvePrincipal(context) {
      const principal = await provider.authenticate(context);
      // provider が壊れた形の Principal を返しても認可層へ通さない
      return isPrincipal(principal) ? principal : null;
    },
  };
}

/** Request から境界型を作る。Headers の key は小文字へ正規化する */
export function toAuthRequestContext(request: Request): AuthRequestContext {
  const headers = new Map<string, string>();
  request.headers.forEach((value, key) => {
    headers.set(key.toLowerCase(), value);
  });
  return { headers, url: request.url };
}

function isPrincipal(value: Principal | null): value is Principal {
  if (value === null) return false;
  if (typeof value.subject !== 'string' || value.subject.length === 0) return false;
  if (typeof value.tenantId !== 'string' || value.tenantId.length === 0) return false;
  if (!Array.isArray(value.workspaceIds) || !Array.isArray(value.roles)) return false;
  return true;
}
