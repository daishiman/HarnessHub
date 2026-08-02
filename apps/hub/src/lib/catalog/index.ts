/** feat-dual-catalog-web の純粋ロジック層の公開入口。UI 部品はここ経由で参照する。 */

export type { CatalogCapabilities } from './degradation.js';
export { catalogCapabilities, classifyCatalogFailure, isDegraded } from './degradation.js';
export { httpCatalogPort } from './http-adapter.js';
export type { MarketplaceBuildOptions, PluginSourceResolver } from './marketplace.js';
export { buildMarketplaceDocument, resolveAdoptedSourceResolver } from './marketplace.js';
export type { PollingState } from './polling.js';
export {
  INITIAL_POLL_INTERVAL_MS,
  isPollablePublishState,
  MAX_CONSECUTIVE_FAILURES,
  MAX_POLL_DURATION_MS,
  MAX_POLL_INTERVAL_MS,
  nextPollIntervalMs,
  parseRetryAfterSeconds,
  resolveRetryDelayMs,
  shouldContinuePolling,
} from './polling.js';
export type { CatalogFailure, CatalogPort, CatalogResult, CatalogScope } from './ports.js';
export { publishStatusChipValue } from './publish-status.js';
