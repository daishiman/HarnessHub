import type { Metadata } from 'next';
import { HearingSheetDetail } from './hearing-sheet-detail.js';

export const metadata: Metadata = {
  title: 'ヒアリングシート詳細 | Harness Hub',
};

interface PageProps {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function HearingSheetDetailPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return (
    <>
      <style>{'@media print { [data-print-exclude] { display: none !important; } }'}</style>
      <HearingSheetDetail id={id} tenantId={query.tenant ?? ''} workspaceId={query.workspace ?? ''} />
    </>
  );
}
