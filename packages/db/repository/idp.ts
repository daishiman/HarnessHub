// idp_connections リポジトリ — テナント IdP secret の封筒暗号化保存 (security-spec §4.3)。
// 復号は OIDC 認可要求の組立時のみ。既定の読取経路は暗号文のまま返す。

import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { idpConnections } from '../schema/core/identity';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { guardedWrite } from './conflict';
import type { ColumnCipher } from './crypto';
import type { CoreAdapter } from './db';
import {
  assertCredentialStatusTransition,
  type CurrentSecretCas,
  clientSecretLast4,
  type IdpConnectionRow,
  type IdpCredentialMode,
  type IdpCredentialStatus,
  PendingCredentialAbsentError,
  type PendingSecretCas,
  SHARED_CREDENTIAL_PLACEHOLDER,
  SharedCredentialSecretAccessError,
} from './idp-lifecycle';
import { serverNow } from './time';
import { newUlid } from './ulid';

export {
  CLIENT_SECRET_LAST4_LENGTH,
  type CurrentSecretCas,
  clientSecretLast4,
  type IdpConnectionRow,
  type IdpCredentialMode,
  type IdpCredentialStatus,
  InvalidCredentialStatusTransitionError,
  PendingCredentialAbsentError,
  type PendingSecretCas,
  RESOLVABLE_CREDENTIAL_STATUS,
  SharedCredentialSecretAccessError,
} from './idp-lifecycle';

/**
 * 封筒暗号化の AAD 材料。
 *
 * **rotation 中の `pending_client_secret_enc` も同じ ref を使う。** AAD は
 * `{table}:{column}:{row_id}` なので、pending 列を自分の列名で暗号化すると
 * `activate` で暗号文を `client_secret_enc` へ移した瞬間に AAD が食い違って復号できなくなる。
 * 移し替えのたびに復号 → 再暗号化すれば回避できるが、それでは切替が「復号・暗号化・更新」の
 * 3 手順になり、CAS 1 文で原子的に切り替えるという保証を失う。
 *
 * AAD が防ぎたいのは**他の行への暗号文の移植**であり、同一行内の staging 列から本番列への
 * 昇格は防ぎたい対象ではない。だから両列を「この行の client_secret という 1 つの論理スロット」
 * として同じ AAD で扱う。
 */
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
/**
 * mode によらず指定できる登録オプション。
 *
 * 交差型で外へ括り出すのは、`credentialMode` による narrowing を壊さずに
 * 共通フィールドを 1 箇所へ書くため。union の各枝へ同じフィールドを複製すると、
 * 片方だけ直す事故が起きる。
 */
export interface IdpConnectionInsertOptions {
  /**
   * 登録時の lifecycle 状態。**省略時は `active`** で、列の DEFAULT と一致する。
   *
   * 省略を許すのは、管理 API を足しても**既存の登録経路が 1 行も変わらない**ことを
   * 型の側から保証するため。管理 API 経由の新規登録は `pending` を明示的に渡し、
   * 接続テストを通るまで認証解決の対象にならない。
   */
  readonly credentialStatus?: IdpCredentialStatus;
}

