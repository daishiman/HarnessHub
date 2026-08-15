/**
 * 旧 S09 route (`/metrics`) の互換転送 (sys-metrics-tracking-p05 / ADR §37)。
 *
 * 何を: 画面本体は `/dashboard` へ移したので、ここは転送だけを行う。
 * なぜ: 旧 route に画面本体を残すと認可と表示の owner が 2 つに割れ、片方だけ直す事故が起きる。
 *
 * 共有済みの URL が壊れないよう、クエリはそのまま (同名の繰り返しも潰さずに) 引き継ぐ。
 */
import { createLegacyRedirectPage } from '../../../lib/routing/legacy-route-redirect.js';

export default createLegacyRedirectPage('/dashboard');
