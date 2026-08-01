/**
 * Auth.js の sign-in → callback 経路を**外部 IdP を立てずに**通すためのテストダブル。
 *
 * 方針は in-memory-ports.ts と同じで、「検証が通ること」の意味が消える箇所はモックしない。
 * `oauth4webapi` は id_token の署名を JWKS 経由で必ず検証するため、鍵は本物 (ES256 の鍵ペアを
 * 都度生成し、JWKS 応答で公開鍵を配る) を使う。差し替えるのは HTTP 経路 (`globalThis.fetch`) だけ。
 */

const KEY_ID = 'fake-idp-key';
const ES256_KEY_PARAMS = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const ES256_SIGN_PARAMS = { name: 'ECDSA', hash: 'SHA-256' } as const;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function base64UrlJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** token endpoint が受け取った要求。client 認証のかたちを検査するために保持する。 */
export interface RecordedTokenRequest {
  readonly authorization: string | null;
  readonly form: Readonly<Record<string, string>>;
}

export interface FakeOidcIdp {
  readonly issuer: string;
  /** `globalThis.fetch` へ差し込む stub。IdP の 3 endpoint 以外を叩いたら例外にする。 */
  readonly fetch: typeof globalThis.fetch;
  /** 次の token 応答に載せる id_token の claims。`nonce` は認可要求から流し込む。 */
  setIdTokenClaims(claims: Readonly<Record<string, unknown>>): void;
  tokenRequests(): readonly RecordedTokenRequest[];
}

