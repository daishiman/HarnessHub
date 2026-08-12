'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import type { CatalogScope } from '../../lib/catalog/index.js';

const CatalogReleaseHistory = dynamic(
  () => import('./CatalogReleaseHistory.js').then((module) => module.CatalogReleaseHistory),
  {
    ssr: false,
    loading: () => <p aria-live="polite">公開履歴を読み込んでいます。</p>,
  },
);

interface LazyCatalogReleaseHistoryProps {
  readonly scope: CatalogScope;
  readonly projectId: string;
}

export function LazyCatalogReleaseHistory(props: LazyCatalogReleaseHistoryProps): ReactNode {
  return <CatalogReleaseHistory {...props} />;
}
