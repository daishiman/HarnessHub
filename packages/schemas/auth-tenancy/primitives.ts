/**
 * feat-auth-tenancy の契約プリミティブ。
 * 数値・文字集合の正本は docs/backend-spec.md §3.2 / docs/security-spec.md §2.1-2.2 であり、
 * ここは「その形を wire 上で表現したもの」だけを持つ (実行時の TTL 等は apps/hub 側 config.ts が正本)。
 */
import { z } from 'zod';

/**
 * テナントを URL で名指しするための slug。`/{tenant_slug}/signin` の path segment になる。
 * 大文字を許すと同一テナントが 2 通りの URL を持ってしまうため小文字のみに縛る。
 */
export const tenantSlugSchema = z
  .string()
  .min(1, 'テナント slug が空です')
  .max(63, 'テナント slug が長すぎます')
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'テナント slug に使えない文字が含まれています');
export type TenantSlug = z.output<typeof tenantSlugSchema>;

/**
 * user_code の文字集合 (Crockford Base32)。
 * `I` `L` `O` `U` を除くのは、人が読み上げ・手入力する値だから (1/I/L、0/O の取り違えを構造的に消す)。
 */
export const USER_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** user_code の桁数。8 桁 = 32^8 ≈ 40bit。TTL 10 分 + 試行 5 回制限と併せて総当たりを封じる。 */
export const USER_CODE_LENGTH = 8;

export const userCodeSchema = z
  .string()
  .length(USER_CODE_LENGTH, `user_code は ${USER_CODE_LENGTH} 文字です`)
  .regex(/^[0-9A-HJKMNP-TV-Z]{8}$/, 'user_code に使えない文字が含まれています');
export type UserCode = z.output<typeof userCodeSchema>;

/** device_code。返却は平文だが保存側は SHA-256 ハッシュのみを持つ (security-spec §2.2)。 */
export const deviceCodeSchema = z.string().min(32, 'device_code が短すぎます').max(512, 'device_code が長すぎます');

/** refresh token。device_code と同じく保存はハッシュのみ。 */
export const refreshTokenSchema = z.string().min(32, 'refresh_token が短すぎます').max(1024);

/**
 * Publisher token に付与できる scope (security-spec §3.5)。
 * role とは直交する。role が足りていても scope が無ければ拒否する。
 */
export const publisherTokenScopeSchema = z.enum(['publish:write', 'metrics:write', 'feedback:write', 'aijob:process']);
export type PublisherTokenScope = z.output<typeof publisherTokenScopeSchema>;

/**
 * session claims に載る role。**列としての値域は 3 種**であり `owner` を含まない。
 * `owner` は `projects.owner_user_id` との関係から認可判定時に合成される (ADR AD-3)。
 */
export const sessionRoleSchema = z.enum(['provider-admin', 'workspace-admin', 'member']);
export type SessionRole = z.output<typeof sessionRoleSchema>;

/** 利用者の状態。`inactive` は認可判定で一律拒否される。 */
export const userStatusSchema = z.enum(['active', 'inactive']);
export type UserStatus = z.output<typeof userStatusSchema>;

/** UNIX epoch 秒。JWT の `iat`/`exp` と失効時刻の比較に使うため、ミリ秒と混ぜない。 */
export const epochSecondsSchema = z.number().int().nonnegative();

/**
 * OIDC credential の出所 (issue-auth-tenancy-shared-google-oidc-20260729)。
 *
 * - `customer_google`: テナント所有の Google Cloud project で作った OAuth client。
 *   client_id / client_secret はテナント行 (`idp_connections`) に持つ。
 * - `shared_google`: HarnessHub 所有の共通 OAuth client。credential は**環境単位で 1 組**だけ持ち、
 *   テナント行へは複製しない。
 *
 * **既定値を持たせない。** 「未設定なら共有」にすると、既存テナントの認証境界が
 * 列を足した瞬間に変わってしまう。未設定・不明な値は解決側で拒否する (fail-closed)。
 */
export const oidcCredentialModeSchema = z.enum(['customer_google', 'shared_google']);
export type OidcCredentialMode = z.output<typeof oidcCredentialModeSchema>;

/**
 * Google Workspace のプライマリドメイン (ID token の `hd` claim と突き合わせる値)。
 *
 * 小文字のみを許すのは、`hd` の比較を「正規化してから」ではなく**保存時点で一意**にするため。
 * 大文字を許すと `Example.com` と `example.com` が別エントリとして登録でき、
 * 「許可したつもりのドメインが一致しない」という無言の拒否 (または片方だけ許可) を生む。
 *
 * ドットを 1 つ以上要求する。`hd` は登録済みドメインなので TLD を必ず持ち、
 * ドット無しの値 (`localhost` 等) は Workspace ドメインとして成立しない。
 */
export const workspaceDomainSchema = z
  .string()
  .min(3, 'Workspace ドメインが短すぎます')
  .max(253, 'Workspace ドメインが長すぎます')
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/,
    'Workspace ドメインは小文字の DNS 名で指定してください',
  );
export type WorkspaceDomain = z.output<typeof workspaceDomainSchema>;