export async function createFakeOidcIdp(options: {
  readonly issuer: string;
  readonly audience: string;
}): Promise<FakeOidcIdp> {
  const { issuer, audience } = options;
  const keyPair = await crypto.subtle.generateKey(ES256_KEY_PARAMS, true, ['sign', 'verify']);
  const exported = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  // ext / key_ops は載せない。JWKS の鍵選択条件に余計な制約を持ち込まないため
  const publicJwk = {
    kty: exported.kty,
    crv: exported.crv,
    x: exported.x,
    y: exported.y,
    alg: 'ES256',
    use: 'sig',
    kid: KEY_ID,
  };

  const metadata = {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${issuer}/jwks`,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['ES256'],
    code_challenge_methods_supported: ['S256'],
  };

  let idTokenClaims: Readonly<Record<string, unknown>> = {};
  const recorded: RecordedTokenRequest[] = [];

  const signIdToken = async (): Promise<string> => {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload = { iss: issuer, aud: audience, iat: issuedAt, exp: issuedAt + 300, ...idTokenClaims };
    const signingInput = `${base64UrlJson({ alg: 'ES256', typ: 'JWT', kid: KEY_ID })}.${base64UrlJson(payload)}`;
    const signature = await crypto.subtle.sign(
      ES256_SIGN_PARAMS,
      keyPair.privateKey,
      new TextEncoder().encode(signingInput),
    );
    return `${signingInput}.${base64Url(new Uint8Array(signature))}`;
  };

  const fetchStub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url === `${issuer}/.well-known/openid-configuration`) return jsonResponse(metadata);
    if (url === metadata.jwks_uri) return jsonResponse({ keys: [publicJwk] });
    if (url === metadata.token_endpoint) {
      recorded.push({
        authorization: new Headers(init?.headers).get('authorization'),
        form: Object.fromEntries(new URLSearchParams(String(init?.body ?? ''))),
      });
      return jsonResponse({
        access_token: 'fake-idp-access-token',
        token_type: 'bearer',
        expires_in: 300,
        id_token: await signIdToken(),
      });
    }

    throw new Error(`fake IdP に未定義の endpoint が呼ばれました: ${url}`);
  };

  return {
    issuer,
    fetch: fetchStub as typeof globalThis.fetch,
    setIdTokenClaims(claims) {
      idTokenClaims = claims;
    },
    tokenRequests: () => [...recorded],
  };
}

export interface OidcSignInFlow {
  /** signin が返した IdP への遷移先。state / nonce / code_challenge が載っている。 */
  readonly authorizeUrl: URL;
  /** callback の応答。ここに session cookie が載る (拒否された場合は載らない)。 */
  readonly response: Response;
  readonly cookies: ReadonlyMap<string, string>;
}

/**
 * ブラウザ相当の cookie 入れ物。
 *
 * state / nonce / PKCE verifier は Auth.js が cookie へ封入する。手で組み立てると封入形式の
 * 変更を検出できないため、必ず handler の応答から拾い直す。共有 client 方式では
 * **開始 (テナント path) と callback (共通 path) で応答が別**なので、跨いで運ぶ器が要る。
 */
export interface CookieJar {
  /** 応答の `Set-Cookie` を取り込む。空値は削除指示として扱う。 */
  absorb(response: Response): void;
  /** `Cookie` ヘッダ値を組む。`exclude` に挙げた名前は落とす (欠落時の挙動を試すため)。 */
  header(options?: { readonly exclude?: readonly string[] }): string;
  entries(): ReadonlyMap<string, string>;
}

export function createCookieJar(): CookieJar {
  const jar = new Map<string, string>();

  return {
    absorb(response) {
      for (const raw of response.headers.getSetCookie()) {
        const pair = raw.split(';')[0];
        if (pair === undefined) continue;
        const separator = pair.indexOf('=');
        if (separator < 0) continue;
        const name = pair.slice(0, separator).trim();
        const value = pair.slice(separator + 1).trim();
        if (value.length === 0) jar.delete(name);
        else jar.set(name, value);
      }
    },
    header(options) {
      const exclude = new Set(options?.exclude ?? []);
      return [...jar]
        .filter(([name]) => !exclude.has(name))
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
    },
    entries: () => new Map(jar),
  };
}

/** 認可開始まで進めた状態。callback をどこへ・どんな cookie で出すかは呼び出し側が決める。 */
export interface StartedOidcSignIn {
  /** signin(POST) の遷移先。state / nonce / code_challenge が載っている。 */
  readonly authorizeUrl: URL;
  /** signin(POST) の応答そのもの。共有方式の binding cookie はここに載る。 */
  readonly signin: Response;
  readonly jar: CookieJar;
}

/**
 * csrf → signin(POST) までを実際の handler へ通す。
 *
 * ここで止めるのは、**callback の宛先が方式によって変わる**から。
 * 顧客方式は `{basePath}/callback/{provider}`、共有方式は `/api/auth/shared/callback/tenant-oidc`。
 */
export async function startOidcSignIn(params: {
  readonly handler: (request: Request) => Promise<Response>;
  readonly origin: string;
  /** 認可を開始する path。どちらの方式も `/api/auth/{tenant_slug}`。 */
  readonly basePath: string;
  readonly providerId?: string;
}): Promise<StartedOidcSignIn> {
  const { handler, origin, basePath } = params;
  const providerId = params.providerId ?? 'tenant-oidc';
  const jar = createCookieJar();

  const csrf = await handler(new Request(`${origin}${basePath}/csrf`));
  jar.absorb(csrf);
  const { csrfToken } = (await csrf.json()) as { csrfToken: string };

  const signin = await handler(
    new Request(`${origin}${basePath}/signin/${providerId}`, {
      method: 'POST',
      headers: { cookie: jar.header(), 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ csrfToken, callbackUrl: `${origin}/` }).toString(),
    }),
  );
  jar.absorb(signin);
  const location = signin.headers.get('location');
  if (location === null) throw new Error(`認可要求へ遷移しませんでした (status=${signin.status})`);

  return { authorizeUrl: new URL(location), signin, jar };
}

/**
 * 認可 callback を handler へ出す。IdP が返す id_token の `nonce` は認可要求から流し込む。
 *
 * `state` と `callbackPath` を呼び出し側が指定できるのが要点で、
 * 「別テナントの state を共通 callback へ提示する」といった否定系をそのまま書ける。
 */
export async function completeOidcCallback(params: {
  readonly handler: (request: Request) => Promise<Response>;
  readonly idp: FakeOidcIdp;
  readonly origin: string;
  readonly started: StartedOidcSignIn;
  /** callback を受ける path (`/api/auth/{slug}/callback/tenant-oidc` など)。 */
  readonly callbackPath: string;
  /** id_token に載せる claims (`sub` は必須、`nonce` は自動で足す)。 */
  readonly idToken: Readonly<Record<string, unknown>>;
  /** 既定は認可 URL に載った state。差し替え試験ではここへ別の値を渡す。 */
  readonly state?: string | null;
  /** callback 要求から落とす cookie 名。binding 欠落の試験で使う。 */
  readonly excludeCookies?: readonly string[];
}): Promise<Response> {
  const { handler, idp, origin, started, callbackPath, idToken } = params;

  idp.setIdTokenClaims({ ...idToken, nonce: started.authorizeUrl.searchParams.get('nonce') });

  const callback = new URL(`${origin}${callbackPath}`);
  callback.searchParams.set('code', 'fake-authorization-code');
  const state = params.state === undefined ? started.authorizeUrl.searchParams.get('state') : params.state;
  if (state !== null) callback.searchParams.set('state', state);

  const headers: Record<string, string> = {};
  const cookie = started.jar.header(
    params.excludeCookies === undefined ? undefined : { exclude: params.excludeCookies },
  );
  if (cookie.length > 0) headers.cookie = cookie;

  const response = await handler(new Request(callback.toString(), { headers }));
  started.jar.absorb(response);
  return response;
}

/**
 * csrf → signin(POST) → callback(GET) を実際の handler へ順に通す (顧客持ち込み client 方式)。
 * callback は認可を開始したのと同じテナント path で受ける。
 */
export async function driveOidcSignIn(params: {
  readonly handler: (request: Request) => Promise<Response>;
  readonly idp: FakeOidcIdp;
  readonly origin: string;
  /** `/api/auth/{tenant_slug}` まで。 */
  readonly basePath: string;
  /** id_token に載せる claims (`sub` は必須、`nonce` は自動で足す)。 */
  readonly idToken: Readonly<Record<string, unknown>>;
  readonly providerId?: string;
}): Promise<OidcSignInFlow> {
  const providerId = params.providerId ?? 'tenant-oidc';
  const started = await startOidcSignIn({
    handler: params.handler,
    origin: params.origin,
    basePath: params.basePath,
    providerId,
  });

  const response = await completeOidcCallback({
    handler: params.handler,
    idp: params.idp,
    origin: params.origin,
    started,
    callbackPath: `${params.basePath}/callback/${providerId}`,
    idToken: params.idToken,
  });

  return { authorizeUrl: started.authorizeUrl, response, cookies: started.jar.entries() };
}

/** 応答の `Set-Cookie` から指定 cookie の値を取り出す。削除指示 (空値) は null 扱い。 */
export function setCookieValue(response: Response, name: string): string | null {
  for (const raw of response.headers.getSetCookie()) {
    const pair = raw.split(';')[0];
    if (pair === undefined) continue;
    const separator = pair.indexOf('=');
    if (separator < 0 || pair.slice(0, separator).trim() !== name) continue;
    const value = pair.slice(separator + 1).trim();
    return value.length > 0 ? value : null;
  }
  return null;
}
