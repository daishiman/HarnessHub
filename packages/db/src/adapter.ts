// D2 ヘッジ (Turso→D1 退避) をアプリ層へ波及させないための adapter 境界。型と driver 判定のみを持つ。

import type { DrizzleSchema } from './drizzle';
import { DriverNotSupportedError } from './errors';

/** 対応 driver。Turso (libSQL) を既定とし、D1 を退避先として同じ境界の裏に置く。 */
export const DATABASE_DRIVERS = ['turso', 'd1'] as const;

export type DatabaseDriver = (typeof DATABASE_DRIVERS)[number];

export function isDatabaseDriver(value: unknown): value is DatabaseDriver {
  return typeof value === 'string' && (DATABASE_DRIVERS as readonly string[]).includes(value);
}

/**
 * driver が対応集合に含まれることを保証する。
 * 退避先を増減させたときに、未対応の組合せを実行時の最初期で落とすための境界。
 */
export function assertSupportedDriver(
  value: unknown,
  supported: readonly DatabaseDriver[] = DATABASE_DRIVERS,
): DatabaseDriver {
  if (!isDatabaseDriver(value) || !supported.includes(value)) {
    throw new DriverNotSupportedError(String(value), supported);
  }
  return value;
}

/**
 * DB 接続の抽象。**実接続の生成はこの package の外** (apps/hub 側の合成) で行い、
 * アプリ層は driver 差 (Turso / D1) をこの型の裏に隠したまま扱う。
 */
export interface DatabaseAdapter<TSchema extends DrizzleSchema = DrizzleSchema, TClient = unknown> {
  readonly driver: DatabaseDriver;
  /** feat-domain-model-db が定義するスキーマ束。この package は中身を知らない。 */
  readonly schema: TSchema;
  /** drizzle のクライアント実体。型引数として受け取るだけで、生成も破棄もしない。 */
  readonly client: TClient;
}

/**
 * トランザクション境界。D1 と Turso で保証範囲が異なるため、
 * 「トランザクションを張れる adapter」を別の型として明示し、必要な箇所だけが要求できるようにする。
 */
export interface TransactionalAdapter<TSchema extends DrizzleSchema = DrizzleSchema, TClient = unknown>
  extends DatabaseAdapter<TSchema, TClient> {
  transaction<TResult>(run: (tx: DatabaseAdapter<TSchema, TClient>) => Promise<TResult>): Promise<TResult>;
}

/** adapter がトランザクションに対応しているかの型ガード。 */
export function isTransactionalAdapter<TSchema extends DrizzleSchema, TClient>(
  adapter: DatabaseAdapter<TSchema, TClient>,
): adapter is TransactionalAdapter<TSchema, TClient> {
  return typeof (adapter as TransactionalAdapter<TSchema, TClient>).transaction === 'function';
}
