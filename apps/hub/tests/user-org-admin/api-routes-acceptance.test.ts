// P05 実装 (SYS-USER-ORG-ADMIN-P05)
// UOA-API-* / UOA-ROUTE-*: acceptance 3件 (salary 非露出・監査記録・axe0) を実現する API 層の受入契約。
//
// P04 時点では `packages/schemas/user-org-admin/` も route も存在しなかったため、本ファイルは
// it.todo のみを持つスタブだった。P05 でスキーマ・route・real DB harness (support/route-runtime.ts) が
// 揃ったので、ここで実テストへ昇格する。
//
// UOA-ROUTE-002 の「member 由来の viewer で salary が "***" になる」件は、現行の ACTION_RULES では
// `users.read`/`users.read_salary` がどちらも workspace-admin 以上限定のため、member は
// GET /api/v1/users に到達する前に 403 で弾かれ、maskPii の非 admin 分岐へは HTTP 経路から到達できない
// (`pii-salary-contract.test.ts` の UOA-PII-101 が同じ理由で it.todo のまま)。そのためここでは
// 到達可能な範囲 (workspace-admin が実値を見られること) だけを検証する。
//
// UOA-ROUTE-007 (CSV export) は S17 画面と export エンドポイントが未実装のため it.todo のまま残す。
// UOA-ROUTE-101 (S17/S18/legal 統合 axe) も画面実装後に昇格する。

import {
  createUserRequestSchema,
  displaySettingsResponseSchema,
  meResponseSchema,
  notificationSettingsResponseSchema,
  salaryDisplaySchema,
  tenantCoefficientsResponseSchema,
  updateUserRequestSchema,
  userListItemSchema,
} from '@harness-hub/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getMe, PATCH as patchMe } from '../../src/app/api/v1/me/route.js';
import { GET as getUser, PATCH as patchUser } from '../../src/app/api/v1/users/[id]/route.js';
import { POST as createUser, GET as listUsers } from '../../src/app/api/v1/users/route.js';
import type { AuthRuntime } from '../../src/lib/authz/runtime.js';
import { TENANT_HEADER } from '../../src/middleware/index.js';
import {
  ALLOWED_ORIGIN,
  contextFor,
  createUserOrgAdminHarness,
  sessionCookieFor,
  type UserOrgAdminHarness,
} from './support/route-runtime.js';

const runtimeHolder = vi.hoisted(() => ({ current: null as AuthRuntime | null }));
const userOrgAdminRuntimeHolder = vi.hoisted(() => ({ current: null as unknown }));

vi.mock('../../src/lib/authz/index.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/authz/index.js')>();
  return {
    ...actual,
    authRuntime: () => {
      if (runtimeHolder.current === null) throw new Error('テスト用 authRuntime が未設定です');
      return runtimeHolder.current;
    },
  };
});

vi.mock('../../src/features/user-org-admin/runtime.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/features/user-org-admin/runtime.js')>();
  return {
    ...actual,
    userOrgAdminRuntime: () => {
      if (userOrgAdminRuntimeHolder.current === null) throw new Error('テスト用 userOrgAdminRuntime が未設定です');
      return userOrgAdminRuntimeHolder.current;
    },
  };
});

