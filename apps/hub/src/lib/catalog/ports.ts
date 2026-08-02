/**
 * catalog のデータ取得境界 (ADR §2.1)。
 *
 * UI 部品はこの interface **だけ**を見る。実 fetch は `http-adapter.ts` に閉じる。
 * 消費先の `/api/v1/harnesses*` は feat-publish-pipeline 側で未実装 (ADR §0 A2) だが、
 * port を挟んでおけば「未実装 = 縮退表示」で画面が成立し、実装到着時は adapter を差し替えるだけで済む。
 *
 * **書込操作を置かない**。promote / rollback / 検査実行 / pointer 更新は feat-publish-pipeline の責務であり、
 * ここに口を開けると本 feature が状態機械を進められてしまう (test-design DC-SCOPE-03)。
 */
import type {
  CatalogDetail,
  CatalogFailureKind,
  CatalogListQuery,
  CatalogListResponse,
  InstallDescriptor,
  PublishRequestView,
  ReleaseListResponse,
} from '@harness-hub/schemas';

/** 失敗の観測結果。UI はこれを `classifyCatalogFailure` の結果とともに扱う。 */
export interface CatalogFailure {
  kind: CatalogFailureKind;
  /** HTTP status。ネットワーク到達不能なら null。 */
  status: number | null;
  /** `Retry-After` の秒数。無ければ null。 */
  retryAfterSeconds: number | null;
  /** 利用者向けの説明 (平易な日本語)。 */
  message: string;
}

export type CatalogResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: CatalogFailure };

/** テナント境界。**すべての取得でこれを必須にする** (省略を「全件」と解釈させない)。 */
export interface CatalogScope {
  tenantId: string;
  workspaceId: string;
}

export interface CatalogPort {
  /** S01 一覧。 */
  listEntries(
    scope: CatalogScope,
    query: CatalogListQuery,
    signal?: AbortSignal,
  ): Promise<CatalogResult<CatalogListResponse>>;
  /** S02 詳細。 */
  getDetail(scope: CatalogScope, projectId: string, signal?: AbortSignal): Promise<CatalogResult<CatalogDetail>>;
  /** S02/S04 の release 履歴。 */
  listReleases(
    scope: CatalogScope,
    projectId: string,
    signal?: AbortSignal,
  ): Promise<CatalogResult<ReleaseListResponse>>;
  /** S03 公開状態 (ポーリング対象)。 */
  getPublishRequest(
    scope: CatalogScope,
    publishId: string,
    signal?: AbortSignal,
  ): Promise<CatalogResult<PublishRequestView>>;
  /**
   * install descriptor の取得。`Idempotency-Key` は呼び出し側が生成して渡す。
   * download count の重複加算を防ぐため、同じ導入操作では同じ鍵を再送する。
   */
  requestInstall(
    scope: CatalogScope,
    projectId: string,
    input: { releaseId: string; idempotencyKey: string },
    signal?: AbortSignal,
  ): Promise<CatalogResult<InstallDescriptor>>;
}
