/** 全 API 契約が共有するプリミティブ schema (テナント境界の ID・ISO 日時・ページング) の単一ソース。 */
import { z } from 'zod';

/**
 * 識別子の共通形。URL path segment にそのまま置ける文字種のみ許可する。
 * 生成方式 (ULID / cuid2 等) は feat-domain-model-db の責務なので、ここでは形だけを縛る。
 */
export const identifierSchema = z
  .string()
  .min(1, '識別子が空です')
  .max(64, '識別子が長すぎます')
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, '識別子に使えない文字が含まれています');

/**
 * テナント ID。D4 (row-level のテナント分離) の起点になるため brand 型にして、
 * 素の string を誤って渡せないようにする。
 */
export const tenantIdSchema = identifierSchema.brand<'TenantId'>();
export type TenantId = z.output<typeof tenantIdSchema>;

/** ワークスペース ID。テナント配下のスコープ単位。 */
export const workspaceIdSchema = identifierSchema.brand<'WorkspaceId'>();
export type WorkspaceId = z.output<typeof workspaceIdSchema>;

/** ユーザー ID。 */
export const userIdSchema = identifierSchema.brand<'UserId'>();
export type UserId = z.output<typeof userIdSchema>;

const ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/;

/**
 * 実在する日時かを検査する。
 * `Date.parse` は 2026-02-30 を 3/2 へ繰り上げて受理してしまうため、
 * 日付要素が往復するかを自前で確かめる。
 */
function isRealIsoDateTime(value: string): boolean {
  const matched = ISO_DATE_TIME_PATTERN.exec(value);
  if (!matched) return false;

  const [, year, month, day, hour, minute, second, , offsetHour, offsetMinute] = matched;
  const [y, mo, d] = [Number(year), Number(month), Number(day)];
  const utc = new Date(Date.UTC(y, mo - 1, d));
  const isRealDate = utc.getUTCFullYear() === y && utc.getUTCMonth() === mo - 1 && utc.getUTCDate() === d;
  const isRealTime = Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59;
  const isRealOffset =
    offsetHour === undefined || (Number(offsetHour) <= 23 && Number(offsetMinute) <= 59);

  return isRealDate && isRealTime && isRealOffset;
}

/**
 * ISO 8601 日時 (UTC の `Z` もオフセット付きも許可)。
 * 形が合っていても実在しない日付 (2026-02-30 等) は落とす。
 */
export const isoDateTimeSchema = z
  .string()
  .regex(ISO_DATE_TIME_PATTERN, 'ISO 8601 形式の日時ではありません')
  .refine(isRealIsoDateTime, '存在しない日時です')
  .brand<'IsoDateTime'>();
export type IsoDateTime = z.output<typeof isoDateTimeSchema>;

/** `Date` を契約で使える ISO 日時文字列へ変換する。サーバ時刻を単一の書式へ寄せるための唯一の入口。 */
export function toIsoDateTime(value: Date): IsoDateTime {
  return isoDateTimeSchema.parse(value.toISOString());
}

/** メールアドレス。 */
export const emailSchema = z.email('メールアドレスの形式ではありません');

/** semver。Release / plugin の版表記に使う。 */
export const semVerSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/,
    'semver 形式ではありません',
  );

/** 表示言語。ja を正本、en は後追い (frontend-spec §1)。 */
export const localeSchema = z.enum(['ja', 'en']);
export type Locale = z.output<typeof localeSchema>;

/**
 * cursor ページングの入力 (backend-spec §3.5)。
 * offset 方式は更新中データで重複・欠落を起こすため採らない。
 */
export const cursorSchema = z.string().min(1).max(512);

export const paginationQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type PaginationQuery = z.output<typeof paginationQuerySchema>;
