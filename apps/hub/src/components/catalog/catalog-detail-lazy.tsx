'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

import type { CatalogScope } from '../../lib/catalog/index.js';

const CatalogDetail = dynamic(() => import('./CatalogDetail.js').then((module) => module.CatalogDetail), {
  ssr: false,
  loading: () => <p aria-live="polite">業務ツールの詳細を読み込んでいます。</p>,
});

interface LazyCatalogDetailProps {
  readonly scope: CatalogScope;
  readonly projectId: string;
  readonly publishId: string | null;
}

export function LazyCatalogDetail(props: LazyCatalogDetailProps): ReactNode {
  return <CatalogDetail {...props} />;
}
