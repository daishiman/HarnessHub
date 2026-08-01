/**
 * Device Flow tests の共有 harness。
 *
 * 時刻・ID・port を決定論的に注入し、各 scenario file が振る舞いだけを検証できるようにする。
 */

import type { DeviceFlowService } from '../../src/lib/auth/device-flow/service.js';
import { createDeviceFlowService } from '../../src/lib/auth/device-flow/service.js';
import { createAuditLogger, createInMemoryAuditSink } from '../../src/shared/audit/index.js';
import {
  createSequentialIds,
  createTestPorts,
  directoryUser,
  TENANT_A,
  type TestPorts,
  WORKSPACE_A1,
} from './support/in-memory-ports.js';

export const NOW = 1_800_000_000;
export const USER_ID = 'user-approver';

export interface DeviceFlowHarness {
  readonly service: DeviceFlowService;
  readonly ports: TestPorts;
  readonly audit: ReturnType<typeof createInMemoryAuditSink>;
}

export function createHarness(options: { readonly tenantId?: string } = {}): DeviceFlowHarness {
  const tenantId = options.tenantId ?? TENANT_A;
  const ports = createTestPorts({
    users: [directoryUser({ id: USER_ID, tenantId, workspaceIds: [WORKSPACE_A1] })],
  });
  ports.clock.set(NOW);
  const sink = createInMemoryAuditSink();

  return {
    ports,
    audit: sink,
    service: createDeviceFlowService({
      ports,
      audit: createAuditLogger({
        sink,
        now: () => new Date(ports.clock.nowSeconds() * 1000),
        newId: createSequentialIds('audit'),
      }),
      accessTokenSecret: 'access-secret',
      verificationUri: 'https://hub.example.com/device',
      newId: createSequentialIds('rec'),
    }),
  };
}

/** 承認済みの device_code を作るところまでを 1 手で。多くのテストがここから始まる。 */
export async function approvedDeviceCode(harness: DeviceFlowHarness, tenantId = TENANT_A) {
  const issued = await harness.service.requestCode({ tenantId, scope: ['publish:write'], deviceLabel: 'macbook' });
  const approval = await harness.service.approve({
    tenantId,
    userCode: issued.user_code,
    userId: USER_ID,
    workspaceId: WORKSPACE_A1,
  });
  if (!approval.ok) throw new Error(`前提: 承認できるはず (${approval.reason})`);
  return issued;
}
