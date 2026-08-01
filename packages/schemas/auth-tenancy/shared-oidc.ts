/**
 * 共通 Google OAuth client 方式の wire 契約 (issue-auth-tenancy-shared-google-oidc-20260729)。
 *
 * テナント別 client 方式では、テナントは **URL の path** で運べた
 * (`/api/auth/{tenant_slug}/callback` が Google 側に redirect URI として登録済みだから)。
 * 共通 client 方式では redirect URI を全テナントで 1 本に固定するため path にテナントを載せられない。
 * 代わりにテナントを `state` へ載せ、**署名で改竄不能にする**のがここの契約。
 */
import { z } from 'zod';

import { epochSecondsSchema, tenantSlugSchema } from './primitives.js';

/**
 * 共通 callback へ渡す `state` の claims。
 *
 * `typ` を literal で固定するのは、session JWT / access token と**同じ鍵で署名しても**
 * 経路をまたいで使い回せないようにするため (token.ts の `typ` と同じ理由)。
 * これが無いと、共通 callback へ session cookie の値を state として提示する経路が生まれる。
 */
export const sharedOidcStateClaimsSchema = z.object({
  typ: z.literal('shared_oidc_state'),
  /** 束縛先テナントの内部 ID。callback はこの値でしかテナントを確定しない。 */
  tid: z.string().min(1),
  /** 束縛先テナントの slug。認証後の戻り先 URL 組立に使う (tid から引き直さずに済ませる)。 */
  slug: tenantSlugSchema,
  /**
   * double-submit する CSRF binding 値の SHA-256 (16 進)。
   *
   * state は URL に載るので、それ**だけ**では「攻撃者が用意した認可要求を被害者のブラウザで
   * 完了させる」ログイン CSRF を防げない。同じ値の平文を `HttpOnly` cookie にも置き、
   * callback で「cookie の平文 → hash」が state 内の hash と一致することを要求する。
   * cookie は攻撃者のブラウザにしか無いので、被害者のブラウザでは一致しない。
   *
   * hash を state 側に置き平文を cookie 側に置くのは、URL (履歴・Referer・ログに残る) へ
   * 秘密の平文を出さないため。
   */
  csrf: z.string().length(64, 'csrf binding は SHA-256 の 16 進表現です'),
  iat: epochSecondsSchema,
  /** state の失効時刻。認可開始から callback までの現実的な上限を超えたら受理しない。 */
  exp: epochSecondsSchema,
});
export type SharedOidcStateClaims = z.output<typeof sharedOidcStateClaimsSchema>;
