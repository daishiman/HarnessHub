// 接続層の公開面。libSQL (primary) と D1 (hedge) の 2 ファクトリのみを提供する (D2 / qa-020)。
// この 2 関数以外の経路で DB クライアントを生成しないこと (CI: check-connection-layer-isolation)。

export {
  type CoreSchema,
  createD1Client,
  type D1Adapter,
  type D1Database,
  type D1DatabaseLike,
  type D1PreparedStatementLike,
  type D1ResultLike,
} from './d1';
export { createTursoClient, type TursoAdapter, type TursoDatabase, type TursoEnv } from './turso';
