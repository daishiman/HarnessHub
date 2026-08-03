/**
 * feat-user-org-admin のビジネスロジック層。route はこの service だけを呼び、
 * PII マスク・監査・repository 呼び出しの手順をここへ閉じる (with-authz が担う認可判定とは責務分担する)。
 *
 * salary の閲覧/更新には `authz.can('users.read_salary' | 'users.write_salary')` (両方 workspace-admin+)
 * を route 側で先に通す前提。この service は「role が admin 相当かどうか」だけを
 * `EffectiveRole` から再判定し (`toPiiViewer`)、PII マスクの単一実装 (`shared/pii`) に渡す。
 * 認可判定を二重に持つのではなく、PII マスクの入力形 (`PiiViewer`) を組み立てているだけ。
 */
import type { CoreRepositories, HearingIntakeRepository, RepositoryContext, UserRow } from '@harness-hub/db';
import { EntityNotFoundError } from '@harness-hub/db';
import type {
  CreateUserRequest,
  DisplaySettingsResponse,
  MeResponse,
  NotificationSettingsResponse,
  TenantCoefficientsResponse,
  UpdateDisplaySettingsRequest,
  UpdateMeRequest,
  UpdateNotificationSettingsRequest,
  UpdateTenantCoefficientsRequest,
  UpdateUserRequest,
  UserDetail,
  UserListItem,
  UserListResponse,
} from '@harness-hub/schemas';
import { displaySettingsResponseSchema } from '@harness-hub/schemas';
import { atLeast } from '../../lib/authz/index.js';
import type { NotificationDispatcher } from '../../shared/notification/index.js';
import {
  ADMIN_ROLE,
  canView,
  maskPii,
  maskPiiForExport,
  type PiiFieldPolicy,
  type PiiViewer,
} from '../../shared/pii/index.js';
import { notifyCoefficientsChanged, notifyRoleChanged } from './notification.js';

// packages/db の公開面 (`src/index.ts`) は個別 repository の interface (UsersRepo 等) を
// 意図的に公開しない (leaf export 禁止 — composition.ts 冒頭コメント参照)。
// `CoreRepositories` からの添字アクセス型で受け取り、境界を迂回しない。
type UsersRepo = CoreRepositories['users'];
type AuditRepo = CoreRepositories['audit'];
type UserSettingsRepo = CoreRepositories['userSettings'];

/** with-authz の EffectiveRole をここでも import すると authz 層への逆依存になるため、必要な語彙だけ受け取る。 */
export type ViewerRole = 'member' | 'owner' | 'workspace-admin' | 'provider-admin';

/**
 * `user_settings.theme/density/language` は plain text 列 (DB 側で enum 制約を持たない)。
 * schema 側の union で parse し、想定外の値が紛れ込んでいた場合は default に落として route を落とさない
 * (更新経路は本 schema でしか書けないため通常起きないが、直接 SQL 投入等の想定外書込みに対する読取り側の防御)。
 */
function toDisplaySettingsResponse(row: {
  readonly theme: string;
  readonly density: string;
  readonly language: string;
}): DisplaySettingsResponse {
  const parsed = displaySettingsResponseSchema.safeParse(row);
  return parsed.success ? parsed.data : { theme: 'system', density: 'comfortable', language: 'ja' };
}

const SALARY_POLICY: PiiFieldPolicy = { field: 'salary', sensitivity: 'admin_only' };

/** pii-salary-contract.test.ts が固定する変換。role が workspace-admin 以上なら admin viewer 扱い。 */
function toPiiViewer(role: ViewerRole): PiiViewer {
  return { roles: atLeast(role, 'workspace-admin') ? [ADMIN_ROLE] : [] };
}

export interface UserOrgAdminServiceDeps {
  readonly users: UsersRepo;
  readonly userSettings: UserSettingsRepo;
  readonly audit: AuditRepo;
  readonly coefficients: HearingIntakeRepository;
  readonly notifications: NotificationDispatcher;
}

