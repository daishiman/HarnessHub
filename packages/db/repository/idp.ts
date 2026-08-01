// idp_connections リポジトリ — テナント IdP secret の封筒暗号化保存 (security-spec §4.3)。
// 復号は OIDC 認可要求の組立時のみ。既定の読取経路は暗号文のまま返す。

import { and, eq } from 'drizzle-orm';
import { idpConnections } from '../schema/core/identity';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { ColumnCipher } from './crypto';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

/**
 * credential の出所。値域の正本は `@harness-hub/schemas` の `oidcCredentialModeSchema`。
 * packages/db は schemas に依存しない (共通層 detector の二重定義検出を避ける) ため、
 * ここでは **列の enum から導いた型 alias** として持ち、公開面へは出さない。
 */
export type IdpCredentialMode = (typeof idpConnections.credentialMode)['_']['data'];

/**
 * 共有方式の行が `client_secret_enc` / `client_id` に入れる値。
 * 「この行は credential を持たない」ことの表現であり、暗号文でも空の秘密でもない。
 */
export const SHARED_CREDENTIAL_PLACEHOLDER = '';

export interface IdpConnectionRow {
  readonly id: string;
  readonly tenantId: string;
  readonly issuerUrl: string;
  /** `credentialMode='shared_google'` の行では空文字。共有 client の ID は環境単位に置く。 */
  readonly clientId: string;
  /**
   * 暗号文 (`{key_version}:{iv}:{ct}:{tag}`)。平文はこの型を通らない。
   * `credentialMode='shared_google'` の行では**空文字**になる (共有 secret を行へ複製しない)。
   */
  readonly clientSecretEnc: string;
  readonly scopes: string;
  readonly createdAt: number;
  readonly credentialMode: IdpCredentialMode;
  /** 許可 Google Workspace ドメインの JSON 配列文字列。NULL = 未設定。 */
  readonly allowedWorkspaceDomains: string | null;
}

const SECRET_REF = (rowId: string) => ({
  table: 'idp_connections',
  column: 'client_secret_enc',
  rowId,
});

/**
 * 接続の登録入力。**credential mode で判別する union** にしてあるのが要点。
 *
 * `shared_google` 側に `clientSecret` を書く場所が無いので、
 * 「共有方式なのにテナント行へ secret を渡す」呼び出しは**型検査で落ちる**。
 * 実行時チェックにすると、その分岐を通らないテストが 1 本でもあれば見逃せてしまう。
 *
 * 逆に `shared_google` では `allowedWorkspaceDomains` を必須にする。共有 client は
 * `aud` がテナント識別子にならないため、許可ドメイン未設定の共有接続は
 * 「誰でも入れる接続」と同義になる。作らせない。
 */
export type IdpConnectionInsert =
  | {
      /**
       * 省略可。既定は顧客持ち込み方式で、列の DEFAULT と一致する。
       * 省略を許すのは、**共有方式の追加で既存の登録経路が 1 行も変わらない**ことを
       * 型の側から保証するため (受入条件 5)。必須にすると既存呼び出しが全て書き換えになり、
       * 「既存方式が壊れていない」ことを既存テストの無変更で示せなくなる。
       */
      readonly credentialMode?: 'customer_google';
      readonly issuerUrl: string;
      readonly clientId: string;
      /** 平文 secret。保存前に必ず暗号化される。 */
      readonly clientSecret: string;
      readonly scopes: string;
      /** 顧客方式では任意。未指定なら NULL = hd を検査しない (既存挙動)。 */
      readonly allowedWorkspaceDomains?: readonly string[];
    }
  | {
      readonly credentialMode: 'shared_google';
      readonly issuerUrl: string;
      readonly scopes: string;
      /** 共有方式では必須。空配列も許さない (下の実装で拒否する)。 */
      readonly allowedWorkspaceDomains: readonly string[];
      /**
       * `clientId` も受け取らない。共有 client の ID は secret と同じく**環境単位で 1 箇所**に置き、
       * テナント行へは複製しない。行へ写すと、共有 client を差し替えるたびに
       * 全テナント行を更新する運用が生まれ、この issue が減らそうとしている手作業が戻ってくる。
       */
    };

/** 共有方式の行に対して secret 復号を要求したときの故障。 */
export class SharedCredentialSecretAccessError extends Error {
  constructor(rowId: string) {
    super(`idp_connections(${rowId}) は共有 credential 方式のため行に client_secret を持ちません`);
    this.name = 'SharedCredentialSecretAccessError';
  }
}

