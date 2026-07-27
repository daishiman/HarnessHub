// Turso (libSQL) 接続ファクトリ — primary 経路 (D2)。
// 返す型は feat-hub-foundation が確立した adapter 境界 (src/adapter.ts) に従い、
// アプリ層は driver 差をこの境界の裏に隠したまま扱う。
//
// **entry を 2 つ持つ理由 (HarnessHub-b7ng)。** @libsql/client は実行環境ごとに別実装を出す。
// 既定 (`@libsql/client`) は Node 向けで `file:` を native binding (libsql) で開けるが、
// Cloudflare Workers には native binding が無いので原理的に動かない。Workers 用は
// fetch/WebSocket だけで喋る `@libsql/client/web` で、こちらは `file:` を開けない。
// package の exports は `workerd` 条件で既定 entry を web 実装へ差し替えるが、それに任せると
//   - 本番がどちらの driver で動くのかが bundler の解決条件に隠れる
//   - Next の file tracing は Node 条件で辿るため web 実装が .open-next へ複写されず、
//     workerd 向け bundle が `Could not resolve "@libsql/client"` で落ちる
// の 2 つを踏む。**使う entry を source 上で名指しする**ことでどちらも消える。

import { type Client, createClient } from '@libsql/client';
import { createClient as createWebClient } from '@libsql/client/web';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from '../schema/index';
import type { DatabaseAdapter, TransactionalAdapter } from '../src/adapter';

export type CoreSchema = typeof schema;
export type TursoDatabase = LibSQLDatabase<CoreSchema>;

export interface TursoEnv {
  /** `libsql://…` (Turso) または `file:…` / `:memory:` (ローカル/テスト・restore drill 用)。 */
  readonly url: string;
  readonly authToken?: string | undefined;
}

export interface TursoAdapter extends TransactionalAdapter<CoreSchema, TursoDatabase> {
  /** CLI・テストでファイルハンドルを解放するための明示 close。Workers 常駐時は呼ばない。 */
  close(): void;
}

/** driver 差を吸収する前段。`authToken` を「未指定」と「空文字」で区別する。 */
function toClientConfig(env: TursoEnv): { url: string; authToken?: string } {
  return env.authToken === undefined ? { url: env.url } : { url: env.url, authToken: env.authToken };
}

/** libSQL 接続を生成する。スキーマは常に barrel (schema/index.ts) を束ねる。 */
export function createTursoClient(env: TursoEnv): TursoAdapter {
  const scope = /^(?:file:|:memory:)/i.test(env.url) ? 'process-local' : 'request-bound';
  return buildTursoAdapter(createClient(toClientConfig(env)), scope);
}

/**
 * Workers (workerd) 用の libSQL 接続を生成する。HTTP/WebSocket 経路のみを使う実装で、
 * `file:` / `:memory:` は開けない — Workers にファイルシステムが無いのでそもそも成立しない。
 *
 * 本番 (apps/hub) はこちらを使う。`file:` を渡す経路は開発者の設定誤りなので、
 * driver の中で分かりにくく失敗させるより、どの環境変数が悪いかを添えて即座に止める。
 */
export function createTursoWebClient(env: TursoEnv): TursoAdapter {
  if (!/^(?:libsql|https|wss|ws|http):/i.test(env.url)) {
    throw new Error(
      `Workers 経路の libSQL 接続にはリモート URL が必要です (受け取った url=${env.url})。` +
        'file: / :memory: は Node 経路 (createTursoClient) 専用です。',
    );
  }
  return buildTursoAdapter(createWebClient(toClientConfig(env)), 'request-bound');
}

/** 生 client を adapter 境界へ包む。entry (Node / Web) が違っても境界の挙動は同一に保つ。 */
function buildTursoAdapter(raw: Client, writeConcurrencyScope: TursoAdapter['writeConcurrencyScope']): TursoAdapter {
  const db = drizzle(raw, { schema });

  const adapter: TursoAdapter = {
    driver: 'turso',
    writeConcurrencyScope,
    schema,
    client: db,
    async transaction<TResult>(
      run: (tx: DatabaseAdapter<CoreSchema, TursoDatabase>) => Promise<TResult>,
    ): Promise<TResult> {
      // 監査 append 等の read-modify-write を直列化するため immediate で begin する (ADR §7)。
      return db.transaction(
        async (tx) =>
          run({
            driver: 'turso',
            writeConcurrencyScope,
            schema,
            client: tx as unknown as TursoDatabase,
          }),
        {
          behavior: 'immediate',
        },
      );
    },
    close(): void {
      raw.close();
    },
  };
  return adapter;
}
