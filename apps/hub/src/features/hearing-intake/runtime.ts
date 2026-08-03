/** Hearing intake の本番 composition root。route の import 時には環境変数へ触れない。 */
import { createHearingIntakeRepository, createTursoWebClient, type HearingIntakeRepository } from '@harness-hub/db';

import { createHearingIntakeService, type HearingIntakeService } from './service.js';

export interface HearingIntakeRuntime {
  readonly repository: HearingIntakeRepository;
  readonly service: HearingIntakeService;
}

export function createHearingIntakeRuntime(repository: HearingIntakeRepository): HearingIntakeRuntime {
  return {
    repository,
    service: createHearingIntakeService(repository),
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
      readonly runtime: HearingIntakeRuntime;
    }
  | undefined;

export function hearingIntakeRuntime(source: Record<string, string | undefined> = process.env): HearingIntakeRuntime {
  if (cached === undefined || cached.url !== source.TURSO_DATABASE_URL || cached.token !== source.TURSO_AUTH_TOKEN) {
    const repository = createHearingIntakeRepository(createTursoWebClient(readDatabaseEnv(source)));
    cached = {
      url: source.TURSO_DATABASE_URL,
      token: source.TURSO_AUTH_TOKEN,
      runtime: createHearingIntakeRuntime(repository),
    };
  }
  return cached.runtime;
}
