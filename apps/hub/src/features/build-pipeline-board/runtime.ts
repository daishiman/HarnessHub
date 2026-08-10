/**
 * build-pipeline-board の本番 composition root (SYS-BUILD-PIPELINE-BOARD-P05)。
 *
 * feedback-loop の runtime.ts と同じ契約: **route の import 時には環境変数へ触れない**。
 * 触ると、DB 接続情報が無いビルド環境で route を import しただけで失敗する。
 * 依存の解決は `buildPipelineBoardRuntime()` を呼んだ時点まで遅らせる。
 */
import {
  type BuildStageRepository,
  createBuildStageRepository,
  createFeedbackRepository,
  createHearingIntakeRepository,
  createTursoWebClient,
  type FeedbackRepository,
  type HearingIntakeRepository,
} from '@harness-hub/db';

import {
  type BuildPipelineBoardService,
  type BuildSourceTitlePort,
  createBuildPipelineBoardService,
} from './service.js';

export interface BuildPipelineBoardRuntime {
  readonly repository: BuildStageRepository;
  readonly service: BuildPipelineBoardService;
}

export function createBuildPipelineBoardRuntime(
  repository: BuildStageRepository,
  titles: BuildSourceTitlePort,
): BuildPipelineBoardRuntime {
  return { repository, service: createBuildPipelineBoardService(repository, { titles }) };
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
      readonly runtime: BuildPipelineBoardRuntime;
    }
  | undefined;

export function buildPipelineBoardRuntime(
  source: Record<string, string | undefined> = process.env,
): BuildPipelineBoardRuntime {
  if (cached === undefined || cached.url !== source.TURSO_DATABASE_URL || cached.token !== source.TURSO_AUTH_TOKEN) {
    // builds / hearing_sheets / feedbacks は同一 DB。接続を repository ごとに分けると
    // 「どちらの接続で読んだか」の区別が生まれるが、区別する理由が無い (feedback-loop と同方針)。
    const adapter = createTursoWebClient(readDatabaseEnv(source));
    cached = {
      url: source.TURSO_DATABASE_URL,
      token: source.TURSO_AUTH_TOKEN,
      runtime: createBuildPipelineBoardRuntime(
        createBuildStageRepository(adapter),
        createDbSourceTitlePort(createHearingIntakeRepository(adapter), createFeedbackRepository(adapter)),
      ),
    };
  }
  return cached.runtime;
}

/**
 * 接続元 (hearing sheet / feedback) から Build の見出しを引く port の実装。
 *
 * 参照先が消えている・別テナントで読めない場合は **例外にせず null を返す**。
 * 見出しは表示上の付随情報であり、それが取れないことで工程ボード全体が読めなくなるのは割に合わない
 * (service 側が既定の見出しへフォールバックする)。
 */
export function createDbSourceTitlePort(
  hearing: Pick<HearingIntakeRepository, 'findSheet'>,
  feedback: Pick<FeedbackRepository, 'findFeedback'>,
): BuildSourceTitlePort {
  return {
    async titleForSheet(context, sheetId) {
      try {
        const sheet = await hearing.findSheet(context, sheetId);
        return sheet?.title ?? null;
      } catch {
        return null;
      }
    },
    async titleForFeedback(context, feedbackId) {
      try {
        const row = await feedback.findFeedback(context, feedbackId);
        // feedback は題名列を持たないため、FR コード + 本文の先頭を見出しにする。
        return row === null ? null : `${row.code} ${row.body}`;
      } catch {
        return null;
      }
    },
  };
}
