'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const HearingSheetDetail = dynamic(
  () => import('./hearing-sheet-detail.js').then((module) => module.HearingSheetDetail),
  {
    ssr: false,
    loading: () => <p aria-live="polite">シートを読み込み中です。</p>,
  },
);

interface LazyHearingSheetDetailProps {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
}

export function LazyHearingSheetDetail(props: LazyHearingSheetDetailProps): ReactNode {
  return <HearingSheetDetail {...props} />;
}
