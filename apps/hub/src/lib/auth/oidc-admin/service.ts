/**
 * 顧客持ち込み Google OAuth client の管理サービス
 * (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
 *
 * ## この層が持つもの / 持たないもの
 *
 * 持つのは **lifecycle の業務規則**だけ:
 *   - どの状態からどの操作を受け付けるか (受付可否の判定)
 *   - 何を監査へ残すか
 *   - Google 接続だけを管理対象に閉じること
 *
 * 持たないもの:
 *   - **認可**。誰が呼べるかは `withAuthz` + `ACTION_RULES` の 1 箇所が決める。
 *     ここで role を見ると認可判定が 2 箇所になり、片方だけ緩む余地ができる。
 *   - **原子性の保証**。並行更新の勝敗は repository の CAS (`UPDATE ... WHERE ... RETURNING`) が
 *     決める。ここで読んでから比較すると、読みと書きの間が競合の窓になる。
 *     この層は「CAS が 0 行を返した」を `state_conflict` へ翻訳するだけ。
 *
 * ## secret の通り道
 *
 * 平文 secret がこの module に現れるのは 3 箇所だけで、いずれも**引数から受けて即座に渡す**:
 *   `register` → repository の暗号化、`stageRotation` → 同上、`test` → 接続テスター。
 * 戻り値の型 (`OidcConnectionSummary` 系) には secret を書ける場所が無い (schema 側で保証)。
 * 監査へ載せるのも `*_last4` までで、これは Google Cloud Console と突き合わせるための識別子。
 */

import { type CoreRepositories, createRepositoryContext, type IdpConnectionRow } from '@harness-hub/db';
import type {
  OidcAdminError,
  OidcConnectionListResponse,
  OidcConnectionMutationResponse,
  OidcConnectionRegisterRequest,
  OidcConnectionSetup,
  OidcConnectionTestResponse,
} from '@harness-hub/schemas';

import type { AuditLogger } from '../../../shared/audit/index.js';
import { SHARED_OIDC_CALLBACK_PATH, SHARED_OIDC_PROVIDER_ID } from '../config.js';
import { GOOGLE_OIDC_ISSUER } from '../shared-credentials.js';
import type { OidcConnectionTester } from './connection-test.js';
import { toSummary } from './summary.js';

/**
 * 監査 action。**backend-spec §3.8 の列挙が正本**なので、操作ごとに新しい action 名を作らない。
 * 何をしたかは metadata の `change` で表す — 語彙を増やすと、監査を読む側が
 * 「この feature が作った action 名を全部知っている」前提になる。
 */
const AUDIT_ACTION = 'idp.connection_change';

/** 監査上の資源種別。`ACTION_RULES` の resource type とも揃える。 */
export const OIDC_CONNECTION_RESOURCE_TYPE = 'idp_connection';

/**
 * 新規登録する接続の scope。Auth.js provider が要求する値 (`authjs-config.ts`) と同じ並びにする。
 * 順序まで揃えるのは、保存値と要求値を目視で突き合わせる運用があるため。
 */
const DEFAULT_OIDC_SCOPES = ['openid', 'email', 'profile'] as const;

export type OidcAdminErrorCode = OidcAdminError['error'];

/**
 * 業務結果。例外にしないのは、`connection_not_found` と `state_conflict` が
 * **想定内の応答**だから。例外にすると route 側が try/catch で分岐することになり、
 * 「握り潰して 200 を返す」実装が書きやすくなる。
 */
export type OidcAdminResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: OidcAdminErrorCode };

const ok = <T>(value: T): OidcAdminResult<T> => ({ ok: true, value });
const fail = <T>(error: OidcAdminErrorCode): OidcAdminResult<T> => ({ ok: false, error });

/**
 * 操作のスコープ。
 *
 * `tenantId` は **`withAuthz` が解決した資源側のテナント**を渡すこと。principal 側の tenantId を
 * 渡すと、provider-admin の越境操作が自分のテナントへ向いてしまう。
 */
export interface OidcAdminScope {
  readonly tenantId: string;
  /** 監査の actor。session の userId。 */
  readonly actorSubject: string;
}

