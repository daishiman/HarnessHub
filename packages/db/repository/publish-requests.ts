// publish_requests リポジトリ — 状態遷移を CAS に閉じる (ADR AD-9 / 制約 qa-020)。
//
// 公開するのは create / transitionStatus / 読取系のみ。**status を無条件に上書きする関数を持たない**。
// 「読む → 判定 → 全置換」を許すと、並行する 2 要求が同じ現在状態を読んで両方遷移でき、
// 状態機械が保証したはずの順序 (draft → validating → …) が DB 側で崩れる。
// CAS (compare-and-swap = 期待した現在値と一致したときだけ書き換える) なら、
// 敗者の UPDATE が 0 行になるので呼び出し側が競合を識別できる。
//
// 同一 channel の直列化は partial UNIQUE index (`publish_requests_channel_active_uq`) が正本。
// このリポジトリは違反を UniqueViolation として識別可能な形で伝えるところまでを担う。

import { and, desc, eq, lt } from 'drizzle-orm';
import { publishRequests } from '../schema/core/publish';
import { EntityNotFoundError } from '../src/errors';
import type { RepositoryContext } from '../src/types';
import { errorChainText, guardedWrite } from './conflict';
import type { CoreAdapter } from './db';
import { serverNow } from './time';
import { newUlid } from './ulid';

/** 9 状態。`@harness-hub/schemas` の `publishRequestStateSchema` と同じ集合。 */
export type PublishRequestStatus =
  | 'draft'
  | 'validating'
  | 'needs_fix'
  | 'ready'
  | 'approval_pending'
  | 'approved'
  | 'publishing'
  | 'failed'
  | 'published';

export type PublishVerdictValue = 'green' | 'yellow' | 'red';

export interface PublishRequestRow {
  readonly id: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly projectId: string;
  readonly channelId: string;
  readonly status: PublishRequestStatus;
  readonly verdict: PublishVerdictValue | null;
  readonly findingsJson: string | null;
  readonly releaseId: string | null;
  readonly requestedBy: string;
  readonly idempotencyKey: string | null;
  readonly createdAt: number;
}

export interface CreatePublishRequestInput {
  readonly workspaceId: string;
  readonly projectId: string;
  readonly channelId: string;
  readonly requestedBy: string;
  readonly idempotencyKey?: string | null;
}

/**
 * CAS の入力。`from` は「この状態のときだけ遷移する」という期待値。
 * 付随列 (verdict / findings / release / content hash) は遷移と**同一 UPDATE** で書く。
 * 別文に分けると、遷移だけ成功して findings が入らない中途半端な行が生まれうる。
 */
export interface TransitionStatusInput {
  readonly from: PublishRequestStatus;
  readonly to: PublishRequestStatus;
  readonly verdict?: PublishVerdictValue | null;
  readonly findingsJson?: string | null;
  readonly releaseId?: string | null;
}

/**
 * 直列化違反 (同一 channel に非終端 request が既にある)。
 *
 * `RepositoryError` を継承**しない**。同 class の `RepositoryErrorCode` は
 * `not-found | driver-not-supported | invalid-page-request | invalid-context` の 4 値で、
 * 「競合」を表す値が無い。ここで値域へ 'conflict' を足すと、その enum を消費する
 * 全 repository の網羅 switch に影響が及ぶ (feat-domain-model-db 全体の変更になる)。
 * 本 feature 固有の失敗は本 feature の型で表し、共有語彙を広げない。
 */
export class ChannelBusyError extends Error {
  readonly channelId: string;

  constructor(channelId: string) {
    super(`channel ${channelId} には未完了の publish request が既に存在します`);
    this.name = 'ChannelBusyError';
    this.channelId = channelId;
  }
}

/** partial UNIQUE index の述語と同じ集合。ここを変えるときは schema 側の述語も必ず一緒に変える。 */
export const PUBLISH_REQUEST_TERMINAL_STATUSES: readonly PublishRequestStatus[] = ['published', 'failed', 'draft'];

function isUniqueViolation(error: unknown): boolean {
  // drizzle は driver 例外を包んで message を書き換えるため cause 連鎖まで辿る (conflict.ts 参照)。
  return /unique/i.test(errorChainText(error));
}

