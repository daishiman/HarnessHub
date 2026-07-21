// 第 2 consumer 系統による telemetry ingest / rollup (apps/hub/src/shared/telemetry) の利用。
// 生イベントのオンライン集計は禁止 (B3) なので、fixture 側も rollup 関数を通してのみ集計する。
import {
  createTelemetryIngest,
  type IngestedTelemetryEvent,
  rollupTelemetry,
  type TelemetryEvent,
  type TelemetryIngestResult,
  type TelemetryRollup,
  type TelemetryStore,
} from '../../../src/shared/telemetry/index.js';

export const boundCreateTelemetryIngest = createTelemetryIngest;
export const boundRollupTelemetry = rollupTelemetry;

export const sampleEvents: readonly TelemetryEvent[] = [
  { tenantId: 'tenant-a', workspaceId: 'workspace-1', metric: 'harness.run', value: 1, idempotencyKey: 'e-1' },
  { tenantId: 'tenant-a', workspaceId: 'workspace-1', metric: 'harness.run', value: 2, idempotencyKey: 'e-2' },
  // 同一バッチ内の重複。冪等キーで畳まれる想定
  { tenantId: 'tenant-a', workspaceId: 'workspace-1', metric: 'harness.run', value: 3, idempotencyKey: 'e-1' },
];

/** 受け入れた event をそのまま保持する store */
export function createCollectingStore(collected: IngestedTelemetryEvent[]): TelemetryStore {
  return {
    appendUnique: async (events) => {
      collected.push(...events);
      return events.length;
    },
  };
}

export async function ingestSample(collected: IngestedTelemetryEvent[]): Promise<TelemetryIngestResult> {
  const ingest = createTelemetryIngest({
    store: createCollectingStore(collected),
    now: () => new Date('2026-07-21T00:30:00.000Z'),
  });
  return ingest.ingest(sampleEvents);
}

/** 日別バケット (86400 秒) の集計 */
export function rollupSample(events: readonly IngestedTelemetryEvent[]): readonly TelemetryRollup[] {
  return rollupTelemetry(events, 86_400);
}
