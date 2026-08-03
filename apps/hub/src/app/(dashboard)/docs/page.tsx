import type { Metadata } from 'next';

import { DocumentList } from './document-list.js';

export const metadata: Metadata = {
  title: 'ドキュメント一覧 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return (
    <section aria-labelledby="docs-heading">
      <h1 id="docs-heading">ドキュメント</h1>
      <p>
        <a href={`/docs/new?tenant=${query.tenant ?? ''}&workspace=${query.workspace ?? ''}`}>新しく作成</a>
      </p>
      <DocumentList tenantId={query.tenant ?? ''} workspaceId={query.workspace ?? ''} />
    </section>
  );
}
