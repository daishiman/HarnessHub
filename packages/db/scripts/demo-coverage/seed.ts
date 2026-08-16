// 網羅確認用デモデータの投入 (ADR §3 / §5 / §6)。
//
// 28 route × 5 状態 × ドメイン enum 全 132 値を、決定論 ID と固定時刻だけで作る。
// 実行時刻・乱数を一切使わないので、何度実行しても、いつ実行しても同じ行になる (T3)。
//
// 冪等性の作り方は「テナント境界で消してから入れ直す」である。UPSERT を積み上げると、
// 前回の実行で作った余分な行が残り「2 回目のダイジェストが一致しない」を踏む。
// テナントに属さない 2 テーブル (packages / encryption_keys の全体鍵) だけは、
// 決定論 ID の集合を明示して消す。
//
// 各行ビルダーが戻り値型を明示しているのは、schema の enum 列がリテラル型を要求するためである。
// 型注釈があると綴り違いの列挙値が実行時ではなく型検査で落ちる。逆に `as string` で潰すと
// リテラル型まで失われ、enum 列の検査が丸ごと無効になる。

import { hearingSheetEstimateSchema, hearingSheetFormSnapshotSchema } from '@harness-hub/schemas';
import { inArray } from 'drizzle-orm';
import type { CoreAdapter } from '../../repository/db';
import * as schema from '../../schema/index';
import { BASE_TIME, BULK_SERIES, bulkKeys, DERIVED_SERIES, ENUM_SERIES, KEYS, LONG_TEXT } from './fixtures';
import { seedId } from './seed-id';

export interface SeedOptions {
  readonly adapter: CoreAdapter;
}

export interface SeedSummary {
  /** SQL テーブル名 → 投入行数。テーブルを跨いだ件数の申告はここだけに置く。 */
  readonly counts: Record<string, number>;
}

/**
 * 1 文あたりの行数上限。
 *
 * SQLite の bind 変数は 1 文 999 個までで、超えると `too many SQL variables` で落ちる。
 * 最も列の多い documents が 18 列なので、50 行 = 900 変数で必ず下回る。
 */
const CHUNK_SIZE = 50;

/** BASE_TIME からの分オフセットで時刻を決める。Date.now() は使わない。 */
function at(minutes: number): number {
  return BASE_TIME + minutes * 60_000;
}

const DAY = 1_440;

/**
 * 配列から index 番目を取り出す。長さを超えたら巡回する。
 *
 * `noUncheckedIndexedAccess` のため `values[i]` の型は `T | undefined` になる。
 * `as string` で潰すとリテラル型まで失われるので、型を保ったまま undefined だけを外す。
 */
function pick<TValue>(values: readonly TValue[], index: number): TValue {
  const value = values[index % values.length];
  if (value === undefined) {
    throw new Error(`索引 ${index} を解決できません (長さ ${values.length})`);
  }
  return value;
}

/** 長文パターンを取り出す。fixtures 側の配列長を実装が黙って前提にしないための関数。 */
function longText(kind: keyof typeof LONG_TEXT, index: number): string {
  return pick(LONG_TEXT[kind], index);
}

// --- 決定論 ID の束 ---------------------------------------------------------

const TENANT = {
  main: seedId(KEYS.tenantMain),
  suspended: seedId(KEYS.tenantSuspended),
  empty: seedId(KEYS.tenantEmpty),
  secondary: seedId(KEYS.tenantSecondary),
} as const;

/** 削除の走査範囲。この 4 テナントの外側には一切触れない。 */
const TENANT_IDS: readonly string[] = [TENANT.main, TENANT.suspended, TENANT.empty, TENANT.secondary];

const WORKSPACE = {
  main: seedId(KEYS.workspaceMain),
  suspended: seedId(KEYS.workspaceSuspended),
} as const;

const USER = {
  providerAdmin: seedId(KEYS.userProviderAdmin),
  workspaceAdmin: seedId(KEYS.userWorkspaceAdmin),
  member: seedId(KEYS.userMember),
  inactive: seedId(KEYS.userInactive),
} as const;

const PROJECT = {
  active: seedId(KEYS.projectActive),
  suspended: seedId(KEYS.projectSuspended),
  archived: seedId(KEYS.projectArchived),
} as const;

const CHANNEL = ENUM_SERIES.targetChannels.map(seedId);
const BUILD = ENUM_SERIES.builds.map(seedId);
const SHEET = ENUM_SERIES.hearingSheets.map(seedId);
const AI_JOB = ENUM_SERIES.aiJobs.map(seedId);
const PUBLISH_REQUEST = ENUM_SERIES.publishRequests.map(seedId);
const ROLLUP = ENUM_SERIES.metricsRollups.map(seedId);

const RELEASE = {
  available: seedId(KEYS.releaseAvailable),
  suspended: seedId(KEYS.releaseSuspended),
  deprecated: seedId(KEYS.releaseDeprecated),
} as const;

const PACKAGE_HASH = seedId(KEYS.packageSkills);

const ENCRYPTION_KEY_IDS: readonly string[] = [
  seedId(KEYS.encryptionSalaryActive),
  seedId(KEYS.encryptionSalaryRetiring),
  seedId(KEYS.encryptionSalaryRetired),
  seedId(KEYS.encryptionIdpSecret),
  seedId(KEYS.encryptionTenantData),
];

const TENANT_DATA = {
  knowledgeDoc: seedId(KEYS.tenantDataKnowledgeDoc),
  runInput: seedId(KEYS.tenantDataRunInput),
  runOutput: seedId(KEYS.tenantDataRunOutput),
  screenshot: seedId(KEYS.tenantDataScreenshot),
} as const;

const DOCUMENT = {
  commonPublished: seedId(KEYS.documentCommonPublished),
  commonDraft: seedId(KEYS.documentCommonDraft),
  tenantPublished: seedId(KEYS.documentTenantPublished),
  tenantDraft: seedId(KEYS.documentTenantDraft),
} as const;

const FEEDBACK = {
  open: seedId(KEYS.feedbackOpen),
  inProgress: seedId(KEYS.feedbackInProgress),
  resolved: seedId(KEYS.feedbackResolved),
} as const;

const DEPARTMENT = '経営企画本部';
const OTHER_DEPARTMENT = '営業推進部';

/** 大量パターンの論理キーを key で引く。BULK_SERIES と 1 対 1。 */
function bulkIds(key: string): string[] {
  const series = BULK_SERIES.find((entry) => entry.key === key);
  if (series === undefined) {
    throw new Error(`BULK_SERIES に ${key} がありません`);
  }
  return bulkKeys(series.prefix, series.count).map(seedId);
}

/** 分割して INSERT し、投入件数を返す。 */
async function insertAll<TRow>(rows: readonly TRow[], write: (chunk: TRow[]) => Promise<unknown>): Promise<number> {
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    await write(rows.slice(index, index + CHUNK_SIZE));
  }
  return rows.length;
}

/**
 * 網羅確認用のデモデータを投入する。
 *
 * 接続文字列はここで読まない。呼び手が開いた adapter をそのまま使うことで、
 * 「テストは一時ファイル、CLI はローカル DB」という差を実装の外側に置ける。
 */
