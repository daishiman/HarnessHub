/** device flow (RFC 8628) の公開入口。 */

export { generateOpaqueToken, generateUserCode, type RandomBytes, systemRandomBytes } from './codes.js';
export type {
  ApproveRejection,
  ApproveResult,
  DeviceFlowDeps,
  DeviceFlowResult,
  DeviceFlowService,
} from './contracts.js';
export {
  createDeviceFlowService,
  normalizeUserCode,
} from './service.js';
