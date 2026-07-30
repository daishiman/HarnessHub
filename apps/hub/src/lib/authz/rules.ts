/**
 * action → 必要権限の規則表 (ADR AD-4)。
 *
 * 判定を「表引き」に閉じてあるので、権限を確認したいときに読む場所が 1 つで済む。
 * 表に無い action は `no_rule` で拒否される (deny-by-default) — 新しい API を足したとき、
 * 規則を書き忘れると動かないので、書き忘れが「全開放」ではなく「全拒否」側に倒れる。
 */

import type { PublisherTokenScope } from '@harness-hub/schemas';

import type { EffectiveRole } from './types.js';

export interface ActionRule {
  /** これ以上の実効 role を要求する。 */
  readonly minRole: EffectiveRole;
  /**
   * access token 経由の場合に要求する scope。
   * session 経由では scope を判定しない (security-spec §3.5)。
   */
  readonly requiredScope: PublisherTokenScope | null;
  /** この action を呼べる資格情報。用途外 token を role だけで通さない。 */
  readonly credential: 'session' | 'access_token' | 'either';
  /**
   * 自分が所有する資源に限るか。
   * `workspace-admin` 以上は管理操作として他人の資源にも及ぶ (`decide` 側で判定)。
   */
  readonly selfOnly: boolean;
}

const SESSION = 'session';
const TOKEN = 'access_token';
const EITHER = 'either';

/**
 * security-spec §3.4 の action 語彙を機械可読にした正本。
 *
 * P0 の時点で全 role 判定を有効にする契約 (security-spec §8) のため、後続 feature が
 * route を実装する action もここで先に deny-by-default の規則を確定する。
 */
export const ACTION_RULES: Readonly<Record<string, ActionRule>> = {
  'metrics.read_aggregate': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'sheets.create': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'sheets.read_own': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: true },
  'sheets.read_all': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'sheets.status_change': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'sheets.regenerate': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'builds.read': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'builds.stage_change': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'projects.create': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'projects.update': { minRole: 'owner', requiredScope: null, credential: SESSION, selfOnly: false },
  'harnesses.read': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'harnesses.install': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'publish.request': { minRole: 'owner', requiredScope: 'publish:write', credential: EITHER, selfOnly: false },
  'publish.approve': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'publish.reject': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'channel.promote': { minRole: 'owner', requiredScope: 'publish:write', credential: EITHER, selfOnly: false },
  'channel.rollback': { minRole: 'owner', requiredScope: 'publish:write', credential: EITHER, selfOnly: false },
  'release.suspend': { minRole: 'owner', requiredScope: 'publish:write', credential: EITHER, selfOnly: false },
  'feedback.create': { minRole: 'member', requiredScope: 'feedback:write', credential: EITHER, selfOnly: false },
  'feedback.read': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'feedback.status_change': {
    minRole: 'workspace-admin',
    requiredScope: null,
    credential: SESSION,
    selfOnly: false,
  },
  'docs.read': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'docs.write_tenant': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'docs.write_common': { minRole: 'provider-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'users.read': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'users.write': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'users.role_change': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'users.read_salary': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'users.write_salary': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'coefficients.change': {
    minRole: 'workspace-admin',
    requiredScope: null,
    credential: SESSION,
    selfOnly: false,
  },
  'audit.read': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'aijob.pull': {
    minRole: 'workspace-admin',
    requiredScope: 'aijob:process',
    credential: TOKEN,
    selfOnly: false,
  },
  'aijob.complete': {
    minRole: 'member',
    requiredScope: 'aijob:process',
    credential: TOKEN,
    selfOnly: true,
  },
  'aijob.fail': {
    minRole: 'member',
    requiredScope: 'aijob:process',
    credential: TOKEN,
    selfOnly: true,
  },
  'token.revoke_own': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: true },
  'token.revoke_any': {
    minRole: 'workspace-admin',
    requiredScope: null,
    credential: SESSION,
    selfOnly: false,
  },
  'metrics.ingest': {
    minRole: 'member',
    requiredScope: 'metrics:write',
    credential: TOKEN,
    selfOnly: false,
  },

  // 本 feature の route が使う補助 action。上の正本語彙と同じ強度から逸脱させない。
  'device.approve': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'token.list.self': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: true },
  'token.list.workspace': {
    minRole: 'workspace-admin',
    requiredScope: null,
    credential: SESSION,
    selfOnly: false,
  },
  'token.revoke': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: true },
  'publish.write': { minRole: 'owner', requiredScope: 'publish:write', credential: EITHER, selfOnly: false },
  // Publisher CLI 専用。publish.write と異なり session を許可しない。
  'publish.cancel': { minRole: 'owner', requiredScope: 'publish:write', credential: TOKEN, selfOnly: false },
  'deployment.register': { minRole: 'owner', requiredScope: 'publish:write', credential: TOKEN, selfOnly: false },
};

export function findActionRule(action: string): ActionRule | null {
  return Object.hasOwn(ACTION_RULES, action) ? (ACTION_RULES[action] as ActionRule) : null;
}
