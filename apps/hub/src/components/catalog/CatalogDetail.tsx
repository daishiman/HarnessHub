'use client';

/**
 * S02 詳細 (概要 / 公開状態 / リリース履歴)。
 *
 * ADR §4.2 の code splitting 境界は**タブ**に置く。
 * 初期表示で必要なのは「概要」だけで、ポーリングを持つ公開状態タブや履歴タブの JS を
 * 最初のバンドルに含めると、閲覧しかしない利用者にまで転送量と実行時間を負担させる (G13)。
 */
import type { CatalogDetail as CatalogDetailView } from '@harness-hub/schemas';
import { DegradedBanner, ErrorState, Skeleton, StatusChip, Tabs } from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { CatalogFailure, CatalogPort, CatalogScope } from '../../lib/catalog/index.js';
import { catalogCapabilities, httpCatalogPort } from '../../lib/catalog/index.js';
import { CatalogInstallPanel } from './CatalogInstallPanel.js';

const CatalogPublishStatus = dynamic(
  async () => (await import('./CatalogPublishStatus.js')).CatalogPublishStatus,
  // タブを開くまで読み込まない。読み込み中も文言を出して高さの跳ねを抑える (CLS)
  { loading: () => <p>公開状態を読み込んでいます。</p> },
);

const CatalogReleaseHistory = dynamic(async () => (await import('./CatalogReleaseHistory.js')).CatalogReleaseHistory, {
  loading: () => <p>リリース履歴を読み込んでいます。</p>,
});

export interface CatalogDetailProps {
  scope: CatalogScope;
  projectId: string;
  port?: CatalogPort;
  /** RSC 側で取得済みなら渡す。初期表示が空にならない。 */
  initialDetail?: CatalogDetailView | undefined;
  /** 公開状態タブの対象。進行中の公開要求が無ければ null でタブを出さない。 */
  publishId?: string | null | undefined;
}

export function CatalogDetail({
  scope,
  projectId,
  port = httpCatalogPort,
  initialDetail,
  publishId = null,
}: CatalogDetailProps) {
  const detailKey = `${scope.tenantId}\u0000${scope.workspaceId}\u0000${projectId}`;
  const [detail, setDetail] = useState<CatalogDetailView | null>(initialDetail ?? null);
  const [loadedDetailKey, setLoadedDetailKey] = useState<string>(detailKey);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await port.getDetail(scope, projectId, controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok) {
        setDetail(result.value);
        setLoadedDetailKey(detailKey);
        setFailure(null);
      } else {
        // 取得済みの detail は消さない (§6.1 縮退)
        setFailure(result.failure);
      }
    })();
    return () => controller.abort();
  }, [port, scope, projectId, detailKey]);

  const capabilities = failure === null ? null : catalogCapabilities(failure.kind);
  const degraded = capabilities?.canBrowse === true;
  const visibleDetail = loadedDetailKey === detailKey ? detail : null;

  // 401/403/契約不正では、initialDetail や以前の成功応答を残さない。
  // 「Hub 障害時の stale 表示」と「現在の利用者に閲覧権限が無い」は別の境界である。
  if (failure !== null && capabilities?.canBrowse === false) {
    return <ErrorState description={failure.message} />;
  }

  if (visibleDetail === null) {
    // Skeleton は aria-hidden の装飾なので、読み込み状態の告知は呼び出し側が持つ
    return (
      <div aria-busy="true">
        <p aria-live="polite">業務ツールの詳細を読み込んでいます。</p>
        <Skeleton lines={4} />
      </div>
    );
  }

  const overview = (
    <div>
      <p>{visibleDetail.summary}</p>
      <dl>
        <dt>種別</dt>
        <dd>{visibleDetail.target === 'skill' ? 'Skill' : 'Web アプリ'}</dd>
        <dt>公開範囲</dt>
        <dd>{visibleDetail.visibility === 'workspace' ? 'Workspace 全体' : '自分のみ'}</dd>
        <dt>現在の版</dt>
        <dd>{visibleDetail.stable_version ?? '未公開'}</dd>
        <dt>状態</dt>
        <dd>
          {visibleDetail.release_status === null ? (
            '未公開'
          ) : (
            <StatusChip domain="release" status={visibleDetail.release_status} />
          )}
        </dd>
        <dt>導入数</dt>
        <dd>{visibleDetail.download_count}</dd>
      </dl>
      <CatalogInstallPanel
        scope={scope}
        projectId={visibleDetail.project_id}
        releaseId={visibleDetail.stable_release_id}
        degraded={degraded}
        port={port}
      />
    </div>
  );

  const items = [
    { id: 'overview', label: '概要', content: overview },
    ...(publishId === null
      ? []
      : [
          {
            id: 'publish',
            label: '公開状態',
            content: <CatalogPublishStatus scope={scope} publishId={publishId} port={port} />,
          },
        ]),
    {
      id: 'releases',
      label: 'リリース履歴',
      content: (
        <CatalogReleaseHistory
          scope={scope}
          projectId={visibleDetail.project_id}
          stableReleaseId={visibleDetail.stable_release_id}
          port={port}
        />
      ),
    },
  ];

  return (
    <article>
      {degraded ? <DegradedBanner description={failure?.message} /> : null}
      <h2>{visibleDetail.name}</h2>
      <Tabs label="業務ツールの詳細" items={items} defaultActiveId="overview" />
    </article>
  );
}