export async function seedDemoCoverage(options: SeedOptions): Promise<SeedSummary> {
  const db = options.adapter.client;

  await purge(db);

  const counts: Record<string, number> = {};

  // --- identity -----------------------------------------------------------
  counts.tenants = await insertAll(tenantRows(), (chunk) => db.insert(schema.tenants).values(chunk));
  counts.idp_connections = await insertAll(idpConnectionRows(), (chunk) =>
    db.insert(schema.idpConnections).values(chunk),
  );
  counts.workspaces = await insertAll(workspaceRows(), (chunk) => db.insert(schema.workspaces).values(chunk));
  counts.users = await insertAll(userRows(), (chunk) => db.insert(schema.users).values(chunk));
  counts.user_workspaces = await insertAll(userWorkspaceRows(), (chunk) =>
    db.insert(schema.userWorkspaces).values(chunk),
  );
  counts.user_settings = await insertAll(userSettingRows(), (chunk) => db.insert(schema.userSettings).values(chunk));

  // --- catalog ------------------------------------------------------------
  counts.projects = await insertAll(projectRows(), (chunk) => db.insert(schema.projects).values(chunk));
  counts.target_channels = await insertAll(targetChannelRows(), (chunk) =>
    db.insert(schema.targetChannels).values(chunk),
  );
  counts.packages = await insertAll(packageRows(), (chunk) => db.insert(schema.packages).values(chunk));
  counts.releases = await insertAll(releaseRows(), (chunk) => db.insert(schema.releases).values(chunk));
  counts.deployment_references = await insertAll(deploymentReferenceRows(), (chunk) =>
    db.insert(schema.deploymentReferences).values(chunk),
  );
  counts.catalog_entries = await insertAll(catalogEntryRows(), (chunk) =>
    db.insert(schema.catalogEntries).values(chunk),
  );

  // --- publish ------------------------------------------------------------
  counts.publish_requests = await insertAll(publishRequestRows(), (chunk) =>
    db.insert(schema.publishRequests).values(chunk),
  );
  counts.publisher_tokens = await insertAll(publisherTokenRows(), (chunk) =>
    db.insert(schema.publisherTokens).values(chunk),
  );
  counts.device_authorizations = await insertAll(deviceAuthorizationRows(), (chunk) =>
    db.insert(schema.deviceAuthorizations).values(chunk),
  );
  counts.idempotency_ledger = await insertAll(idempotencyLedgerRows(), (chunk) =>
    db.insert(schema.idempotencyLedger).values(chunk),
  );

  // --- security / smoke ---------------------------------------------------
  counts.audit_events = await insertAll(auditEventRows(), (chunk) => db.insert(schema.auditEvents).values(chunk));
  counts.encryption_keys = await insertAll(encryptionKeyRows(), (chunk) =>
    db.insert(schema.encryptionKeys).values(chunk),
  );
  counts.session_revocations = await insertAll(sessionRevocationRows(), (chunk) =>
    db.insert(schema.sessionRevocations).values(chunk),
  );
  counts.smoke_fixture_leases = await insertAll(smokeFixtureLeaseRows(), (chunk) =>
    db.insert(schema.smokeFixtureLeases).values(chunk),
  );

  // --- tenant data --------------------------------------------------------
  counts.tenant_data_objects = await insertAll(tenantDataObjectRows(), (chunk) =>
    db.insert(schema.tenantDataObjects).values(chunk),
  );
  counts.tenant_data_tombstones = await insertAll(tenantDataTombstoneRows(), (chunk) =>
    db.insert(schema.tenantDataTombstones).values(chunk),
  );

  // --- hearing intake -----------------------------------------------------
  counts.hearing_sheets = await insertAll(hearingSheetRows(), (chunk) => db.insert(schema.hearingSheets).values(chunk));
  counts.ai_jobs = await insertAll(aiJobRows(), (chunk) => db.insert(schema.aiJobs).values(chunk));
  counts.display_code_counters = await insertAll(displayCodeCounterRows(), (chunk) =>
    db.insert(schema.displayCodeCounters).values(chunk),
  );
  counts.hearing_screenshots = await insertAll(hearingScreenshotRows(), (chunk) =>
    db.insert(schema.hearingScreenshots).values(chunk),
  );
  counts.hearing_share_tokens = await insertAll(hearingShareTokenRows(), (chunk) =>
    db.insert(schema.hearingShareTokens).values(chunk),
  );
  counts.tenant_coefficients = await insertAll(tenantCoefficientRows(), (chunk) =>
    db.insert(schema.tenantCoefficients).values(chunk),
  );

  // --- docs / feedback / builds / metrics ---------------------------------
  counts.notion_integrations = await insertAll(notionIntegrationRows(), (chunk) =>
    db.insert(schema.notionIntegrations).values(chunk),
  );
  counts.documents = await insertAll(documentRows(), (chunk) => db.insert(schema.documents).values(chunk));
  counts.mutation_create_idempotency = await insertAll(mutationCreateIdempotencyRows(), (chunk) =>
    db.insert(schema.mutationCreateIdempotency).values(chunk),
  );
  counts.feedbacks = await insertAll(feedbackRows(), (chunk) => db.insert(schema.feedbacks).values(chunk));
  counts.builds = await insertAll(buildRows(), (chunk) => db.insert(schema.builds).values(chunk));
  counts.build_stage_events = await insertAll(buildStageEventRows(), (chunk) =>
    db.insert(schema.buildStageEvents).values(chunk),
  );
  counts.metrics_events = await insertAll(metricsEventRows(), (chunk) => db.insert(schema.metricsEvents).values(chunk));
  counts.metrics_rollups = await insertAll(metricsRollupRows(), (chunk) =>
    db.insert(schema.metricsRollups).values(chunk),
  );

  return { counts };
}

/**
 * 前回の投入分を消す。
 *
 * 子から親の順で消すのは、外部キーが宣言されている場合に備えた論理的な整合のためで、
 * 現在の schema は FK を宣言していないため実行上の制約ではない。
 */
