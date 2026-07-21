// 第 2 consumer 系統による PII ガード (apps/hub/src/shared/pii) の利用。
// 「どの属性が要保護か」は policy 側の単一ソースに委ね、fixture でマスク処理を再実装しない。
import {
  ADMIN_ROLE,
  canView,
  maskPii,
  maskPiiForExport,
  PII_MASK,
  type PiiFieldPolicy,
  type PiiViewer,
} from '../../../src/shared/pii/index.js';

export const boundMaskPii = maskPii;
export const boundMaskPiiForExport = maskPiiForExport;
export const boundCanView = canView;
export const boundAdminRole = ADMIN_ROLE;
export const boundPiiMask = PII_MASK;

/** qa-032 の salary を含む代表的な policy */
export const samplePolicies: readonly PiiFieldPolicy[] = [
  { field: 'salary', sensitivity: 'admin_only' },
  { field: 'passwordHash', sensitivity: 'never_exposed' },
];

export const sampleRecord = {
  id: 'user-1',
  displayName: '山田',
  salary: 6_000_000,
  passwordHash: 'hash',
} as const;

export const adminViewer: PiiViewer = { roles: [ADMIN_ROLE] };
export const memberViewer: PiiViewer = { roles: ['member'] };

export function maskForViewer(viewer: PiiViewer): Record<string, unknown> {
  return maskPii(sampleRecord, samplePolicies, viewer);
}

export function maskForExport(): Record<string, unknown> {
  return maskPiiForExport(sampleRecord, samplePolicies);
}
