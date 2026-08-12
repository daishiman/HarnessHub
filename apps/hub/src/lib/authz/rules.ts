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
  readonly credential: 'session' | 'access_token' | 'either' | 'session_or_cwv_probe';
  /**
   * 自分が所有する資源に限るか。
   * `workspace-admin` 以上は管理操作として他人の資源にも及ぶ (`decide` 側で判定)。
   */
  readonly selfOnly: boolean;
  /** provider-adminの通常越境も禁止する機械操作だけfalseを指定する。省略時は既存挙動を維持する。 */
  readonly allowProviderCrossTenant?: boolean;
}

const SESSION = 'session';
const TOKEN = 'access_token';
const EITHER = 'either';
const SESSION_OR_CWV_PROBE = 'session_or_cwv_probe';

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
  'projects.read': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'projects.create': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'projects.update': { minRole: 'owner', requiredScope: null, credential: SESSION, selfOnly: false },
  // CWV probe は `/catalog` と同 UI が読む read endpoint だけを middleware で許可し、
  // route 側でもこの action 以外へは到達できない。通常 session の権限は変えない。
  'harnesses.read': { minRole: 'member', requiredScope: null, credential: SESSION_OR_CWV_PROBE, selfOnly: false },
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
  // 外部作成文書の同期はWeb編集とは分離し、短命Device Flow token + 専用scopeだけを許可する。
  'docs.external_sync': {
    minRole: 'workspace-admin',
    requiredScope: 'docs:write',
    credential: TOKEN,
    selfOnly: false,
    allowProviderCrossTenant: false,
  },
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

  // 顧客持ち込み OIDC credential の管理 (issue-auth-tenancy-customer-managed-google-oidc-20260729)。
  //
  // `provider-admin` 限定にするのは、この操作が**テナントのログイン経路そのもの**を差し替えるため。
  // workspace-admin へ開くと、顧客側の管理者が自テナントの認証を任意の Google OAuth client へ
  // 向け替えられる = 実質的に「誰がそのテナントへ入れるか」を顧客管理者が単独で決められる。
  // 越境は `withAuthz` が `provider.cross_tenant_access` として必ず監査する。
  //
  // `credential: SESSION` なのは、publisher token (CLI) にこの権限を持たせないため。
  // 長命な refresh token から認証設定を変えられる経路を作らない。
  'idp.connection_read': { minRole: 'provider-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  'idp.connection_change': { minRole: 'provider-admin', requiredScope: null, credential: SESSION, selfOnly: false },
  // Needs Fix の再投入は同じ要求を draft へ戻すため、Web session と Publisher token の双方を許可する。
  // role/scope/owner 判定は publish.write と同一で、session 経路だけが広い資源へ届くことはない。
  'publish.cancel': { minRole: 'owner', requiredScope: 'publish:write', credential: EITHER, selfOnly: false },
  'deployment.register': { minRole: 'owner', requiredScope: 'publish:write', credential: TOKEN, selfOnly: false },
  // feat-user-org-admin (AD-3): S18 アカウント設定。自分自身の情報のみを対象にするため
  // role の下限は member (`token.list.self` と同型の selfOnly パターン)。
  'me.read': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: true },
  'me.update': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: true },
  // 読取りは一覧・個別ダッシュボードから誰でも参照する想定 (users.read と同強度)。
  // 変更は既存の coefficients.change (workspace-admin) のまま。
  'coefficients.read': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },

  // feat-tenant-data-retention (AD-4)。workspace 内の共有データなので selfOnly は使わない
  // (`docs.write_tenant` と同様に workspace 単位で判定する。所有者限定ではない)。
  // upload/list/read/read_content は member — 通常業務のデータ入出力なので workspace-admin まで
  // 上げる理由が無い (`docs.read` と同強度)。delete だけ workspace-admin にするのは、
  // 削除は復元不可 (soft delete 列を持たない、AD-1) で誤操作の影響が大きいため
  // (`sheets.status_change` 等の破壊的操作と同強度に揃える)。
  'tenant-data.upload': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'tenant-data.list': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'tenant-data.read': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'tenant-data.read_content': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'tenant-data.delete': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },

  // feat-notion-integration (設定画面の Notion 連携)。workspace 単位の共有設定であり
  // 個人の資源ではないため selfOnly は使わない (`tenant-data.*` と同様)。
  // 読取り (「開く」導線を出すための存在確認を含む) は member — 通常業務で参照するだけなので
  // `docs.read` と同強度。書込み/削除は workspace-admin — APIキーという秘密情報を扱うため
  // `tenant-data.delete` と同強度に揃える (`idp.connection_change` の provider-admin まで上げないのは、
  // これはテナントのログイン経路そのものではなく、あくまで 1 ワークスペースの外部連携設定のため)。
  'notion-integration.read': { minRole: 'member', requiredScope: null, credential: SESSION, selfOnly: false },
  'notion-integration.write': { minRole: 'workspace-admin', requiredScope: null, credential: SESSION, selfOnly: false },
};

export function findActionRule(action: string): ActionRule | null {
  return Object.hasOwn(ACTION_RULES, action) ? (ACTION_RULES[action] as ActionRule) : null;
}