async function purge(db: CoreAdapter['client']): Promise<void> {
  const userIds = [...Object.values(USER), ...bulkIds('users/list')];

  await db.delete(schema.buildStageEvents).where(inArray(schema.buildStageEvents.tenantId, TENANT_IDS));
  await db.delete(schema.builds).where(inArray(schema.builds.tenantId, TENANT_IDS));
  await db.delete(schema.metricsEvents).where(inArray(schema.metricsEvents.tenantId, TENANT_IDS));
  await db.delete(schema.metricsRollups).where(inArray(schema.metricsRollups.tenantId, TENANT_IDS));
  await db.delete(schema.feedbacks).where(inArray(schema.feedbacks.tenantId, TENANT_IDS));
  await db
    .delete(schema.mutationCreateIdempotency)
    .where(inArray(schema.mutationCreateIdempotency.tenantId, TENANT_IDS));
  await db.delete(schema.documents).where(inArray(schema.documents.tenantId, TENANT_IDS));
  await db.delete(schema.notionIntegrations).where(inArray(schema.notionIntegrations.tenantId, TENANT_IDS));
  await db.delete(schema.tenantDataTombstones).where(inArray(schema.tenantDataTombstones.tenantId, TENANT_IDS));
  await db.delete(schema.tenantDataObjects).where(inArray(schema.tenantDataObjects.tenantId, TENANT_IDS));
  await db.delete(schema.tenantCoefficients).where(inArray(schema.tenantCoefficients.tenantId, TENANT_IDS));
  await db.delete(schema.hearingShareTokens).where(inArray(schema.hearingShareTokens.tenantId, TENANT_IDS));
  await db.delete(schema.hearingScreenshots).where(inArray(schema.hearingScreenshots.tenantId, TENANT_IDS));
  await db.delete(schema.displayCodeCounters).where(inArray(schema.displayCodeCounters.tenantId, TENANT_IDS));
  await db.delete(schema.aiJobs).where(inArray(schema.aiJobs.tenantId, TENANT_IDS));
  await db.delete(schema.hearingSheets).where(inArray(schema.hearingSheets.tenantId, TENANT_IDS));
  await db.delete(schema.smokeFixtureLeases).where(inArray(schema.smokeFixtureLeases.tenantId, TENANT_IDS));
  await db.delete(schema.sessionRevocations).where(inArray(schema.sessionRevocations.tenantId, TENANT_IDS));
  await db.delete(schema.auditEvents).where(inArray(schema.auditEvents.tenantId, TENANT_IDS));
  await db.delete(schema.idempotencyLedger).where(inArray(schema.idempotencyLedger.tenantId, TENANT_IDS));
  await db.delete(schema.deviceAuthorizations).where(inArray(schema.deviceAuthorizations.tenantId, TENANT_IDS));
  await db.delete(schema.publisherTokens).where(inArray(schema.publisherTokens.tenantId, TENANT_IDS));
  await db.delete(schema.publishRequests).where(inArray(schema.publishRequests.tenantId, TENANT_IDS));
  await db.delete(schema.catalogEntries).where(inArray(schema.catalogEntries.tenantId, TENANT_IDS));
  await db.delete(schema.deploymentReferences).where(inArray(schema.deploymentReferences.tenantId, TENANT_IDS));
  await db.delete(schema.releases).where(inArray(schema.releases.tenantId, TENANT_IDS));
  await db.delete(schema.targetChannels).where(inArray(schema.targetChannels.tenantId, TENANT_IDS));
  await db.delete(schema.projects).where(inArray(schema.projects.tenantId, TENANT_IDS));
  await db.delete(schema.userSettings).where(inArray(schema.userSettings.userId, userIds));
  await db.delete(schema.userWorkspaces).where(inArray(schema.userWorkspaces.tenantId, TENANT_IDS));
  await db.delete(schema.users).where(inArray(schema.users.tenantId, TENANT_IDS));
  await db.delete(schema.workspaces).where(inArray(schema.workspaces.tenantId, TENANT_IDS));
  await db.delete(schema.idpConnections).where(inArray(schema.idpConnections.tenantId, TENANT_IDS));
  await db.delete(schema.tenants).where(inArray(schema.tenants.id, TENANT_IDS));

  // テナント境界を持たない 2 テーブル。列挙した決定論 ID だけを消す。
  await db.delete(schema.packages).where(inArray(schema.packages.contentHash, [PACKAGE_HASH]));
  await db.delete(schema.encryptionKeys).where(inArray(schema.encryptionKeys.id, ENCRYPTION_KEY_IDS));
}

// --- identity ---------------------------------------------------------------

function tenantRows(): (typeof schema.tenants.$inferInsert)[] {
  return [
    { id: TENANT.main, slug: 'demo', name: 'デモ商事株式会社', plan: 'standard', status: 'active', createdAt: at(0) },
    {
      id: TENANT.suspended,
      slug: 'demo-suspended',
      name: 'デモ物流株式会社（停止中）',
      plan: 'standard',
      status: 'suspended',
      createdAt: at(1),
    },
    {
      id: TENANT.empty,
      slug: 'demo-empty',
      name: 'デモ試用テナント（データなし）',
      plan: 'free',
      status: 'active',
      createdAt: at(2),
    },
    {
      id: TENANT.secondary,
      slug: 'demo-secondary',
      name: 'デモ製造株式会社',
      plan: 'standard',
      status: 'active',
      createdAt: at(3),
    },
  ];
}

function idpConnectionRows(): (typeof schema.idpConnections.$inferInsert)[] {
  // uq(tenant_id, issuer_url) があるため、4 つの credential_status は issuer を分けて表す。
  return [
    {
      id: seedId(KEYS.idpPending),
      tenantId: TENANT.main,
      scopes: 'openid email profile',
      createdAt: at(4),
      issuerUrl: 'https://accounts.google.com/demo-pending',
      clientId: 'demo-pending.apps.googleusercontent.com',
      clientSecretEnc: 'enc:v1:demo-pending',
      credentialMode: 'customer_google',
      credentialStatus: 'pending',
      clientSecretLast4: '0001',
      pendingCredentialMode: 'customer_google',
      pendingClientId: 'demo-pending-next.apps.googleusercontent.com',
    },
    {
      id: seedId(KEYS.idpTested),
      tenantId: TENANT.main,
      scopes: 'openid email profile',
      createdAt: at(4),
      issuerUrl: 'https://accounts.google.com/demo-tested',
      clientId: 'demo-tested.apps.googleusercontent.com',
      clientSecretEnc: 'enc:v1:demo-tested',
      credentialMode: 'shared_google',
      credentialStatus: 'tested',
      clientSecretLast4: '0002',
      pendingCredentialMode: 'shared_google',
      pendingTestedAt: at(5),
      lastTestedAt: at(5),
    },
    {
      id: seedId(KEYS.idpActive),
      tenantId: TENANT.main,
      scopes: 'openid email profile',
      createdAt: at(4),
      issuerUrl: 'https://accounts.google.com',
      clientId: 'demo-active.apps.googleusercontent.com',
      clientSecretEnc: 'enc:v1:demo-active',
      credentialMode: 'customer_google',
      credentialStatus: 'active',
      clientSecretLast4: '0003',
      allowedWorkspaceDomains: JSON.stringify(['demo.example.com']),
      lastTestedAt: at(6),
      updatedAt: at(6),
    },
    {
      id: seedId(KEYS.idpDisabled),
      tenantId: TENANT.main,
      scopes: 'openid email profile',
      createdAt: at(4),
      issuerUrl: 'https://accounts.google.com/demo-disabled',
      clientId: 'demo-disabled.apps.googleusercontent.com',
      clientSecretEnc: 'enc:v1:demo-disabled',
      credentialMode: 'shared_google',
      credentialStatus: 'disabled',
      clientSecretLast4: '0004',
      updatedAt: at(7),
    },
  ];
}

function workspaceRows(): (typeof schema.workspaces.$inferInsert)[] {
  return [
    { id: WORKSPACE.main, tenantId: TENANT.main, slug: 'main', name: '本社ワークスペース', createdAt: at(8) },
    {
      id: WORKSPACE.suspended,
      tenantId: TENANT.suspended,
      slug: 'main',
      name: '停止中ワークスペース',
      createdAt: at(9),
    },
  ];
}