export type IdpConnectionInsert = IdpConnectionInsertOptions &
  (
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
      }
  );

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

  /**
   * rotation の新 secret を staging 列へ置く。**現行 credential には触れない**ので、
   * この時点でもテナントのログインは旧 secret のまま動き続ける (受入条件 5)。
   * `null` = 行が無い / 共有方式 / `disabled`。
   */
  stagePendingSecret(context: RepositoryContext, id: string, clientSecret: string): Promise<IdpConnectionRow | null>;
  /**
   * **credential 一式** (client ID・secret・許可ドメイン) を顧客方式として staging する。
   *
   * `stagePendingSecret` との違いは 2 つ。client ID まで差し替えられること、そして
   * **共有方式の行にも置けること**。`idp_connections_tenant_issuer_uq` が 1 テナント 1 Google 行を
   * 強制しているので、共有方式 → 顧客方式の切替は「行を足す」ではなく「この 1 行を差し替える」に
   * なる。差し替えを staging 経由にすれば、昇格するまで行は共有方式のまま解決され、
   * mode 切替も無停止かつ `discardPendingSecret` で取消可能になる。
   *
   * `expectedStatus='disabled'` なら、新 credential を置くと同時に `pending` へ戻す。
   * `null` = 行が無い / 読み取り後に状態が変わった。
   */
  stagePendingCustomerCredential(
    context: RepositoryContext,
    id: string,
    input: {
      readonly clientId: string;
      readonly clientSecret: string;
      readonly allowedWorkspaceDomains?: readonly string[] | undefined;
      readonly expectedStatus: IdpCredentialStatus;
    },
  ): Promise<IdpConnectionRow | null>;
  /** 接続テストのためだけに staging 中の平文を取り出す。レスポンス・ログ・監査へ出さない。 */
  decryptPendingClientSecret(context: RepositoryContext, id: string): Promise<string>;
  /** staging の接続テスト合格を記録する。`null` = staging が差し替わった / 無い。 */
  markPendingTested(context: RepositoryContext, cas: PendingSecretCas): Promise<IdpConnectionRow | null>;
  /** 現行 credential の合格時刻を記録する。pending のときだけ tested へ進める。 */
  markCurrentTested(context: RepositoryContext, cas: CurrentSecretCas): Promise<IdpConnectionRow | null>;
  /**
   * staging を現行へ昇格させる。テスト済み (`pendingTestedAt` 非 NULL) でなければ WHERE が
   * 一致せず 0 行になるため、「保存 → テスト → 切替」の順序が DB 述語として保証される (受入条件 4)。
   */
  activatePendingSecret(context: RepositoryContext, cas: PendingSecretCas): Promise<IdpConnectionRow | null>;
  /** staging を破棄して rotation を取り消す。現行 credential は無傷のまま残る (受入条件 5)。 */
  discardPendingSecret(context: RepositoryContext, cas: PendingSecretCas): Promise<IdpConnectionRow | null>;
  /**
   * lifecycle 状態を CAS で遷移させる。`null` = 期待した状態から既に動いていた (競合)。
   * `ALLOWED_STATUS_TRANSITIONS` に無い組合せは `InvalidCredentialStatusTransitionError`。
   */
  transitionStatus(
    context: RepositoryContext,
    input: {
      readonly id: string;
      readonly expectedStatus: IdpCredentialStatus;
      readonly nextStatus: IdpCredentialStatus;
    },
  ): Promise<IdpConnectionRow | null>;
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
        clientSecretLast4: string | null;
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
              // 列の DEFAULT へ暗黙に委ねず、既定値をここに書く。DEFAULT 任せにすると
              // 「登録時の既定を変える」だけで migration が要る構造になる
              credentialStatus: input.credentialStatus ?? 'active',
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
          // 行が secret を持たないので末尾も無い。空文字ではなく NULL にする —
          // 空文字にすると「末尾が記録されていない行」と区別できなくなる
          clientSecretLast4: null,
          credentialMode: 'shared_google',
        });
      }

      return write({
        clientId: input.clientId,
        clientSecretEnc: await cipher.encryptColumn('idp_secret', input.clientSecret, SECRET_REF(id)),
        clientSecretLast4: clientSecretLast4(input.clientSecret),
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

    async stagePendingSecret(context, id, clientSecret) {
      // 暗号化を UPDATE の前に済ませる。行の存在確認を先にしても、確認と UPDATE の間に
      // 行が消える可能性は残る。存在判定は下の WHERE (= 0 行 → null) に一本化する
      const pendingEnc = await cipher.encryptColumn('idp_secret', clientSecret, SECRET_REF(id));
      const now = serverNow();
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(idpConnections)
          .set({
            pendingClientSecretEnc: pendingEnc,
            pendingClientSecretLast4: clientSecretLast4(clientSecret),
            // secret だけの rotation なので、credential 一式の staging が残っていたら消す。
            // 残すと「前回 staging した client ID」と「今回の secret」が対にならないまま
            // 昇格してしまい、切替直後のログインが全て失敗する
            pendingClientId: null,
            pendingCredentialMode: null,
            pendingAllowedWorkspaceDomains: null,
            // 差し替えたら検証済み時刻は必ず落とす。残すと「前の secret のテスト結果」で
            // 新しい secret の activate が通ってしまう
            pendingTestedAt: null,
            updatedAt: now,
          })
          .where(
            and(
              scope(context, id),
              // 共有方式の行に顧客 secret を置かせない。置けたら、その行は
              // 「secret を複製していない」という共有方式の不変条件を破ることになる
              eq(idpConnections.credentialMode, 'customer_google'),
              // disabled は「使わないと決めた接続」。rotation より先に再有効化 (= 再テスト) を要求する
              ne(idpConnections.credentialStatus, 'disabled'),
            ),
          )
          .returning(),
      );
      return (rows[0] as IdpConnectionRow | undefined) ?? null;
    },

    async stagePendingCustomerCredential(context, id, input) {
      const pendingEnc = await cipher.encryptColumn('idp_secret', input.clientSecret, SECRET_REF(id));
      const now = serverNow();
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(idpConnections)
          .set({
            pendingClientId: input.clientId,
            pendingClientSecretEnc: pendingEnc,
            pendingClientSecretLast4: clientSecretLast4(input.clientSecret),
            pendingCredentialMode: 'customer_google',
            // 未指定は「据え置き」ではなく「検査しない (空配列)」。据え置きにすると、
            // 共有方式で必須だったドメイン制限が顧客方式へ切り替わった後も暗黙に残り、
            // 要求本文を読んだだけでは効いている制限が分からなくなる
            pendingAllowedWorkspaceDomains: normalizeAllowedDomains(input.allowedWorkspaceDomains) ?? '[]',
            // 差し替えたら検証済み時刻は必ず落とす (`stagePendingSecret` と同じ理由)
            pendingTestedAt: null,
            // disabled の再登録は再開操作でもある。未検証のまま active へ戻さず、
            // staging 側のテストを通すため pending にする。
            ...(input.expectedStatus === 'disabled' ? { credentialStatus: 'pending' as const } : {}),
            updatedAt: now,
          })
          // 現行 mode は問わない (共有 → 顧客の切替もこの経路)。状態は CAS で固定する。
          .where(and(scope(context, id), eq(idpConnections.credentialStatus, input.expectedStatus)))
          .returning(),
      );
      return (rows[0] as IdpConnectionRow | undefined) ?? null;
    },

    async decryptPendingClientSecret(context, id) {
      const rows = await adapter.client.select().from(idpConnections).where(scope(context, id)).limit(1);
      const row = rows[0] as IdpConnectionRow | undefined;
      if (row === undefined) throw new EntityNotFoundError('idp_connections', id);
      // 行がまだ共有方式でも、staging が顧客方式なら pending 側には実体のある secret がある
      // (mode 切替の staging 中)。ここで弾くと切替前の接続テストが原理的に行えない
      if (row.credentialMode === 'shared_google' && row.pendingCredentialMode !== 'customer_google') {
        throw new SharedCredentialSecretAccessError(id);
      }
      const pendingEnc = row.pendingClientSecretEnc;
      // 「rotation 中でない」を空文字や null の平文として返さない。返すと呼び出し側が
      // 空 secret で Google に接続テストを投げ、その失敗を「secret が誤り」と誤読する
      if (pendingEnc === null) throw new PendingCredentialAbsentError(id);
      return cipher.decryptColumn('idp_secret', pendingEnc, SECRET_REF(id));
    },

    async markPendingTested(context, cas) {
      const now = serverNow();
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(idpConnections)
          .set({ pendingTestedAt: now, updatedAt: now })
          .where(and(scope(context, cas.id), eq(idpConnections.pendingClientSecretEnc, cas.expectedPendingSecretEnc)))
          .returning(),
      );
      return (rows[0] as IdpConnectionRow | undefined) ?? null;
    },

    async markCurrentTested(context, cas) {
      const now = serverNow();
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(idpConnections)
          .set({
            lastTestedAt: now,
            updatedAt: now,
            ...(cas.expectedStatus === 'pending' ? { credentialStatus: 'tested' as const } : {}),
          })
          .where(
            and(
              scope(context, cas.id),
              // テスト中に現行 credential または状態が変わったら結果を記録しない。
              eq(idpConnections.clientSecretEnc, cas.expectedClientSecretEnc),
              eq(idpConnections.credentialStatus, cas.expectedStatus),
              ne(idpConnections.credentialStatus, 'disabled'),
            ),
          )
          .returning(),
      );
      return (rows[0] as IdpConnectionRow | undefined) ?? null;
    },

    async activatePendingSecret(context, cas) {
      // 昇格する値 (暗号文・last4・テスト時刻) は行から読む。読んだ暗号文を下の WHERE に
      // 入れ直すので、読み取りから UPDATE までの間に staging が差し替わっていれば 0 行になる
      const current = await adapter.client.select().from(idpConnections).where(scope(context, cas.id)).limit(1);
      const row = current[0] as IdpConnectionRow | undefined;
      if (row === undefined) return null;
      const pendingEnc = row.pendingClientSecretEnc;
      if (pendingEnc === null || pendingEnc !== cas.expectedPendingSecretEnc) return null;
      const pendingTestedAt = row.pendingTestedAt;
      if (pendingTestedAt === null) return null;

      const now = serverNow();
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(idpConnections)
          .set({
            // 復号 → 再暗号化を挟まない。AAD を pending 列と共有しているので
            // 暗号文をそのまま移せる (SECRET_REF の注記)
            clientSecretEnc: pendingEnc,
            clientSecretLast4: row.pendingClientSecretLast4,
            // client ID / mode / 許可ドメインは staging されているときだけ動かす。
            // secret だけの rotation では NULL なので現行値が据え置かれる。
            // secret と同じ UPDATE に入れるのが要点 — 別 UPDATE に分けると、
            // その隙間に「新 secret と旧 client ID」の組で認証が走る窓ができる
            ...(row.pendingClientId === null ? {} : { clientId: row.pendingClientId }),
            ...(row.pendingCredentialMode === null ? {} : { credentialMode: row.pendingCredentialMode }),
            ...(row.pendingAllowedWorkspaceDomains === null
              ? {}
              : { allowedWorkspaceDomains: row.pendingAllowedWorkspaceDomains }),
            credentialStatus: 'active',
            lastTestedAt: pendingTestedAt,
            pendingClientSecretEnc: null,
            pendingClientSecretLast4: null,
            pendingClientId: null,
            pendingCredentialMode: null,
            pendingAllowedWorkspaceDomains: null,
            pendingTestedAt: null,
            updatedAt: now,
          })
          .where(
            and(
              scope(context, cas.id),
              eq(idpConnections.pendingClientSecretEnc, cas.expectedPendingSecretEnc),
              // テスト済みでなければ切替を通さない。順序を DB 述語で保証する (受入条件 4)
              isNotNull(idpConnections.pendingTestedAt),
              // 昇格の途中で無効化された接続を、この UPDATE が黙って active に戻さない
              ne(idpConnections.credentialStatus, 'disabled'),
            ),
          )
          .returning(),
      );
      return (rows[0] as IdpConnectionRow | undefined) ?? null;
    },

    async discardPendingSecret(context, cas) {
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(idpConnections)
          .set({
            pendingClientSecretEnc: null,
            pendingClientSecretLast4: null,
            pendingClientId: null,
            pendingCredentialMode: null,
            pendingAllowedWorkspaceDomains: null,
            pendingTestedAt: null,
            updatedAt: serverNow(),
          })
          .where(and(scope(context, cas.id), eq(idpConnections.pendingClientSecretEnc, cas.expectedPendingSecretEnc)))
          .returning(),
      );
      return (rows[0] as IdpConnectionRow | undefined) ?? null;
    },

    async transitionStatus(context, input) {
      assertCredentialStatusTransition(input.expectedStatus, input.nextStatus);
      const now = serverNow();
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .update(idpConnections)
          .set({
            credentialStatus: input.nextStatus,
            // `tested` への遷移は「今テストに通った」ことの記録でもある
            ...(input.nextStatus === 'tested' ? { lastTestedAt: now } : {}),
            updatedAt: now,
          })
          // expectedStatus を WHERE に置くのが CAS の本体。並行して別の遷移が入っていれば 0 行
          .where(and(scope(context, input.id), eq(idpConnections.credentialStatus, input.expectedStatus)))
          .returning(),
      );
      return (rows[0] as IdpConnectionRow | undefined) ?? null;
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
