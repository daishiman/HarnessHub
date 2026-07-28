/**
 * OAuth 2.0 Device Authorization Grant (RFC 8628) の Hub 側実装 (ADR AD-6)。
 *
 * 所有範囲は code 発行 / approve / token 交換 / refresh rotation / 再利用検知 / 失効まで。
 * **OS 資格情報域への保存は所有しない** — feat-publisher-plugin の責務であり、
 * ここには保存 API を置かない (置くと「保存まで実装済み」という誤った証跡になる)。
 */

import type { AccessTokenClaims, PublisherTokenScope, SessionRole, TokenResponse } from '@harness-hub/schemas';
import { publisherTokenScopeSchema } from '@harness-hub/schemas';

import { AUTH_NUMERIC_CONTRACT } from '../config.js';
import { sha256Hex, signJwt } from '../jwt.js';
import type { PublisherTokenRecord } from '../ports.js';
import { generateOpaqueToken, generateUserCode, systemRandomBytes } from './codes.js';
import type { ApproveRejection, ApproveResult, DeviceFlowDeps, DeviceFlowService } from './contracts.js';
import { nextPollIntervalSeconds, normalizeUserCode, relaxedPollIntervalSeconds, toSummary } from './transforms.js';

// 既存の直接 import を壊さない互換 export。新規の公開入口は device-flow/index.ts。
export type {
  ApproveRejection,
  ApproveResult,
  DeviceFlowDeps,
  DeviceFlowResult,
  DeviceFlowService,
} from './contracts.js';
export { normalizeUserCode } from './transforms.js';

