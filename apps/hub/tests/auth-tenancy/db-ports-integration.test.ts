/**
 * T-DB-INT (HarnessHub-b7ng AC-4) — 実 DB adapter 上での認証・device flow 統合。
 *
 * 既存の device flow テストは in-memory ダブル上で **契約**を検証している。ここが見るのは、
 * その契約が「永続化を挟んでも同じ意味になるか」だけ。具体的には次の 4 つが対象:
 *
 *   1. **2 テナント OIDC**: slug から引いた接続と client_secret がテナントを跨がないこと。
 *   2. **Device Flow**: 発行 → 承認 → 交換が実 driver 上で通り、`scopes_json` を往復しても壊れないこと。
 *   3. **refresh rotation**: 旧枝の失効と新枝の発行が実 DB の CAS で直列化されること。
 *   4. **revocation**: 再利用検知の family 一括失効と、session 失効時刻の単位換算 (ミリ秒→秒)。
 *
 * 並行系は `Promise.all` で同じ code を同時に提示して検証する。順に呼ぶ形では
 * 「1 回目で状態が変わった後に 2 回目が読む」ので、CAS が無くても通ってしまい検証にならない。
 */

import { createRepositoryContext } from '@harness-hub/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDbClientSecretResolver } from '../../src/lib/auth/db-ports.js';
import { createDeviceFlowService, type DeviceFlowService } from '../../src/lib/auth/device-flow/index.js';
import { createDbAuditSink } from '../../src/lib/authz/runtime.js';
import { createAuditLogger } from '../../src/shared/audit/index.js';
import { createSequentialIds } from './support/in-memory-ports.js';
import { createRealDbHarness, type RealDbHarness, type SeededTenant, seedTenant } from './support/real-db.js';

const SCOPE = ['publish:write'] as const;

let harness: RealDbHarness;
let tenantA: SeededTenant;
let tenantB: SeededTenant;
let service: DeviceFlowService;

beforeEach(async () => {
  harness = await createRealDbHarness();
  tenantA = await seedTenant(harness, {
    slug: 'tenant-alpha',
    name: 'Alpha 社',
    issuer: 'https://alpha.idp.example.com',
    clientSecret: 'secret-alpha',
  });
  tenantB = await seedTenant(harness, {
    slug: 'tenant-beta',
    name: 'Beta 社',
    issuer: 'https://beta.idp.example.com',
    clientSecret: 'secret-beta',
  });

  service = createDeviceFlowService({
    ports: harness.ports,
    // 監査も実 DB へ落とす。audit_events は hash chain (prev_hash) を持つので、
    // 「書けること」自体が sink 実装の検証になる
    audit: createAuditLogger({
      sink: createDbAuditSink(harness.repositories.audit),
      now: () => new Date(harness.clock.nowSeconds() * 1000),
      newId: createSequentialIds('audit'),
    }),
    accessTokenSecret: 'access-secret',
    verificationUri: 'https://hub.example.com/device',
  });
});

afterEach(() => {
  harness.close();
});

/** 承認済み device_code を 1 本用意する。各テストの前提を 1 行に畳むため。 */
async function approvedDeviceCode(tenant: SeededTenant): Promise<string> {
  const requested = await service.requestCode({
    tenantId: tenant.tenantId,
    scope: [...SCOPE],
    deviceLabel: 'ci-runner',
  });
  const approved = await service.approve({
    tenantId: tenant.tenantId,
    userCode: requested.user_code,
    userId: tenant.userId,
    workspaceId: tenant.workspaceId,
  });
  expect(approved.ok).toBe(true);
  return requested.device_code;
}

/** token pair を 1 組発行する。 */
async function issuedTokenPair(tenant: SeededTenant): Promise<{ accessToken: string; refreshToken: string }> {
  const exchanged = await service.exchangeToken({
    tenantId: tenant.tenantId,
    deviceCode: await approvedDeviceCode(tenant),
  });
  if (!exchanged.ok) throw new Error(`token 交換に失敗した: ${exchanged.error.error}`);
  return { accessToken: exchanged.value.access_token, refreshToken: exchanged.value.refresh_token };
}

