/**
 * 画面状態 (読込中 / 空 / 権限不足 / 見つからない) の唯一の実装。
 *
 * これを共通化しないと、同じ「読み込み中」が画面ごとに別の見た目・別の文言になり、
 * 利用者は毎回「これは何が起きているのか」を読み直すことになる。文言と構造をここに
 * 1 つだけ置き、route 側の `loading.tsx` / `not-found.tsx` は薄い配線に留める。
 *
 * `'use client'` を付けないのは、これらが状態を持たない表示だけの層だから。
 * (`ErrorScreen` だけは `reset` を受け取るため error-screen.tsx へ分けてある)
 */
import { Container, EmptyState, ErrorState, Skeleton, Stack } from '@harness-hub/ui';
import type { ReactNode } from 'react';

import { type WorkspaceRecoveryReason, workspaceRecoveryNotice } from '../lib/routing/workspace-recovery.js';

export interface LoadingScreenProps {
  /** 何を読み込んでいるかを支援技術へ伝える文言。 */
  label?: string;
}

/**
 * 読込中。Skeleton 自体は `aria-hidden` の装飾なので、状態の告知は
 * ここが持つ `role="status"` + `aria-busy` で行う (両方 Skeleton 側に置くと
 * 「読み込み中」が行数ぶん読み上げられる)。
 */
export function LoadingScreen({ label = '読み込み中です' }: LoadingScreenProps): ReactNode {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span data-hh-visually-hidden="">{label}</span>
      <Stack gap={4}>
        {/* 見出し相当の 1 行 + 本文相当の複数行。実データと近い高さにして CLS を抑える */}
        <Skeleton height="2rem" width="40%" />
        <Skeleton lines={4} height="1.25rem" />
      </Stack>
    </div>
  );
}

export interface NotFoundScreenProps {
  title?: string;
  description?: string;
  /** 戻り先の導線。省略時はトップへのリンク。 */
  action?: ReactNode;
}

/** 見つからない。原因の説明より「どこへ戻れるか」を主役にする。 */
export function NotFoundScreen({ title, description, action }: NotFoundScreenProps): ReactNode {
  return (
    <Container size="narrow">
      <EmptyState
        title={title ?? 'ページが見つかりません'}
        description={description ?? 'URL が変わったか、削除された可能性があります。'}
        action={action ?? <a href="/">トップへ戻る</a>}
      />
    </Container>
  );
}

export interface ForbiddenScreenProps {
  description?: string;
}

/**
 * 権限不足。「失敗した」ではなく「誰に頼めば進むか」を書く。
 * 403 を汎用エラーと同じ文面にすると、利用者は再試行を繰り返して同じ所で止まる。
 */
export function ForbiddenScreen({ description }: ForbiddenScreenProps): ReactNode {
  return (
    <Container size="narrow">
      <ErrorState
        title="この画面を開く権限がありません"
        description={description ?? 'テナントの管理者に権限の付与を依頼してください。'}
        nextAction={<a href="/">トップへ戻る</a>}
      />
    </Container>
  );
}

export interface ScopeUnresolvedScreenProps {
  /** 未解決の理由。既定は「まだ選んでいない」。 */
  reason?: WorkspaceRecoveryReason;
}

/**
 * Workspace 未解決 (feat-workspace-switch-ux 受入 5)。
 *
 * `ForbiddenScreen` と分けるのは、この状態が**権限不足ではない**から。同じ「403」で括ると
 * 利用者は管理者へ権限を依頼しに行くが、実際には自分で Workspace を選び直すだけで直る。
 * 認可層の語彙 (`missing_tenant_scope` / `ambiguous_scope`) は一切画面へ出さない。
 *
 * 描くのは ErrorState だけ。qa-118 契約どおり、旧 scope のデータはここでも一切表示しない。
 */
export function ScopeUnresolvedScreen({ reason = 'unresolved' }: ScopeUnresolvedScreenProps): ReactNode {
  const notice = workspaceRecoveryNotice(reason);
  return (
    <Container size="narrow">
      <ErrorState
        title={notice.title}
        description={notice.description}
        nextAction={<a href={notice.actionHref}>{notice.actionLabel}</a>}
      />
    </Container>
  );
}
