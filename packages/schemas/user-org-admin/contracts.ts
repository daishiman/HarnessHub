/**
 * feat-user-org-admin の wire 契約 (AD-3)。
 *
 * salary は応答 DTO に残す (AD-5: フィールド自体を消す独自分岐は作らない)。
 * 非 admin viewer への `'***'` 置換は `apps/hub/src/shared/pii` の `maskPii` がレスポンス組立て時に行う。
 * ここでは「数値 or マスク文字列 or 未設定」という wire 形だけを定義する。
 */
import { z } from 'zod';
// role/status の wire schema は feat-auth-tenancy が既に単一ソースとして持ち、root export (@harness-hub/schemas)
// から `sessionRoleSchema`/`SessionRole`・`userStatusSchema`/`UserStatus` として参照できる。
// 値域が完全一致するため重複定義せずそのまま使う (再輸出もしない。export * の名前衝突を避けるため consumer は auth-tenancy 側の名前で参照する)。
import { sessionRoleSchema, userStatusSchema } from '../auth-tenancy/primitives.js';
import { paginatedSchema } from '../src/envelope.js';
import { identifierSchema, listSearchTermSchema, localeSchema, paginationQuerySchema } from '../src/primitives.js';

const SALARY_MASK = '***';
const userRoleSchema = sessionRoleSchema;

/** maskPii 適用後の salary。数値 (admin 閲覧時) か `'***'` (マスク時) か null (未設定)。 */
export const salaryDisplaySchema = z.union([z.number().int().nonnegative(), z.literal(SALARY_MASK)]).nullable();
export type SalaryDisplay = z.output<typeof salaryDisplaySchema>;

const shortText = z.string().trim().min(1).max(200);

export const userListItemSchema = z
  .object({
    id: identifierSchema,
    name: shortText,
    department: z.string().max(200).nullable(),
    role: userRoleSchema,
    status: userStatusSchema,
    salary: salaryDisplaySchema,
    last_login_at: z.number().int().nonnegative().nullable(),
  })
  .strict();
export type UserListItem = z.output<typeof userListItemSchema>;

/** GET /api/v1/users */
export const userListQuerySchema = paginationQuerySchema.extend({
  /**
   * 検索対象は **氏名 (name) と部署 (department)**。email は含めない。
   *
   * email を外すのは、AD-3 で email を一覧 DTO (`userListItemSchema`) から意図的に
   * 落としているため。一覧に出していない値で行が当たると、閲覧者からは「なぜこの人が
   * 出たのか」が読み取れない結果になる (email は個別ダッシュボード側の情報)。
   *
   * salary も同じ理由に加えて、maskPii でマスクされうる値なので検索対象にしない。
   * マスクされた値で絞り込めてしまうと、マスクが表示だけの化粧になる。
   */
  q: listSearchTermSchema.optional(),
});
export type UserListQuery = z.output<typeof userListQuerySchema>;

export const userListResponseSchema = paginatedSchema(userListItemSchema);
export type UserListResponse = z.output<typeof userListResponseSchema>;

/** GET /api/v1/users/:id (個別ダッシュボード)。一覧項目に email を足すのみ (AD-3)。 */
export const userDetailSchema = userListItemSchema.extend({ email: z.email() }).strict();
export type UserDetail = z.output<typeof userDetailSchema>;

/** POST /api/v1/users (事前登録)。salary は平文で受け取り、保存前に暗号化される (UsersRepo の責務)。 */
export const createUserRequestSchema = z
  .object({
    email: z.email(),
    name: shortText,
    department: z.string().max(200).optional(),
    salary: z.number().int().min(0).max(100_000_000).optional(),
    role: userRoleSchema,
    status: userStatusSchema,
  })
  .strict();
export type CreateUserRequest = z.output<typeof createUserRequestSchema>;

export const createUserResponseSchema = userDetailSchema;
export type CreateUserResponse = z.output<typeof createUserResponseSchema>;

