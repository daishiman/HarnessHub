// repository 境界で投げる例外。driver 固有のエラーをアプリ層へ素通しさせないための共通語彙。

export type RepositoryErrorCode = 'not-found' | 'driver-not-supported' | 'invalid-page-request' | 'invalid-context';

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;

  constructor(code: RepositoryErrorCode, message: string) {
    super(message);
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
