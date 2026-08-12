import { ActionLink, Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { sessionActionVisible } from '../../../lib/authz/index.js';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { resolveShellIdentity } from '../../../lib/routing/shell-identity.js';
import { DocumentList } from './document-list.js';

export const metadata: Metadata = {
  title: 'ドキュメント一覧 | Harness Hub',
};

interface PageProps {
  /** `q` は共通ヘッダーの検索フォームから届く (§3.0)。 */
  readonly searchParams: Promise<{
    readonly tenant?: string;
    readonly workspace?: string;
    readonly q?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const [query, scope, identity] = await Promise.all([searchParams, resolveDashboardScope(), resolveShellIdentity()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  const initialQuery = query.q?.trim() ?? '';
  const canCreate = sessionActionVisible(identity.role, 'docs.write_tenant');
  return (
    <>
      <ScreenHeader
        id="docs-heading"
        title="ドキュメント"
        description="業務ツールの使い方や運用手順をまとめて共有します。"
        sticky
        actions={
          canCreate ? (
            <ActionLink href={`/docs/new?tenant=${tenantId}&workspace=${workspaceId}`} variant="primary">
              新しく作成
            </ActionLink>
          ) : undefined
        }
      />
      <Panel flush>
        <DocumentList tenantId={tenantId} workspaceId={workspaceId} initialQuery={initialQuery} />
      </Panel>
    </>
  );
}
