import { Alert, Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';

import { sessionActionVisible } from '../../../../lib/authz/index.js';
import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { resolveShellIdentity } from '../../../../lib/routing/shell-identity.js';
import { DocumentCreateForm } from './document-create-form.js';

export const metadata: Metadata = {
  title: 'ドキュメント作成 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function DocumentCreatePage({ searchParams }: PageProps) {
  const [query, scope, identity] = await Promise.all([searchParams, resolveDashboardScope(), resolveShellIdentity()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  const canWriteTenant = sessionActionVisible(identity.role, 'docs.write_tenant');
  const canWriteCommon = sessionActionVisible(identity.role, 'docs.write_common');
  return (
    <>
      <ScreenHeader
        id="docs-new-heading"
        title="ドキュメントを作成"
        description="作成した内容は、選んだスコープの範囲で共有されます。"
        breadcrumbs={[
          { href: `/docs?tenant=${tenantId}&workspace=${workspaceId}`, label: 'ドキュメント' },
          { label: '新規作成' },
        ]}
        breadcrumbsLabel="現在地"
      />
      <Panel>
        {canWriteTenant ? (
          <DocumentCreateForm tenantId={tenantId} workspaceId={workspaceId} canWriteCommon={canWriteCommon} />
        ) : (
          <Alert
            tone="danger"
            title="作成できません"
            description="ドキュメントの作成には管理者 (workspace-admin 以上) の権限が必要です。管理者に権限の付与を依頼してください。"
          />
        )}
      </Panel>
    </>
  );
}