describe('2 テナント OIDC (AC-1 / AC-4)', () => {
  it('slug ごとに別テナントの接続を返し、issuer が混ざらない', async () => {
    const alpha = await harness.ports.oidcConnections.findByTenantSlug('tenant-alpha');
    const beta = await harness.ports.oidcConnections.findByTenantSlug('tenant-beta');

    expect(alpha).toMatchObject({
      tenantId: tenantA.tenantId,
      tenantSlug: 'tenant-alpha',
      issuer: 'https://alpha.idp.example.com',
      clientId: 'client-tenant-alpha',
      displayName: 'Alpha 社',
      enabled: true,
    });
    expect(beta?.issuer).toBe('https://beta.idp.example.com');
    expect(beta?.tenantId).not.toBe(tenantA.tenantId);
  });

  it('未登録 slug は null を返す (既定 provider へ落とさない)', async () => {
    expect(await harness.ports.oidcConnections.findByTenantSlug('tenant-unknown')).toBeNull();
  });

  it('client_secret は封筒暗号化から復号され、テナントごとに別の値になる', async () => {
    const resolve = createDbClientSecretResolver({ repositories: harness.repositories });

    expect(await resolve(tenantA.tenantId)).toBe('secret-alpha');
    expect(await resolve(tenantB.tenantId)).toBe('secret-beta');
  });

  it('停止テナントは enabled=false になる (認証の入口で閉じる)', async () => {
    await harness.repositories.tenants.update(tenantA.tenantId, { status: 'suspended' });

    expect(await harness.ports.oidcConnections.findByTenantSlug('tenant-alpha')).toMatchObject({ enabled: false });
  });

  it('同じ user/workspace ID の所属を別テナントへ保存しても主キーが衝突しない', async () => {
    const shared = { userId: 'same-user', workspaceId: 'same-workspace' };
    await Promise.all([
      harness.repositories.userWorkspaces.add(createRepositoryContext({ tenantId: tenantA.tenantId }), shared),
      harness.repositories.userWorkspaces.add(createRepositoryContext({ tenantId: tenantB.tenantId }), shared),
    ]);

    expect(
      await harness.repositories.userWorkspaces.listWorkspaceIdsForUser(
        createRepositoryContext({ tenantId: tenantA.tenantId }),
        shared.userId,
      ),
    ).toContain(shared.workspaceId);
    expect(
      await harness.repositories.userWorkspaces.listWorkspaceIdsForUser(
        createRepositoryContext({ tenantId: tenantB.tenantId }),
        shared.userId,
      ),
    ).toContain(shared.workspaceId);
  });

  it('同じ IdP subject の JIT 作成が同時到着しても 1 利用者へ収束する', async () => {
    const input = {
      tenantId: tenantA.tenantId,
      idpSubject: 'jit-concurrent-subject',
      email: 'jit@example.com',
    };
    const created = await Promise.all([
      harness.ports.users.createFromOidc(input),
      harness.ports.users.createFromOidc(input),
    ]);

    expect(created[0]?.id).toBe(created[1]?.id);
    expect(
      (await harness.repositories.users.list(createRepositoryContext({ tenantId: tenantA.tenantId }))).filter(
        (user) => user.idpSubject === input.idpSubject,
      ),
    ).toHaveLength(1);
  });
});

