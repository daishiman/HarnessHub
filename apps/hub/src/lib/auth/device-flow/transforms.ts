/**
 * `createDeviceFlowService` が使う副作用の無い変換関数群。
 *
 * DB / clock に依存しない純粋関数だけを置く (service.ts 本体の 500 行超過を避けるため
 * HarnessHub-v22l で分離した)。
 */

import type { TokenSummary } from '@harness-hub/schemas';

import { AUTH_NUMERIC_CONTRACT } from '../config.js';
import type { PublisherTokenRecord } from '../ports.js';

/**
 * 人が読み上げ・手入力した user_code を照合できる形へ寄せる。
 *
 * Crockford Base32 は `I/L/O/U` を集合から外しているので、それらが入力されたら
 * **取り違えとして復元する** (`I`/`L`→`1`、`O`→`0`)。ここで直さないと、
 * 「読み上げは合っているのに照合が落ちる」という利用者から見て不可解な失敗になる。
 * 区切りのハイフンと空白も落とす。
 */
export function normalizeUserCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
}

/**
 * polling 間隔の増減 (docs/security-spec.md §2.2 = qa-073 で確定。起点は ADR 実装追補 §10.7)。
 *
 * RFC 8628 §3.5 が定めているのは「`slow_down` を返したら interval を **5 秒増やす**」までで、
 * **上限も、素直に待った client への減衰も規定していない**。
 * 規約どおりに増やすだけだと間隔は単調増加し、device_code の TTL (10 分) を追い越しうる。
 * そうなると client は「次に叩いてよい時刻」に達する前に code が期限切れになり、
 * 自分で自分の flow を詰ませる。
 *
 * そこで加算 (`nextPollIntervalSeconds`) と減算 (`relaxedPollIntervalSeconds`) を対にし、
 * どちらも同じ `devicePollBackoffSeconds` 幅で動かす。加算と減算の幅が同じなので、
 * 「速く叩いて罰を受け、次だけ守って帳消しにする」交互 polling は差し引き 0 にしかならない。
 * 減衰幅を加算幅より大きくすると、この交互 polling が実質的に罰を免れる。
 *
 * 上限・下限は幅ではなく**到達点**で押さえる:
 *   - 上限 `devicePollMaxIntervalSeconds` (60 秒) — server が強制する待ち時間の頭打ち。
 *     TTL 600 秒に対し最悪でも 10 回は叩けるので、server 側の都合で flow を殺せない。
 *   - 下限 `devicePollIntervalSeconds` (5 秒) — 発行時に client へ告げた `interval`。
 *     ここより下げると、告知値どおりに叩いている client を後から `slow_down` にできてしまう。
 *
 * 限界: 上限が縛るのは**server が強制する**間隔だけである。client が自分側で保持する間隔は
 * RFC どおり `slow_down` のたびに +5 秒され、こちらには上限が無い。client が減衰を知らずに
 * 増やし続ければ TTL 内に叩かなくなりうるが、それは client 実装の責務で server からは是正できない。
 */
export function nextPollIntervalSeconds(currentIntervalSeconds: number): number {
  return Math.min(
    currentIntervalSeconds + AUTH_NUMERIC_CONTRACT.devicePollBackoffSeconds,
    AUTH_NUMERIC_CONTRACT.devicePollMaxIntervalSeconds,
  );
}

/** 間隔を守った polling に対して罰を 1 段だけ戻す。初期値より下へは戻さない。 */
export function relaxedPollIntervalSeconds(currentIntervalSeconds: number): number {
  return Math.max(
    currentIntervalSeconds - AUTH_NUMERIC_CONTRACT.devicePollBackoffSeconds,
    AUTH_NUMERIC_CONTRACT.devicePollIntervalSeconds,
  );
}

/** 一覧表示用の要約。**平文 token を含めない**のが契約上の要点 (一覧経路から資格情報を漏らさない)。 */
export function toSummary(record: PublisherTokenRecord, nowSeconds: number): TokenSummary {
  const status =
    record.revokedAtSeconds !== null ? 'revoked' : record.expiresAtSeconds <= nowSeconds ? 'expired' : 'active';
  return {
    id: record.id,
    device_label: record.deviceLabel,
    scope: [...record.scope],
    workspace_id: record.workspaceId,
    created_at: new Date(record.createdAtSeconds * 1000).toISOString(),
    last_used_at: record.lastUsedAtSeconds === null ? null : new Date(record.lastUsedAtSeconds * 1000).toISOString(),
    expires_at: new Date(record.expiresAtSeconds * 1000).toISOString(),
    status,
  };
}
