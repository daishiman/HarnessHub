'use client';

import type { SessionRole } from '@harness-hub/schemas';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const DocumentList = dynamic(() => import('./document-list.js').then((module) => module.DocumentList), {
  ssr: false,
  loading: () => <p aria-live="polite">ドキュメント一覧を読み込んでいます…</p>,
});

export function DocumentListLazy(props: {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly initialQuery?: string;
  readonly sessionRole?: SessionRole | null;
}): ReactNode {
  return <DocumentList {...props} />;
}