describe('Device Flow (AC-3 / AC-4)', () => {
  it('発行 → 承認 → 交換が実 DB 上で通り、scope が往復して壊れない', async () => {
    const requested = await service.requestCode({
      tenantId: tenantA.tenantId,
      scope: [...SCOPE],
      deviceLabel: 'ci-runner',
    });

    // 保存側は device_code の平文を持たない (hash のみ)。user_code から引ける
    const stored = await harness.ports.deviceAuthorizations.findByUserCode(tenantA.tenantId, requested.user_code);
    expect(stored).toMatchObject({ status: 'pending', scope: [...SCOPE], deviceLabel: 'ci-runner' });

    const approved = await service.approve({
      tenantId: tenantA.tenantId,
      userCode: requested.user_code,
      userId: tenantA.userId,
      workspaceId: tenantA.workspaceId,
    });
    expect(approved).toEqual({ ok: true, deviceLabel: 'ci-runner' });

    const exchanged = await service.exchangeToken({
      tenantId: tenantA.tenantId,
      deviceCode: requested.device_code,
    });
    expect(exchanged.ok).toBe(true);
    if (!exchanged.ok) return;
    // port の `scope` は配列のまま。空白区切り文字列へ畳むのは HTTP 応答を組む層の責務なので、
    // ここで文字列を期待すると `scopes_json` の往復ではなく直列化の場所を検査してしまう
    expect(exchanged.value.scope).toEqual([...SCOPE]);

    // device_code は使い捨て。同じ code の 2 回目は拒否される
    const replayed = await service.exchangeToken({
      tenantId: tenantA.tenantId,
      deviceCode: requested.device_code,
    });
    expect(replayed).toEqual({ ok: false, error: { error: 'invalid_grant' } });
  });

  it('テナント A の device_code はテナント B の context では引けない', async () => {
    const requested = await service.requestCode({
      tenantId: tenantA.tenantId,
      scope: [...SCOPE],
      deviceLabel: null,
    });

    expect(await harness.ports.deviceAuthorizations.findByUserCode(tenantB.tenantId, requested.user_code)).toBeNull();
    expect(await service.exchangeToken({ tenantId: tenantB.tenantId, deviceCode: requested.device_code })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });
  });

  it('同一 device_code を並行に提示しても token pair は 1 組だけ発行される', async () => {
    const deviceCode = await approvedDeviceCode(tenantA);

    const results = await Promise.all([
      service.exchangeToken({ tenantId: tenantA.tenantId, deviceCode }),
      service.exchangeToken({ tenantId: tenantA.tenantId, deviceCode }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);

    // 発行された枝が 1 本だけであることを永続化側で確認する (CAS が効いた証跡)
    const tokens = await harness.ports.publisherTokens.listByUserId(tenantA.tenantId, tenantA.userId);
    expect(tokens).toHaveLength(1);
  });

  it('承認済み user_code への 5 回の同時失敗を全件計数し、denied へ遷移する', async () => {
    const requested = await service.requestCode({
      tenantId: tenantA.tenantId,
      scope: [...SCOPE],
      deviceLabel: null,
    });
    expect(
      await service.approve({
        tenantId: tenantA.tenantId,
        userCode: requested.user_code,
        userId: tenantA.userId,
        workspaceId: tenantA.workspaceId,
      }),
    ).toMatchObject({ ok: true });

    await Promise.all(
      Array.from({ length: 5 }, () =>
        service.approve({
          tenantId: tenantA.tenantId,
          userCode: requested.user_code,
          userId: tenantB.userId,
          workspaceId: tenantA.workspaceId,
        }),
      ),
    );

    expect(
      await harness.ports.deviceAuthorizations.findByUserCode(tenantA.tenantId, requested.user_code),
    ).toMatchObject({ attempts: 5, status: 'denied' });
  });
});

describe('refresh rotation (AC-4)', () => {
  it('rotation で新しい refresh token が出て、旧 token は失効する', async () => {
    const first = await issuedTokenPair(tenantA);

    const rotated = await service.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken });
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) return;
    expect(rotated.value.refresh_token).not.toBe(first.refreshToken);

    const family = await harness.ports.publisherTokens.listByUserId(tenantA.tenantId, tenantA.userId);
    expect(family).toHaveLength(2);
    // 旧枝だけが失効している (新枝は生きている)
    expect(family.filter((token) => token.revokedAtSeconds !== null)).toHaveLength(1);

    // 新しい枝が **本当に永続化されている**ことまで見る。
    // ロック競合で壊れた libSQL 接続の書き込みは「自分からは見えるが commit されない」ため、
    // 応答が成功で返ってきても枝が消えていることがある (conflict.ts に機序)。
    // もう一度 rotate できることが、その枝が別トランザクション (監査 append) から
    // 見えている証拠になる。並行系ではなくこの直列テストに置くのは、
    // 並行系では family 掃討が絡んで「勝者の枝が生きているか」が interleaving 依存になるため
    const reRotated = await service.refresh({
      tenantId: tenantA.tenantId,
      refreshToken: rotated.value.refresh_token,
    });
    expect(reRotated.ok).toBe(true);
  });

  it('同一 refresh token の並行提示で新しい枝は 1 本だけ生まれる', async () => {
    const first = await issuedTokenPair(tenantA);

    const results = await Promise.all([
      service.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken }),
      service.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    // 負けた側は invalid_grant。窃取と同型の分岐だが token は複製されない
    expect(results.filter((result) => !result.ok)).toEqual([{ ok: false, error: { error: 'invalid_grant' } }]);

    // 枝は 2 本 = 元の 1 本 + 新規 1 本。3 本あれば CAS が効いておらず token が複製されている
    const tokens = await harness.ports.publisherTokens.listByUserId(tenantA.tenantId, tenantA.userId);
    expect(tokens).toHaveLength(2);

    /**
     * **生存本数を固定値で測らない**。負けた側がどの枝に落ちるかは interleaving で変わる。
     *
     * - 負けた側の**読み**が勝者の CAS より後 → 上流の再利用検知 (失効済み提示) に落ちて
     *   family 掃討が走る。掃討が勝者の `create` より先なら勝者の枝は生き残り、後なら死ぬ。
     * - 読みが CAS より先 → rotation CAS の敗北になり、掃討は走らず勝者の枝が生きる。
     *
     * 実測 (単一プロセス + guardedWrite) では前者の「掃討が先」に落ちる。だが順序を
     * テストの期待値に焼き付けると、負荷や環境で interleaving が変わった瞬間に落ちる。
     * **interleaving に依らず成り立つ不変条件だけ**を測る: 生存は 1 本以下で、
     * 掃討が走らなかったときは必ず 1 本 (= 勝者が使える token を受け取っている)。
     */
    const raceAudit = await harness.repositories.audit.read(createRepositoryContext({ tenantId: tenantA.tenantId }));
    const swept = raceAudit.some((row) => row.action === 'token.reuse_detected');
    const live = tokens.filter((token) => token.revokedAtSeconds === null);
    if (swept) expect(live.length).toBeLessThanOrEqual(1);
    else expect(live).toHaveLength(1);
  });

  it('並行提示で拒否された refresh token の再提示は再利用検知へ昇格する', async () => {
    const first = await issuedTokenPair(tenantA);

    // 並行提示。片方は拒否される (どの枝で拒否されるかは interleaving 依存 — 上のテスト)
    await Promise.all([
      service.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken }),
      service.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken }),
    ]);

    // **同じ token をもう一度出すと窃取検知に落ちる**。これが「CAS 敗北では escalate しない」
    // 判断の前提: 負けた側が読んだ枝は勝者が既に失効させているので、
    // 検知は**遅れるだけで消えない**。ここが崩れると CAS 敗北の拒否が窃取の抜け道になる
    const again = await service.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken });
    expect(again).toEqual({ ok: false, error: { error: 'invalid_grant' } });

    const tokens = await harness.ports.publisherTokens.listByUserId(tenantA.tenantId, tenantA.userId);
    // 勝者の枝まで含めて family が全滅する = 窃取された枝が生き延びない
    expect(tokens.every((token) => token.revokedAtSeconds !== null)).toBe(true);

    // 件数は固定しない (並行提示の時点で 1 本出ている場合がある)。
    // 測るのは「再提示のあと検知が監査に残っている」ことと、上の family 全滅
    const audit = await harness.repositories.audit.read(createRepositoryContext({ tenantId: tenantA.tenantId }));
    expect(audit.filter((row) => row.action === 'token.reuse_detected').length).toBeGreaterThanOrEqual(1);
  });

  it('rotation CAS 敗北を強制すると token.refresh_race が監査に 1 行残る (HarnessHub-v22l)', async () => {
    const first = await issuedTokenPair(tenantA);

    // 実 DB の真の並行実行はタイミング依存で「読んだ時点は生きていたが CAS に負けた」を
    // 確実には再現できない (上のテストの通り、単一プロセスでは大抵 reuse_detected 側に落ちる)。
    // ここでは revokeIfActive だけを強制的に false へ差し替え、rotation CAS 敗北の分岐を
    // 決定論的に踏む。読み取り経路 (findByRefreshTokenHash 等) は実 DB のまま
    const racingPorts = {
      ...harness.ports,
      publisherTokens: {
        ...harness.ports.publisherTokens,
        async revokeIfActive() {
          return false;
        },
      },
    };
    const racingService = createDeviceFlowService({
      ports: racingPorts,
      audit: createAuditLogger({
        sink: createDbAuditSink(harness.repositories.audit),
        now: () => new Date(harness.clock.nowSeconds() * 1000),
        newId: createSequentialIds('audit-race'),
      }),
      accessTokenSecret: 'access-secret',
      verificationUri: 'https://hub.example.com/device',
    });

    const raced = await racingService.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken });
    expect(raced).toEqual({ ok: false, error: { error: 'invalid_grant' } });

    // CAS を偽装しただけで実際の失効 write は起きていない。旧枝は生きたまま残る
    const tokens = await harness.ports.publisherTokens.listByUserId(tenantA.tenantId, tenantA.userId);
    expect(tokens.every((token) => token.revokedAtSeconds === null)).toBe(true);

    const audit = await harness.repositories.audit.read(createRepositoryContext({ tenantId: tenantA.tenantId }));
    const raceEvents = audit.filter((row) => row.action === 'token.refresh_race');
    expect(raceEvents).toHaveLength(1);
    expect(JSON.parse(raceEvents[0]?.summaryJson ?? '{}')).toMatchObject({ family_id: tokens[0]?.familyId });
    // token.reuse_detected とは別 action。混同・合流させない
    expect(audit.filter((row) => row.action === 'token.reuse_detected')).toHaveLength(0);
  });

  it('旧 refresh token の再利用は family 全体を失効させる', async () => {
    const first = await issuedTokenPair(tenantA);
    const rotated = await service.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken });
    expect(rotated.ok).toBe(true);

    // 失効済みの枝を再提示 = 窃取された枝が使われた状態
    const reused = await service.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken });
    expect(reused).toEqual({ ok: false, error: { error: 'invalid_grant' } });

    const tokens = await harness.ports.publisherTokens.listByUserId(tenantA.tenantId, tenantA.userId);
    expect(tokens.every((token) => token.revokedAtSeconds !== null)).toBe(true);

    // 再利用検知は監査へ残る。summary まで見るのは「影響範囲が記録されたか」が要件だから
    const audit = await harness.repositories.audit.read(createRepositoryContext({ tenantId: tenantA.tenantId }));
    const detected = audit.filter((row) => row.action === 'token.reuse_detected');
    expect(detected).toHaveLength(1);
    expect(JSON.parse(detected[0]?.summaryJson ?? '{}')).toMatchObject({
      revoked_family_size: 2,
      revoked_count: 1,
    });
  });
});