describe('P05 受入層: zod スキーマ契約 (AD-3)', () => {
  it('UOA-API-001: GET /api/v1/users のレスポンス zod スキーマが salary フィールドを持ち、maskPii 経由でのみ値が変わる', () => {
    expect(userListItemSchema.shape.salary).toBe(salaryDisplaySchema);
    expect(salaryDisplaySchema.parse(6_000_000)).toBe(6_000_000);
    expect(salaryDisplaySchema.parse('***')).toBe('***');
    expect(salaryDisplaySchema.parse(null)).toBeNull();
  });

  it('UOA-API-002: POST /api/v1/users の入力 zod スキーマが role/department/salary の事前登録項目を検証する', () => {
    const parsed = createUserRequestSchema.parse({
      email: 'new-user@acme.example.com',
      name: '新規 太郎',
      department: '営業',
      salary: 5_000_000,
      role: 'member',
      status: 'active',
    });
    expect(parsed).toMatchObject({ department: '営業', salary: 5_000_000, role: 'member' });
    expect(() => createUserRequestSchema.parse({ email: 'x', name: 'x', role: 'member', status: 'active' })).toThrow();
  });

  it('UOA-API-003: PATCH /api/v1/users/:id の入力 zod スキーマが role 変更と他フィールド変更を区別できる', () => {
    expect(updateUserRequestSchema.parse({ department: '経理' })).toEqual({ department: '経理' });
    expect(updateUserRequestSchema.parse({ role: 'workspace-admin' })).toEqual({ role: 'workspace-admin' });
    // role を含まない要求と含む要求を型上も区別できる (route 側の users.role_change 追加判定の裏付け)
    const withRole = updateUserRequestSchema.parse({ role: 'member' });
    expect('role' in withRole).toBe(true);
  });

  it('UOA-API-004: GET/PATCH /api/v1/me 系スキーマが user_settings を含む (プロフィール + 通知設定)', () => {
    // /api/v1/me 自体は role/salary を含まない自己編集不可項目のみ (AD-3)。
    // user_settings 由来の値は姉妹 route である /api/v1/me/notification-settings・
    // /api/v1/me/display-settings (AD-2 §S18 表示設定) の契約が持つ。
    expect(Object.keys(meResponseSchema.shape)).toEqual(['id', 'email', 'name', 'department', 'role']);
    expect(Object.keys(notificationSettingsResponseSchema.shape)).toEqual([
      'notify_generation',
      'notify_review',
      'notify_weekly',
      'notify_feedback',
      'email_enabled',
    ]);
  });

  it('UOA-API-005: GET/PATCH /api/v1/tenant/coefficients の zod スキーマが AD-4 の TenantCoefficientRow 形状と一致する', () => {
    expect(Object.keys(tenantCoefficientsResponseSchema.shape)).toEqual([
      'annual_hours',
      'minutes_per_run',
      'sheet_reduction_rate',
      'updated_by',
    ]);
  });

  it('UOA-API-006: GET/PATCH /api/v1/me/notification-settings の zod スキーマが NotificationMessage の channels 組立てに必要な項目を持つ', () => {
    const parsed = notificationSettingsResponseSchema.parse({
      notify_generation: true,
      notify_review: false,
      notify_weekly: true,
      notify_feedback: false,
      email_enabled: true,
    });
    expect(parsed.notify_generation).toBe(true);
    expect(parsed.email_enabled).toBe(true);
  });

  it('UOA-API-007: GET/PATCH /api/v1/me/display-settings の zod スキーマが theme/density/language を持つ (AD-2 §S18)', () => {
    const parsed = displaySettingsResponseSchema.parse({ theme: 'dark', density: 'compact', language: 'en' });
    expect(parsed).toEqual({ theme: 'dark', density: 'compact', language: 'en' });
    expect(() => displaySettingsResponseSchema.parse({ theme: 'blue', density: 'compact', language: 'en' })).toThrow();
  });
});

