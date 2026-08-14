/**
 * 本番テナントの初期マスタ投入ロジック (CLI 本体は bootstrap-tenant.ts)。
 *
 * **なぜ専用経路が要るか。** アプリから作れない行が 3 つある:
 *   - `tenants` / `workspaces`: repository (`createTenantsRepo`) は存在するが、
 *     呼出し元が test しかない。画面・API から新規テナントを作る経路が無い。
 *   - 最初の `workspace-admin`: 初回サインインの JIT provisioning は role を常に `member` で作る
 *     (apps/hub/src/lib/auth/db-ports.ts)。昇格画面は `workspace-admin` を要求するので、
 *     1 人目だけは画面から作れない (鶏と卵)。
 *
 * **seed-local.ts と決定的に違う点。** seed-local は「同じ slug を消してから作り直す」。
 * それは手元でしか成立しない。ここでは **既存行を一切書き換えず、無い行だけを足す**。
 * 再実行しても増えない・壊れないことを冪等性の定義とし、削除系の操作は一切持たない。
 *
 * 結果は各段階の帰属 (`created` / `existing` / `promoted` …) を必ず返す。「0 件」を
 * 「元から在った」「今作った」「dry-run で作らなかった」へ潰すと、実行後に何が起きたのか
 * 復元できなくなる。
 */

import { and, eq } from 'drizzle-orm';

import { type AuditEventInput, createAuditRepo } from '../repository/audit';
import { guardedWrite } from '../repository/conflict';
import type { CoreAdapter } from '../repository/db';
import { serverNow } from '../repository/time';
import { newUlid } from '../repository/ulid';
import { tenants, users, userWorkspaces, workspaces } from '../schema/core/identity';
import { isTransactionalAdapter } from '../src/adapter';
import { createRepositoryContext } from '../src/context';
import type { RepositoryContext } from '../src/types';

/** 昇格先。`provider-admin` は `workspace-admin` より強いので降格させない。 */
const TARGET_ROLE = 'workspace-admin';
const STRONGER_ROLES = new Set(['provider-admin', TARGET_ROLE]);

/** 監査の actor。人ではないので actor_type は `system`。 */
const ACTOR_ID = 'bootstrap-tenant';
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface BootstrapInput {
  readonly tenantSlug: string;
  readonly tenantName: string;
  readonly plan: string;
  readonly workspaceSlug: string;
  readonly workspaceName: string;
  /** 未指定なら昇格段階そのものを行わない (テナント枠だけ先に作る運用)。 */
  readonly adminEmail?: string | undefined;
  /** false = dry-run。既定を dry-run にするのは、書き込みを常に明示の結果にするため。 */
  readonly apply: boolean;
}

export type RowOutcome = 'created' | 'existing' | 'planned';
export type AdminOutcome = 'promoted' | 'already-admin' | 'planned' | 'skipped' | 'user-not-found' | 'ambiguous-email';
export type MembershipOutcome = 'created' | 'existing' | 'planned' | 'skipped';

export interface BootstrapReport {
  readonly ok: boolean;
  readonly dryRun: boolean;
  readonly tenant: { readonly id: string | null; readonly slug: string; readonly outcome: RowOutcome };
  readonly workspace: { readonly id: string | null; readonly slug: string; readonly outcome: RowOutcome };
  readonly admin: {
    readonly email: string | null;
    readonly userId: string | null;
    readonly roleBefore: string | null;
    readonly outcome: AdminOutcome;
    readonly membership: MembershipOutcome;
  };
  readonly errors: readonly string[];
}

export interface BootstrapDependencies {
  /** テストで監査障害を注入できる境界。本番既定は audit repository の append。 */
  readonly appendAudit?: (adapter: CoreAdapter, context: RepositoryContext, event: AuditEventInput) => Promise<void>;
}

function required(field: string, value: string): void {
  if (value.trim().length === 0) throw new Error(`${field} は必須です`);
}

