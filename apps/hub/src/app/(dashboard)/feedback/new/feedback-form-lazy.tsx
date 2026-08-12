'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const FeedbackForm = dynamic(() => import('./feedback-form.js').then((module) => module.FeedbackForm), {
  ssr: false,
  loading: () => <p aria-live="polite">改善要望フォームを読み込んでいます…</p>,
});

export function FeedbackFormLazy(props: { readonly tenantId: string; readonly workspaceId: string }): ReactNode {
  return <FeedbackForm {...props} />;
}
