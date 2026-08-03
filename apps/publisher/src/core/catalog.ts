/**
 * marketplace catalog 表示用エントリの組み立て (AD-1 core/)。
 * 表示用の整形のみを行い、公開可否の判定は一切行わない (判定は inspection-client/ の責務)。
 */
import type { CompletedManifest } from './manifest.js';

export interface MarketplaceCatalogEntry {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly owner: string | null;
  readonly visibility: 'private' | 'workspace';
  readonly summary: string;
}

export function buildCatalogEntry(manifest: CompletedManifest): MarketplaceCatalogEntry {
  return {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    owner: manifest.owner,
    visibility: manifest.visibility,
    summary: manifest.summary,
  };
}
