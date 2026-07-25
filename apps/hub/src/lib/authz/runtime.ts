/**
 * 認証・認可の合成点 (composition root)。
 *
 * ここだけが「実装の実体をどこから取るか」を知る。route も判定層も port 型しか見ない。
 *
 * **未結線を隠さない**: feat-domain-model-db の repository は着地済みだが、AuthPorts が要求する
 * Device Flow / Workspace の永続化項目が現行 schema と一致しない。そのため `authRuntime()` は例外を投げる。
 * 「動くふりをする in-memory 実装を本番経路へ差す」ことは意図的にしていない —
 * それをやると認証が通ってしまい、未実装が 200 応答で隠れる (ADR AD-8 と同じ理由)。
 */

import { type AuditSink, createAuditLogger } from '../../shared/audit/index.js';
import { createDeviceFlowService, type DeviceFlowService } from '../auth/device-flow/index.js';
import type { AuthPorts } from '../auth/ports.js';
import { createRevocationChecker } from './revocation.js';
import type { AuthzRuntimeDeps } from './with-authz.js';

export interface AuthRuntimeEnv {
  readonly sessionSecret: string;
  readonly accessTokenSecret: string;
  /** state-changing 要求で許可する Origin。 */
  readonly allowedOrigins: readonly string[];
  /** device flow の照合画面 URL。 */
  readonly verificationUri: string;
}

export interface AuthRuntime {
  readonly ports: AuthPorts;
  readonly authz: AuthzRuntimeDeps;
  readonly deviceFlow: DeviceFlowService;
}

export function createAuthRuntime(input: { ports: AuthPorts; auditSink: AuditSink; env: AuthRuntimeEnv }): AuthRuntime {
  const audit = createAuditLogger({ sink: input.auditSink });

  return {
    ports: input.ports,
    authz: {
      ports: input.ports,
      audit,
      // checker は runtime 単位で 1 つ。要求ごとに作ると TTL キャッシュが毎回空になる
      revocation: createRevocationChecker(input.ports.sessionRevocations, input.ports.clock),
      sessionSecret: input.env.sessionSecret,
      accessTokenSecret: input.env.accessTokenSecret,
      allowedOrigins: input.env.allowedOrigins,
    },
    deviceFlow: createDeviceFlowService({
      ports: input.ports,
      audit,
      accessTokenSecret: input.env.accessTokenSecret,
      verificationUri: input.env.verificationUri,
    }),
  };
}

/** 環境変数から設定を読む。欠けている値は既定へ落とさず例外にする (fail-closed)。 */
export function readAuthRuntimeEnv(source: Record<string, string | undefined> = process.env): AuthRuntimeEnv {
  return {
    sessionSecret: required(source, 'AUTH_SESSION_SECRET'),
    accessTokenSecret: required(source, 'AUTH_ACCESS_TOKEN_SECRET'),
    allowedOrigins: required(source, 'AUTH_ALLOWED_ORIGINS')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    verificationUri: required(source, 'AUTH_DEVICE_VERIFICATION_URI'),
  };
}

/**
 * 本番経路の runtime。
 * port/schema 契約が未整合のため現時点では必ず例外になる。結線後にここを差し替える
 * (architecture-implementation-notes.md §11 / HarnessHub-b7ng)。
 */
export function authRuntime(): AuthRuntime {
  throw new Error(
    'auth runtime unavailable: AuthPorts と packages/db の Device Flow / Workspace 永続化契約が未整合です ' +
      '(feat-domain-model-db 所有 / HarnessHub-b7ng)。',
  );
}

function required(source: Record<string, string | undefined>, key: string): string {
  const value = source[key];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`環境変数 ${key} が未設定です`);
  }
  return value;
}
