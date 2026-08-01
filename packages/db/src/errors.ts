// repository 境界で投げる例外。driver 固有のエラーをアプリ層へ素通しさせないための共通語彙。

export type RepositoryErrorCode =
  | 'not-found'
  | 'conflict'
  | 'driver-not-supported'
  | 'invalid-page-request'
  | 'invalid-context'
  | 'connection-poisoned';

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;

  constructor(code: RepositoryErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RepositoryError';
    this.code = code;
  }
}

/** 対象が存在しない。driver ごとの表現差をここへ正規化する。 */
export class EntityNotFoundError extends RepositoryError {
  readonly entity: string;
  readonly id: string;

  constructor(entity: string, id: string) {
    super('not-found', `${entity} が見つかりません (id=${id})`);
    this.name = 'EntityNotFoundError';
    this.entity = entity;
    this.id = id;
  }
}

/** 未対応 driver。D2 (Turso→D1 退避) の切替時に、未対応の組合せを起動時点で落とす。 */
export class DriverNotSupportedError extends RepositoryError {
  readonly driver: string;

  constructor(driver: string, supported: readonly string[]) {
    super('driver-not-supported', `driver "${driver}" は未対応です (対応: ${supported.join(', ')})`);
    this.name = 'DriverNotSupportedError';
    this.driver = driver;
  }
}

/**
 * 接続が復旧不能な状態に落ちた (HarnessHub-njkm)。
 *
 * ローカル libSQL は `SQLITE_BUSY` で失敗した単発 `execute()` を後片付けしないため、
 * その接続は未終了 statement を抱えたまま固まる。以降の書き込みは**自分からは見えるが
 * commit されない**ので、放置すると「成功を返したのに行が無い」という静かなデータ喪失になる。
 * 詳細と実測は `repository/conflict.ts` のヘッダにある。
 *
 * この例外は**再試行してはいけない**失敗を表す。復旧手段は接続を捨てること
 * (`TursoAdapter.reconnect()`) だけで、同じ接続を叩き直しても状態は戻らない。
 * `src/lock-conflict.ts` の `isLockConflict` はこの例外を再試行対象から除外する。
 */
export class ConnectionPoisonedError extends RepositoryError {
  /** 毒を踏んだ driver 操作名 (`execute` / `batch` / `commit` など)。原因調査の起点。 */
  readonly operation: string;

  constructor(operation: string, cause: unknown) {
    super(
      'connection-poisoned',
      `DB 接続がロック競合で復旧不能になりました (operation=${operation})。` +
        '未 commit の書き込みを読ませないため以降の操作を停止します。reconnect() で接続を作り直してください。',
      { cause },
    );
    this.name = 'ConnectionPoisonedError';
    this.operation = operation;
  }
}
