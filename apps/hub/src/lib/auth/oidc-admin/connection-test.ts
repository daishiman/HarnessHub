/**
 * 顧客持ち込み Google OAuth client の接続テスト
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * ## 利用者を巻き込まずに credential を検証する方法
 *
 * 「本当にログインできるか」を確かめる一番素直な方法は実際にログインさせることだが、
 * それでは rotation のたびに pilot user の手を借りることになり、深夜の緊急 rotation が
 * 「人が起きるまで進まない作業」になる。
 *
 * 代わりに **token endpoint へ意図的に無効な authorization code を投げる**。
 * OAuth 2.0 (RFC 6749 §5.2) は client 認証の失敗を `invalid_client`、
 * code の不正を `invalid_grant` として区別するので:
 *
 *   - `invalid_grant` が返る = 不正な code が拒否された = credential probe は **合格**
 *   - `invalid_client` が返る = credential そのものが違う = **不合格**
 *
 * つまり「わざと失敗させて、失敗の種類を読む」。自分が所有する OAuth client に対して
 * 1 要求だけ投げる検査で、利用者の資格情報も同意も要らない。ただし、偽 code は登録済み
 * redirect URI と結び付いていないため、この probe だけでは callback 登録の正しさを証明できない。
 * そこは有効化後の実ブラウザ login を別ゲートにする。
 *
 * ## secret の扱い
 *
 * 平文 secret はこの module の**引数と要求 body の中だけ**に存在する。
 * 戻り値は列挙された失敗理由だけで、Google の応答本文も例外 message も外へ出さない。
 * 応答本文を持ち回ると、それを「詳細エラー」としてログや API に載せる改修が自然に見えてしまう。
 */

import type { OidcConnectionTestFailure } from '@harness-hub/schemas';

/**
 * わざと拒否させるための authorization code。
 *
 * 秘密ではない (むしろ「絶対に有効でない値」であることが要件)。定数で固定しておくのは、
 * 乱数にすると「まぐれで有効な code に当たる」心配を毎回説明する羽目になるため。
 * authorization code は Google 側で発行されたものしか有効にならないので、
 * この固定文字列が受理されることはない。
 */
const PROBE_AUTHORIZATION_CODE = 'harness-hub-connection-probe-invalid-code';

/** OIDC discovery document のうち、この検査が使う部分だけ。 */
interface DiscoveryDocument {
  readonly issuer?: unknown;
  readonly token_endpoint?: unknown;
}

export interface OidcConnectionTestInput {
  /** 接続の issuer (`https://accounts.google.com`)。discovery の一致検査にも使う。 */
  readonly issuer: string;
  readonly clientId: string;
  /** 平文 secret。**呼び出し側はこの値をログ・監査・応答へ渡さないこと。** */
  readonly clientSecret: string;
  /** Google Cloud Console へ登録済みの callback URL。 */
  readonly redirectUri: string;
}

export type OidcConnectionTestOutcome =
  | { readonly passed: true }
  | { readonly passed: false; readonly reason: OidcConnectionTestFailure };

export type OidcConnectionTester = (input: OidcConnectionTestInput) => Promise<OidcConnectionTestOutcome>;

export interface GoogleOidcConnectionTesterDeps {
  /**
   * 注入する `fetch`。省略時は global。
   * テストで差し替えられるようにしてあるのは、Google への実通信をテストの前提にしないため
   * (ネットワークが落ちた日に CI が「credential が壊れた」と主張し始める)。
   */
  readonly fetch?: typeof globalThis.fetch;
}

/**
 * Google の OIDC discovery + token endpoint を使う接続テスターを作る。
 *
 * 判定は 4 値 (合格 / discovery 不達 / issuer 不一致 / credential 拒否 / 想定外) に閉じる。
 * 「よく分からないので合格」に倒れる枝を作らないこと — 接続テストは有効化の前提条件なので、
 * ここが緩むと未検証の credential が `active` へ進む。
 */
export function createGoogleOidcConnectionTester(deps: GoogleOidcConnectionTesterDeps = {}): OidcConnectionTester {
  const doFetch = deps.fetch ?? globalThis.fetch;

  return async (input) => {
    const discovery = await readDiscovery(doFetch, input.issuer);
    if (discovery === null) return { passed: false, reason: 'discovery_unreachable' };
    if (discovery.issuer !== input.issuer) return { passed: false, reason: 'issuer_mismatch' };

    return probeTokenEndpoint(doFetch, discovery.tokenEndpoint, input);
  };
}

interface ResolvedDiscovery {
  readonly issuer: string;
  readonly tokenEndpoint: string;
}

async function readDiscovery(doFetch: typeof globalThis.fetch, issuer: string): Promise<ResolvedDiscovery | null> {
  // issuer の末尾スラッシュ有無で path が `//.well-known` になるのを防ぐ。
  // Google は正規化してくれるが、issuer 一致検査は正規化前後で意味が変わるので手前で揃える
  const base = issuer.endsWith('/') ? issuer.slice(0, -1) : issuer;

  let response: Response;
  try {
    response = await doFetch(`${base}/.well-known/openid-configuration`, {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
  } catch {
    // 例外の中身は握り潰す。DNS 名や proxy の詳細が上位のエラー文字列へ流れるのを避ける
    return null;
  }
  if (!response.ok) return null;

  let document: DiscoveryDocument;
  try {
    document = (await response.json()) as DiscoveryDocument;
  } catch {
    return null;
  }

  const documentIssuer = typeof document.issuer === 'string' ? document.issuer : null;
  const tokenEndpoint = typeof document.token_endpoint === 'string' ? document.token_endpoint : null;
  if (documentIssuer === null || tokenEndpoint === null) return null;

  return { issuer: documentIssuer, tokenEndpoint };
}

async function probeTokenEndpoint(
  doFetch: typeof globalThis.fetch,
  tokenEndpoint: string,
  input: OidcConnectionTestInput,
): Promise<OidcConnectionTestOutcome> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: PROBE_AUTHORIZATION_CODE,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
  });

  let response: Response;
  try {
    response = await doFetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: body.toString(),
    });
  } catch {
    return { passed: false, reason: 'unexpected_response' };
  }

  // 401 は client 認証の失敗 (RFC 6749 §5.2)。body を読むまでもなく credential が違う
  if (response.status === 401) return { passed: false, reason: 'invalid_client' };

  let payload: { readonly error?: unknown };
  try {
    payload = (await response.json()) as { readonly error?: unknown };
  } catch {
    return { passed: false, reason: 'unexpected_response' };
  }

  const error = typeof payload.error === 'string' ? payload.error : null;

  // 意図的に無効な code を送っているので、正常応答 (200) が返ること自体が想定外。
  // 「成功したから合格」にしてしまうと、token endpoint を騙る別実体を合格にできてしまう
  if (response.ok) return { passed: false, reason: 'unexpected_response' };

  if (error === 'invalid_client') return { passed: false, reason: 'invalid_client' };
  // ここだけが probe 合格。callback 登録の一致はこの応答だけでは証明できない
  if (error === 'invalid_grant') return { passed: true };

  return { passed: false, reason: 'unexpected_response' };
}
