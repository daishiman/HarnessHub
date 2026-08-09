/**
 * session role から「ナビゲーションへ action の導線を出してよいか」を投影する。
 *
 * これは API の最終認可ではない。resource の tenant/workspace/owner 条件は request ごとに
 * `withAuthz()` が検査する。ここでは ACTION_RULES の credential と minRole だけを使い、
 * 明らかに実行できない導線を DOM へ出さないための fail-closed な表示判定を返す。
 */

import { findActionRule } from './rules.js';
import type { BaseRole } from './types.js';
import { atLeast } from './types.js';

export function sessionActionVisible(role: BaseRole | null, action: string): boolean {
  if (role === null) return false;

  const rule = findActionRule(action);
  if (rule === null) return false;

  const acceptsSession =
    rule.credential === 'session' || rule.credential === 'either' || rule.credential === 'session_or_cwv_probe';

  return acceptsSession && atLeast(role, rule.minRole);
}