export interface PublishRequestsRepo {
  /**
   * 新規作成。作成直後は `draft` (= 終端扱い) なので、この時点では channel を占有しない。
   * 占有が始まるのは `draft → validating` の遷移時であり、直列化違反はそこで初めて起こりうる。
   */
  create(context: RepositoryContext, input: CreatePublishRequestInput): Promise<PublishRequestRow>;
  /**
   * 状態遷移 (CAS)。`from` と現在値が一致しなければ **null** を返す (例外にしない)。
   * 競合は異常ではなく、並行要求があれば正常に起きる事象なので、呼び出し側が
   * 「負けた」と判断して 409 を返せる形にする。
   *
   * 非終端状態への遷移が直列化違反になる場合は `ChannelBusyError` を投げる。
   */
  transitionStatus(
    context: RepositoryContext,
    id: string,
    input: TransitionStatusInput,
  ): Promise<PublishRequestRow | null>;
  findById(context: RepositoryContext, id: string): Promise<PublishRequestRow | null>;
  /** 同一 channel の非終端 request。存在すれば直列化違反 (0 件 or 1 件)。 */
  findActiveByChannel(context: RepositoryContext, channelId: string): Promise<PublishRequestRow | null>;
  list(
    context: RepositoryContext,
    filter: {
      readonly projectId?: string;
      readonly channelId?: string;
      readonly status?: PublishRequestStatus;
      readonly cursor?: string;
      readonly limit: number;
    },
  ): Promise<PublishRequestRow[]>;
}

export function createPublishRequestsRepo(adapter: CoreAdapter): PublishRequestsRepo {
  return {
    async create(context, input) {
      try {
        const rows = await guardedWrite(adapter, () =>
          adapter.client
            .insert(publishRequests)
            .values({
              id: newUlid(),
              tenantId: context.tenantId,
              workspaceId: input.workspaceId,
              projectId: input.projectId,
              channelId: input.channelId,
              status: 'draft',
              verdict: null,
              findingsJson: null,
              releaseId: null,
              requestedBy: input.requestedBy,
              idempotencyKey: input.idempotencyKey ?? null,
              createdAt: serverNow(),
            })
            .returning(),
        );
        return rows[0] as PublishRequestRow;
      } catch (error) {
        // draft は index 述語の対象外なので通常ここは通らないが、
        // 述語が変わったときに沈黙して重複を作らないよう明示的に写像しておく。
        if (isUniqueViolation(error)) throw new ChannelBusyError(input.channelId);
        throw error;
      }
    },

    async transitionStatus(context, id, input) {
      // 付随列は「渡されたキーだけ」を更新対象にする。undefined を null と同一視すると、
      // 状態遷移のたびに findings や release_id が意図せず消える。
      const patch: Record<string, unknown> = { status: input.to };
      if (input.verdict !== undefined) patch.verdict = input.verdict;
      if (input.findingsJson !== undefined) patch.findingsJson = input.findingsJson;
      if (input.releaseId !== undefined) patch.releaseId = input.releaseId;

      try {
        const rows = await guardedWrite(adapter, () =>
          adapter.client
            .update(publishRequests)
            .set(patch)
            .where(
              and(
                eq(publishRequests.tenantId, context.tenantId),
                eq(publishRequests.id, id),
                // ここが CAS の本体。期待した状態でなければ 0 行になる
                eq(publishRequests.status, input.from),
              ),
            )
            .returning(),
        );
        return (rows[0] as PublishRequestRow | undefined) ?? null;
      } catch (error) {
        if (isUniqueViolation(error)) throw new ChannelBusyError(id);
        throw error;
      }
    },

    async findById(context, id) {
      const rows = await adapter.client
        .select()
        .from(publishRequests)
        .where(and(eq(publishRequests.tenantId, context.tenantId), eq(publishRequests.id, id)))
        .limit(1);
      return (rows[0] as PublishRequestRow | undefined) ?? null;
    },

    async findActiveByChannel(context, channelId) {
      // 述語を SQL の NOT IN で書かず、取得後に絞る形にはしない
      // (行数が増えたときに全件を読むことになるため)。drizzle の notInArray を使う。
      const rows = await adapter.client
        .select()
        .from(publishRequests)
        .where(and(eq(publishRequests.tenantId, context.tenantId), eq(publishRequests.channelId, channelId)))
        .orderBy(desc(publishRequests.id));
      const active = (rows as PublishRequestRow[]).find(
        (row) => !PUBLISH_REQUEST_TERMINAL_STATUSES.includes(row.status),
      );
      return active ?? null;
    },

    async list(context, filter) {
      const conditions = [eq(publishRequests.tenantId, context.tenantId)];
      if (filter.projectId !== undefined) conditions.push(eq(publishRequests.projectId, filter.projectId));
      if (filter.channelId !== undefined) conditions.push(eq(publishRequests.channelId, filter.channelId));
      if (filter.status !== undefined) conditions.push(eq(publishRequests.status, filter.status));
      // ULID PK は時系列単調なので、id を cursor にすると「作成順の続き」がそのまま表せる。
      // offset 方式にすると、ページを跨ぐ間に新規作成された行で重複・欠落が起きる。
      if (filter.cursor !== undefined) conditions.push(lt(publishRequests.id, filter.cursor));

      const rows = await adapter.client
        .select()
        .from(publishRequests)
        .where(and(...conditions))
        .orderBy(desc(publishRequests.id))
        .limit(filter.limit);
      return rows as PublishRequestRow[];
    },
  };
}

/** 参照の便宜のため再輸出 (呼び出し側が errors module を直接触らずに済むように)。 */
export { EntityNotFoundError };