export interface UserOrgAdminService {
  listUsers(context: RepositoryContext, viewerRole: ViewerRole, actorId: string): Promise<UserListResponse>;
  exportUsers(context: RepositoryContext): Promise<readonly UserExportRow[]>;
  getUser(context: RepositoryContext, id: string, viewerRole: ViewerRole, actorId: string): Promise<UserDetail | null>;
  updateUser(context: RepositoryContext, id: string, request: UpdateUserRequest, actorId: string): Promise<UserDetail>;
  getMe(context: RepositoryContext, userId: string): Promise<MeResponse | null>;
  updateMe(context: RepositoryContext, userId: string, request: UpdateMeRequest): Promise<MeResponse>;
  getNotificationSettings(userId: string): Promise<NotificationSettingsResponse>;
  updateNotificationSettings(
    userId: string,
    request: UpdateNotificationSettingsRequest,
  ): Promise<NotificationSettingsResponse>;
  getDisplaySettings(userId: string): Promise<DisplaySettingsResponse>;
  updateDisplaySettings(userId: string, request: UpdateDisplaySettingsRequest): Promise<DisplaySettingsResponse>;
  getCoefficients(context: RepositoryContext): Promise<TenantCoefficientsResponse>;
  updateCoefficients(
    context: RepositoryContext,
    request: UpdateTenantCoefficientsRequest,
    actorId: string,
  ): Promise<TenantCoefficientsResponse>;
}

export interface UserExportRow {
  readonly name: string;
  readonly department: string | null;
  readonly role: string;
  readonly status: string;
  readonly salary: string | null;
}

/**
 * salary をマスク後の表示値へ変換する。
 * - viewer が admin 相当なら復号して数値を返す (呼出し元でまとめて 1 回だけ `user.salary_read` を監査する)。
 * - そうでなければ、ciphertext の有無だけを保った非 null プレースホルダを渡し `maskPii` に `'***'` へ潰させる。
 *   (`maskPii` は null は null のまま通すため、"未設定" と "非表示" を区別できる)
 */
async function resolveSalaryDisplay(
  users: UsersRepo,
  context: RepositoryContext,
  row: UserRow,
  viewer: PiiViewer,
): Promise<number | string | null> {
  if (row.salary === null) return null;
  if (!canView(SALARY_POLICY, viewer)) return 0; // maskPii が非 null を '***' に置き換える。数値そのものに意味は無い。
  return users.decryptSalary(context, row.id);
}

function toListItemBase(row: UserRow, salary: number | string | null): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    role: row.role,
    status: row.status,
    salary,
    last_login_at: row.lastLoginAt,
  };
}

