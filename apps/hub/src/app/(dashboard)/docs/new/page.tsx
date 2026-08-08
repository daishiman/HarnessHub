import type { Metadata } from 'next';

import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { DocumentCreateForm } from './document-create-form.js';

export const metadata: Metadata = {
  title: 'ドキュメント作成 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function DocumentCreatePage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return (
    <section aria-labelledby="docs-new-heading">
      <h1 id="docs-new-heading">ドキュメントを作成</h1>
      <DocumentCreateForm tenantId={tenantId} workspaceId={workspaceId} />
    </section>
  );
}
