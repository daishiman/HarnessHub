import type { Metadata } from 'next';
import { resolveDashboardScope, scopeFromQuery } from '../../../lib/routing/dashboard-scope.js';
import { FeedbackList } from './feedback-list.js';

export const metadata: Metadata = {
  title: '改善要望フィードバック | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function FeedbackPage({ searchParams }: PageProps) {
  const [query, scope] = await Promise.all([searchParams, resolveDashboardScope()]);
  const { tenantId, workspaceId } = scopeFromQuery(query, scope);
  return (
    <section aria-labelledby="feedback-heading">
      <h1 id="feedback-heading">改善要望フィードバック</h1>
      <p>
        <a href={`/feedback/new?tenant=${tenantId}&workspace=${workspaceId}`}>新しく報告</a>
      </p>
      <FeedbackList tenantId={tenantId} workspaceId={workspaceId} />
    </section>
  );
}
