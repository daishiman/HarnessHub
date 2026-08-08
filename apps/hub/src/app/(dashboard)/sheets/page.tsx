import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { HearingSheetList } from './hearing-sheet-list.js';

export const metadata: Metadata = {
  title: 'ヒアリングシート一覧 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function HearingSheetsPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return (
    <section aria-labelledby="hearing-sheets-heading">
      <h1 id="hearing-sheets-heading">ヒアリングシート</h1>
      <p>
        <a href={`/sheets/new?tenant=${tenantId}&workspace=${workspaceId}`}>新しく作成</a>
      </p>
      <HearingSheetList tenantId={tenantId} workspaceId={workspaceId} />
    </section>
  );
}