export interface OidcAdminService {
  /**
   * 接続一覧。`setup` (Google Cloud Console 側へ手で登録する値) も同じ応答へ載せる。
   * 別操作に分けない — 管理画面は必ず両方を同時に要る (接続が 0 件でも callback URL は出す)。
   */
  list(scope: OidcAdminScope): Promise<OidcAdminResult<OidcConnectionListResponse>>;
  register(
    scope: OidcAdminScope,
    request: OidcConnectionRegisterRequest,
  ): Promise<OidcAdminResult<OidcConnectionMutationResponse>>;
  /** 接続テスト。`target='pending'` は rotation 中の新 secret を検証する。 */
  test(
    scope: OidcAdminScope,
    input: { readonly connectionId: string; readonly target: 'current' | 'pending' },
  ): Promise<OidcAdminResult<OidcConnectionTestResponse>>;
  stageRotation(
    scope: OidcAdminScope,
    input: { readonly connectionId: string; readonly clientSecret: string },
  ): Promise<OidcAdminResult<OidcConnectionMutationResponse>>;
  discardRotation(
    scope: OidcAdminScope,
    input: { readonly connectionId: string },
  ): Promise<OidcAdminResult<OidcConnectionMutationResponse>>;
  /**
   * 有効化。rotation が staging されていれば新 secret の昇格、無ければ
   * `tested` → `active` の lifecycle 遷移として扱う。
   */
  activate(
    scope: OidcAdminScope,
    input: { readonly connectionId: string },
  ): Promise<OidcAdminResult<OidcConnectionMutationResponse>>;
  disable(
    scope: OidcAdminScope,
    input: { readonly connectionId: string },
  ): Promise<OidcAdminResult<OidcConnectionMutationResponse>>;
}

export interface OidcAdminServiceDeps {
  readonly repositories: Pick<CoreRepositories, 'tenants' | 'idpConnections'>;
  readonly audit: AuditLogger;
  /** callback URL の組立元。Host ヘッダから作らない (Host 偽装で登録先がずれる)。 */
  readonly canonicalOrigin: string;
  /** Google への接続テスター。テストは fetch を差し替えた実装を注入する。 */
  readonly testConnection: OidcConnectionTester;
}

