// canonical migration と schema/index.ts の allTables が同じテーブル集合を持つことを検査する共有述語。
// migration lineage test と tenant isolation coverage gate が同じ比較実装を使い、片方だけの追随を防ぐ。

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { splitMigrationSql } from '../backup/ddl';

export interface TableRegistryParity {
  readonly missingFromRegistry: readonly string[];
  readonly extraInRegistry: readonly string[];
}

function normalized(names: readonly string[]): string[] {
  return [...new Set(names)].sort();
}

export function compareTableRegistry(
  migrationTableNames: readonly string[],
  registryTableNames: readonly string[],
): TableRegistryParity {
  const migrations = new Set(normalized(migrationTableNames));
  const registry = new Set(normalized(registryTableNames));
  return {
    missingFromRegistry: [...migrations].filter((name) => !registry.has(name)).sort(),
    extraInRegistry: [...registry].filter((name) => !migrations.has(name)).sort(),
  };
}

export function assertTableRegistryParity(
  migrationTableNames: readonly string[],
  registryTableNames: readonly string[],
): void {
  const result = compareTableRegistry(migrationTableNames, registryTableNames);
  if (result.missingFromRegistry.length === 0 && result.extraInRegistry.length === 0) return;
  throw new Error(
    `migration/allTables のテーブル集合が不一致です (` +
      `missingFromRegistry=${result.missingFromRegistry.join(',') || '-'} ` +
      `extraInRegistry=${result.extraInRegistry.join(',') || '-'})`,
  );
}

/** canonical migration SQL を空 SQLite へ適用し、実際に生成されるテーブル名を返す。 */
export function canonicalMigrationTableNames(migrationsDir: string): string[] {
  const db = new DatabaseSync(':memory:');
  try {
    const sqlFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const file of sqlFiles) {
      for (const statement of splitMigrationSql(readFileSync(join(migrationsDir, file), 'utf8'))) {
        db.exec(statement);
      }
    }
    return (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {
        name: string;
      }[]
    )
      .map(({ name }) => name)
      .sort();
  } finally {
    db.close();
  }
}
