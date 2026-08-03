/**
 * user-org-admin の本番 composition root。route の import 時には環境変数へ触れない
 * (hearing-intake/runtime.ts と同じ理由)。
 *
 * `users`/`audit` の実体は `createCoreRepositories` (packages/db) にまとめて任せる。
 * `apps/hub/src/lib/authz/runtime.ts` の本番 authz runtime と同じ関数を呼ぶため、
 * ここで独自に `ColumnCipher` を組み立てない (鍵を扱う層をこれ以上増やさない、AD-1 と同じ理由)。
 * `tenant_coefficients` は本 feature の repository を持たず、owner (feat-hearing-intake) の
 * runtime を再利用する (AD-4: 第 2 の DB 接続経路を増やさない)。
 *
 * POST /api/v1/users (AD-3 の「事前登録」) は本 feature では実装しない。
 * `apps/hub/src/lib/auth/db-ports.ts` の `createFromOidc` (JIT provisioning) を確認したところ、
 * 初回ログイン時は常に新規 `idpSubject` で `role: 'member'` の行を作るだけで、メール等で
 * 既存の事前登録行へ紐付ける仕組みが存在しない。事前登録行を先に作っても初回ログインで
 * 別行が JIT 作成され、同一人物が二重登録になる。この紐付けは feat-auth-tenancy が持つ
 * JIT ロジック自体の変更を要し本 feature の書込み範囲外のため、`tenant_coefficients` の
 * 書込み port 未実装と同じ扱い (AD-4 決定3) で route が 501 を返す。フォローアップは
 * bd issue として別途起票する。
 */
import {
  type CoreRepositories,
  createCoreRepositories,
  createTursoWebClient,
  type HearingIntakeRepository,
} from '@harness-hub/db';
import { hearingIntakeRuntime } from '../hearing-intake/runtime.js';
import { createUserOrgAdminService, type UserOrgAdminService } from './service.js';

export interface UserOrgAdminRuntime {
  readonly repositories: Pick<CoreRepositories, 'users' | 'userSettings' | 'audit'>;
  readonly coefficients: HearingIntakeRepository;
  readonly service: UserOrgAdminService;
}

export function createUserOrgAdminRuntime(
  repositories: Pick<CoreRepositories, 'users' | 'userSettings' | 'audit'>,
  coefficients: HearingIntakeRepository,
): UserOrgAdminRuntime {
  return {
    repositories,
    coefficients,
    service: createUserOrgAdminService({
      users: repositories.users,
      userSettings: repositories.userSettings,
      audit: repositories.audit,
      coefficients,
    }),
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
      readonly kek: string | undefined;
      readonly runtime: UserOrgAdminRuntime;
    }
  | undefined;

export function userOrgAdminRuntime(source: Record<string, string | undefined> = process.env): UserOrgAdminRuntime {
  if (
    cached === undefined ||
    cached.url !== source.TURSO_DATABASE_URL ||
    cached.token !== source.TURSO_AUTH_TOKEN ||
    cached.kek !== source.ENCRYPTION_KEK
  ) {
    const repositories = createCoreRepositories({
      adapter: createTursoWebClient(readDatabaseEnv(source)),
      kekBase64: required(source, 'ENCRYPTION_KEK'),
    });
    cached = {
      url: source.TURSO_DATABASE_URL,
      token: source.TURSO_AUTH_TOKEN,
      kek: source.ENCRYPTION_KEK,
      runtime: createUserOrgAdminRuntime(repositories, hearingIntakeRuntime(source).repository),
    };
  }
  return cached.runtime;
}