function userRows(): (typeof schema.users.$inferInsert)[] {
  const named = [
    {
      id: USER.providerAdmin,
      idpSubject: 'demo-provider-admin',
      email: 'provider-admin@demo.example.com',
      name: '運営 太郎',
      department: '運営本部',
      role: 'provider-admin',
      status: 'active',
      lastLoginAt: at(10),
    },
    {
      id: USER.workspaceAdmin,
      idpSubject: 'demo-workspace-admin',
      email: 'workspace-admin@demo.example.com',
      name: '管理 花子',
      department: '情報システム部',
      role: 'workspace-admin',
      status: 'active',
      lastLoginAt: at(11),
    },
    {
      // 長文パターン: 一覧の氏名列が意図した位置で折れるかを見るための行。
      id: USER.member,
      idpSubject: 'demo-member',
      email: 'member@demo.example.com',
      name: longText('personName', 0),
      department: DEPARTMENT,
      role: 'member',
      status: 'active',
      lastLoginAt: at(12),
    },
    {
      id: USER.inactive,
      idpSubject: 'demo-inactive',
      email: 'inactive@demo.example.com',
      name: longText('personName', 1),
      department: OTHER_DEPARTMENT,
      role: 'member',
      status: 'inactive',
      lastLoginAt: null,
    },
  ] as const;

  const bulk = bulkIds('users/list').map((id, index) => ({
    id,
    idpSubject: `demo-bulk-member-${index + 1}`,
    email: `member-${index + 1}@demo.example.com`,
    name: `デモ利用者 ${index + 1}`,
    department: index % 2 === 0 ? DEPARTMENT : OTHER_DEPARTMENT,
    role: 'member' as const,
    status: 'active' as const,
    lastLoginAt: at(20 + index),
  }));

  return [...named, ...bulk].map((row, index) => ({
    ...row,
    tenantId: TENANT.main,
    // 給与は暗号化列なので、偽の暗号文を入れず NULL のままにする。
    salary: null,
    createdAt: at(10 + index),
  }));
}

function userWorkspaceRows(): (typeof schema.userWorkspaces.$inferInsert)[] {
  const users = [USER.providerAdmin, USER.workspaceAdmin, USER.member, USER.inactive];
  return DERIVED_SERIES.userWorkspaces.map((_key, index) => ({
    tenantId: TENANT.main,
    userId: pick(users, index),
    workspaceId: WORKSPACE.main,
    createdAt: at(13 + index),
  }));
}

function userSettingRows(): (typeof schema.userSettings.$inferInsert)[] {
  const users = [USER.providerAdmin, USER.workspaceAdmin, USER.member, USER.inactive];
  const themes = ['system', 'light', 'dark', 'system'] as const;
  const densities = ['comfortable', 'compact', 'comfortable', 'compact'] as const;
  return DERIVED_SERIES.userSettings.map((_key, index) => ({
    userId: pick(users, index),
    notifyGeneration: true,
    notifyReview: index % 2 === 0,
    notifyWeekly: index !== 3,
    notifyFeedback: true,
    emailEnabled: index !== 2,
    theme: pick(themes, index),
    density: pick(densities, index),
    language: 'ja' as const,
  }));
}

// --- catalog ----------------------------------------------------------------

function projectRows(): (typeof schema.projects.$inferInsert)[] {
  const named = [
    {
      id: PROJECT.active,
      slug: 'demo-active',
      name: '営業日報の自動要約',
      description: longText('body', 0),
      status: 'active',
    },
    {
      id: PROJECT.suspended,
      slug: 'demo-suspended',
      name: '見積書ドラフト生成',
      description: '見積書の初稿を作る補助。停止中の表示を確認するための行。',
      status: 'suspended',
    },
    {
      id: PROJECT.archived,
      slug: 'demo-archived',
      name: '議事録の整形（旧版）',
      description: null,
      status: 'archived',
    },
  ] as const;

  // uq(workspace_id, name) があるため名前は一意にする。先頭 1 件だけ長文にして折返しを見る。
  const bulk = bulkIds('catalog/projects').map((id, index) => ({
    id,
    slug: `demo-bulk-${index + 1}`,
    name: index === 0 ? longText('heading', 0) : `デモ案件 ${index + 1}`,
    description: index % 3 === 0 ? longText('body', 1) : null,
    status: 'active' as const,
  }));

  return [...named, ...bulk].map((row, index) => ({
    ...row,
    tenantId: TENANT.main,
    workspaceId: WORKSPACE.main,
    ownerUserId: USER.workspaceAdmin,
    createdAt: at(30 + index),
  }));
}

function targetChannelRows(): (typeof schema.targetChannels.$inferInsert)[] {
  const projects = [
    PROJECT.active,
    PROJECT.active,
    PROJECT.suspended,
    PROJECT.suspended,
    PROJECT.archived,
    PROJECT.archived,
  ];
  const targets = ['skill', 'web_app', 'skill', 'web_app', 'skill', 'web_app'] as const;
  return CHANNEL.map((id, index) => ({
    id,
    tenantId: TENANT.main,
    projectId: pick(projects, index),
    target: pick(targets, index),
    stableReleaseId: index === 0 ? RELEASE.available : null,
    createdAt: at(50 + index),
  }));
}

function packageRows(): (typeof schema.packages.$inferInsert)[] {
  return [
    {
      contentHash: PACKAGE_HASH,
      r2Key: `packages/${PACKAGE_HASH}.zip`,
      sizeBytes: 262_144,
      kind: 'skills-package',
      createdAt: at(55),
    },
  ];
}

function releaseRows(): (typeof schema.releases.$inferInsert)[] {
  const manifestJson = JSON.stringify({ name: 'demo-active', entry: 'SKILL.md' });
  const base = {
    tenantId: TENANT.main,
    projectId: PROJECT.active,
    channelId: pick(CHANNEL, 0),
    packageHash: PACKAGE_HASH,
    manifestJson,
    createdBy: USER.workspaceAdmin,
  };
  return [
    { ...base, id: RELEASE.available, version: '1.1.0', status: 'available', createdAt: at(60) },
    { ...base, id: RELEASE.suspended, version: '1.0.0', status: 'suspended', createdAt: at(61) },
    { ...base, id: RELEASE.deprecated, version: '0.9.0', status: 'deprecated', createdAt: at(62) },
  ];
}

function deploymentReferenceRows(): (typeof schema.deploymentReferences.$inferInsert)[] {
  return [
    {
      id: seedId(KEYS.deploymentReference),
      tenantId: TENANT.main,
      projectId: PROJECT.active,
      channelId: pick(CHANNEL, 1),
      releaseId: RELEASE.available,
      url: 'https://demo-active.example.workers.dev',
      provider: 'cloudflare',
      orphanCandidate: false,
      registeredBy: USER.workspaceAdmin,
      lastHealthAt: at(65),
      createdAt: at(65),
    },
  ];
}

function catalogEntryRows(): (typeof schema.catalogEntries.$inferInsert)[] {
  // uq(project_id) のため 1 案件 1 エントリ。visibility 2 値は別案件へ割り当てる。
  return [
    {
      id: seedId(KEYS.catalogEntryWorkspace),
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      projectId: PROJECT.active,
      visibility: 'workspace',
      summary: '営業日報を要約し、週次の共有資料へそのまま貼れる形に整えます。',
      tagsJson: JSON.stringify([longText('tagName', 0), '営業', '要約']),
      dlCount: 128,
      publishedAt: at(66),
    },
    {
      id: seedId(KEYS.catalogEntryPrivate),
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      projectId: PROJECT.suspended,
      visibility: 'private',
      summary: null,
      tagsJson: null,
      dlCount: 3,
      publishedAt: null,
    },
  ];
}

// --- publish ----------------------------------------------------------------

