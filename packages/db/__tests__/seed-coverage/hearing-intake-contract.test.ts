import { hearingSheetEstimateSchema, hearingSheetFormSnapshotSchema } from '@harness-hub/schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { TursoAdapter } from '../../connection/turso';
import { hearingSheets } from '../../schema/hearing-intake/schema';
import { seedDemoCoverage } from '../../scripts/demo-coverage/seed';
import { asCore, createLibsqlTestDb } from '../support/test-db';

let adapter: TursoAdapter;

beforeEach(async () => {
  adapter = await createLibsqlTestDb();
});

afterEach(() => {
  adapter.close();
});

describe('demo coverage hearing intake storage contract', () => {
  it('stores every hearing sheet in the current Hub read schema', async () => {
    const summary = await seedDemoCoverage({ adapter: asCore(adapter) });
    const rows = await adapter.client
      .select({
        id: hearingSheets.id,
        title: hearingSheets.title,
        formJson: hearingSheets.formJson,
        estimateJson: hearingSheets.estimateJson,
      })
      .from(hearingSheets);

    const hearingSheetCount = summary.counts.hearing_sheets;
    if (hearingSheetCount === undefined) {
      throw new Error('SeedSummary に hearing_sheets 件数がありません');
    }
    expect(rows).toHaveLength(hearingSheetCount);

    const violations: string[] = [];
    for (const row of rows) {
      try {
        const parsed = hearingSheetFormSnapshotSchema.safeParse(JSON.parse(row.formJson) as unknown);
        if (!parsed.success) {
          violations.push(`${row.id}: form`);
        } else if (parsed.data.taskName !== row.title) {
          violations.push(`${row.id}: form.taskName`);
        }
      } catch {
        violations.push(`${row.id}: form-json`);
      }

      try {
        if (!hearingSheetEstimateSchema.safeParse(JSON.parse(row.estimateJson) as unknown).success) {
          violations.push(`${row.id}: estimate`);
        }
      } catch {
        violations.push(`${row.id}: estimate-json`);
      }
    }

    expect(violations).toEqual([]);
  });
});