describe('revocation (AC-4)', () => {
  it('revokeToken 後は refresh できない', async () => {
    const first = await issuedTokenPair(tenantA);
    const [token] = await harness.ports.publisherTokens.listByUserId(tenantA.tenantId, tenantA.userId);
    expect(token).toBeDefined();
    if (token === undefined) return;

    const revoked = await service.revokeToken({
      tenantId: tenantA.tenantId,
      tokenId: token.id,
      actorUserId: tenantA.userId,
    });
    expect(revoked).toEqual({ revokedCount: 1 });

    expect(await service.refresh({ tenantId: tenantA.tenantId, refreshToken: first.refreshToken })).toEqual({
      ok: false,
      error: { error: 'invalid_grant' },
    });
  });

  it('session 失効時刻はミリ秒列から秒へ換算されて port に出る', async () => {
    const written = await harness.repositories.sessionRevocations.revokeAll(
      createRepositoryContext({ tenantId: tenantA.tenantId }),
    );

    const seen = await harness.ports.sessionRevocations.findRevokedAtSeconds(tenantA.tenantId, tenantA.userId);
    expect(seen).toBe(Math.floor(written.revokedAt / 1000));

    // 失効はテナント単位。別テナントへは波及しない
    expect(await harness.ports.sessionRevocations.findRevokedAtSeconds(tenantB.tenantId, tenantB.userId)).toBeNull();
  });
});
