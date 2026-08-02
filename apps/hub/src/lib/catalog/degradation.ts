/**
 * Hub 停止時の縮退判定 (§6.1 / qa-011 / qa-019)。acceptance 3 の直接根拠。
 *
 * 「Hub が落ちている」と「あなたには権限が無い」と「壊れている」は利用者にとって全く別の事象であり、
 * 一律のエラー画面にすると、導入済みツールが動いているのに使えないと誤解される。
 * ここで 4 分類に落とし、UI 側の見せ方を決める。
 */
import type { CatalogFailureKind } from '@harness-hub/schemas';

/**
 * HTTP status から失敗種別を決める。
 *
 * `404` を `fatal` にしない点が重要。本 feature が消費する `/api/v1/harnesses*` は
 * feat-publish-pipeline 側で未実装であり (ADR §0 A2)、未実装を「壊れている」と表示すると
 * 実際には健全な縮退状態が障害として報告される。
 */
export function classifyCatalogFailure(status: number | null | undefined): CatalogFailureKind {
  if (status === null || status === undefined) return 'degraded'; // ネットワーク到達不能
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'degraded';
  if (status === 408 || status === 429) return 'degraded';
  if (status >= 500) return 'degraded';
  if (status >= 400) return 'fatal';
  return 'fatal';
}

/**
 * 失敗種別ごとに UI が許す操作。
 *
 * **縮退時に閲覧と導入情報のコピーを残すことが「Hub 停止中も導入済み Skill が動作継続する」の UI 面の担保**。
 * 逆に新規公開・追加・更新はサーバ側の状態遷移を伴うので、縮退中は導線ごと止める。
 */
export interface CatalogCapabilities {
  /** 取得済みデータの閲覧。 */
  canBrowse: boolean;
  /** install descriptor の表示・コピー。 */
  canCopyInstallDescriptor: boolean;
  /** 新規公開・追加・更新。 */
  canMutate: boolean;
  /** サインイン画面へ送るべきか。 */
  requiresSignIn: boolean;
}

export function catalogCapabilities(kind: CatalogFailureKind): CatalogCapabilities {
  switch (kind) {
    case 'degraded':
      return { canBrowse: true, canCopyInstallDescriptor: true, canMutate: false, requiresSignIn: false };
    case 'unauthorized':
      return { canBrowse: false, canCopyInstallDescriptor: false, canMutate: false, requiresSignIn: true };
    case 'forbidden':
      // 権限不足はサインインし直しても解決しない。再サインインへ誘導するとループになる
      return { canBrowse: false, canCopyInstallDescriptor: false, canMutate: false, requiresSignIn: false };
    case 'fatal':
      return { canBrowse: false, canCopyInstallDescriptor: false, canMutate: false, requiresSignIn: false };
  }
}

/** 縮退が起きているか (= 画面を潰さずバナーを出す状態か)。 */
export function isDegraded(kind: CatalogFailureKind): boolean {
  return kind === 'degraded';
}