export function createUserOrgAdminService(deps: UserOrgAdminServiceDeps): UserOrgAdminService {
  return {
    async listUsers(context, viewerRole, actorId) {
      const viewer = toPiiViewer(viewerRole);
      const rows = await deps.users.list(context);
      const items = await Promise.all(
        rows.map(async (row) => {
          const salary = await resolveSalaryDisplay(deps.users, context, row, viewer);
          return maskPii(toListItemBase(row, salary), [SALARY_POLICY], viewer) as unknown as UserListItem;
        }),
      );
      if (canView(SALARY_POLICY, viewer) && rows.some((row) => row.salary !== null)) {
        await deps.audit.append(context, {
          actorType: 'user',
          actorId,
          action: 'user.salary_read',
          entityType: 'user',
          entityId: 'list',
          summary: { count: rows.length },
        });
      }
      // repository が cursor pagination を実装していないため (`UsersRepo.list` は limit のみ)、
      // ここで無い cursor をでっち上げず、常に単一ページ (`next_cursor: null`) として返す。
      return { items, next_cursor: null };
    },

    async exportUsers(context) {
      const rows = await deps.users.list(context);
      return rows.map((row) => {
        // ciphertext の有無だけを渡し、salary を復号しない。共通 export guard は viewer を受けず常にマスクする。
        const masked = maskPiiForExport(toListItemBase(row, row.salary), [SALARY_POLICY]);
        return {
          name: String(masked.name),
          department: masked.department === null ? null : String(masked.department),
          role: String(masked.role),
          status: String(masked.status),
          salary: masked.salary === null ? null : String(masked.salary),
        };
      });
    },

    async getUser(context, id, viewerRole, actorId) {
      const row = await deps.users.findById(context, id);
      if (row === null) return null;
      const viewer = toPiiViewer(viewerRole);
      const salary = await resolveSalaryDisplay(deps.users, context, row, viewer);
      if (canView(SALARY_POLICY, viewer) && row.salary !== null) {
        await deps.audit.append(context, {
          actorType: 'user',
          actorId,
          action: 'user.salary_read',
          entityType: 'user',
          entityId: id,
          summary: {},
        });
      }
      return maskPii(
        { ...toListItemBase(row, salary), email: row.email },
        [SALARY_POLICY],
        viewer,
      ) as unknown as UserDetail;
    },

    async updateUser(context, id, request, actorId) {
      const before = await deps.users.findById(context, id);
      if (before === null) throw new EntityNotFoundError('users', id);

      const patch: Parameters<UsersRepo['update']>[2] = {
        ...(request.name !== undefined && { name: request.name }),
        ...(request.department !== undefined && { department: request.department }),
        ...(request.status !== undefined && { status: request.status }),
        ...(request.role !== undefined && { role: request.role }),
      };

      const updated = Object.keys(patch).length > 0 ? await deps.users.update(context, id, patch) : before;

      if (request.role !== undefined && request.role !== before.role) {
        const auditEvent = await deps.audit.append(context, {
          actorType: 'user',
          actorId,
          action: 'user.role_change',
          entityType: 'user',
          entityId: id,
          summary: { from: before.role, to: request.role },
        });
        const settings = await deps.userSettings.getOrDefault(id);
        await notifyRoleChanged(deps.notifications, {
          tenantId: context.tenantId,
          recipientUserId: id,
          emailEnabled: settings.emailEnabled,
          auditEventId: auditEvent.id,
        });
      }

      let finalRow = updated;
      if (request.salary !== undefined) {
        finalRow = await deps.users.updateSalary(context, id, request.salary);
        await deps.audit.append(context, {
          actorType: 'user',
          actorId,
          action: 'user.salary_change',
          entityType: 'user',
          entityId: id,
          // 値そのものは書かない (AuditEventInput の契約: summary に salary の生値を含めない)
          summary: { changed: true },
        });
      }

      // このメソッドを呼べるのは route 側で users.write (workspace-admin+) を通過した者だけなので、
      // 応答は admin viewer として組み立てる (自分がいま書いた salary を確認できないと UX として破綻するため)。
      const adminViewer = toPiiViewer('workspace-admin');
      const salary = await resolveSalaryDisplay(deps.users, context, finalRow, adminViewer);
      return maskPii(
        { ...toListItemBase(finalRow, salary), email: finalRow.email },
        [SALARY_POLICY],
        adminViewer,
      ) as unknown as UserDetail;
    },

    async getMe(context, userId) {
      const row = await deps.users.findById(context, userId);
      if (row === null) return null;
      return { id: row.id, email: row.email, name: row.name, department: row.department, role: row.role };
    },

    async updateMe(context, userId, request) {
      const patch: Parameters<UsersRepo['update']>[2] = {
        ...(request.name !== undefined && { name: request.name }),
      };
      const row =
        Object.keys(patch).length > 0
          ? await deps.users.update(context, userId, patch)
          : await deps.users.findById(context, userId);
      if (row === null) throw new EntityNotFoundError('users', userId);
      return { id: row.id, email: row.email, name: row.name, department: row.department, role: row.role };
    },

    async getNotificationSettings(userId) {
      const row = await deps.userSettings.getOrDefault(userId);
      return {
        notify_generation: row.notifyGeneration,
        notify_review: row.notifyReview,
        notify_weekly: row.notifyWeekly,
        notify_feedback: row.notifyFeedback,
        email_enabled: row.emailEnabled,
      };
    },

    async updateNotificationSettings(userId, request) {
      const patch: Parameters<UserSettingsRepo['update']>[1] = {
        ...(request.notify_generation !== undefined && { notifyGeneration: request.notify_generation }),
        ...(request.notify_review !== undefined && { notifyReview: request.notify_review }),
        ...(request.notify_weekly !== undefined && { notifyWeekly: request.notify_weekly }),
        ...(request.notify_feedback !== undefined && { notifyFeedback: request.notify_feedback }),
        ...(request.email_enabled !== undefined && { emailEnabled: request.email_enabled }),
      };
      const row = await deps.userSettings.update(userId, patch);
      return {
        notify_generation: row.notifyGeneration,
        notify_review: row.notifyReview,
        notify_weekly: row.notifyWeekly,
        notify_feedback: row.notifyFeedback,
        email_enabled: row.emailEnabled,
      };
    },

    async getDisplaySettings(userId) {
      const row = await deps.userSettings.getOrDefault(userId);
      return toDisplaySettingsResponse(row);
    },

    async updateDisplaySettings(userId, request) {
      const patch: Parameters<UserSettingsRepo['update']>[1] = {
        ...(request.theme !== undefined && { theme: request.theme }),
        ...(request.density !== undefined && { density: request.density }),
        ...(request.language !== undefined && { language: request.language }),
      };
      const row = await deps.userSettings.update(userId, patch);
      return toDisplaySettingsResponse(row);
    },

    async getCoefficients(context) {
      const row = await deps.coefficients.getCoefficients(context);
      return {
        annual_hours: row.annualHours,
        minutes_per_run: row.minutesPerRun,
        sheet_reduction_rate: row.sheetReductionRate,
        updated_by: row.updatedBy,
      };
    },

    async updateCoefficients(context, request, actorId) {
      const changedFields = [
        ...(request.annual_hours !== undefined ? ['annualHours'] : []),
        ...(request.minutes_per_run !== undefined ? ['minutesPerRun'] : []),
        ...(request.sheet_reduction_rate !== undefined ? ['sheetReductionRate'] : []),
      ];
      if (changedFields.length === 0) return this.getCoefficients(context);

      const row = await deps.coefficients.updateCoefficients(context, {
        ...(request.annual_hours !== undefined && { annualHours: request.annual_hours }),
        ...(request.minutes_per_run !== undefined && { minutesPerRun: request.minutes_per_run }),
        ...(request.sheet_reduction_rate !== undefined && { sheetReductionRate: request.sheet_reduction_rate }),
      });
      const auditEvent = await deps.audit.append(context, {
        actorType: 'user',
        actorId,
        action: 'coefficient.change',
        entityType: 'tenant_coefficients',
        entityId: context.tenantId,
        // 係数の実値は監査ログにも通知本文にも書かない (SEC6/SEC9)。
        summary: { changedFields },
      });
      const settings = await deps.userSettings.getOrDefault(actorId);
      await notifyCoefficientsChanged(deps.notifications, {
        tenantId: context.tenantId,
        recipientUserId: actorId,
        emailEnabled: settings.emailEnabled,
        auditEventId: auditEvent.id,
      });
      return {
        annual_hours: row.annualHours,
        minutes_per_run: row.minutesPerRun,
        sheet_reduction_rate: row.sheetReductionRate,
        updated_by: row.updatedBy,
      };
    },
  };
}

/** POST /api/v1/users (事前登録) は本 service に実装しない。理由は runtime.ts 冒頭コメント・route 側の 501 応答を参照。 */
export type { CreateUserRequest };
