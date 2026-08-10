import { Panel, ScreenHeader } from '@harness-hub/ui';
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
    <>
      <ScreenHeader
        id="docs-new-heading"
        title="ドキュメントを作成"
        breadcrumbs={[
          { href: `/docs?tenant=${tenantId}&workspace=${workspaceId}`, label: 'ドキュメント' },
          { label: '新規作成' },
        ]}
        breadcrumbsLabel="現在地"
      />
      <Panel>
        <DocumentCreateForm tenantId={tenantId} workspaceId={workspaceId} />
      </Panel>
    </>
  );
}