/**
 * PATCH /api/v1/users/:id。
 * role の変更は `users.role_change` を、salary の変更は `users.write_salary` を追加で要求する (AD-5/AD-3)。
 * 両方を同一 route に置くのは AD-3 の表どおり。認可判定は request の内容 (どのフィールドが含まれるか) で分岐する。
 */
export const updateUserRequestSchema = z
  .object({
    name: shortText.optional(),
    department: z.string().max(200).nullable().optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
    salary: z.number().int().min(0).max(100_000_000).nullable().optional(),
  })
  .strict();
export type UpdateUserRequest = z.output<typeof updateUserRequestSchema>;

export const updateUserResponseSchema = userDetailSchema;
export type UpdateUserResponse = z.output<typeof updateUserResponseSchema>;

/** GET/PATCH /api/v1/me (session 本人限定)。role/salary は含めない (自己編集不可な項目)。 */
export const meResponseSchema = z
  .object({
    id: identifierSchema,
    email: z.email(),
    name: shortText,
    department: z.string().max(200).nullable(),
    role: userRoleSchema,
  })
  .strict();
export type MeResponse = z.output<typeof meResponseSchema>;

export const updateMeRequestSchema = z
  .object({
    name: shortText.optional(),
  })
  .strict();
export type UpdateMeRequest = z.output<typeof updateMeRequestSchema>;

/**
 * `packages/db/schema/core/identity.ts` の `user_settings` 列をそのまま wire 形にする
 * (AD-7 §3: 通知種別ごとの on/off + email チャンネルの有効化)。
 * 当初 channels 配列で汎用化していたが、実テーブルは種別別トグルなので実列に合わせて訂正した。
 */
export const notificationSettingsResponseSchema = z
  .object({
    notify_generation: z.boolean(),
    notify_review: z.boolean(),
    notify_weekly: z.boolean(),
    notify_feedback: z.boolean(),
    email_enabled: z.boolean(),
  })
  .strict();
export type NotificationSettingsResponse = z.output<typeof notificationSettingsResponseSchema>;

export const updateNotificationSettingsRequestSchema = z
  .object({
    notify_generation: z.boolean().optional(),
    notify_review: z.boolean().optional(),
    notify_weekly: z.boolean().optional(),
    notify_feedback: z.boolean().optional(),
    email_enabled: z.boolean().optional(),
  })
  .strict();
export type UpdateNotificationSettingsRequest = z.output<typeof updateNotificationSettingsRequestSchema>;

/**
 * GET/PATCH /api/v1/me/display-settings (AD-2 §S18: 表示設定 theme/density/language)。
 * `packages/db/schema/core/identity.ts` の `user_settings.theme/density/language` 列は既に存在するが、
 * これまで契約層 (本ファイル) と service 層は通知トグルしか公開していなかった。AD-2 の S18 記載内容
 * (プロフィール・通知設定・表示設定) に合わせ、通知設定とは別 endpoint として追加する
 * (同じテーブルの1行でも「通知」と「表示」は利用者から見た関心が別なので契約も分ける)。
 * language は API 契約側の共通 locale token (`localeSchema`) をそのまま使う。UI 部品側の `UiLocale` とは
 * 名前を分けて所有境界を保つ設計 (`packages/ui/src/i18n/dictionaries.ts` のコメント参照)。
 */
export const themePreferenceSchema = z.enum(['light', 'dark', 'system']);
export type ThemePreference = z.output<typeof themePreferenceSchema>;

export const densityPreferenceSchema = z.enum(['comfortable', 'compact']);
export type DensityPreference = z.output<typeof densityPreferenceSchema>;

/**
 * 配色 (palette) は明るさ (theme) と直交する別軸。`@harness-hub/ui` の `paletteNames` が
 * 見た目側の正本だが、契約層から UI 部品へ依存させない (依存の向きは ui → schemas)。
 * 値は同じ集合に保ち、ずれは `packages/ui` 側のテストと本 enum の突き合わせで守る。
 */
