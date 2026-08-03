/** docs-cms の本番 composition root。route の import 時には環境変数へ触れない。 */
import { createDocsCmsRepository, createTursoWebClient, type DocsCmsRepository } from '@harness-hub/db';

export interface DocsCmsRuntime {
  readonly repository: DocsCmsRepository;
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
      readonly runtime: DocsCmsRuntime;
    }
  | undefined;

export function docsCmsRuntime(source: Record<string, string | undefined> = process.env): DocsCmsRuntime {
  if (cached === undefined || cached.url !== source.TURSO_DATABASE_URL || cached.token !== source.TURSO_AUTH_TOKEN) {
    const repository = createDocsCmsRepository(createTursoWebClient(readDatabaseEnv(source)));
    cached = {
      url: source.TURSO_DATABASE_URL,
      token: source.TURSO_AUTH_TOKEN,
      runtime: { repository },
    };
  }
  return cached.runtime;
}