/**
 * 公開申請の 9 状態。
 *
 * partial uq(channel_id) WHERE status NOT IN ('published','failed','draft') があるため、
 * 非終端 6 値は別 channel へ散らし、終端 3 値だけ同じ channel に置ける。
 */
const PUBLISH_SPECS = [
  { status: 'draft', channel: 0, verdict: null },
  { status: 'validating', channel: 0, verdict: null },
  { status: 'needs_fix', channel: 1, verdict: 'yellow' },
  { status: 'ready', channel: 2, verdict: 'green' },
  { status: 'approval_pending', channel: 3, verdict: null },
  { status: 'approved', channel: 4, verdict: null },
  { status: 'publishing', channel: 5, verdict: null },
  { status: 'failed', channel: 0, verdict: 'red' },
  { status: 'published', channel: 0, verdict: null },
] as const;

function publishRequestRows(): (typeof schema.publishRequests.$inferInsert)[] {
  return PUBLISH_SPECS.map((spec, index) => ({
    id: pick(PUBLISH_REQUEST, index),
    tenantId: TENANT.main,
    workspaceId: WORKSPACE.main,
    projectId: PROJECT.active,
    channelId: pick(CHANNEL, spec.channel),
    status: spec.status,
    verdict: spec.verdict,
    findingsJson: spec.status === 'needs_fix' ? JSON.stringify([{ code: 'MANIFEST_TITLE', level: 'warn' }]) : null,
    releaseId: spec.status === 'published' ? RELEASE.available : null,
    requestedBy: USER.workspaceAdmin,
    idempotencyKey: `demo-publish-${index + 1}`,
    createdAt: at(70 + index),
  }));
}

function publisherTokenRows(): (typeof schema.publisherTokens.$inferInsert)[] {
  const id = seedId(KEYS.publisherToken);
  return [
    {
      id,
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      userId: USER.workspaceAdmin,
      deviceName: 'デモ作業端末',
      refreshTokenHash: `hash:${id}`,
      scopesJson: JSON.stringify(['publish', 'catalog:read']),
      familyId: id,
      lastUsedAt: at(80),
      expiresAt: at(30 * DAY),
      revokedAt: null,
      createdAt: at(80),
    },
  ];
}

function deviceAuthorizationRows(): (typeof schema.deviceAuthorizations.$inferInsert)[] {
  const statuses = ['pending', 'approved', 'denied', 'consumed'] as const;
  return ENUM_SERIES.deviceAuthorizations.map((key, index) => {
    const id = seedId(key);
    const status = pick(statuses, index);
    const linked = status === 'approved' || status === 'consumed';
    return {
      id,
      tenantId: TENANT.main,
      deviceCodeHash: `hash:${id}`,
      userCode: `DEMO-${String(index + 1).padStart(4, '0')}`,
      userId: linked ? USER.member : null,
      workspaceId: linked ? WORKSPACE.main : null,
      scopesJson: JSON.stringify(['publish']),
      deviceName: 'デモ CLI',
      status,
      attempts: index,
      intervalSec: 5,
      lastPolledAt: status === 'pending' ? null : at(85 + index),
      expiresAt: at(100 + index),
      createdAt: at(85 + index),
    };
  });
}

function idempotencyLedgerRows(): (typeof schema.idempotencyLedger.$inferInsert)[] {
  const key = seedId(KEYS.idempotencyLedger);
  return [
    {
      scope: 'metrics.ingest',
      key,
      tenantId: TENANT.main,
      requestHash: `hash:${key}`,
      responseStatus: 202,
      responseBodyJson: JSON.stringify({ accepted: true }),
      expiresAt: at(DAY),
    },
  ];
}

// --- security / smoke -------------------------------------------------------

function auditEventRows(): (typeof schema.auditEvents.$inferInsert)[] {
  const named = [
    {
      id: seedId(pick(ENUM_SERIES.auditEvents, 0)),
      actorType: 'user',
      actorId: USER.workspaceAdmin,
      action: 'project.create',
      entityType: 'project',
      entityId: PROJECT.active,
      seq: 1,
    },
    {
      id: seedId(pick(ENUM_SERIES.auditEvents, 1)),
      actorType: 'publisher_token',
      actorId: seedId(KEYS.publisherToken),
      action: 'release.publish',
      entityType: 'release',
      entityId: RELEASE.available,
      seq: 2,
    },
    {
      id: seedId(pick(ENUM_SERIES.auditEvents, 2)),
      actorType: 'system',
      actorId: 'system',
      action: 'metrics.rollup',
      entityType: 'metrics_rollup',
      entityId: pick(ROLLUP, 0),
      seq: 3,
    },
  ] as const;

  // uq(tenant_id, seq) を守るため、大量分の seq は名前付き 1-3 と重ならない 101 から振る。
  const bulk = bulkIds('audit/events').map((id, index) => ({
    id,
    actorType: 'user' as const,
    actorId: USER.member,
    action: 'document.update',
    entityType: 'document',
    entityId: DOCUMENT.tenantPublished,
    seq: 101 + index,
  }));

  return [...named, ...bulk].map((row) => ({
    ...row,
    tenantId: TENANT.main,
    workspaceId: WORKSPACE.main,
    summaryJson: JSON.stringify({ action: row.action }),
    prevHash: `hash:prev:${row.seq}`,
    eventHash: `hash:event:${row.seq}`,
    createdAt: at(90 + row.seq),
  }));
}

function encryptionKeyRows(): (typeof schema.encryptionKeys.$inferInsert)[] {
  // partial uq(purpose, key_version) WHERE tenant_id IS NULL があるため、全体鍵は版を分ける。
  return [
    {
      id: seedId(KEYS.encryptionSalaryActive),
      tenantId: null,
      purpose: 'salary',
      keyVersion: 3,
      dekWrapped: 'wrapped:salary:v3',
      status: 'active',
      createdAt: at(100),
      retiredAt: null,
    },
    {
      id: seedId(KEYS.encryptionSalaryRetiring),
      tenantId: null,
      purpose: 'salary',
      keyVersion: 2,
      dekWrapped: 'wrapped:salary:v2',
      status: 'retiring',
      createdAt: at(101),
      retiredAt: null,
    },
    {
      id: seedId(KEYS.encryptionSalaryRetired),
      tenantId: null,
      purpose: 'salary',
      keyVersion: 1,
      dekWrapped: 'wrapped:salary:v1',
      status: 'retired',
      createdAt: at(102),
      retiredAt: at(103),
    },
    {
      id: seedId(KEYS.encryptionIdpSecret),
      tenantId: null,
      purpose: 'idp_secret',
      keyVersion: 1,
      dekWrapped: 'wrapped:idp:v1',
      status: 'active',
      createdAt: at(104),
      retiredAt: null,
    },
    {
      id: seedId(KEYS.encryptionTenantData),
      tenantId: TENANT.main,
      purpose: 'tenant_data',
      keyVersion: 1,
      dekWrapped: 'wrapped:tenant-data:v1',
      status: 'active',
      createdAt: at(105),
      retiredAt: null,
    },
  ];
}

function sessionRevocationRows(): (typeof schema.sessionRevocations.$inferInsert)[] {
  return [{ tenantId: TENANT.suspended, revokedAt: at(110) }];
}

