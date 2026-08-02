'use client';

/**
 * S04 リリース履歴 (screen-inventory S04 の閲覧部分)。
 *
 * 昇格・切り戻しの**操作は置かない** (DC-SCOPE-03)。本 feature の責務は閲覧であり、
 * 状態を変える導線を混ぜると「見るつもりで押した」事故が起きる。
 */
import type { ReleaseView } from '@harness-hub/schemas';
import { DataTable, DegradedBanner, ErrorState, StatusChip } from '@harness-hub/ui';
import { useEffect, useState } from 'react';
import type { CatalogFailure, CatalogPort, CatalogScope } from '../../lib/catalog/index.js';
import { catalogCapabilities, httpCatalogPort } from '../../lib/catalog/index.js';

export interface CatalogReleaseHistoryProps {
  scope: CatalogScope;
  projectId: string;
  port?: CatalogPort;
  /** 現在の stable。行に印を付けるために使う。null なら未公開。 */
  stableReleaseId?: string | null | undefined;
}

export function CatalogReleaseHistory({
  scope,
  projectId,
  port = httpCatalogPort,
  stableReleaseId = null,
}: CatalogReleaseHistoryProps) {
  const releaseListKey = `${scope.tenantId}\u0000${scope.workspaceId}\u0000${projectId}`;
  const [releases, setReleases] = useState<readonly ReleaseView[]>([]);
  const [loadedReleaseListKey, setLoadedReleaseListKey] = useState<string>(releaseListKey);
  const [loading, setLoading] = useState<boolean>(true);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const result = await port.listReleases(scope, projectId, controller.signal);
      if (controller.signal.aborted) return;
      if (result.ok) {
        setReleases(result.value.items);
        setLoadedReleaseListKey(releaseListKey);
        setFailure(null);
      } else {
        setFailure(result.failure);
      }
      setLoading(false);
    })();
    return () => controller.abort();
  }, [port, scope, projectId, releaseListKey]);

  const capabilities = failure === null ? null : catalogCapabilities(failure.kind);
  const visibleReleases = loadedReleaseListKey === releaseListKey ? releases : [];

  if (failure !== null && capabilities?.canBrowse === false) {
    return <ErrorState description={failure.message} />;
  }

  return (
    <div>
      {failure !== null && capabilities?.canBrowse === true ? <DegradedBanner description={failure.message} /> : null}

      <DataTable<ReleaseView>
        caption="リリース履歴"
        loading={loading}
        rows={visibleReleases}
        rowKey={(row) => row.id}
        emptyMessage="まだ公開された版はありません。"
        columns={[
          {
            key: 'version',
            header: '版',
            sortable: true,
            value: (row) => row.version,
            render: (row) => (row.id === stableReleaseId ? `${row.version}（現在の版）` : row.version),
          },
          {
            key: 'status',
            header: '状態',
            value: (row) => row.status,
            render: (row) => <StatusChip domain="release" status={row.status} />,
          },
          { key: 'created_at', header: '公開日時', sortable: true, value: (row) => row.created_at },
          // package_hash は同一性の確認に要るが、全長は読みづらいので先頭 12 文字に絞る
          {
            key: 'package_hash',
            header: '内容の指紋',
            value: (row) => row.package_hash,
            render: (row) => <code>{row.package_hash.slice(0, 12)}</code>,
          },
        ]}
      />
    </div>
  );
}