export interface IdpConnectionsRepo {
  insert(context: RepositoryContext, input: IdpConnectionInsert): Promise<IdpConnectionRow>;
  findById(context: RepositoryContext, id: string): Promise<IdpConnectionRow | null>;
  list(context: RepositoryContext): Promise<IdpConnectionRow[]>;
  /**
   * OIDC 認可要求の組立時のみ呼ぶこと。レスポンス・ログへ出さない。
   * 共有方式の行では `SharedCredentialSecretAccessError` を投げる —
   * 空文字を secret として返すと、呼び出し側が「空の secret で認証を試みる」経路になる。
   */
  decryptClientSecret(context: RepositoryContext, id: string): Promise<string>;
  deleteById(context: RepositoryContext, id: string): Promise<void>;
}

export function createIdpConnectionsRepo(adapter: CoreAdapter, cipher: ColumnCipher): IdpConnectionsRepo {
  const scope = (context: RepositoryContext, id: string) =>
    and(eq(idpConnections.tenantId, context.tenantId), eq(idpConnections.id, id));

  return {
    async insert(context, input) {
      const id = newUlid();
      const domains = normalizeAllowedDomains(input.allowedWorkspaceDomains);

      const write = async (values: {
        clientId: string;
        clientSecretEnc: string;
        credentialMode: IdpCredentialMode;
      }): Promise<IdpConnectionRow> => {
        const rows = await guardedWrite(adapter, () =>
          adapter.client
            .insert(idpConnections)
            .values({
              id,
              tenantId: context.tenantId,
              issuerUrl: input.issuerUrl,
              scopes: input.scopes,
              createdAt: serverNow(),
              allowedWorkspaceDomains: domains,
              ...values,
            })
            .returning(),
        );
        return rows[0] as IdpConnectionRow;
      };

      // 分岐を `if` で切るのは narrowing のため。三項で書くと union が絞られず、
      // 共有方式の枝から `input.clientSecret` を参照できてしまう
      if (input.credentialMode === 'shared_google') {
        if (domains === null) {
          throw new Error('共有 credential 方式の接続には許可 Workspace ドメインが 1 件以上必要です');
        }
        // 暗号化そのものを行わない。「空文字を暗号化して入れる」と暗号文の入った行と
        // 見分けが付かなくなり、「secret を行へ複製していない」ことを検査できなくなる (受入条件 4)
        return write({
          clientId: SHARED_CREDENTIAL_PLACEHOLDER,
          clientSecretEnc: SHARED_CREDENTIAL_PLACEHOLDER,
          credentialMode: 'shared_google',
        });
      }

      return write({
        clientId: input.clientId,
        clientSecretEnc: await cipher.encryptColumn('idp_secret', input.clientSecret, SECRET_REF(id)),
        credentialMode: 'customer_google',
      });
    },

    async findById(context, id) {
      const rows = await adapter.client.select().from(idpConnections).where(scope(context, id)).limit(1);
      return (rows[0] as IdpConnectionRow | undefined) ?? null;
    },

    async list(context) {
      const rows = await adapter.client
        .select()
        .from(idpConnections)
        .where(eq(idpConnections.tenantId, context.tenantId));
      return rows as IdpConnectionRow[];
    },

    async decryptClientSecret(context, id) {
      const rows = await adapter.client.select().from(idpConnections).where(scope(context, id)).limit(1);
      const row = rows[0] as IdpConnectionRow | undefined;
      if (row === undefined) throw new EntityNotFoundError('idp_connections', id);
      // 共有方式の行に secret は無い。空文字を返すと呼び出し側が「空 secret で認証」へ進む
      if (row.credentialMode === 'shared_google') throw new SharedCredentialSecretAccessError(id);
      return cipher.decryptColumn('idp_secret', row.clientSecretEnc, SECRET_REF(id));
    },

    async deleteById(context, id) {
      await guardedWrite(adapter, () => adapter.client.delete(idpConnections).where(scope(context, id)));
    },
  };
}

/**
 * 許可 Workspace ドメインを保存形 (JSON 配列文字列) へ正規化する。
 *
 * 空配列を `'[]'` として保存せず NULL へ寄せる。`'[]'` を許すと
 * 「未設定 (NULL)」と「明示的に空 (= 誰も許可しない)」の 2 状態が生まれ、
 * 読み取り側が両方を分岐しなければならなくなる。どちらも「有効な許可が 0 件」なので
 * 表現を 1 つに畳み、共有方式ではその状態を insert の時点で拒否する。
 */
function normalizeAllowedDomains(domains: readonly string[] | undefined): string | null {
  if (domains === undefined || domains.length === 0) return null;
  return JSON.stringify([...domains]);
}
