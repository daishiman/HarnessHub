'use client';

/**
 * S01 公開ウィザードの**状態追跡 + 結果表示** (HarnessHub-vwxc)。
 *
 * 追跡 (polling) も結果表示も、公開要求が生まれた後にしか動かない。
 * それでもウィザード本体に同居していると、停止判定 (`shouldContinuePolling` /
 * `shouldResumeOnVisible` / `resolveRetryDelayMs`) と失敗分類 (`classifyCatalogFailure`)
 * が `/catalog/publish` の First Load JS に載る。この route は G13 予算の残余が repo 内で
 * 最も薄いので、`request` が生まれた時点で読み込む単位へまとめて切り出す。
 *
 * 判定規則そのものは持たない。S03 と同じ純関数へ状態を渡すだけにして、
 * 「どこで止めるか」の定義が画面ごとに割れないようにする。
 */
import type { CatalogFailureKind, PublishRequestView } from '@harness-hub/schemas';
import { type ReactNode, useEffect } from 'react';

import type { PollingState } from '../../lib/catalog/index.js';
import {
  classifyCatalogFailure,
  resolveRetryDelayMs,
  shouldContinuePolling,
  shouldResumeOnVisible,
} from '../../lib/catalog/index.js';
import type { PublishJourneyPort, PublishJourneyScope } from '../../lib/publish-journey/index.js';
import { PublishWizardOutcome } from './PublishWizardOutcome.js';

export interface PublishWizardTrackerProps {
  readonly scope: PublishJourneyScope;
  readonly port: PublishJourneyPort;
  readonly request: PublishRequestView;
  /** 取得できた最新の公開要求。呼び出し側の state 更新関数をそのまま渡す (参照が安定している必要がある)。 */
  readonly onRequest: (request: PublishRequestView) => void;
  /** 状態取得の失敗文言。成功時は null に戻す。 */
  readonly onStatusFailure: (message: string | null) => void;
}

function isDocumentVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export function PublishWizardTracker({
  scope,
  port,
  request,
  onRequest,
  onStatusFailure,
}: PublishWizardTrackerProps): ReactNode {
  const requestId = request.id;
  const requestStatus = request.status;

  // 自動で進む状態だけを既存 catalog polling 契約で追う。人待ち状態は叩き続けない。
  useEffect(() => {
    const controller = new AbortController();
    const startedAt = Date.now();
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;
    let failures = 0;
    let lastStatus = requestStatus;
    let lastFailureKind: CatalogFailureKind | null = null;
    let pausedForVisibility = false;
    let inFlight = false;

    /** 停止判定の入力。S03 と同じ純関数へ渡し、条件をこの画面側に写さない。 */
    const currentState = (): PollingState => ({
      status: lastStatus,
      consecutiveFailures: failures,
      elapsedMs: Date.now() - startedAt,
      documentVisible: isDocumentVisible(),
      inFlight,
      lastFailureKind,
    });

    const run = async (): Promise<void> => {
      if (cancelled) return;

      // 待機中に hidden へ変わった場合も、通信を始める前に共通契約へ問い直す。
      // 応答後だけ判定すると hidden 中に 1 回余分な request が発生する。
      const beforeRequest = currentState();
      if (!beforeRequest.documentVisible) {
        if (shouldResumeOnVisible(beforeRequest)) pausedForVisibility = true;
        return;
      }

      inFlight = true;
      const result = await port.getRequest(scope, requestId, controller.signal);
      inFlight = false;
      if (cancelled) return;
      if (result.ok) {
        failures = 0;
        lastFailureKind = null;
        lastStatus = result.value.status;
        onRequest(result.value);
        onStatusFailure(null);
      } else {
        failures += 1;
        // PublishJourneyFailure は kind を持たないため、catalog と同じ分類器で導出する。
        // ここで独自の分類を書くと S01 と S03 で終端の定義が割れる
        lastFailureKind = classifyCatalogFailure(result.failure.status);
        onStatusFailure(result.failure.message);
      }
      const state = currentState();
      if (shouldContinuePolling(state)) {
        timer = window.setTimeout(() => void run(), resolveRetryDelayMs(attempt, null));
        attempt += 1;
        return;
      }
      // 可視性だけが理由なら復帰で再開する。終端失敗・終端状態はここで完全に止まる
      if (shouldResumeOnVisible(state)) pausedForVisibility = true;
    };

    const handleVisibilityChange = (): void => {
      if (cancelled) return;
      if (!pausedForVisibility) return;
      if (!isDocumentVisible()) return;
      if (!shouldResumeOnVisible(currentState())) return;
      pausedForVisibility = false;
      void run();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const initialState = currentState();
    if (shouldContinuePolling(initialState)) {
      timer = window.setTimeout(() => void run(), resolveRetryDelayMs(0, null));
    } else if (shouldResumeOnVisible(initialState)) {
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
  }, [onRequest, onStatusFailure, port, requestId, requestStatus, scope]);

  return <PublishWizardOutcome scope={scope} request={request} />;
}