export const palettePreferenceSchema = z.enum(['gray', 'blue', 'beige', 'green', 'navy']);
export type PalettePreference = z.output<typeof palettePreferenceSchema>;

/**
 * `theme` が `system` のとき、その端末で実際に表示された明るさ。
 * 「自動を選んだ人が実際は何を見ているか」は自動のままでは分からないので、保存時に確定値を控える。
 */
export const resolvedThemeSchema = z.enum(['light', 'dark']);
export type ResolvedTheme = z.output<typeof resolvedThemeSchema>;

export const displaySettingsResponseSchema = z
  .object({
    theme: themePreferenceSchema,
    density: densityPreferenceSchema,
    language: localeSchema,
    palette: palettePreferenceSchema,
    resolved_theme: resolvedThemeSchema,
  })
  .strict();
export type DisplaySettingsResponse = z.output<typeof displaySettingsResponseSchema>;

export const updateDisplaySettingsRequestSchema = z
  .object({
    theme: themePreferenceSchema.optional(),
    density: densityPreferenceSchema.optional(),
    language: localeSchema.optional(),
    palette: palettePreferenceSchema.optional(),
    resolved_theme: resolvedThemeSchema.optional(),
  })
  .strict();
export type UpdateDisplaySettingsRequest = z.output<typeof updateDisplaySettingsRequestSchema>;

/**
 * GET /api/v1/admin/appearance-usage — 配色の採用状況 (provider-admin 限定)。
 *
 * 数えるのは「押した回数」ではなく利用者ごとの現在設定 1 行なので、1 人 = 1 票になる。
 * 構成比の分母は `measured_users` (外観を保存した人) で、全利用者ではない —
 * 未保存の人は既定の配色で表示されているだけで、選んだ結果ではないため。
 * 個人を特定できる値は含めない (人数と比率だけ)。
 */
const usageShareSchema = { users: z.number().int().nonnegative(), share: z.number().min(0).max(1) };

export const appearanceUsageResponseSchema = z
  .object({
    total_users: z.number().int().nonnegative(),
    measured_users: z.number().int().nonnegative(),
    measurement_rate: z.number().min(0).max(1),
    by_palette: z.array(z.object({ palette: palettePreferenceSchema, ...usageShareSchema }).strict()),
    by_palette_theme: z.array(
      z.object({ palette: palettePreferenceSchema, theme: themePreferenceSchema, ...usageShareSchema }).strict(),
    ),
    by_resolved_theme: z.array(z.object({ resolved_theme: resolvedThemeSchema, ...usageShareSchema }).strict()),
  })
  .strict();
export type AppearanceUsageResponse = z.output<typeof appearanceUsageResponseSchema>;

/**
 * GET/PATCH /api/v1/tenant/coefficients (AD-4)。
 * `HearingIntakeRepository.getCoefficients()` の返り値 (tenantId を除く) と同形。
 */
export const tenantCoefficientsResponseSchema = z
  .object({
    annual_hours: z.number().int().positive(),
    minutes_per_run: z.number().int().positive(),
    sheet_reduction_rate: z.number().min(0).max(1),
    updated_by: shortText,
    /** 解決できた場合だけ返す人が読める表示名。既存応答との互換のため optional。 */
    updated_by_name: shortText.optional(),
  })
  .strict();
export type TenantCoefficientsResponse = z.output<typeof tenantCoefficientsResponseSchema>;

/** 部分更新。書込みは tenant_coefficients owner の `HearingIntakeRepository.updateCoefficients()` を経由する (AD-4)。 */
export const updateTenantCoefficientsRequestSchema = z
  .object({
    annual_hours: z.number().int().positive().optional(),
    minutes_per_run: z.number().int().positive().optional(),
    sheet_reduction_rate: z.number().min(0).max(1).optional(),
  })
  .strict();
export type UpdateTenantCoefficientsRequest = z.output<typeof updateTenantCoefficientsRequestSchema>;