export function createOidcAdminService(deps: OidcAdminServiceDeps): OidcAdminService {
  const { tenants: tenantsRepo, idpConnections: connectionsRepo } = deps.repositories;

  const contextOf = (scope: OidcAdminScope) =>
    createRepositoryContext({ tenantId: scope.tenantId, actorId: scope.actorSubject });

  /**
   * 顧客方式の callback URL。`authjs-config.ts` の basePath 規則
   * (`/api/auth/{tenant_slug}` + Auth.js の `/callback/{providerId}`) をここで 1 回だけ組む。
   * 画面に出す文字列と実際の callback が食い違うと、Console へ登録した URI が永遠に一致しない。
   */
  const customerCallbackUrl = (tenantSlug: string): string =>
    `${deps.canonicalOrigin}/api/auth/${tenantSlug}/callback/${SHARED_OIDC_PROVIDER_ID}`;

  const setupFor = (tenantSlug: string): OidcConnectionSetup => ({
    tenant_slug: tenantSlug,
    customer_callback_url: customerCallbackUrl(tenantSlug),
    shared_callback_url: `${deps.canonicalOrigin}${SHARED_OIDC_CALLBACK_PATH}`,
    required_google_scopes: [...DEFAULT_OIDC_SCOPES],
  });

  /**
   * 監査 1 件。**変更が成立したときだけ**呼ぶ。
   * 失敗まで同じ action で残すと、監査ログから「実際に設定が変わった回数」を数えられなくなる。
   */
  const recordChange = async (
    scope: OidcAdminScope,
    row: IdpConnectionRow,
    change: string,
    extra: Readonly<Record<string, string | number | boolean | null>> = {},
  ): Promise<void> => {
    await deps.audit.record({
      actorSubject: scope.actorSubject,
      tenantId: scope.tenantId,
      // 接続はテナント単位の設定で workspace に属さない
      workspaceId: null,
      action: AUDIT_ACTION,
      resourceType: OIDC_CONNECTION_RESOURCE_TYPE,
      resourceId: row.id,
      metadata: {
        change,
        credential_mode: row.credentialMode,
        credential_status: row.credentialStatus,
        // last4 は識別子。secret 本体は schema の最小長でこれと重ならないことを保証している
        client_secret_last4: row.clientSecretLast4,
        pending_client_secret_last4: row.pendingClientSecretLast4,
        ...extra,
      },
    });
  };

  /** 接続 1 件を読み、顧客方式であることまで確認する。管理操作の共通前置き。 */
  const loadCustomerConnection = async (
    scope: OidcAdminScope,
    connectionId: string,
  ): Promise<OidcAdminResult<IdpConnectionRow>> => {
    const row = await connectionsRepo.findById(contextOf(scope), connectionId);
    // テナント越境も同じ応答へ畳む (`findById` は tenant_id を WHERE に含む)。
    // 「他テナントには存在する」と読み取れる応答を返さない
    if (row === null) return fail('connection_not_found');
    // この API は Google 専用。ID を直接指定して別 issuer の接続を回転・無効化させない。
    if (row.issuerUrl !== GOOGLE_OIDC_ISSUER) return fail('not_customer_managed');
    // 行がまだ共有方式でも、顧客方式への切替が staging 済みなら管理操作の対象。
    // ここで弾くと、切替を staging した直後に接続テストも取消もできなくなる
    if (row.credentialMode !== 'customer_google' && row.pendingCredentialMode !== 'customer_google') {
      return fail('not_customer_managed');
    }
    return ok(row);
  };

  /**
   * テナントの Google 接続行 (あれば)。
   *
   * `idp_connections_tenant_issuer_uq` により (tenant_id, issuer_url) は一意なので、
   * 一致する行はあっても 1 件。`list` を絞るだけで済ませているのは、
   * repository へ検索メソッドを増やすほどの用途がここしか無いため。
   */
  const findGoogleConnection = async (scope: OidcAdminScope): Promise<IdpConnectionRow | null> => {
    const rows = await connectionsRepo.list(contextOf(scope));
    return rows.find((row) => row.issuerUrl === GOOGLE_OIDC_ISSUER) ?? null;
  };

  return {
    async list(scope) {
      const tenant = await tenantsRepo.findById(scope.tenantId);
      if (tenant === null) return fail('connection_not_found');
      const rows = (await connectionsRepo.list(contextOf(scope))).filter((row) => row.issuerUrl === GOOGLE_OIDC_ISSUER);
      return ok({
        setup: setupFor(tenant.slug),
        // 表示順を作成順で固定する。`list()` は順序を保証しないため、
        // 画面を開き直すたびに行が入れ替わって見える
        items: [...rows].sort((left, right) => left.createdAt - right.createdAt).map(toSummary),
      });
    },

    /**
     * 顧客持ち込み credential の登録。
     *
     * テナントに Google 接続行が既にあるかで経路が分かれる。行を増やす選択肢は無い —
     * `idp_connections_tenant_issuer_uq` が (tenant_id, issuer_url) を一意にしているので、
     * 1 テナントの Google 接続は常に 1 行。したがって「共有方式からの切替」も
     * 「別の OAuth client への載せ替え」も、この 1 行の差し替えになる。
     *
     * 既存行がある場合に上書きせず staging へ置くのは、上書きすると新 credential が
     * 未検証のまま即座に認証へ使われてしまうため。staging なら昇格まで現行 credential が
     * 生き続け、接続テストに落ちたら捨てるだけで戻せる (受入条件 5)。
     */
    async register(scope, request) {
      const tenant = await tenantsRepo.findById(scope.tenantId);
      if (tenant === null) return fail('connection_not_found');

      const existing = await findGoogleConnection(scope);
      if (existing !== null) {
        const staged = await connectionsRepo.stagePendingCustomerCredential(contextOf(scope), existing.id, {
          clientId: request.client_id,
          clientSecret: request.client_secret,
          allowedWorkspaceDomains: request.allowed_workspace_domains,
          expectedStatus: existing.credentialStatus,
        });
        if (staged === null) return fail('state_conflict');

        await recordChange(
          scope,
          staged,
          // 「方式が変わる」と「同じ方式で client が変わる」は運用上の意味が違う。
          // 前者は Google 側の請求先・同意画面ごと変わるので、監査で見分けられるようにする
          existing.credentialStatus === 'disabled'
            ? 'reactivation_staged'
            : existing.credentialMode === 'customer_google'
              ? 'credential_staged'
              : 'mode_switch_staged',
          {
            previous_credential_mode: existing.credentialMode,
            allowed_workspace_domain_count: request.allowed_workspace_domains.length,
          },
        );
        return ok({ connection: toSummary(staged) });
      }

      const row = await connectionsRepo.insert(contextOf(scope), {
        credentialMode: 'customer_google',
        // issuer を要求本文から取らない。顧客持ち込み方式は Google 限定 (scope_out) なので、
        // ここが唯一の出所になる
        issuerUrl: GOOGLE_OIDC_ISSUER,
        clientId: request.client_id,
        clientSecret: request.client_secret,
        scopes: DEFAULT_OIDC_SCOPES.join(' '),
        allowedWorkspaceDomains: request.allowed_workspace_domains,
        // 登録は必ず未検証から始める。既存の登録経路 (insert の既定 = active) と違うのは、
        // 管理 API からは「テストを通さずに有効化する」経路を作らないため (受入条件 4)
        credentialStatus: 'pending',
      });

      await recordChange(scope, row, 'registered', {
        allowed_workspace_domain_count: request.allowed_workspace_domains.length,
      });
      return ok({ connection: toSummary(row) });
    },

    async test(scope, input) {
      const loaded = await loadCustomerConnection(scope, input.connectionId);
      if (!loaded.ok) return loaded;
      const row = loaded.value;
      const context = contextOf(scope);

      const tenant = await tenantsRepo.findById(scope.tenantId);
      if (tenant === null) return fail('connection_not_found');

      if (input.target === 'pending') {
        const stagedEnc = row.pendingClientSecretEnc;
        // 「rotation 中でない」を repository の例外で知るのではなく手前で判定する。
        // 例外にすると、route 側で 500 と業務エラーの区別が付かない
        if (stagedEnc === null) return fail('rotation_not_staged');

        const outcome = await deps.testConnection({
          issuer: row.issuerUrl,
          // client ID も staging されていればそちらを試す。現行 client ID と新 secret の組を
          // 試してしまうと、正しい credential なのに `invalid_client` で落ちる
          clientId: row.pendingClientId ?? row.clientId,
          clientSecret: await connectionsRepo.decryptPendingClientSecret(context, row.id),
          redirectUri: customerCallbackUrl(tenant.slug),
        });
        if (!outcome.passed) {
          // 失敗は状態を変えない。`pendingTestedAt` を触らないので activate は通らないままになる
          await recordChange(scope, row, 'rotation_test_failed', { failure_reason: outcome.reason });
          return ok({
            id: row.id,
            target: 'pending',
            passed: false,
            failure_reason: outcome.reason,
            connection: toSummary(row),
          });
        }

        // 合格の記録は「テストしたその暗号文」に紐付ける。テスト中に staging が
        // 差し替わっていれば 0 行になり、別の secret を検証済みにしてしまう事故が起きない
        const tested = await connectionsRepo.markPendingTested(context, {
          id: row.id,
          expectedPendingSecretEnc: stagedEnc,
        });
        if (tested === null) return fail('state_conflict');

        await recordChange(scope, tested, 'rotation_tested');
        return ok({ id: row.id, target: 'pending', passed: true, failure_reason: null, connection: toSummary(tested) });
      }

      // 共有方式の行に staging を積んだ状態 (mode 切替の途中)。現行 credential は環境単位の
      // 共有 client なので、この管理 API がテストする対象ではない。`target='pending'` を促す
      if (row.credentialMode === 'shared_google') return fail('not_customer_managed');
      // 無効化済みの現行 credential は再利用しない。再登録で新 credential を staging し、
      // pending 側をテストするのが唯一の再開経路。
      if (row.credentialStatus === 'disabled') return fail('invalid_transition');

      const outcome = await deps.testConnection({
        issuer: row.issuerUrl,
        clientId: row.clientId,
        clientSecret: await connectionsRepo.decryptClientSecret(context, row.id),
        redirectUri: customerCallbackUrl(tenant.slug),
      });
      if (!outcome.passed) {
        await recordChange(scope, row, 'test_failed', { failure_reason: outcome.reason });
        return ok({
          id: row.id,
          target: 'current',
          passed: false,
          failure_reason: outcome.reason,
          connection: toSummary(row),
        });
      }

      // active/tested の再テストでも last_tested_at を更新する。現行暗号文と状態を CAS に含め、
      // テスト中に別 credential へ切り替わった場合は古い結果を記録しない。
      const tested = await connectionsRepo.markCurrentTested(context, {
        id: row.id,
        expectedClientSecretEnc: row.clientSecretEnc,
        expectedStatus: row.credentialStatus,
      });
      if (tested === null) return fail('state_conflict');

      await recordChange(scope, tested, 'tested');
      return ok({ id: row.id, target: 'current', passed: true, failure_reason: null, connection: toSummary(tested) });
    },

    async stageRotation(scope, input) {
      const loaded = await loadCustomerConnection(scope, input.connectionId);
      if (!loaded.ok) return loaded;
      // secret だけの差し替えは「現行 client ID が顧客のもの」が前提。共有方式の行 (切替 staging 中を
      // 含む) には効かない — 差し替える現行 secret がそもそも行に無い
      if (loaded.value.credentialMode !== 'customer_google') return fail('not_customer_managed');
      // `disabled` への staging は repository の WHERE でも弾かれるが、ここで判定して
      // 「競合 (state_conflict)」ではなく「順序違い (invalid_transition)」だと分かる応答にする
      if (loaded.value.credentialStatus === 'disabled') return fail('invalid_transition');

      const staged = await connectionsRepo.stagePendingSecret(contextOf(scope), input.connectionId, input.clientSecret);
      if (staged === null) return fail('state_conflict');

      await recordChange(scope, staged, 'rotation_staged');
      return ok({ connection: toSummary(staged) });
    },

    async discardRotation(scope, input) {
      const loaded = await loadCustomerConnection(scope, input.connectionId);
      if (!loaded.ok) return loaded;
      const stagedEnc = loaded.value.pendingClientSecretEnc;
      if (stagedEnc === null) return fail('rotation_not_staged');

      const discarded = await connectionsRepo.discardPendingSecret(contextOf(scope), {
        id: input.connectionId,
        expectedPendingSecretEnc: stagedEnc,
      });
      if (discarded === null) return fail('state_conflict');

      await recordChange(scope, discarded, 'rotation_discarded');
      return ok({ connection: toSummary(discarded) });
    },

    async activate(scope, input) {
      const loaded = await loadCustomerConnection(scope, input.connectionId);
      if (!loaded.ok) return loaded;
      const row = loaded.value;
      const context = contextOf(scope);

      const stagedEnc = row.pendingClientSecretEnc;
      if (stagedEnc !== null) {
        // rotation の昇格。未テストなら repository 側の WHERE (`pendingTestedAt IS NOT NULL`) が
        // 0 行にするが、それは競合ではなく順序違いなので手前で見分ける
        if (row.pendingTestedAt === null) return fail('invalid_transition');

        const activated = await connectionsRepo.activatePendingSecret(context, {
          id: row.id,
          expectedPendingSecretEnc: stagedEnc,
        });
        if (activated === null) return fail('state_conflict');

        await recordChange(scope, activated, 'rotation_activated');
        return ok({ connection: toSummary(activated) });
      }

      // 通常の有効化。`tested` 以外からは通さない = 接続テストが前提条件になる (受入条件 4)
      if (row.credentialStatus !== 'tested') return fail('invalid_transition');

      const activated = await connectionsRepo.transitionStatus(context, {
        id: row.id,
        expectedStatus: 'tested',
        nextStatus: 'active',
      });
      if (activated === null) return fail('state_conflict');

      await recordChange(scope, activated, 'activated');
      return ok({ connection: toSummary(activated) });
    },

    async disable(scope, input) {
      const loaded = await loadCustomerConnection(scope, input.connectionId);
      if (!loaded.ok) return loaded;
      const row = loaded.value;
      // 共有方式の行を、切替 staging 中だからという理由でこの API から止めさせない。
      // 止めた瞬間に「まだ共有方式で運用中のテナント」が全員ログイン不能になる。
      // 切替をやめるなら staging の取消 (discardRotation) が正しい操作
      if (row.credentialMode !== 'customer_google') return fail('not_customer_managed');
      // 二重無効化は「もう目的は達成されている」が、成功として返すと
      // 「今回この操作で止まった」と読める監査が 1 件増える。状態は嘘をつかせない
      if (row.credentialStatus === 'disabled') return fail('invalid_transition');

      const disabled = await connectionsRepo.transitionStatus(contextOf(scope), {
        id: row.id,
        expectedStatus: row.credentialStatus,
        nextStatus: 'disabled',
      });
      if (disabled === null) return fail('state_conflict');

      await recordChange(scope, disabled, 'disabled', { previous_status: row.credentialStatus });
      return ok({ connection: toSummary(disabled) });
    },
  };
}