describe('P05 受入層: HTTP route の認可・PII・監査の一体結合', () => {
  let harness: UserOrgAdminHarness;

  beforeEach(async () => {
    harness = await createUserOrgAdminHarness();
    runtimeHolder.current = harness.authRuntime;
    userOrgAdminRuntimeHolder.current = harness.userOrgAdminRuntime;
  });

  afterEach(() => {
    runtimeHolder.current = null;
    userOrgAdminRuntimeHolder.current = null;
    harness.close();
  });

  interface RequestOptions {
    readonly user?: Parameters<typeof sessionCookieFor>[0] | null;
    readonly body?: unknown;
  }

  async function buildRequest(path: string, method: 'GET' | 'POST' | 'PATCH', options: RequestOptions = {}) {
    const headers = new Headers();
    const user = options.user === undefined ? harness.workspaceAdmin : options.user;
    if (user !== null) headers.set('cookie', await sessionCookieFor(user, harness.db.clock.nowSeconds()));
    headers.set(TENANT_HEADER, harness.tenantId);
    headers.set('origin', ALLOWED_ORIGIN);
    if (options.body !== undefined) headers.set('content-type', 'application/json');
    return new Request(`https://hub.example.com/api/v1${path}`, {
      method,
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  }

  const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

  it('UOA-ROUTE-001: GET /api/v1/users を member で呼ぶと 403 (users.read は workspace-admin 限定)', async () => {
    const response = await listUsers(await buildRequest('/users', 'GET', { user: harness.member }));
    expect(response.status).toBe(403);
  });

  it('UOA-ROUTE-002: GET /api/v1/users を workspace-admin で呼ぶと salary が実値で返る (maskPii の実結線)', async () => {
    const response = await listUsers(await buildRequest('/users', 'GET', { user: harness.workspaceAdmin }));
    expect(response.status).toBe(200);
    const body = await response.json();
    const memberItem = body.items.find((item: { readonly id: string }) => item.id === harness.member.id);
    expect(memberItem.salary).toBe(4_800_000);
  });

  it('UOA-ROUTE-003: PATCH /api/v1/users/:id で role を変更すると AuditRepo に user.role_change が記録される', async () => {
    const response = await patchUser(
      await buildRequest(`/users/${harness.member.id}`, 'PATCH', { body: { role: 'workspace-admin' } }),
      routeContext(harness.member.id),
    );
    expect(response.status).toBe(200);

    const events = await harness.db.repositories.audit.read(contextFor(harness.tenantId));
    const roleChange = events.find((event) => event.action === 'user.role_change');
    expect(roleChange).toMatchObject({ entityId: harness.member.id, entityType: 'user' });
    expect(JSON.parse(roleChange?.summaryJson ?? '{}')).toEqual({ from: 'member', to: 'workspace-admin' });
  });

  it('UOA-ROUTE-004: PATCH /api/v1/users/:id で salary を変更すると AuditRepo に user.salary_change が記録される (金額そのものは summary に含まない)', async () => {
    const response = await patchUser(
      await buildRequest(`/users/${harness.member.id}`, 'PATCH', { body: { salary: 5_500_000 } }),
      routeContext(harness.member.id),
    );
    expect(response.status).toBe(200);

    const events = await harness.db.repositories.audit.read(contextFor(harness.tenantId));
    const salaryChange = events.find((event) => event.action === 'user.salary_change');
    expect(salaryChange).toMatchObject({ entityId: harness.member.id });
    expect(salaryChange?.summaryJson).not.toContain('5500000');
  });

  it('UOA-ROUTE-005: GET /api/v1/users/:id (個別ダッシュボード) の salary 読取りが decryptSalary 経由で user.salary_read を記録する', async () => {
    const response = await getUser(
      await buildRequest(`/users/${harness.member.id}`, 'GET'),
      routeContext(harness.member.id),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.salary).toBe(4_800_000);

    const events = await harness.db.repositories.audit.read(contextFor(harness.tenantId));
    expect(events.some((event) => event.action === 'user.salary_read' && event.entityId === harness.member.id)).toBe(
      true,
    );
  });

  it('UOA-ROUTE-006: 事前登録 POST /api/v1/users の権限は workspace-admin 限定で、member からは 403', async () => {
    const memberResponse = await createUser(
      await buildRequest('/users', 'POST', {
        user: harness.member,
        body: { email: 'x@acme.example.com', name: 'X', role: 'member', status: 'active' },
      }),
    );
    expect(memberResponse.status).toBe(403);

    // workspace-admin は認可を通過するが、JIT provisioning との紐付け機構が無いため 501 (runtime.ts の理由コメント参照)
    const adminResponse = await createUser(
      await buildRequest('/users', 'POST', {
        user: harness.workspaceAdmin,
        body: { email: 'x@acme.example.com', name: 'X', role: 'member', status: 'active' },
      }),
    );
    expect(adminResponse.status).toBe(501);
  });

  it.todo(
    'UOA-ROUTE-007: CSV export エンドポイントが maskPiiForExport を通し、閲覧者の role に関わらず salary をマスクする',
  );

  it('UOA-ROUTE-008: GET/PATCH /api/v1/me は session 本人限定 (selfOnly) で、自分の行だけを読み書きする', async () => {
    const memberSelf = await getMe(await buildRequest('/me', 'GET', { user: harness.member }));
    expect(memberSelf.status).toBe(200);
    const memberBody = await memberSelf.json();
    expect(memberBody.id).toBe(harness.member.id);

    const adminSelf = await getMe(await buildRequest('/me', 'GET', { user: harness.workspaceAdmin }));
    const adminBody = await adminSelf.json();
    expect(adminBody.id).toBe(harness.workspaceAdmin.id);
    expect(adminBody.id).not.toBe(memberBody.id);

    const updated = await patchMe(
      await buildRequest('/me', 'PATCH', { user: harness.member, body: { name: '改名 太郎' } }),
    );
    expect(updated.status).toBe(200);
    expect((await updated.json()).name).toBe('改名 太郎');

    // 本人以外の行は触れていない (workspace-admin の name は変わらない)
    const adminAfter = await getMe(await buildRequest('/me', 'GET', { user: harness.workspaceAdmin }));
    expect((await adminAfter.json()).name).toBe('Workspace Admin');
  });
});

describe('P06 実行結果への引き継ぎ (P04 時点では実行しない。参考リスト)', () => {
  it.todo(
    'UOA-ROUTE-101: 全 it.todo を実テストへ昇格した後、S17/S18/legal の統合 axe を実行する (screens-a11y-contract.test.tsx の it.todo と対応)',
  );
});
