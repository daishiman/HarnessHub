'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import type { PublishWizardProps } from './PublishWizard.js';

const PublishWizard = dynamic(() => import('./PublishWizard.js').then((module) => module.PublishWizard), {
  ssr: false,
  loading: () => <p aria-live="polite">公開フォームを読み込んでいます。</p>,
});

export function LazyPublishWizard(props: PublishWizardProps): ReactNode {
  return <PublishWizard {...props} />;
}
