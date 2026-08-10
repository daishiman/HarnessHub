'use client';

/**
 * S13 パイプラインボードのデータ取得と工程操作 (SYS-BUILD-PIPELINE-BOARD-P05 / docs/frontend-spec.md S13)。
 *
 * ボードの見た目・キーボード操作・DnD 不採用の判断は共有部品 `StageBoard` (@harness-hub/ui) が持つ。
 * ここは **消費側** に徹する (qa-021/qa-022) — 独自のボード UI を作ると、a11y の担保が
 * design system と画面の 2 箇所に分かれ、片方だけ直った状態が生まれる。
 *
 * 工程操作は API 側が admin 限定 (SEC2)。画面側で role を先読みして出し分けはせず、
 * 拒否は応答 (403) を受けて案内する。UI に role 判定を写すと認可表 (B9) と二重化するため。
 *
 * @harness-hub/schemas から**値**を import しないのが本 file の制約。あの package は zod を
 * 実行時に伴い、client の初期 chunk へ載ると `/builds` の First Load JS 予算 (120 KiB) を破る。
 * 工程の並びは server component から `stageOrder` props で受け取り、列組みは zod 非依存の
 * `board-columns.ts` を使う。
 */
import type { BuildListItem, BuildListResponse, BuildStage, BuildStageTransitionResponse } from '@harness-hub/schemas';
import { Alert, StageBoard, type StageColumn } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { toBoardColumnsView } from '../../../features/build-pipeline-board/board-columns.js';

interface BuildBoardProps {
  readonly tenantId: string;
  readonly workspaceId: string;
  /** 7 工程の並び。正本は @harness-hub/schemas の `BUILD_STAGE_ORDER` (server から配る)。 */
  readonly stageOrder: readonly BuildStage[];
}

/** API 1 回あたりの上限。ボードは `next_cursor` を最後まで追い、全工程を一望する。 */
const BOARD_PAGE_LIMIT = 100;

export function BuildBoard({ tenantId, workspaceId, stageOrder }: BuildBoardProps): ReactNode {
  const [items, setItems] = useState<readonly BuildListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const scopeHeaders = useMemo(
    () => ({ 'x-harness-tenant-id': tenantId, 'x-harness-workspace-id': workspaceId }),
    [tenantId, workspaceId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loaded: BuildListItem[] = [];
      const seenCursors = new Set<string>();
      let cursor: string | null = null;
      do {
        const query = new URLSearchParams({ limit: String(BOARD_PAGE_LIMIT) });
        if (cursor !== null) query.set('cursor', cursor);
        const response = await fetch(`/api/v1/builds?${query.toString()}`, {
          credentials: 'same-origin',
          headers: scopeHeaders,
        });
        if (!response.ok) throw new Error('工程ボードを取得できませんでした。');
        const body = (await response.json()) as BuildListResponse;
        loaded.push(...body.items);
        cursor = body.next_cursor;
        if (cursor !== null) {
          if (seenCursors.has(cursor)) throw new Error('工程ボードの続き位置が循環しています。');
          seenCursors.add(cursor);
        }
      } while (cursor !== null);
      setItems(loaded);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '工程ボードを取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [scopeHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  // `StageCard.meta` は共有部品側で `meta?: string` (exactOptionalPropertyTypes 下では undefined を
  // 受け付けない) のため、値が無いときは **キーごと落とす**。undefined を明示すると型が合わない。
  const columns: readonly StageColumn[] = useMemo(
    () =>
      toBoardColumnsView(items, stageOrder).map((column) => ({
        stage: column.stage,
        cards: column.cards.map((card) =>
          card.meta === undefined
            ? { id: card.id, title: card.title, risk: card.risk }
            : { id: card.id, title: card.title, risk: card.risk, meta: card.meta },
        ),
      })),
    [items, stageOrder],
  );

  const moveCard = useCallback(
    async (cardId: string, direction: 'previous' | 'next') => {
      const target = items.find((item) => item.id === cardId);
      if (target === undefined) return;
      const currentIndex = stageOrder.indexOf(target.stage);
      const nextStage: BuildStage | undefined = stageOrder[currentIndex + (direction === 'next' ? 1 : -1)];
      if (nextStage === undefined) return;

      setNotice(null);
      try {
        const response = await fetch(`/api/v1/builds/${cardId}/stage`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { ...scopeHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ to_stage: nextStage, expected_stage: target.stage }),
        });
        if (response.status === 403) {
          setError('工程を操作できるのは管理者だけです。');
          return;
        }
        if (!response.ok) {
          // problem+json の detail をそのまま出す。409 (競合 / 公開前提未達) の案内はサーバ側が正本。
          const problem = (await response.json()) as { readonly detail?: string; readonly title?: string };
          setError(problem.detail ?? problem.title ?? '工程を変更できませんでした。');
          return;
        }
        const body = (await response.json()) as BuildStageTransitionResponse;
        setItems((current) => current.map((item) => (item.id === body.build.id ? body.build : item)));
        setError(null);
        setNotice(`${body.build.title}の工程を更新しました。`);
      } catch {
        setError('工程を変更できませんでした。');
      }
    },
    [items, scopeHeaders, stageOrder],
  );

  return (
    <>
      {error === null ? null : <Alert tone="danger" title="工程ボードのエラー" description={error} />}
      {notice === null ? null : <Alert tone="success" title="工程を更新しました" description={notice} />}
      <p aria-live="polite">{loading ? '工程ボードを読み込んでいます。' : `${items.length} 件の構築案件を表示中`}</p>
      <StageBoard
        label="ハーネス構築の工程ボード"
        columns={columns}
        onMoveCard={(cardId, direction) => {
          void moveCard(cardId, direction);
        }}
      />
    </>
  );
}
