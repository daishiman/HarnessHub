import type { Metadata } from 'next';
import { FeedbackDetail } from './feedback-detail.js';

export const metadata: Metadata = {
  title: 'フィードバック詳細 | Harness Hub',
};

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function FeedbackDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <FeedbackDetail id={id} tenantId={query.tenant ?? ''} workspaceId={query.workspace ?? ''} />;
}
