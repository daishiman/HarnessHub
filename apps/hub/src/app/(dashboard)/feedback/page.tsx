import type { Metadata } from 'next';
import { FeedbackList } from './feedback-list.js';

export const metadata: Metadata = {
  title: '改善要望フィードバック | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function FeedbackPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return (
    <section aria-labelledby="feedback-heading">
      <h1 id="feedback-heading">改善要望フィードバック</h1>
      <p>
        <a href={`/feedback/new?tenant=${query.tenant ?? ''}&workspace=${query.workspace ?? ''}`}>新しく報告</a>
      </p>
      <FeedbackList tenantId={query.tenant ?? ''} workspaceId={query.workspace ?? ''} />
    </section>
  );
}