export function createDeviceFlowService(deps: DeviceFlowDeps): DeviceFlowService {
  const randomBytes = deps.randomBytes ?? systemRandomBytes;
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const { clock, deviceAuthorizations, publisherTokens, users } = deps.ports;

  /** 要求 scope のうち語彙として正しいものだけを残す。未知 scope は黙って落とす (拡大解釈しない)。 */
  function narrowScope(requested: readonly string[]): PublisherTokenScope[] {
    const accepted: PublisherTokenScope[] = [];
    for (const candidate of requested) {
      const parsed = publisherTokenScopeSchema.safeParse(candidate);
      if (parsed.success && !accepted.includes(parsed.data)) accepted.push(parsed.data);
    }
    return accepted;
  }

  async function issueTokenPair(input: {
    tenantId: string;
    workspaceId: string;
    userId: string;
    role: SessionRole;
    scope: readonly PublisherTokenScope[];
    deviceLabel: string | null;
    familyId: string;
  }): Promise<TokenResponse> {
    const now = clock.nowSeconds();
    const tokenId = newId();
    const refreshToken = generateOpaqueToken(randomBytes);

    const claims: AccessTokenClaims = {
      typ: 'access',
      sub: input.userId,
      tenant_id: input.tenantId,
      workspace_id: input.workspaceId,
      token_id: tokenId,
      role: input.role,
      scope: [...input.scope],
      iat: now,
      exp: now + AUTH_NUMERIC_CONTRACT.accessTokenTtlSeconds,
    };

    const record: PublisherTokenRecord = {
      id: tokenId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      userId: input.userId,
      familyId: input.familyId,
      // 平文は返却時にしか存在しない。DB が流出しても refresh token を復元できない
      refreshTokenHash: await sha256Hex(refreshToken),
      scope: input.scope,
      deviceLabel: input.deviceLabel,
      createdAtSeconds: now,
      lastUsedAtSeconds: null,
      expiresAtSeconds: now + AUTH_NUMERIC_CONTRACT.refreshTokenTtlSeconds,
      revokedAtSeconds: null,
    };
    await publisherTokens.create(record);

    return {
      access_token: await signJwt(claims, deps.accessTokenSecret),
      token_type: 'Bearer',
      expires_in: AUTH_NUMERIC_CONTRACT.accessTokenTtlSeconds,
      refresh_token: refreshToken,
      scope: [...input.scope],
    };
  }

  return {
    async requestCode(input) {
      const now = clock.nowSeconds();
      const deviceCode = generateOpaqueToken(randomBytes);
      const userCode = generateUserCode(randomBytes);

      await deviceAuthorizations.create({
        id: newId(),
        tenantId: input.tenantId,
        deviceCodeHash: await sha256Hex(deviceCode),
        userCode,
        scope: narrowScope(input.scope),
        deviceLabel: input.deviceLabel,
        status: 'pending',
        attempts: 0,
        expiresAtSeconds: now + AUTH_NUMERIC_CONTRACT.deviceCodeTtlSeconds,
        lastPolledAtSeconds: null,
        intervalSeconds: AUTH_NUMERIC_CONTRACT.devicePollIntervalSeconds,
        approvedByUserId: null,
        workspaceId: null,
      });

      return {
        device_code: deviceCode,
        user_code: userCode,
        verification_uri: deps.verificationUri,
        verification_uri_complete: `${deps.verificationUri}?user_code=${userCode}`,
        expires_in: AUTH_NUMERIC_CONTRACT.deviceCodeTtlSeconds,
        interval: AUTH_NUMERIC_CONTRACT.devicePollIntervalSeconds,
      };
    },

    async approve(input) {
      const normalizedUserCode = normalizeUserCode(input.userCode);
      const record = await deviceAuthorizations.findByUserCode(input.tenantId, normalizedUserCode);
      // 存在しない user_code はどの authorization にも帰属できないので試行回数を数えない。
      // 全 pending へ数えると、攻撃者が他人の認可を潰せる DoS になる。
      // 総当たり自体は security-spec §7.2 の rate limit (5/分) が担う (本 feature は所有しない)
      if (record === null) return { ok: false, reason: 'not_found' };

      const now = clock.nowSeconds();

      /**
       * 「code は知っているが承認できなかった」試行を数える (security-spec §2.2)。
       * 上限に達した認可は `denied` へ落とし、polling 側へ `access_denied` を返す。
       * code を知っている相手はそもそも承認できるため、この計数で攻撃面は増えない。
       *
       * **関数宣言ではなく arrow function にしてある**: 関数宣言は巻き上げられるため、
       * 上の `record === null` による絞り込みが閉包の中まで届かない (TS18047)。
       */
      const countFailure = async (reason: ApproveRejection): Promise<ApproveResult> => {
        let current = record;
        for (;;) {
          // 上限へ達した後の追加要求で attempts を 6, 7… と増やさない。
          // 「5 回で denied」が永続化契約なので、denied は終端としてそのまま返す。
          if (current.status === 'denied' || current.attempts >= AUTH_NUMERIC_CONTRACT.userCodeMaxAttempts) {
            return { ok: false, reason: 'denied' };
          }
          const attempts = current.attempts + 1;
          const exhausted = attempts >= AUTH_NUMERIC_CONTRACT.userCodeMaxAttempts;
          // status と attempts の組を CAS する。status だけだと、同時に失敗した要求が全て
          // attempts=1 を書いて成功し、総当たり回数を過少計数してしまう。
          const counted = await deviceAuthorizations.compareAndSwapStatus({
            expectedStatus: current.status,
            expectedAttempts: current.attempts,
            next: { ...current, attempts, status: exhausted ? 'denied' : current.status },
          });
          if (counted) return { ok: false, reason: exhausted ? 'denied' : reason };

          // CAS に負けたのは別要求が先に計数・遷移したため。最新行で残りの 1 回を数え直す。
          // 行が消える設計ではないが、外部 DB 操作を推測で補完しないため null は not_found に倒す。
          const latest = await deviceAuthorizations.findByUserCode(input.tenantId, normalizedUserCode);
          if (latest === null) return { ok: false, reason: 'not_found' };
          current = latest;
        }
      };

      if (record.expiresAtSeconds <= now) return { ok: false, reason: 'expired' };
      if (record.status === 'denied') return { ok: false, reason: 'denied' };
      // 承認済み / 交換済みの user_code は再利用させない (照合後即失効)
      if (record.status !== 'pending') return countFailure('already_used');

      // pending のままなら承認する。負けた側は「既に承認済み」— 監査も出さずに弾く
      const approved = await deviceAuthorizations.compareAndSwapStatus({
        expectedStatus: 'pending',
        expectedAttempts: record.attempts,
        next: {
          ...record,
          status: 'approved',
          approvedByUserId: input.userId,
          workspaceId: input.workspaceId,
        },
      });
      if (!approved) return { ok: false, reason: 'already_used' };

      await deps.audit.record({
        actorSubject: input.userId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        action: 'device.approve',
        resourceType: 'token',
        resourceId: record.id,
        metadata: { device_label: record.deviceLabel },
      });

      return { ok: true, deviceLabel: record.deviceLabel };
    },

    async exchangeToken(input) {
      const record = await deviceAuthorizations.findByDeviceCodeHash(input.tenantId, await sha256Hex(input.deviceCode));
      if (record === null) return { ok: false, error: { error: 'invalid_grant' } };

      const now = clock.nowSeconds();
      if (record.expiresAtSeconds <= now) return { ok: false, error: { error: 'expired_token' } };
      if (record.status === 'denied') return { ok: false, error: { error: 'access_denied' } };
      // device_code は使い捨て。2 回目の交換を許すと token を無制限に複製できる
      if (record.status === 'consumed') return { ok: false, error: { error: 'invalid_grant' } };

      // polling が速すぎる場合は間隔を広げて突き返す。RFC 8628 §3.5 の slow_down
      if (record.lastPolledAtSeconds !== null && now - record.lastPolledAtSeconds < record.intervalSeconds) {
        await deviceAuthorizations.savePollProgress({
          tenantId: record.tenantId,
          id: record.id,
          lastPolledAtSeconds: now,
          intervalSeconds: nextPollIntervalSeconds(record.intervalSeconds),
        });
        return { ok: false, error: { error: 'slow_down' } };
      }

      // ここへ来たのは interval を守った polling。罰を 1 段だけ戻す (下の `relaxedPollIntervalSeconds`)
      if (record.status === 'pending') {
        await deviceAuthorizations.savePollProgress({
          tenantId: record.tenantId,
          id: record.id,
          lastPolledAtSeconds: now,
          intervalSeconds: relaxedPollIntervalSeconds(record.intervalSeconds),
        });
        return { ok: false, error: { error: 'authorization_pending' } };
      }

      // ここに来るのは status === 'approved' のときだけ
      if (record.approvedByUserId === null || record.workspaceId === null) {
        return { ok: false, error: { error: 'invalid_grant' } };
      }

      const user = await users.findById(input.tenantId, record.approvedByUserId);
      // 承認後に無効化された利用者の token を発行しない
      if (user === null || user.status !== 'active') {
        return { ok: false, error: { error: 'access_denied' } };
      }

      /**
       * device_code の使い捨てを確定させる 1 点。
       *
       * `approved` のままだったときだけ `consumed` へ遷移する。同じ device_code を並行に
       * 提示された場合、この CAS で true を得るのは 1 本だけなので token pair の発行も 1 回で終わる。
       * ここを read→save にすると、両方が「approved を読んだ」状態から書き込むため
       * **同じ認可から 2 組の token が出る** (RFC 8628 §3.5 の使い捨て要件が壊れる)。
       */
      const consumed = await deviceAuthorizations.compareAndSwapStatus({
        expectedStatus: 'approved',
        expectedAttempts: record.attempts,
        next: { ...record, status: 'consumed', lastPolledAtSeconds: now },
      });
      // 負けた側は「既に交換済み」。expired ではないので invalid_grant を返す
      if (!consumed) return { ok: false, error: { error: 'invalid_grant' } };

      const token = await issueTokenPair({
        tenantId: input.tenantId,
        workspaceId: record.workspaceId,
        userId: user.id,
        role: user.role,
        scope: record.scope,
        deviceLabel: record.deviceLabel,
        familyId: newId(),
      });

      await deps.audit.record({
        actorSubject: user.id,
        tenantId: input.tenantId,
        workspaceId: record.workspaceId,
        action: 'token.issue',
        resourceType: 'token',
        resourceId: record.id,
        metadata: { device_label: record.deviceLabel, scope: record.scope.join(' ') },
      });

      return { ok: true, value: token };
    },

    async refresh(input) {
      const hash = await sha256Hex(input.refreshToken);
      const record = await publisherTokens.findByRefreshTokenHash(input.tenantId, hash);
      if (record === null) return { ok: false, error: { error: 'invalid_grant' } };

      const now = clock.nowSeconds();

      // 失効済みの refresh token が提示された = 窃取された枝が使われた。
      // rotation だけでは窃取を検知できない。family 全体を落として初めて意味を持つ
      if (record.revokedAtSeconds !== null) {
        // 影響範囲 (family 全体の枝数) は監査に残す値。失効操作の前に読む
        const family = await publisherTokens.listByFamilyId(input.tenantId, record.familyId);
        // 1 操作で family 全体を落とす。1 本ずつ read→save すると、途中で落ちた時に
        // 「一部だけ生きている family」が残り、窃取された枝が生き延びうる
        const revokedCount = await publisherTokens.revokeFamily({
          tenantId: input.tenantId,
          familyId: record.familyId,
          revokedAtSeconds: now,
        });
        await deps.audit.record({
          actorSubject: record.userId,
          tenantId: input.tenantId,
          workspaceId: record.workspaceId,
          action: 'token.reuse_detected',
          resourceType: 'token',
          resourceId: record.id,
          metadata: {
            family_id: record.familyId,
            // 影響を受けた枝の総数 (既に失効していたものも含む) = 侵害の広さ
            revoked_family_size: family.length,
            // この検知で新たに止めた本数。差 (family_size - revoked_count) が既失効の枝数
            revoked_count: revokedCount,
          },
        });
        return { ok: false, error: { error: 'invalid_grant' } };
      }

      if (record.expiresAtSeconds <= now) return { ok: false, error: { error: 'expired_token' } };

      const user = await users.findById(input.tenantId, record.userId);
      if (user === null || user.status !== 'active') return { ok: false, error: { error: 'access_denied' } };

      /**
       * rotation の直列化点。
       *
       * 旧 refresh を**先に**失効させてから新しい枝を作る (順序を逆にすると、途中で落ちた時に
       * 「両方生きている」状態が残る)。さらにその失効を CAS にしてあるので、同じ refresh token を
       * 並行に提示されても true を得るのは 1 本だけ = **新しい枝も 1 本だけ**生まれる。
       */
      const rotated = await publisherTokens.revokeIfActive({
        tenantId: input.tenantId,
        id: record.id,
        revokedAtSeconds: now,
        lastUsedAtSeconds: now,
      });
      if (!rotated) {
        /**
         * CAS に負けた側。**この 1 本だけ拒否し、family へは波及させない** (HarnessHub-b7ng で確定)。
         *
         * ここを通るのは「同じ refresh token を出した並行要求のうち、失効させられなかった側」。
         * 直前の `record.revokedAtSeconds !== null` 検査は通っている = 読んだ時点では生きていた。
         * つまり窃取の再利用と client の同時多重送信が**同じ形で現れる**分岐で、上の再利用検知
         * (`revokedAtSeconds !== null`) と違い「失効済みを提示した」証拠が無い。
         *
         * **どちらの分岐に落ちるかは interleaving で決まる。** 負けた側の *読み* が勝者の CAS
         * より後なら上の再利用検知に落ち、先ならここに落ちる。単一プロセス
         * (ローカル file backend + guardedWrite) の実測では前者。Workers は isolate が複数で
         * プロセス内の待ち行列を共有しないため、**本番では両者が生きた枝を読んでここに落ちる**。
         * だからこの分岐の方針が本番の挙動そのものになる。
         *
         * **family 全失効へ escalate しない理由。** ここから `revokeFamily` を撃つと勝者の
         * `issueTokenPair` (= 新しい枝の `create`) と競走する。掃討はその時点で存在する行しか
         * 落とせないので、勝者の枝が後に生まれれば生き残る。実測でこれが起きている:
         * 上の再利用検知が撃った監査は `revoked_family_size: 1 / revoked_count: 0` で、
         * **掃討時点で勝者の枝がまだ無い** = 掃討後に生まれた枝は取り逃す。つまり escalate は
         * 「たいてい family が死ぬが時々勝者だけ生き残る」タイミング依存にしかならない
         * (決定論にするには family 単位の墓標が要り、schema 追加を伴う別設計)。加えて CLI が
         * 並行に refresh するたび利用者がログアウトするので、可用性の代償が恒常的になる。
         *
         * **検知が失われない根拠。** 負けた側が読んだ枝は勝者が既に失効させている。よって同じ
         * refresh token を次に提示すれば上の再利用検知に落ち family が失効する。窃取の検知は
         * **遅れるだけで消えない** (tests の「並行提示で拒否された refresh token の再提示は
         * 再利用検知へ昇格する」が証拠)。
         *
         * **残る穴 (HarnessHub-v22l で解消)。** client が invalid_grant で古い token を捨て
         * 再提示しない場合、この窓で起きた窃取はそれまで観測されなかった。そこで
         * 「並行提示されたこと自体」を独立した監査 action `token.refresh_race` として残す
         * (action 語彙の正本は docs/backend-spec.md §3.8 / docs/security-spec-data-integrity.md
         * §5.2)。`token.reuse_detected` (失効済みを提示した確定的な窃取シグナル) とは
         * 意味が異なるため昇格・合流させず、別 action のまま記録する。
         */
        await deps.audit.record({
          actorSubject: record.userId,
          tenantId: input.tenantId,
          workspaceId: record.workspaceId,
          action: 'token.refresh_race',
          resourceType: 'token',
          resourceId: record.id,
          metadata: { family_id: record.familyId },
        });
        return { ok: false, error: { error: 'invalid_grant' } };
      }

      const token = await issueTokenPair({
        tenantId: input.tenantId,
        workspaceId: record.workspaceId,
        userId: record.userId,
        role: user.role,
        scope: record.scope,
        deviceLabel: record.deviceLabel,
        familyId: record.familyId,
      });

      return { ok: true, value: token };
    },

    async revokeToken(input) {
      const record = await publisherTokens.findById(input.tenantId, input.tokenId);
      if (record === null) return null;

      const now = clock.nowSeconds();
      const revokedCount = await publisherTokens.revokeFamily({
        tenantId: input.tenantId,
        familyId: record.familyId,
        revokedAtSeconds: now,
      });

      await deps.audit.record({
        actorSubject: input.actorUserId,
        tenantId: input.tenantId,
        workspaceId: record.workspaceId,
        action: 'token.revoke',
        resourceType: 'token',
        resourceId: record.id,
        metadata: { family_id: record.familyId, revoked_count: revokedCount },
      });

      // 既に失効済みでも成功として返す (冪等)。呼び出し側が再試行しても状態が変わらない
      return { revokedCount: Math.max(revokedCount, 1) };
    },

    async listTokensForUser(input) {
      const records = await publisherTokens.listByUserId(input.tenantId, input.userId);
      return records.map((record) => toSummary(record, clock.nowSeconds()));
    },

    async listTokensForWorkspace(input) {
      const records = await publisherTokens.listByWorkspaceId(input.tenantId, input.workspaceId);
      return records.map((record) => toSummary(record, clock.nowSeconds()));
    },
  };
}
