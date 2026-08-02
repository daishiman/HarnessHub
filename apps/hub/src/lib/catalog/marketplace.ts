/**
 * marketplace document の生成 (ADR §3.1 / qa-003 / I6 / I9)。
 *
 * **純関数**として書く — 同じ entry 集合からは必ず同じ document が出る。
 * 時刻や乱数が混ざると、edge キャッシュのヒット判定と CI の再現検証が両方壊れる。
 */
import type { CatalogEntry, MarketplaceDocument, MarketplacePlugin } from '@harness-hub/schemas';

/**
 * plugin の `source` を解決する関数。
 *
 * 実体は**採用配布経路 (Stage 0 technical gate H7) が確定してから**実装する。
 * URL 型 marketplace と Bootstrap Installer では source の形が違い、
 * ここで推測値を焼き込むと、gate の結論が出たときに配信済み document が誤った参照を指し続ける。
 */
export type PluginSourceResolver = (entry: CatalogEntry) => string;

export interface MarketplaceBuildOptions {
  name: string;
  description: string;
  version: string;
  ownerName: string;
  /**
   * 採用配布経路の source 解決器。**未確定なら `null`** を渡す。
   * null のときは plugins を 1 件も生成せず `source_status: 'pending-h7'` を返す (fail-closed)。
   */
  source: PluginSourceResolver | null;
}

/**
 * marketplace に載せてよい entry か。
 *
 * - `visibility === 'private'`: 作者のみの版。配布カタログへ出すと意図しない共有になる。
 * - `stable_version === null`: 一度も公開されていない。参照先が存在しない plugin 要素になる。
 * - `release_status !== 'available'`: 停止・非推奨の版を新規導入させない。
 */
function isDistributable(entry: CatalogEntry): boolean {
  if (entry.visibility !== 'workspace') return false;
  if (entry.stable_version === null) return false;
  return entry.release_status === 'available';
}

function toPlugin(entry: CatalogEntry, source: PluginSourceResolver): MarketplacePlugin {
  return {
    name: entry.name,
    source: source(entry),
    description: entry.summary,
    // isDistributable を通った entry は stable_version が非 null であることが保証される
    version: entry.stable_version ?? '',
    category: entry.target,
    tags: [entry.target, entry.visibility],
  };
}

/**
 * marketplace document を組み立てる。
 *
 * `plugins: []` になる理由が 2 通りある (公開対象 0 件 / 配布経路未確定) ため、
 * `source_status` で必ず区別できるようにしている。消費側が「空 = 正常」と読み違えると
 * Stage 0 gate が未成立のまま配布が始まってしまう。
 */
export function buildMarketplaceDocument(
  entries: readonly CatalogEntry[],
  options: MarketplaceBuildOptions,
): MarketplaceDocument {
  const { source } = options;
  const plugins = source === null ? [] : entries.filter(isDistributable).map((entry) => toPlugin(entry, source));

  return {
    name: options.name,
    description: options.description,
    version: options.version,
    metadata: { description: options.description, version: options.version },
    owner: { name: options.ownerName },
    plugins,
    source_status: source === null ? 'pending-h7' : 'ready',
  };
}

/**
 * 採用配布経路の解決。
 *
 * 判定の正本は `docs/features/feat-stage0-distribution-gate/stage0-gate-conclusion.md` の
 * frontmatter `verdict` であり、現在は `H7_NOT_ESTABLISHED`。成立へ変わった時点で resolver を実装する。
 * それまでは `null` を返し、配信面に `pending-h7` を出し続ける。
 * **未確定を「経路なし」ではなく「未確定」として観測できる状態に保つことが fail-closed の実体**。
 *
 * 判定条件に decision ID (`D7` など) を使わない — `spec-state.json` の `D7` は
 * 「環境構成: 常設 staging を持つか」であり配布経路とは無関係。ID の再利用で
 * 「登録された = 経路が確定した」と誤読すると、未成立のまま配布が始まる。
 * verdict と実装の一致は DC-MKT-10 が固定する。
 */
export function resolveAdoptedSourceResolver(): PluginSourceResolver | null {
  return null;
}