function smokeFixtureLeaseRows(): (typeof schema.smokeFixtureLeases.$inferInsert)[] {
  // tenant_id が PK なので、kind 4 値には 4 テナントが要る (ADR §10.1 の 2 テナントから拡張)。
  const kinds = ['database', 'hearing', 'coverage', 'publish'] as const;
  const tenants = [TENANT.main, TENANT.suspended, TENANT.empty, TENANT.secondary];
  return ENUM_SERIES.smokeLeases.map((_key, index) => ({
    tenantId: pick(tenants, index),
    runId: 'demo-coverage',
    kind: pick(kinds, index),
    // 掃除処理がデモテナントを回収しないよう、期限は十分先に置く。
    expiresAt: at(3_650 * DAY),
    createdAt: at(111 + index),
  }));
}

// --- tenant data ------------------------------------------------------------

function tenantDataObjectRows(): (typeof schema.tenantDataObjects.$inferInsert)[] {
  const kinds = ['knowledge_doc', 'run_input', 'run_output', 'hearing_screenshot'] as const;
  const ids = [TENANT_DATA.knowledgeDoc, TENANT_DATA.runInput, TENANT_DATA.runOutput, TENANT_DATA.screenshot];
  const titles = ['社内ナレッジ（デモ）', '実行入力（デモ）', '実行出力（デモ）', '入力画面のスクリーンショット'];
  return ids.map((id, index) => ({
    id,
    tenantId: TENANT.main,
    workspaceId: WORKSPACE.main,
    kind: pick(kinds, index),
    title: pick(titles, index),
    r2Key: `tenant-data/${TENANT.main}/${id}`,
    sizeBytes: 4_096 * (index + 1),
    contentHash: `hash:${id}`,
    encKeyVersion: 1,
    uploadedBy: USER.member,
    createdAt: at(120 + index),
  }));
}

function tenantDataTombstoneRows(): (typeof schema.tenantDataTombstones.$inferInsert)[] {
  return [
    {
      id: seedId(KEYS.tenantDataTombstone),
      tenantId: TENANT.main,
      objectId: TENANT_DATA.runInput,
      r2Key: `tenant-data/${TENANT.main}/${TENANT_DATA.runInput}`,
      deletedAt: at(125),
    },
  ];
}

// --- hearing intake ---------------------------------------------------------

function hearingFormSnapshot(title: string, index: number) {
  return hearingSheetFormSnapshotSchema.parse({
    taskName: title,
    company: 'デモ株式会社',
    applicant: 'デモ利用者',
    domain: index % 2 === 0 ? '経理' : '業務改善',
    issue: '手作業の確認に時間がかかり、担当者ごとに判断がぶれる',
    tools: '表計算 / 社内ワークフロー',
    hours: 20 + index,
    people: 5 + index,
    features: '入力チェック・下書き・履歴の記録',
    output: '確認結果の一覧',
    priority: 'high',
  });
}

function hearingEstimateSnapshot(index: number) {
  const savedHoursPerYear = 400 + index;
  return hearingSheetEstimateSchema.parse({
    savedMinutesPerYear: savedHoursPerYear * 60,
    savedHoursPerYear,
    savedAmountPerYear: savedHoursPerYear * 3_000,
  });
}

function hearingSheetRows(): (typeof schema.hearingSheets.$inferInsert)[] {
  const statuses = ['received', 'generating', 'review', 'completed'] as const;
  const titles = [
    '受付直後のヒアリングシート（デモ）',
    '生成中のヒアリングシート（デモ）',
    'レビュー待ちのヒアリングシート（デモ）',
    longText('heading', 1),
  ];

  const named = SHEET.map((id, index) => ({
    id,
    code: `HS-${String(index + 1).padStart(4, '0')}`,
    title: pick(titles, index),
    status: pick(statuses, index),
    department: index === 3 ? DEPARTMENT : OTHER_DEPARTMENT,
    aiJobId: index === 1 ? pick(AI_JOB, 0) : index === 2 ? pick(AI_JOB, 3) : null,
    generatedDocIdsJson: index === 3 ? JSON.stringify([DOCUMENT.tenantPublished]) : null,
    buildId: index === 3 ? pick(BUILD, 0) : null,
  }));

  const bulk = bulkIds('sheets/list').map((id, index) => ({
    id,
    code: `HS-${String(1_001 + index).padStart(4, '0')}`,
    title: `デモ申請 ${index + 1}`,
    status: pick(statuses, index),
    department: index % 2 === 0 ? DEPARTMENT : OTHER_DEPARTMENT,
    aiJobId: null,
    generatedDocIdsJson: null,
    buildId: null,
  }));

  return [...named, ...bulk].map((row, index) => ({
    ...row,
    tenantId: TENANT.main,
    workspaceId: WORKSPACE.main,
    applicantUserId: USER.member,
    formJson: JSON.stringify(hearingFormSnapshot(row.title, index)),
    estimateJson: JSON.stringify(hearingEstimateSnapshot(index)),
    createdAt: at(130 + index),
    updatedAt: at(130 + index),
  }));
}

/** AI ジョブの 5 行。kind 3 値と status 5 値を同時に網羅する組み合わせにする。 */
const AI_JOB_SPECS = [
  { kind: 'sheet_generation', status: 'queued', refType: 'hearing_sheet' },
  { kind: 'feedback_response', status: 'processing', refType: 'feedback' },
  { kind: 'doc_draft', status: 'completed', refType: 'document' },
  { kind: 'sheet_generation', status: 'failed', refType: 'hearing_sheet' },
  { kind: 'feedback_response', status: 'dead', refType: 'feedback' },
] as const;

function errorMessageFor(status: (typeof AI_JOB_SPECS)[number]['status']): string | null {
  if (status === 'failed') {
    return '生成に失敗しました（デモデータ）';
  }
  if (status === 'dead') {
    return '再試行の上限に達しました（デモデータ）';
  }
  return null;
}

function aiJobRows(): (typeof schema.aiJobs.$inferInsert)[] {
  const refIds = [pick(SHEET, 1), FEEDBACK.open, DOCUMENT.tenantDraft, pick(SHEET, 2), FEEDBACK.inProgress];

  return AI_JOB.map((id, index) => {
    const spec = pick(AI_JOB_SPECS, index);
    const refId = pick(refIds, index);
    return {
      id,
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      kind: spec.kind,
      status: spec.status,
      payloadJson: JSON.stringify({ refType: spec.refType, refId }),
      resultJson: spec.status === 'completed' ? JSON.stringify({ documentId: DOCUMENT.tenantDraft }) : null,
      error: errorMessageFor(spec.status),
      attempt: spec.status === 'dead' ? 3 : spec.status === 'failed' ? 1 : 0,
      maxAttempts: 3,
      leaseExpiresAt: spec.status === 'processing' ? at(150) : null,
      claimedByTokenId: spec.status === 'processing' ? seedId(KEYS.publisherToken) : null,
      refType: spec.refType,
      refId,
      createdAt: at(145 + index),
      updatedAt: at(145 + index),
    };
  });
}

function displayCodeCounterRows(): (typeof schema.displayCodeCounters.$inferInsert)[] {
  const kinds = ['HS', 'FR', 'DOC'] as const;
  const nextValues = [1_061, 1_061, 1_065];
  return ENUM_SERIES.displayCodeCounters.map((_key, index) => ({
    tenantId: TENANT.main,
    kind: pick(kinds, index),
    nextValue: pick(nextValues, index),
  }));
}

