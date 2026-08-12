'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const HearingSheetList = dynamic(() => import('./hearing-sheet-list.js').then((module) => module.HearingSheetList), {
  ssr: false,
  loading: () => <p aria-live="polite">ヒアリングシート一覧を読み込んでいます…</p>,
});

export function HearingSheetListLazy(props: {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly initialQuery?: string;
}): ReactNode {
  return <HearingSheetList {...props} />;
}
