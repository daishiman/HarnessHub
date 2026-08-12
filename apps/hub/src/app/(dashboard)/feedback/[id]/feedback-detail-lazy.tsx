'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const FeedbackDetail = dynamic(() => import('./feedback-detail.js').then((module) => module.FeedbackDetail), {
  ssr: false,
  loading: () => <p aria-live="polite">フィードバックを読み込み中です。</p>,
});

interface LazyFeedbackDetailProps {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
}

export function LazyFeedbackDetail(props: LazyFeedbackDetailProps): ReactNode {
  return <FeedbackDetail {...props} />;
}
