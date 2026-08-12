import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../../lib/routing/dashboard-scope.js';
import { LazyFeedbackDetail } from './feedback-detail-lazy.js';

export const metadata: Metadata = {
  title: 'フィードバック詳細 | Harness Hub',
};

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function FeedbackDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query, scope] = await Promise.all([params, searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return <LazyFeedbackDetail id={id} tenantId={tenantId} workspaceId={workspaceId} />;
}
