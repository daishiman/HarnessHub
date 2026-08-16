// user_settings — feat-user-org-admin (S18 アカウント設定) の消費専用リポジトリ。
// テーブル定義自体は feat-domain-model-db の schema実体 (schema/core/identity.ts) の一部で、
// ここでは列を追加・変更しない。既存に repository leaf が無かったため本 feature が新設する
// (AD-1 が禁じるのは schema/列変更であり、既存テーブルへの port 追加ではない)。

import { count, eq } from 'drizzle-orm';
import { userSettings, users } from '../schema/core/identity';
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
  readonly palette: string;
  readonly resolvedTheme: string;
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
  readonly palette?: string;
  readonly resolvedTheme?: string;
}

/** 配色の採用状況 (人数だけ)。個人を特定できる値は集計の外へ出さない。 */
export interface AppearanceBucket {
  readonly palette: string;
  readonly theme: string;
  readonly resolvedTheme: string;
  readonly users: number;
}

export interface AppearanceAggregate {
  /** 在籍している利用者の総数。分母ではなく「計測できていない人がどれだけいるか」を示すために持つ。 */
  readonly totalUsers: number;
  /** 外観を保存した (= user_settings の行がある) 人数。構成比の分母。 */
  readonly measuredUsers: number;
  readonly buckets: readonly AppearanceBucket[];
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
  palette: 'gray',
  resolvedTheme: 'light',
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
  /**
   * 配色の採用状況を「利用者 1 人 = 1 票」で数える。押した回数ではなく現在設定の行を数えるので、
   * 試し押しや選び直しが重複票にならない。テナント横断 (provider-admin 向けの全体傾向) で、
   * 返すのは人数だけ。
   */
  aggregateAppearance(): Promise<AppearanceAggregate>;
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

    async aggregateAppearance() {
      const buckets = (await adapter.client
        .select({
          palette: userSettings.palette,
          theme: userSettings.theme,
          resolvedTheme: userSettings.resolvedTheme,
          users: count(),
        })
        .from(userSettings)
        .groupBy(userSettings.palette, userSettings.theme, userSettings.resolvedTheme)) as readonly AppearanceBucket[];

      // 在籍数は users 側からしか出ない。user_settings の行数を総数に流用すると
      // 「保存した人だけが利用者」になり、計測率が常に 100% に見えてしまう。
      const totals = await adapter.client.select({ value: count() }).from(users).where(eq(users.status, 'active'));

      return {
        totalUsers: totals[0]?.value ?? 0,
        measuredUsers: buckets.reduce((sum, bucket) => sum + bucket.users, 0),
        buckets,
      };
    },
  };
}
