'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

const DocumentEditPage = dynamic(() => import('./document-edit-page.js'), {
  ssr: false,
  loading: () => <p aria-live="polite">ドキュメント編集画面を読み込み中です。</p>,
});

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

/** Markdown編集機能を初期shellから分離し、画面遷移に必要なJSを予算内へ保つ。 */
export default function LazyDocumentEditPage(props: PageProps): ReactNode {
  return <DocumentEditPage {...props} />;
}
