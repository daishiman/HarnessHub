import { Panel, ScreenHeader } from '@harness-hub/ui';
import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { FeedbackFormLazy } from './feedback-form-lazy.js';

export const metadata: Metadata = {
  title: '改善要望を報告 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function FeedbackNewPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return (
    <>
      <ScreenHeader
        id="feedback-new-heading"
        title="改善要望を報告"
        description="プロジェクト・種別・優先度・内容を入力すると、受付番号を発行して AI 応答の生成を開始します。"
        breadcrumbs={[
          { href: `/feedback?tenant=${tenantId}&workspace=${workspaceId}`, label: '改善要望' },
          { label: '新規報告' },
        ]}
        breadcrumbsLabel="現在地"
      />
      <Panel>
        <FeedbackFormLazy tenantId={tenantId} workspaceId={workspaceId} />
      </Panel>
    </>
  );
}
