'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const HearingIntakeWizard = dynamic(
  () => import('./hearing-intake-wizard.js').then((module) => module.HearingIntakeWizard),
  {
    ssr: false,
    loading: () => <p aria-live="polite">入力フォームを読み込んでいます。</p>,
  },
);

interface LazyHearingIntakeWizardProps {
  readonly tenantId: string;
  readonly workspaceId: string;
}

export function LazyHearingIntakeWizard(props: LazyHearingIntakeWizardProps): ReactNode {
  return <HearingIntakeWizard {...props} />;
}
