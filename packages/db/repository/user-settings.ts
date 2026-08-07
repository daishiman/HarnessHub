// user_settings — feat-user-org-admin (S18 アカウント設定) の消費専用リポジトリ。
// テーブル定義自体は feat-domain-model-db の schema実体 (schema/core/identity.ts) の一部で、
// ここでは列を追加・変更しない。既存に repository leaf が無かったため本 feature が新設する
// (AD-1 が禁じるのは schema/列変更であり、既存テーブルへの port 追加ではない)。

import { eq } from 'drizzle-orm';
import { userSettings } from '../schema/core/identity';
import { guardedWrite } from './conflict';
import type { CoreAdapter } from './db';

export interface UserSettingsRow {
  readonly userId: string;
  readonly notifyGeneration: boolean;
  readonly notifyReview: boolean;
  readonly notifyWeekly: boolean;
  readonly notifyFeedback: boolean;
  readonly emailEnabled: boolean;
  readonly theme: string;
  readonly density: string;
  readonly language: string;
}

export interface UpdateUserSettingsInput {
  readonly notifyGeneration?: boolean;
  readonly notifyReview?: boolean;
  readonly notifyWeekly?: boolean;
  readonly notifyFeedback?: boolean;
  readonly emailEnabled?: boolean;
  readonly theme?: string;
  readonly density?: string;
  readonly language?: string;
}

const DEFAULT_SETTINGS: Omit<UserSettingsRow, 'userId'> = {
  notifyGeneration: true,
  notifyReview: true,
  notifyWeekly: true,
  notifyFeedback: true,
  emailEnabled: true,
  theme: 'system',
  density: 'comfortable',
  language: 'ja',
};

/**
 * user_settings は users への 1:1 従属列で tenant_id を持たない (schema コメント参照)。
 * テナント境界の確認は呼出し側が `UsersRepo.findById(context, userId)` で先に行う前提とし、
 * ここでは userId だけを鍵にする。他 repository の `RepositoryContext` 第一引数規約とは
 * 意図的に異なる — 存在しない tenantId を型上だけ受け取らせると「テナント判定をしている」という
 * 誤った印象を残すため。
 */
export interface UserSettingsRepo {
  /** 行が無ければ (未初期化) schema 既定値を返す。空行を先に作らない (読取専用アクセスで書込みを起こさない)。 */
  getOrDefault(userId: string): Promise<UserSettingsRow>;
  update(userId: string, input: UpdateUserSettingsInput): Promise<UserSettingsRow>;
}

export function createUserSettingsRepo(adapter: CoreAdapter): UserSettingsRepo {
  return {
    async getOrDefault(userId) {
      const rows = await adapter.client.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
      const row = rows[0] as UserSettingsRow | undefined;
      return row ?? { userId, ...DEFAULT_SETTINGS };
    },

    async update(userId, input) {
      if (Object.keys(input).length === 0) {
        const rows = await adapter.client.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
        const row = rows[0] as UserSettingsRow | undefined;
        return row ?? { userId, ...DEFAULT_SETTINGS };
      }
      const rows = await guardedWrite(adapter, () =>
        adapter.client
          .insert(userSettings)
          .values({ userId, ...DEFAULT_SETTINGS, ...input })
          .onConflictDoUpdate({ target: userSettings.userId, set: input })
          .returning(),
      );
      return rows[0] as UserSettingsRow;
    },
  };
}
