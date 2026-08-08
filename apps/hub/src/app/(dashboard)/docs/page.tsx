import type { Metadata } from 'next';

import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { DocumentList } from './document-list.js';

export const metadata: Metadata = {
  title: 'ドキュメント一覧 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return (
    <section aria-labelledby="docs-heading">
      <h1 id="docs-heading">ドキュメント</h1>
      <p>
        <a href={`/docs/new?tenant=${tenantId}&workspace=${workspaceId}`}>新しく作成</a>
      </p>
      <DocumentList tenantId={tenantId} workspaceId={workspaceId} />
    </section>
  );
}
