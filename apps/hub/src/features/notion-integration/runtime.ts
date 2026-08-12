/**
 * notion-integration の本番 composition root。route の import 時には環境変数へ触れない
 * (他 feature の runtime.ts と同じ理由: route module のトップレベルで環境変数未設定エラーを起こさせない)。
 *
 * repository は `createNotionIntegrationRepository` (packages/db) が専用の `ColumnCipher` を
 * 自前で組む facade を使う (`tenant-data` と同じ理由で `createCoreRepositories` の合成単位を素通りさせない)。
 */
import { createNotionIntegrationRepository, createTursoWebClient, type NotionIntegrationRepo } from '@harness-hub/db';
import { createNotionIntegrationService, type NotionIntegrationService } from './service.js';

export interface NotionIntegrationRuntime {
  readonly repository: NotionIntegrationRepo;
  readonly service: NotionIntegrationService;
}

export function createNotionIntegrationRuntime(repository: NotionIntegrationRepo): NotionIntegrationRuntime {
  return { repository, service: createNotionIntegrationService({ repository }) };
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
      readonly kek: string | undefined;
      readonly runtime: NotionIntegrationRuntime;
    }
  | undefined;

export function notionIntegrationRuntime(
  source: Record<string, string | undefined> = process.env,
): NotionIntegrationRuntime {
  if (
    cached === undefined ||
    cached.url !== source.TURSO_DATABASE_URL ||
    cached.token !== source.TURSO_AUTH_TOKEN ||
    cached.kek !== source.ENCRYPTION_KEK
  ) {
    const repository = createNotionIntegrationRepository({
      adapter: createTursoWebClient(readDatabaseEnv(source)),
      kekBase64: required(source, 'ENCRYPTION_KEK'),
    });
    cached = {
      url: source.TURSO_DATABASE_URL,
      token: source.TURSO_AUTH_TOKEN,
      kek: source.ENCRYPTION_KEK,
      runtime: createNotionIntegrationRuntime(repository),
    };
  }
  return cached.runtime;
}
