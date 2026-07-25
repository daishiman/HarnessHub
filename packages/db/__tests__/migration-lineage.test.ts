// DMDB-T07 / DMDB-T13: 単一 migration lineage の検査。
// T07 は設定と lineage の単一性、T13 (P08 後に有効) は canonical migration と schema harness の同値検証。

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { splitMigrationSql } from '../backup/ddl';
import { schemaDdl } from './support/schema-harness';

const PKG_ROOT = join(import.meta.dirname, '..');
const MIGRATIONS_DIR = join(PKG_ROOT, 'migrations');

interface TableShape {
  readonly columns: string[];
  readonly uniqueIndexes: string[];
}

/** DDL 適用後の実スキーマ形状 (テーブル/列/unique index) を取り出す。 */
function introspect(statements: readonly string[]): Record<string, TableShape> {
  const db = new DatabaseSync(':memory:');
  try {
    for (const s of statements) db.exec(s);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    const shapes: Record<string, TableShape> = {};
    for (const { name } of tables) {
      const columns = (db.prepare(`PRAGMA table_info(${JSON.stringify(name)})`).all() as { name: string }[])
        .map((c) => c.name)
        .sort();
      const uniqueIndexes = (
        db.prepare(`PRAGMA index_list(${JSON.stringify(name)})`).all() as {
          name: string;
          unique: number;
          origin: string;
        }[]
      )
        .filter((i) => i.unique === 1)
        .map((i) =>
          (db.prepare(`PRAGMA index_info(${JSON.stringify(i.name)})`).all() as { name: string }[])
            .map((c) => c.name)
            .join(','),
        )
        .sort();
      shapes[name] = { columns, uniqueIndexes };
    }
    return shapes;
  } finally {
    db.close();
  }
}

describe('DMDB-T07 single migration lineage', () => {
  it('drizzle.config.ts の出力先が ./migrations 単一で、入力が schema barrel である', () => {
    const config = readFileSync(join(PKG_ROOT, 'drizzle.config.ts'), 'utf8');
    expect(config).toContain("dialect: 'sqlite'");
    expect(config).toContain("schema: './schema/index.ts'");
    expect(config).toContain("out: './migrations'");
    // out の指定が複数無いこと (単一系統)
    expect(config.match(/out:/g)).toHaveLength(1);

    const manifest = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
      exports: Record<string, string>;
      files: string[];
    };
    expect(Object.keys(manifest.exports).sort()).toStrictEqual([
      '.',
      './backup',
      './connection',
      './cron/export-daily',
      './cron/verify-audit-chain',
      './registry',
      './repository',
      './schema',
    ]);
    expect(manifest.files).toEqual(expect.arrayContaining(['migrations', 'schema', 'repository', 'backup']));
    expect(manifest.dependencies).toHaveProperty('@libsql/client');
    expect(manifest.dependencies).toHaveProperty('drizzle-orm');
  });

  it('meta/_journal.json が単一 lineage で、.sql ファイル数と一致する (P08 後)', () => {
    if (!existsSync(MIGRATIONS_DIR)) return; // P08 実行前は対象なし
    const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf8')) as {
      dialect: string;
      entries: { idx: number; tag: string }[];
    };
    expect(journal.dialect).toBe('sqlite');
    const sqlFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));
    expect(journal.entries).toHaveLength(sqlFiles.length);
    // idx が 0 から連続する単一系統
    expect(journal.entries.map((e) => e.idx)).toStrictEqual(journal.entries.map((_, i) => i));
  });
});

describe('DMDB-T13 canonical migration と schema harness の同値 (P08 後)', () => {
  it.skipIf(!existsSync(MIGRATIONS_DIR))(
    'migration SQL 適用結果のスキーマ形状が barrel 導出 DDL と一致する',
    async () => {
      const sqlFiles = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      const migrationStatements = sqlFiles.flatMap((f) =>
        splitMigrationSql(readFileSync(join(MIGRATIONS_DIR, f), 'utf8')),
      );
      const fromMigrations = introspect(migrationStatements);
      const fromHarness = introspect(await schemaDdl());
      expect(fromMigrations).toStrictEqual(fromHarness);
      expect(Object.keys(fromMigrations)).toHaveLength(18);
    },
  );
});
