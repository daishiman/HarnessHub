/**
 * publish pipeline の監査 action 名の正本。
 *
 * **認可の action 名と監査の action 名は別物**である。認可側 (`lib/authz/rules.ts` の `ACTION_RULES`) は
 * 「誰が呼べるか」を決める鍵で、複数の endpoint が同じ鍵を共有してよい (例: submit と package upload は
 * どちらも `publish.write`)。一方ここは「何が起きたか」の記録語彙なので、endpoint 操作ごとに 1 つ要る。
 * 共有すると監査ログから「submit されたのか、パッケージが差し替わったのか」が読めなくなる。
 *
 * docs/backend-spec.md §3.8 の列挙と同じ語彙を使う。認可の `publish.write` のような
 * 複数 endpoint 共通 action へ監査語彙を畳み込まず、操作単位で保持する。
 */

/** 監査 event の action 名。値はそのまま `audit_events.action` 列へ入る。 */
export const PUBLISH_AUDIT_ACTIONS = {
  /** POST /api/v1/projects (docs/backend-spec.md §3.8 確定語) */
  projectCreate: 'project.create',
  /** POST /api/v1/publish (§3.8 確定語) */
  request: 'publish.request',
  /** PUT /api/v1/publish/:id/package (§3.8 確定語) */
  packageUpload: 'publish.package_upload',
  /** POST /api/v1/publish/:id/submit (§3.8 確定語) */
  submit: 'publish.submit',
  /** POST /api/v1/publish/:id/approve (§3.8 確定語) */
  approve: 'publish.approve',
  /** POST /api/v1/publish/:id/cancel (§3.8 確定語。差戻し語 publish.reject とは別に持つ) */
  cancel: 'publish.cancel',
  /** POST /api/v1/channels/:id/promote (§3.8 確定語) */
  promote: 'channel.promote',
  /** POST /api/v1/channels/:id/rollback (§3.8 確定語) */
  rollback: 'channel.rollback',
  /** POST /api/v1/releases/:id/suspend (§3.8 確定語) */
  suspend: 'release.suspend',
  /** POST /api/v1/projects/:id/deployment (§3.8 確定語) */
  registerDeployment: 'deployment.register',
} as const;

export type PublishAuditAction = (typeof PUBLISH_AUDIT_ACTIONS)[keyof typeof PUBLISH_AUDIT_ACTIONS];

/** `audit_events.entity_type` に入る資源種別。resource 参照 (`AuthzResourceRef.type`) と同じ語彙に揃える。 */
export const PUBLISH_AUDIT_ENTITIES = {
  project: 'project',
  publishRequest: 'publish_request',
  channel: 'target_channel',
  release: 'release',
  deployment: 'deployment_reference',
} as const;
