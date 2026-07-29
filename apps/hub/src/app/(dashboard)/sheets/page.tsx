import type { Metadata } from 'next';
import { HearingSheetList } from './hearing-sheet-list.js';

export const metadata: Metadata = {
  title: 'ヒアリングシート一覧 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function HearingSheetsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return (
    <section aria-labelledby="hearing-sheets-heading">
      <h1 id="hearing-sheets-heading">ヒアリングシート</h1>
      <p>
        <a href={`/sheets/new?tenant=${query.tenant ?? ''}&workspace=${query.workspace ?? ''}`}>新しく作成</a>
      </p>
      <HearingSheetList tenantId={query.tenant ?? ''} workspaceId={query.workspace ?? ''} />
    </section>
  );
}
