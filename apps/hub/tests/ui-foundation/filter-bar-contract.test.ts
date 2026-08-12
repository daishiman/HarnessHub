import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const FILTER_BAR_SOURCES = [
  'src/components/catalog/CatalogList.tsx',
  'src/app/(dashboard)/feedback/feedback-list.tsx',
  'src/app/(dashboard)/docs/document-list.tsx',
  'src/app/(dashboard)/sheets/hearing-sheet-list.tsx',
  'src/app/(dashboard)/metrics/metrics-dashboard.tsx',
  'src/app/(dashboard)/metrics/usage/usage-savings-report.tsx',
] as const;

const readSource = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('FILTERBAR: 確定済み条件と sticky 方針', () => {
  it.each(FILTER_BAR_SOURCES)('%s は確定済み条件を FilterBar に渡す', (path) => {
    expect(readSource(path)).toContain('appliedChips=');
  });

  it.each([
    'src/app/(dashboard)/metrics/metrics-dashboard.tsx',
    'src/app/(dashboard)/metrics/usage/usage-savings-report.tsx',
  ])('%s の FilterBar は集計をスクロールしても条件が見える', (path) => {
    const source = readSource(path);
    const filterBar = source.slice(source.indexOf('<FilterBar'), source.indexOf('</FilterBar>'));
    expect(filterBar).toContain('sticky');
  });
});
