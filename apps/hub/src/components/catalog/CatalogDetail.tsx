'use client';

/**
 * S02 詳細 (概要 / 公開状態 / リリース履歴)。
 *
 * ADR §4.2 の code splitting 境界は**タブ**に置く。
 * 初期表示で必要なのは「概要」だけで、ポーリングを持つ公開状態タブや履歴タブの JS を
 * 最初のバンドルに含めると、閲覧しかしない利用者にまで転送量と実行時間を負担させる (G13)。
 */
import type { CatalogDetail as CatalogDetailView } from '@harness-hub/schemas';
import {
  DefinitionList,
  DegradedBanner,
  ErrorState,
  Panel,
  ScreenHeader,
  Skeleton,
  Stack,
  StatusChip,
  Tabs,
  TagRow,
} from '@harness-hub/ui';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { CatalogFailure, CatalogPort, CatalogScope } from '../../lib/catalog/index.js';
import { catalogCapabilities, httpCatalogPort } from '../../lib/catalog/index.js';

/**
 * 導入パネルも初期チャンクから外す (HarnessHub-5vlq)。
 *
 * 概要タブの中にあるので「初期表示に必要」に見えるが、実際に必要になるのは
 * **詳細取得が成功した後**である。成功するまで dynamic component 自体を描画しないため、
 * 失敗・縮退画面しか見ない利用者へ導入パネルを転送しない。成功後には追加読込が発生するため、
 * 体感遅延と First Load JS の削減量は bundle 実測で判定する。
 */
const CatalogInstallPanel = dynamic(async () => (await import('./CatalogInstallPanel.js')).CatalogInstallPanel, {
  // 高さの跳ね (CLS) を抑えるため、読み込み中も同じ位置に文言を残す
  loading: () => <p>導入手段を読み込んでいます。</p>,
});

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
  const listHref = `/catalog?tenant=${encodeURIComponent(scope.tenantId)}&workspace=${encodeURIComponent(scope.workspaceId)}`;

  // 401/403/契約不正では、initialDetail や以前の成功応答を残さない。
  // 「Hub 障害時の stale 表示」と「現在の利用者に閲覧権限が無い」は別の境界である。
  if (failure !== null && capabilities?.canBrowse === false) {
    return (
      <article>
        <ScreenHeader
          title="業務ツール詳細"
          breadcrumbs={[{ href: listHref, label: '業務ツール' }, { label: '詳細' }]}
          breadcrumbsLabel="現在地"
          sticky
        />
        <ErrorState description={failure.message} />
      </article>
    );
  }

  if (visibleDetail === null) {
    // Skeleton は aria-hidden の装飾なので、読み込み状態の告知は呼び出し側が持つ
    return (
      <article>
        <ScreenHeader
          title="業務ツール詳細"
          breadcrumbs={[{ href: listHref, label: '業務ツール' }, { label: '詳細' }]}
          breadcrumbsLabel="現在地"
          sticky
        />
        <div aria-busy="true">
          <p aria-live="polite">業務ツールの詳細を読み込んでいます。</p>
          <Skeleton lines={4} />
        </div>
      </article>
    );
  }

  const overview = (
    <Stack gap={4}>
      <p style={{ margin: 0 }}>{visibleDetail.summary}</p>
      {/* 対象そのものの属性なので、比較のための表ではなく定義リストで並べる (§5-1 の写し方)。
          生の <dl> を画面ごとに書くと余白と折り返しがばらつくため共通部品に寄せる */}
      <DefinitionList
        label="このツールの基本情報"
        columns={2}
        items={[
          { term: '種別', description: visibleDetail.target === 'skill' ? 'ハーネス' : 'Web アプリ' },
          {
            term: '公開範囲',
            description: visibleDetail.visibility === 'workspace' ? 'Workspace 全体' : '自分のみ',
          },
          { term: '最新の版', description: visibleDetail.stable_version ?? 'まだ公開されていません' },
          { term: '導入された数', description: `${visibleDetail.download_count} 件` },
        ]}
      />
      <CatalogInstallPanel
        scope={scope}
        projectId={visibleDetail.project_id}
        releaseId={visibleDetail.stable_release_id}
        degraded={degraded}
        port={port}
      />
    </Stack>
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
      {/* 公開状態は本文をスクロールしても見えている必要があるため、
          裸の <p> ではなく sticky な画面見出しの中に置く */}
      <ScreenHeader
        title={visibleDetail.name}
        description={visibleDetail.summary}
        breadcrumbs={[{ href: listHref, label: '業務ツール' }, { label: visibleDetail.name }]}
        breadcrumbsLabel="現在地"
        sticky
        tags={
          <TagRow label="公開の状態">
            {visibleDetail.release_status === null ? (
              <span>まだ公開されていません</span>
            ) : (
              <StatusChip domain="release" status={visibleDetail.release_status} />
            )}
          </TagRow>
        }
      />
      <Stack gap={4}>
        {degraded ? <DegradedBanner description={failure?.message} /> : null}
        <Panel flush>
          <Tabs label="業務ツールの詳細" items={items} defaultActiveId="overview" />
        </Panel>
      </Stack>
    </article>
  );
}
