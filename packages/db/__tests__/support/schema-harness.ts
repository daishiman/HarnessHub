// schema test harness (P06 契約): schema barrel から DDL を実行時導出する。
// P08 の canonical migration artifact を前提にしない (Normative closure)。
// P08 完了後は migration-lineage.test.ts (DMDB-T13) が canonical migration との同値を検証する。

import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import * as schema from '../../schema/index';

let cached: string[] | null = null;

/** barrel を唯一の入力として CREATE TABLE / CREATE INDEX 文を導出する。 */
export async function schemaDdl(): Promise<string[]> {
  if (cached === null) {
    const empty = await generateSQLiteDrizzleJson({});
    const current = await generateSQLiteDrizzleJson(schema as Record<string, unknown>);
    cached = await generateSQLiteMigration(empty, current);
  }
  return cached;
}
