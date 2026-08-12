'use client';

import type { PublishTarget } from '@harness-hub/schemas';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import type { CatalogPort, CatalogScope } from '../../lib/catalog/index.js';

const CatalogList = dynamic(() => import('./CatalogList.js').then((module) => module.CatalogList), {
  ssr: false,
  loading: () => <p aria-live="polite">業務ツール一覧を読み込んでいます…</p>,
});

export function CatalogListLazy(props: {
  readonly scope: CatalogScope;
  readonly port?: CatalogPort;
  readonly initialTarget?: PublishTarget | undefined;
  readonly initialQuery?: string | undefined;
}): ReactNode {
  return <CatalogList {...props} />;
}