function hearingScreenshotRows(): (typeof schema.hearingScreenshots.$inferInsert)[] {
  return [
    {
      id: seedId(KEYS.hearingScreenshot),
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      sheetId: pick(SHEET, 3),
      tenantDataObjectId: TENANT_DATA.screenshot,
      title: '入力画面のスクリーンショット',
      linkedItem: '入力項目の並び',
      note: '折返し位置の確認用に添付したデモ画像です。',
      contentType: 'image/png',
      createdBy: USER.member,
      createdAt: at(155),
    },
  ];
}

function hearingShareTokenRows(): (typeof schema.hearingShareTokens.$inferInsert)[] {
  const audiences = ['harness_creator', 'system_orchestrator'] as const;
  const keys = [KEYS.shareTokenCreator, KEYS.shareTokenOrchestrator];
  return audiences.map((audience, index) => {
    const id = seedId(pick(keys, index));
    return {
      id,
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      sheetId: pick(SHEET, 3),
      audience,
      tokenHash: `hash:${id}`,
      expiresAt: at(7 * DAY),
      revokedAt: null,
      lastAccessedAt: index === 0 ? at(156) : null,
      accessCount: index === 0 ? 4 : 0,
      createdByUserId: USER.workspaceAdmin,
      createdAt: at(156 + index),
    };
  });
}

function tenantCoefficientRows(): (typeof schema.tenantCoefficients.$inferInsert)[] {
  return [
    {
      tenantId: TENANT.main,
      annualHours: 1_800,
      minutesPerRun: 25,
      sheetReductionRate: 0.6,
      updatedBy: USER.workspaceAdmin,
    },
  ];
}

// --- docs / feedback / builds / metrics -------------------------------------

function notionIntegrationRows(): (typeof schema.notionIntegrations.$inferInsert)[] {
  // uq(tenant_id, workspace_id) のため、mode 2 値は別ワークスペースへ割り当てる。
  return [
    {
      id: seedId(KEYS.notionUrl),
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      mode: 'url',
      pageUrl: 'https://www.notion.so/demo-harness-hub',
      apiKeyEnc: null,
      encKeyVersion: null,
      createdAt: at(160),
      updatedAt: at(160),
    },
    {
      id: seedId(KEYS.notionApiKey),
      tenantId: TENANT.suspended,
      workspaceId: WORKSPACE.suspended,
      mode: 'api_key',
      pageUrl: null,
      apiKeyEnc: 'enc:v1:demo-notion',
      encKeyVersion: 1,
      createdAt: at(161),
      updatedAt: at(161),
    },
  ];
}

function documentRows(): (typeof schema.documents.$inferInsert)[] {
  const named = [
    {
      id: DOCUMENT.commonPublished,
      scope: 'common',
      status: 'published',
      title: '利用規約（デモ）',
      bodyMarkdown: '# 利用規約\n\nこれは表示確認用のデモ本文です。\n',
      category: '規約',
      tags: JSON.stringify(['規約', '共通']),
      thumbnailSource: 'auto',
      excerptSource: 'auto',
      excerpt: '表示確認用のデモ規約です。',
      publishAt: at(0),
    },
    {
      id: DOCUMENT.commonDraft,
      scope: 'common',
      status: 'draft',
      title: '操作ガイド（下書き・デモ）',
      bodyMarkdown: '# 操作ガイド\n\n下書き状態の表示を確認するためのデモ本文です。\n',
      category: 'ガイド',
      tags: JSON.stringify(['ガイド']),
      thumbnailSource: 'manual',
      excerptSource: 'manual',
      excerpt: '下書き状態のデモ文書です。',
      publishAt: null,
    },
    {
      // 長文パターン: 見出しと本文がカード幅・全画面幅の双方で意図どおり折れるかを見る。
      id: DOCUMENT.tenantPublished,
      scope: 'tenant',
      status: 'published',
      title: longText('heading', 0),
      bodyMarkdown: `# ${longText('heading', 0)}\n\n${longText('body', 0)}\n`,
      category: '運用手順',
      tags: JSON.stringify([longText('tagName', 0), longText('tagName', 1)]),
      thumbnailSource: 'auto',
      excerptSource: 'manual',
      excerpt: longText('body', 0),
      publishAt: at(165),
    },
    {
      id: DOCUMENT.tenantDraft,
      scope: 'tenant',
      status: 'draft',
      title: longText('heading', 1),
      bodyMarkdown: `# ${longText('heading', 1)}\n\n${longText('body', 1)}\n`,
      category: '検討資料',
      tags: JSON.stringify([longText('tagName', 1)]),
      thumbnailSource: 'manual',
      excerptSource: 'auto',
      excerpt: null,
      publishAt: null,
    },
  ] as const;

  const bulk = bulkIds('docs/list').map((id, index) => ({
    id,
    scope: 'tenant' as const,
    status: index % 2 === 0 ? ('published' as const) : ('draft' as const),
    title: `デモ文書 ${index + 1}`,
    bodyMarkdown: `# デモ文書 ${index + 1}\n\n一覧の件数を確かめるためのデモ本文です。\n`,
    category: index % 3 === 0 ? '運用手順' : 'ガイド',
    tags: JSON.stringify([index % 2 === 0 ? '運用' : '共有']),
    thumbnailSource: 'auto' as const,
    excerptSource: 'auto' as const,
    excerpt: null,
    publishAt: index % 2 === 0 ? at(170 + index) : null,
  }));

  // uq(tenant_id, external_source, external_document_id) は external_* が NULL なら競合しない。
  return [...named, ...bulk].map((row, index) => ({
    ...row,
    tenantId: TENANT.main,
    externalSource: null,
    externalDocumentId: null,
    externalContentHash: null,
    externalRevision: null,
    thumbnailUrl: null,
    assetSummary: null,
    createdBy: USER.member,
    updatedBy: USER.member,
    createdAt: at(165 + index),
    updatedAt: at(165 + index),
  }));
}

function mutationCreateIdempotencyRows(): (typeof schema.mutationCreateIdempotency.$inferInsert)[] {
  return [
    {
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      resource: 'documents',
      operation: 'create',
      key: 'demo-create-document',
      payloadHash: `hash:${DOCUMENT.tenantDraft}`,
      resourceId: DOCUMENT.tenantDraft,
      responseStatus: 201,
      responseHeadersJson: JSON.stringify({ location: `/docs/${DOCUMENT.tenantDraft}` }),
      responseBody: JSON.stringify({ id: DOCUMENT.tenantDraft }),
      expiresAt: at(DAY),
      createdAt: at(170),
    },
    {
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      resource: 'sheets',
      operation: 'create',
      key: 'demo-create-sheet',
      payloadHash: `hash:${pick(SHEET, 3)}`,
      resourceId: pick(SHEET, 3),
      responseStatus: 201,
      responseHeadersJson: JSON.stringify({ location: `/sheets/${pick(SHEET, 3)}` }),
      responseBody: JSON.stringify({ id: pick(SHEET, 3) }),
      expiresAt: at(DAY),
      createdAt: at(171),
    },
  ];
}

