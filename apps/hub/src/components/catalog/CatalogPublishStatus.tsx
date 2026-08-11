'use client';

/**
 * S03 公開状態・修正内容 (S02 の公開タブとして統合)。
 *
 * ポーリングの**間隔と停止条件は `lib/catalog/polling.ts` の純関数が唯一の出所**。
 * ここには数値を書かない — 書くと条件が 2 箇所に散り、片方だけ直した退行が起きる。
 */
import {
  type CatalogFailureKind,
  formatPublishFinding,
  PUBLISH_NEEDS_FIX_HEADING,
  type PublishRequestState,
  type PublishRequestView,
  publishNeedsFixSummary,
} from '@harness-hub/schemas';
import { Alert, Button, Panel, Stack, StatusChip, TagRow } from '@harness-hub/ui';
import { useCallback, useEffect, useState } from 'react';
import type { CatalogFailure, CatalogPort, CatalogScope, PollingState } from '../../lib/catalog/index.js';
import {
  httpCatalogPort,
  publishStatusChipValue,
  resolveRetryDelayMs,
  shouldContinuePolling,
  shouldResumeOnVisible,
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
    let lastFailureKind: CatalogFailureKind | null = null;
    /**
     * 「可視性だけを理由に止まっている」印。
     * 停止 (`stopped`) と区別するのは、前者は復帰で自動回復し、後者は人の再試行を要するため。
     */
    let pausedForVisibility = false;
    let inFlight = false;

    /** 現時点の停止判定入力。判定は必ず polling.ts の純関数へ渡す (ここで条件を書かない)。 */
    const currentState = (): PollingState => ({
      status: lastStatus,
      consecutiveFailures,
      elapsedMs: Date.now() - startedAt,
      documentVisible: isDocumentVisible(),
      inFlight,
      lastFailureKind,
    });

    const run = async (): Promise<void> => {
      if (cancelled) return;

      // timer の予約後に tab が hidden へ変わる場合がある。request 後だけ可視性を
      // 判定すると、hidden 中に 1 回通信してから停止することになるため、送信前にも
      // 同じ純関数へ問い直す。
      const beforeRequest = currentState();
      if (!beforeRequest.documentVisible) {
        if (shouldResumeOnVisible(beforeRequest)) {
          pausedForVisibility = true;
        } else {
          setStopped(true);
        }
        return;
      }

      inFlight = true;
      const result = await port.getPublishRequest(scope, publishId, controller.signal);
      inFlight = false;
      if (cancelled) return;

      let retryAfterSeconds: number | null = null;
      if (result.ok) {
        consecutiveFailures = 0;
        lastFailureKind = null;
        lastStatus = result.value.status;
        setRequest(result.value);
        setFailure(null);
      } else {
        consecutiveFailures += 1;
        lastFailureKind = result.failure.kind;
        retryAfterSeconds = result.failure.retryAfterSeconds;
        setFailure(result.failure);
      }

      const state = currentState();
      if (shouldContinuePolling(state)) {
        const delay = resolveRetryDelayMs(attempt, retryAfterSeconds);
        attempt += 1;
        timer = window.setTimeout(() => void run(), delay);
        return;
      }

      // 継続不可の理由が可視性**だけ**なら停止ではなく一時停止。復帰時に再開する
      if (shouldResumeOnVisible(state)) {
        pausedForVisibility = true;
        return;
      }

      setStopped(true);
    };

    const handleVisibilityChange = (): void => {
      if (cancelled) return;
      if (!pausedForVisibility) return; // 停止済み・実行中・待機中は復帰の対象外
      if (!isDocumentVisible()) return;
      if (!shouldResumeOnVisible(currentState())) return;
      // 先に降ろすことで、連続した visibilitychange で run が多重起動しない
      pausedForVisibility = false;
      void run();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (isDocumentVisible()) {
      void run();
    } else {
      // 不可視で mount された場合は 1 回目から通信しない
      pausedForVisibility = true;
    }

    return () => {
      cancelled = true;
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [port, scope, publishId, initialRequest, generation]);

  return (
    <Panel
      title="公開状態"
      description="公開の申請がいまどこまで進んでいるかを自動で追いかけています。"
      headingLevel={2}
    >
      {/* 見出しは Panel が出す。ここは読み上げ用の名前だけ持たせて見出しの階層飛びを作らない */}
      <section aria-label="公開状態">
        <Stack gap={3}>
          {/* 更新のたびに focus を奪わず、読み上げも中断しない (qa-018) */}
          <div aria-live="polite">
            {request === null ? (
              <p style={{ margin: 0 }}>公開状態を取得しています。</p>
            ) : (
              <TagRow label="公開の状態">
                <StatusChip domain="publish" status={publishStatusChipValue(request.status)} />
              </TagRow>
            )}
          </div>

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
            <Panel title={PUBLISH_NEEDS_FIX_HEADING} headingLevel={3}>
              {/* 説明と 1 行の書式は CLI 経路と同じ実装から取る (受入 3)。ここで文面を作らない */}
              <p style={{ marginBlockStart: 0 }}>{publishNeedsFixSummary(request.verdict)}</p>
              <ul>
                {/* 位置ではなく内容でキーを作る。並び替えや途中挿入があっても同じ指摘が同じ行に留まる */}
                {request.findings.map((finding) => (
                  <li key={`${finding.stage}-${finding.rule_id}-${finding.path ?? ''}-${finding.line ?? ''}`}>
                    {formatPublishFinding(finding)}
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </Stack>
      </section>
    </Panel>
  );
}
