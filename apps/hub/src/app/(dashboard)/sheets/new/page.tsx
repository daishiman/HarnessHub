import { ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { HearingIntakeWizard } from './hearing-intake-wizard.js';

export const metadata: Metadata = {
  title: 'ヒアリングシート作成 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function HearingIntakePage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return (
    <>
      <ScreenHeader
        id="hearing-intake-heading"
        title="業務の困りごとを登録"
        description="4 つのステップで入力すると、受付番号を発行してシート生成を開始します。"
        breadcrumbs={[
          { href: `/sheets?tenant=${tenantId}&workspace=${workspaceId}`, label: 'ヒアリングシート' },
          { label: '新規作成' },
        ]}
        breadcrumbsLabel="現在地"
      />
      <HearingIntakeWizard tenantId={tenantId} workspaceId={workspaceId} />
    </>
  );
}
