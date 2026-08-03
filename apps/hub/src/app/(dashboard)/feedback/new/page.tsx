import type { Metadata } from 'next';
import { FeedbackForm } from './feedback-form.js';

export const metadata: Metadata = {
  title: '改善要望を報告 | Harness Hub',
};

interface PageProps {
  readonly searchParams: Promise<{ readonly tenant?: string; readonly workspace?: string }>;
}

export default async function FeedbackNewPage({ searchParams }: PageProps) {
  const query = await searchParams;
  return (
    <section aria-labelledby="feedback-new-heading">
      <h1 id="feedback-new-heading">改善要望を報告</h1>
      <p>プロジェクト・種別・優先度・内容を入力すると、受付番号を発行して AI 応答の生成を開始します。</p>
      <FeedbackForm tenantId={query.tenant ?? ''} workspaceId={query.workspace ?? ''} />
    </section>
  );
}
