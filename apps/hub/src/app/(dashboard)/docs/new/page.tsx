import type { Metadata } from 'next';

import { DocumentCreateForm } from './document-create-form.js';

export const metadata: Metadata = {
  title: 'ドキュメント作成 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function DocumentCreatePage({ searchParams }: PageProps) {
  const query = await searchParams;
  return (
    <section aria-labelledby="docs-new-heading">
      <h1 id="docs-new-heading">ドキュメントを作成</h1>
      <DocumentCreateForm tenantId={query.tenant ?? ''} workspaceId={query.workspace ?? ''} />
    </section>
  );
}
