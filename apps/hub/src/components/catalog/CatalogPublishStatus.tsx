'use client';

/**
 * S03 公開状態・修正内容 (S02 の公開タブとして統合)。
 *
 * ポーリングの**間隔と停止条件は `lib/catalog/polling.ts` の純関数が唯一の出所**。
 * ここには数値を書かない — 書くと条件が 2 箇所に散り、片方だけ直した退行が起きる。
 */
import {
  formatPublishFinding,
  PUBLISH_NEEDS_FIX_HEADING,
  type PublishRequestState,
  type PublishRequestView,
  publishNeedsFixSummary,
} from '@harness-hub/schemas';
import { Alert, Button, StatusChip } from '@harness-hub/ui';
import { useCallback, useEffect, useState } from 'react';
import type { CatalogFailure, CatalogPort, CatalogScope } from '../../lib/catalog/index.js';
import {
  httpCatalogPort,
  publishStatusChipValue,
  resolveRetryDelayMs,
  shouldContinuePolling,
} from '../../lib/catalog/index.js';

export interface CatalogPublishStatusProps {
  scope: CatalogScope;
  publishId: string;
  port?: CatalogPort;
  /** RSC 側で取得済みの初期値。渡すと初期表示が空にならず CLS を抑えられる。 */
  initialRequest?: PublishRequestView | undefined;
}

function isDocumentVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
}

export function CatalogPublishStatus({
  scope,
  publishId,
  port = httpCatalogPort,
  initialRequest,
}: CatalogPublishStatusProps) {
  const [request, setRequest] = useState<PublishRequestView | null>(initialRequest ?? null);
  const [failure, setFailure] = useState<CatalogFailure | null>(null);
  const [stopped, setStopped] = useState<boolean>(false);
  /** 「再試行」で effect を張り直すための世代カウンタ。 */
  const [generation, setGeneration] = useState<number>(0);

  const retry = useCallback(() => {
    setStopped(false);
    setFailure(null);
    setGeneration((value) => value + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: generation は effect 本体では読まない世代印。依存から外すと停止後に「再試行」を押しても購読が張り直されない
  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;
    let consecutiveFailures = 0;
    let lastStatus: PublishRequestState = initialRequest?.status ?? 'validating';

    const run = async (): Promise<void> => {
      if (cancelled) return;
      const result = await port.getPublishRequest(scope, publishId, controller.signal);
      if (cancelled) return;

      let retryAfterSeconds: number | null = null;
      if (result.ok) {
        consecutiveFailures = 0;
        lastStatus = result.value.status;
        setRequest(result.value);
        setFailure(null);
      } else {
        consecutiveFailures += 1;
        retryAfterSeconds = result.failure.retryAfterSeconds;
        setFailure(result.failure);
      }

      const proceed = shouldContinuePolling({
        status: lastStatus,
        consecutiveFailures,
        elapsedMs: Date.now() - startedAt,
        documentVisible: isDocumentVisible(),
        // この時点で前回リクエストは完了しているため常に false。多重送信は run を直列に繋ぐことで防いでいる
        inFlight: false,
      });
      if (!proceed) {
        setStopped(true);
        return;
      }

      const delay = resolveRetryDelayMs(attempt, retryAfterSeconds);
      attempt += 1;
      timer = window.setTimeout(() => void run(), delay);
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [port, scope, publishId, initialRequest, generation]);

  return (
    <section aria-labelledby="catalog-publish-status-heading">
      <h2 id="catalog-publish-status-heading">公開状態</h2>

      {/* 更新のたびに focus を奪わず、読み上げも中断しない (qa-018) */}
      <p aria-live="polite">
        {request === null ? (
          '公開状態を取得しています。'
        ) : (
          <StatusChip domain="publish" status={publishStatusChipValue(request.status)} />
        )}
      </p>

      {failure === null ? null : (
        <Alert tone="warning" title="公開状態を更新できませんでした" description={failure.message} />
      )}

      {stopped ? (
        <Alert
          tone="info"
          title="自動更新を停止しました"
          description="最新の状態は再試行で取得できます。"
          action={
            <Button type="button" onClick={retry}>
              再試行
            </Button>
          }
        />
      ) : null}

      {request !== null && request.findings.length > 0 ? (
        <section aria-labelledby="catalog-publish-findings-heading">
          <h4 id="catalog-publish-findings-heading">{PUBLISH_NEEDS_FIX_HEADING}</h4>
          {/* 説明と 1 行の書式は CLI 経路と同じ実装から取る (受入 3)。ここで文面を作らない */}
          <p>{publishNeedsFixSummary(request.verdict)}</p>
          <ul>
            {/* 位置ではなく内容でキーを作る。並び替えや途中挿入があっても同じ指摘が同じ行に留まる */}
            {request.findings.map((finding) => (
              <li key={`${finding.stage}-${finding.rule_id}-${finding.path ?? ''}-${finding.line ?? ''}`}>
                {formatPublishFinding(finding)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
