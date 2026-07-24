// リポジトリ層が受ける driver 非依存の DB 型。
// libSQL (LibSQLDatabase) と D1 (DrizzleD1Database) は双方 BaseSQLiteDatabase<'async', …> であり、
// この共通型に対して書いたクエリは両 driver で同一に動く (D2 ヘッジの型面)。

import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from '../schema/index';
import type { DatabaseAdapter } from '../src/adapter';

export type CoreSchema = typeof schema;

export type CoreDb = BaseSQLiteDatabase<'async', unknown, CoreSchema>;

export type CoreAdapter = DatabaseAdapter<CoreSchema, CoreDb>;
