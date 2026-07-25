// restore ライブラリ (qa-019: 復元できないバックアップを成功と数えない / ADR §9)。
// 検証順序: header 検証 → (呼出し側で) 空 DB へ schema 適用 → 全行 insert → 行数一致 →
// audit chain 検証 → salary/secret 断面検査。いずれか失敗で ok=false (fail-closed)。

import { ENCRYPTED_COLUMN_PATTERN } from '../repository/crypto';
import type { CoreAdapter } from '../repository/db';
import { type ExportHeader, parseExportArtifact, resolveTable } from './export';
import { verifyAuditChain } from './verify';

export interface RestoreReport {
  readonly ok: boolean;
  readonly header: ExportHeader | null;
  readonly restoredCounts: Readonly<Record<string, number>>;
  readonly chainOk: boolean;
  readonly errors: readonly string[];
}

const INSERT_CHUNK = 50;

/**
 * artifact を target (スキーマ適用済みの空 DB) へ復元し、整合検査まで行う。
 * schema の適用は呼出し側の責務 (P06 は schema harness、P08 以降は canonical migration)。
 */
export async function restoreControlPlane(target: CoreAdapter, artifact: string): Promise<RestoreReport> {
  const errors: string[] = [];
  let header: ExportHeader | null = null;
  const restoredCounts: Record<string, number> = {};
  let chainOk = false;

  try {
    const parsed = parseExportArtifact(artifact);
    header = parsed.header;

    // 全行 insert (テーブル名順。FK 制約は貼らない設計のため順序依存はない)
    for (const [tableName, rows] of [...parsed.rowsByTable.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      const table = resolveTable(tableName);
      for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
        const chunk = rows.slice(i, i + INSERT_CHUNK);
        await target.client.insert(table).values(chunk);
      }
      restoredCounts[tableName] = rows.length;
    }

    // 行数一致 (header の table_counts と DB 実測の双方)
    for (const [tableName, expected] of Object.entries(header.tables)) {
      const actualRows = (await target.client.select().from(resolveTable(tableName))) as unknown[];
      if (actualRows.length !== expected) {
        errors.push(`行数不一致: ${tableName} expected=${expected} actual=${actualRows.length}`);
      }
    }

    // audit chain 全体検証
    const chainResults = await verifyAuditChain(target);
    const chainErrors = chainResults.filter((r) => !r.ok);
    chainOk = chainErrors.length === 0;
    for (const r of chainErrors) {
      errors.push(`audit chain 検証失敗 (tenant=${r.tenantId}): ${r.errors.join(' / ')}`);
    }

    // salary / client_secret_enc 断面検査: 暗号文形式のままであること (平文が断面に無い)
    const userRows = parsed.rowsByTable.get('users') ?? [];
    for (const row of userRows) {
      const salary = row.salary;
      if (salary !== null && salary !== undefined && !ENCRYPTED_COLUMN_PATTERN.test(String(salary))) {
        errors.push(`users.salary が暗号文形式ではありません (id=${String(row.id)})`);
      }
    }
    const idpRows = parsed.rowsByTable.get('idp_connections') ?? [];
    for (const row of idpRows) {
      if (!ENCRYPTED_COLUMN_PATTERN.test(String(row.clientSecretEnc))) {
        errors.push(`idp_connections.client_secret_enc が暗号文形式ではありません (id=${String(row.id)})`);
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return { ok: errors.length === 0, header, restoredCounts, chainOk, errors };
}
