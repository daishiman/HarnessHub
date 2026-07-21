// 第 2 consumer 系統による監査 event logger (apps/hub/src/shared/audit) の利用。
// スコープ (RepositoryContext) は @harness-hub/db の境界型をそのまま使い、fixture 側で書き写さない。
import {
  type AuditEvent,
  type AuditEventDetail,
  auditEventFromContext,
  createAuditLogger,
  createInMemoryAuditSink,
  type RecordedAuditEvent,
} from '../../../src/shared/audit/index.js';
import { sampleContext } from './uses-db.js';

export const boundCreateAuditLogger = createAuditLogger;
export const boundAuditEventFromContext = auditEventFromContext;
export const boundCreateInMemoryAuditSink = createInMemoryAuditSink;

export const sampleDetail: AuditEventDetail = {
  action: 'publish_request.create',
  resourceType: 'publish_request',
  resourceId: 'pr-1',
  metadata: { stage: 'submitted' },
};

export function buildEvent(): AuditEvent {
  return auditEventFromContext(sampleContext, sampleDetail);
}

/** 記録経路を一往復させ、append-only の sink に載ることを consumer 側から確かめる */
export async function recordSample(): Promise<readonly RecordedAuditEvent[]> {
  const sink = createInMemoryAuditSink();
  const logger = createAuditLogger({
    sink,
    now: () => new Date('2026-07-21T00:00:00.000Z'),
    newId: () => 'audit-1',
  });
  await logger.record(buildEvent());
  return sink.events();
}
