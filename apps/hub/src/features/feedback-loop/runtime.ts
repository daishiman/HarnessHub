/** feedback-loop の本番 composition root。route の import 時には環境変数へ触れない。 */
import {
  type BuildsRepository,
  createBuildsRepository,
  createFeedbackRepository,
  createTursoWebClient,
  type FeedbackRepository,
} from '@harness-hub/db';

import { createNotificationDispatcher } from '../../shared/notification/index.js';
import { createFeedbackResolvedNotificationPort } from './notification.js';
import { createFeedbackLoopService, type FeedbackLoopService } from './service.js';

export interface FeedbackLoopRuntime {
  readonly repository: FeedbackRepository;
  /**
   * `builds` 行の冪等作成専用 (ADR §7 P10 差し戻し再設計)。CRUD API はスコープ外のため
   * service へは持ち込まず、ai-jobs complete route から直接呼ぶだけの薄い経路に留める。
   */
  readonly buildsRepository: BuildsRepository;
  readonly service: FeedbackLoopService;
}

export function createFeedbackLoopRuntime(
  repository: FeedbackRepository,
  buildsRepository: BuildsRepository,
): FeedbackLoopRuntime {
  // transport は feat-hub-foundation の owner 領域 (in_app 永続化 / Resend) がまだ無いため、
  // 現時点では空配列で接続する。共通層の delivered=false 記録により安全側に倒れる (notification.ts 参照)。
  const dispatcher = createNotificationDispatcher({ transports: [] });
  return {
    repository,
    buildsRepository,
    service: createFeedbackLoopService(repository, createFeedbackResolvedNotificationPort(dispatcher)),
  };
}

function required(source: Record<string, string | undefined>, key: string): string {
  const value = source[key]?.trim();
  if (value === undefined || value.length === 0) throw new Error(`環境変数 ${key} が未設定です`);
  return value;
}

function readDatabaseEnv(source: Record<string, string | undefined>) {
  const url = required(source, 'TURSO_DATABASE_URL');
  const authToken = source.TURSO_AUTH_TOKEN?.trim();
  if (/^(?:libsql|https|wss):/i.test(url) && !authToken) {
    throw new Error('リモート TURSO_DATABASE_URL には TURSO_AUTH_TOKEN が必要です');
  }
  return authToken ? { url, authToken } : { url };
}

let cached:
  | {
      readonly url: string | undefined;
      readonly token: string | undefined;
      readonly runtime: FeedbackLoopRuntime;
    }
  | undefined;

export function feedbackLoopRuntime(source: Record<string, string | undefined> = process.env): FeedbackLoopRuntime {
  if (cached === undefined || cached.url !== source.TURSO_DATABASE_URL || cached.token !== source.TURSO_AUTH_TOKEN) {
    // builds と feedback は同一 DB 接続 (adapter) を共有する。repository ごとに接続を作ると
    // 「どちらの接続で読んだか」の区別が生まれてしまう (区別する理由は無い、composition.ts と同じ方針)。
    const adapter = createTursoWebClient(readDatabaseEnv(source));
    const repository = createFeedbackRepository(adapter);
    const buildsRepository = createBuildsRepository(adapter);
    cached = {
      url: source.TURSO_DATABASE_URL,
      token: source.TURSO_AUTH_TOKEN,
      runtime: createFeedbackLoopRuntime(repository, buildsRepository),
    };
  }
  return cached.runtime;
}
