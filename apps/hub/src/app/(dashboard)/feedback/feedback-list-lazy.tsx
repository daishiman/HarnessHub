'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const FeedbackList = dynamic(() => import('./feedback-list.js').then((module) => module.FeedbackList), {
  ssr: false,
  loading: () => <p aria-live="polite">フィードバック一覧を読み込んでいます…</p>,
});

export function FeedbackListLazy(props: {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly initialQuery?: string;
}): ReactNode {
  return <FeedbackList {...props} />;
}
