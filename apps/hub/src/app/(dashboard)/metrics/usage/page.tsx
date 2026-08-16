/**
 * 旧 S16 route (`/metrics/usage`) の互換転送 (sys-metrics-tracking-p05 / ADR §37)。
 *
 * 何を: 画面本体は `/tracking` へ移したので、ここは転送だけを行う。
 * なぜ: 旧 route を第二の画面 owner として残さないため (ADR §37「S09/S16 contract」)。
 */
import { createLegacyRedirectPage } from '../../../../lib/routing/legacy-route-redirect.js';

export default createLegacyRedirectPage('/tracking');