function feedbackRows(): (typeof schema.feedbacks.$inferInsert)[] {
  const named = [
    {
      id: FEEDBACK.open,
      code: 'FR-0001',
      type: 'improvement',
      priority: 'high',
      source: 'harness',
      status: 'open',
      body: longText('body', 1),
      aiResponse: null,
      aiJobId: pick(AI_JOB, 1),
    },
    {
      id: FEEDBACK.inProgress,
      code: 'FR-0002',
      type: 'review',
      priority: 'medium',
      source: 'manual',
      status: 'in_progress',
      body: 'レビュー中の要望です。担当者の割当と期限の表示を確認します。',
      aiResponse: null,
      aiJobId: pick(AI_JOB, 4),
    },
    {
      id: FEEDBACK.resolved,
      code: 'FR-0003',
      type: 'bug',
      priority: 'low',
      source: 'harness',
      status: 'resolved',
      body: '解決済みの不具合報告です。完了後の表示を確認します。',
      aiResponse: '対応済みです。次回の実行から反映されます。',
      aiJobId: null,
    },
  ] as const;

  const bulk = bulkIds('feedback/list').map((id, index) => ({
    id,
    code: `FR-${String(1_001 + index).padStart(4, '0')}`,
    type: 'improvement' as const,
    priority: 'medium' as const,
    source: 'manual' as const,
    status: 'open' as const,
    body: `一覧の件数を確かめるためのデモ要望 ${index + 1} です。`,
    aiResponse: null,
    aiJobId: null,
  }));

  return [...named, ...bulk].map((row, index) => ({
    ...row,
    tenantId: TENANT.main,
    workspaceId: WORKSPACE.main,
    projectId: PROJECT.active,
    createdBy: USER.member,
    createdAt: at(180 + index),
    updatedAt: at(180 + index),
  }));
}

const BUILD_STAGES = ['hearing', 'requirements', 'design', 'build', 'test', 'review', 'publish'] as const;
const BUILD_TYPES = ['hearing', 'improvement', 'review', 'bug', 'hearing', 'improvement', 'review'] as const;

function buildRows(): (typeof schema.builds.$inferInsert)[] {
  // uq(feedback_id) があるため、要望を紐づけるのは 1 行だけにする (NULL 同士は競合しない)。
  const named = BUILD.map((id, index) => ({
    id,
    type: pick(BUILD_TYPES, index),
    stage: pick(BUILD_STAGES, index),
    sheetId: index === 0 ? pick(SHEET, 3) : null,
    feedbackId: index === 1 ? FEEDBACK.open : null,
    publishRequestId: index === 6 ? pick(PUBLISH_REQUEST, 3) : null,
  }));

  const bulk = bulkIds('builds/board').map((id, index) => ({
    id,
    type: 'hearing' as const,
    stage: pick(BUILD_STAGES, index),
    sheetId: null,
    feedbackId: null,
    publishRequestId: null,
  }));

  return [...named, ...bulk].map((row, index) => ({
    ...row,
    tenantId: TENANT.main,
    workspaceId: WORKSPACE.main,
    createdAt: at(200 + index),
    updatedAt: at(200 + index),
  }));
}

/** from_stage 7 値と to_stage 7 値を 1 本の履歴で巡回して網羅する。先頭だけ from が NULL。 */
const STAGE_TRANSITIONS = [
  { from: null, to: 'hearing' },
  { from: 'hearing', to: 'requirements' },
  { from: 'requirements', to: 'design' },
  { from: 'design', to: 'build' },
  { from: 'build', to: 'test' },
  { from: 'test', to: 'review' },
  { from: 'review', to: 'publish' },
  { from: 'publish', to: 'hearing' },
] as const;

function buildStageEventRows(): (typeof schema.buildStageEvents.$inferInsert)[] {
  return ENUM_SERIES.buildStageEvents.map((key, index) => {
    const transition = pick(STAGE_TRANSITIONS, index);
    return {
      id: seedId(key),
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      buildId: pick(BUILD, 0),
      fromStage: transition.from,
      toStage: transition.to,
      actorUserId: USER.workspaceAdmin,
      reason: index === STAGE_TRANSITIONS.length - 1 ? '差し戻しのため受付へ戻しました（デモ）' : null,
      occurredAt: at(220 + index),
      createdAt: at(220 + index),
    };
  });
}

function metricsEventRows(): (typeof schema.metricsEvents.$inferInsert)[] {
  const keys = [KEYS.metricsEventBase, KEYS.metricsEventIdempotent];
  return keys.map((key, index) => {
    const id = seedId(key);
    return {
      id,
      tenantId: TENANT.main,
      workspaceId: WORKSPACE.main,
      harnessId: PROJECT.active,
      actorUserId: USER.member,
      departmentId: index === 0 ? DEPARTMENT : null,
      runCount: index === 0 ? 12 : 5,
      occurredAt: at(230 + index),
      // uq(tenant_id, workspace_id, idempotency_key)。NULL 側も表示確認の対象に含める。
      idempotencyKey: index === 0 ? null : `demo-metrics-${index}`,
      requestDigest: `hash:${id}`,
      idempotencyExpiresAt: at(230 + index + DAY),
      createdAt: at(230 + index),
    };
  });
}

/** 集計行の 8 組。period 2 値 × dimension 4 値を全て作る。 */
const ROLLUP_SPECS = [
  { period: 'daily', dimension: 'tenant' },
  { period: 'weekly', dimension: 'tenant' },
  { period: 'daily', dimension: 'harness' },
  { period: 'weekly', dimension: 'harness' },
  { period: 'daily', dimension: 'department' },
  { period: 'weekly', dimension: 'department' },
  { period: 'daily', dimension: 'user' },
  { period: 'weekly', dimension: 'user' },
] as const;

function metricsRollupRows(): (typeof schema.metricsRollups.$inferInsert)[] {
  const dimensionKeys: Record<(typeof ROLLUP_SPECS)[number]['dimension'], string> = {
    tenant: TENANT.main,
    harness: PROJECT.active,
    department: DEPARTMENT,
    user: USER.member,
  };

  const named = ROLLUP.map((id, index) => {
    const spec = pick(ROLLUP_SPECS, index);
    const span = spec.period === 'daily' ? DAY : 7 * DAY;
    return {
      id,
      period: spec.period,
      dimension: spec.dimension,
      dimensionKey: dimensionKeys[spec.dimension],
      periodStart: at(0),
      periodEnd: at(span),
      runCount: 40 + index * 3,
      savedMinutes: 1_000 + index * 25,
      savedAmount: 120_000 + index * 3_000,
      computedAt: at(240 + index),
    };
  });

  // 並び替えと上位 N 件の表示を確かめるため、実行回数は index で単調に散らす。
  const bulk = bulkIds('metrics/ranking').map((id, index) => ({
    id,
    period: 'daily' as const,
    dimension: 'harness' as const,
    dimensionKey: `demo-harness-${index + 1}`,
    periodStart: at(DAY * (index + 1)),
    periodEnd: at(DAY * (index + 2)),
    runCount: 200 - index,
    savedMinutes: 5_000 - index * 20,
    savedAmount: 600_000 - index * 2_500,
    computedAt: at(250 + index),
  }));

  return [...named, ...bulk].map((row, index) => ({
    ...row,
    tenantId: TENANT.main,
    workspaceId: WORKSPACE.main,
    createdAt: at(240 + index),
    updatedAt: at(240 + index),
  }));
}
