// 接続層の公開面。libSQL (primary / Node・Workers の 2 entry) と D1 (hedge) を提供する (D2 / qa-020)。
// ここのファクトリ以外の経路で DB クライアントを生成しないこと (CI: check-connection-layer-isolation)。
// libSQL が 2 つに分かれている理由は turso.ts のヘッダ (Workers には native binding が無い)。

export {
  type CoreSchema,
  createD1Client,
  type D1Adapter,
  type D1Database,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
  type D1ResultLike,
} from './d1';
export { createRecoverableClient, type RecoverableClient } from './recoverable-client';
export {
  createTursoClient,
  createTursoWebClient,
  type TursoAdapter,
  type TursoDatabase,
  type TursoEnv,
} from './turso';