/** 入力の空文字を入口で止める。空 slug は UNIQUE を素通りして復旧しづらい行を作る。 */
export function assertBootstrapInput(input: BootstrapInput): void {
  required('--tenant-slug', input.tenantSlug);
  required('--tenant-name', input.tenantName);
  required('--plan', input.plan);
  required('--workspace-slug', input.workspaceSlug);
  required('--workspace-name', input.workspaceName);
  if (input.adminEmail !== undefined) required('--admin-email', input.adminEmail);
  if (!SLUG_PATTERN.test(input.tenantSlug) || input.tenantSlug.length > 63) {
    throw new Error('--tenant-slug の形式が不正です (小文字英数字と途中のハイフン、最大 63 文字)');
  }
  if (!SLUG_PATTERN.test(input.workspaceSlug) || input.workspaceSlug.length > 63) {
    throw new Error('--workspace-slug の形式が不正です (小文字英数字と途中のハイフン、最大 63 文字)');
  }
  if (input.adminEmail !== undefined && !EMAIL_PATTERN.test(input.adminEmail)) {
    throw new Error('--admin-email の形式が不正です');
  }
}

export async function bootstrapTenant(
  adapter: CoreAdapter,
  input: BootstrapInput,
  dependencies: BootstrapDependencies = {},
): Promise<BootstrapReport> {
  assertBootstrapInput(input);
  const db = adapter.client;
  const apply = input.apply;
  const errors: string[] = [];
  const appendAudit =
    dependencies.appendAudit ??
    (async (auditAdapter: CoreAdapter, context: RepositoryContext, event: AuditEventInput) => {
      await createAuditRepo(auditAdapter).append(context, event);
    });

  // ---- tenants: 既存があれば name/plan/status を一切触らない。
  // 「投入し直したら本番の表示名が上書きされた」を構造的に起こさないため、更新経路を持たない。
  const existingTenant = await db.select().from(tenants).where(eq(tenants.slug, input.tenantSlug)).limit(1);
  let tenantId: string | null = existingTenant[0]?.id ?? null;
  let tenantOutcome: RowOutcome = tenantId === null ? 'planned' : 'existing';
  if (tenantId === null && apply) {
    tenantId = newUlid();
    // repository 配下と同じく guardedWrite を通す。監査 append は別接続で
    // BEGIN IMMEDIATE を開くので、素の write と混ぜると負けた側の接続が壊れる (conflict.ts)。
    await guardedWrite(adapter, async () => {
      await db.insert(tenants).values({
        id: tenantId as string,
        slug: input.tenantSlug,
        name: input.tenantName,
        plan: input.plan,
        status: 'active',
        createdAt: serverNow(),
      });
    });
    tenantOutcome = 'created';
  }

  // ---- workspaces: tenant が未確定 (dry-run の新規) なら所属先が無いので planned のまま返す。
  let workspaceId: string | null = null;
  let workspaceOutcome: RowOutcome = 'planned';
  if (tenantId !== null) {
    const existingWorkspace = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.tenantId, tenantId), eq(workspaces.slug, input.workspaceSlug)))
      .limit(1);
    workspaceId = existingWorkspace[0]?.id ?? null;
    workspaceOutcome = workspaceId === null ? 'planned' : 'existing';
    if (workspaceId === null && apply) {
      workspaceId = newUlid();
      await guardedWrite(adapter, async () => {
        await db.insert(workspaces).values({
          id: workspaceId as string,
          tenantId: tenantId as string,
          slug: input.workspaceSlug,
          name: input.workspaceName,
          createdAt: serverNow(),
        });
      });
      workspaceOutcome = 'created';
    }
  }

  // ---- 最初の管理者。JIT で作られた行を昇格させるだけで、users 行そのものは作らない。
  // 手で users を作ると idp_subject を推測で埋めることになり、本人の初回ログインで
  // UNIQUE(tenant_id, idp_subject) 違反か別人行の二重作成を招く。
  let adminUserId: string | null = null;
  let roleBefore: string | null = null;
  let adminOutcome: AdminOutcome = 'skipped';
  let membership: MembershipOutcome = 'skipped';

  if (input.adminEmail !== undefined && tenantId !== null) {
    const candidates = await db
      .select()
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.email, input.adminEmail)));

    if (candidates.length > 1) {
      adminOutcome = 'ambiguous-email';
      errors.push(`email ${input.adminEmail} に一致する利用者が ${candidates.length} 件あり一意に定まりません`);
    } else if (candidates.length === 0) {
      adminOutcome = 'user-not-found';
      errors.push(
        `email ${input.adminEmail} の利用者が居ません。対象の方に一度サインインしてもらい (JIT provisioning で行が作られます)、その後もう一度実行してください`,
      );
    } else {
      const target = candidates[0] as { id: string; role: string };
      adminUserId = target.id;
      roleBefore = target.role;
      const alreadyStrong = STRONGER_ROLES.has(target.role);
      adminOutcome = alreadyStrong ? 'already-admin' : apply ? 'promoted' : 'planned';

      // ---- 所属。role が強くても user_workspaces が無ければ認可は
      // 「所属なし = 全 Workspace 拒否」に倒れる (schema/core/identity.ts の userWorkspaces 参照)。
      if (workspaceId === null) {
        membership = 'planned';
      } else {
        const existingMembership = await db
          .select()
          .from(userWorkspaces)
          .where(
            and(
              eq(userWorkspaces.tenantId, tenantId),
              eq(userWorkspaces.userId, target.id),
              eq(userWorkspaces.workspaceId, workspaceId),
            ),
          )
          .limit(1);
        membership = existingMembership.length > 0 ? 'existing' : apply ? 'created' : 'planned';
      }

      // role・所属・監査を 1 transaction にする。監査だけ失敗した時に role/所属だけが残ると、
      // 再実行は「既存」と判定して監査を永久に復旧できないため、部分成功を許さない。
      if (apply && (adminOutcome === 'promoted' || membership === 'created')) {
        if (!isTransactionalAdapter(adapter)) {
          throw new Error('管理者 bootstrap の apply には監査を含む transaction 対応 adapter が必要です');
        }
        const context = createRepositoryContext({ tenantId, actorId: ACTOR_ID });
        await guardedWrite(adapter, () =>
          adapter.transaction(async (tx) => {
            const txAdapter = tx as CoreAdapter;
            const txDb = txAdapter.client;
            if (adminOutcome === 'promoted') {
              await txDb
                .update(users)
                .set({ role: TARGET_ROLE })
                .where(and(eq(users.tenantId, tenantId as string), eq(users.id, target.id)));
              await appendAudit(txAdapter, context, {
                actorType: 'system',
                actorId: ACTOR_ID,
                action: 'user.role_change',
                entityType: 'users',
                entityId: target.id,
                ...(workspaceId === null ? {} : { workspaceId }),
                summary: { from: roleBefore, to: TARGET_ROLE, reason: 'bootstrap-tenant' },
              });
            }
            if (membership === 'created') {
              await txDb.insert(userWorkspaces).values({
                tenantId: tenantId as string,
                userId: target.id,
                workspaceId: workspaceId as string,
                createdAt: serverNow(),
              });
              await appendAudit(txAdapter, context, {
                actorType: 'system',
                actorId: ACTOR_ID,
                action: 'user.workspace_membership_add',
                entityType: 'user_workspaces',
                entityId: `${target.id}:${workspaceId as string}`,
                workspaceId: workspaceId as string,
                summary: { role: adminOutcome === 'promoted' ? TARGET_ROLE : roleBefore, reason: 'bootstrap-tenant' },
              });
            }
          }),
        );
      }
    }
  }

  return {
    // fail-closed。昇格を頼まれたのに対象が居ない/曖昧なら「テナントは作れたので成功」にしない。
    ok: errors.length === 0,
    dryRun: !apply,
    tenant: { id: tenantId, slug: input.tenantSlug, outcome: tenantOutcome },
    workspace: { id: workspaceId, slug: input.workspaceSlug, outcome: workspaceOutcome },
    admin: {
      email: input.adminEmail ?? null,
      userId: adminUserId,
      roleBefore,
      outcome: adminOutcome,
      membership,
    },
    errors,
  };
}
