#!/usr/bin/env tsx
/**
 * ローカル画面確認用の seed (開発者の手元専用)。
 *
 *   pnpm --filter @harness-hub/db exec tsx scripts/seed-local.ts \
 *     --url file:/absolute/path/hub-local.db --session-secret <AUTH_SESSION_SECRET>
 *
 * 本番 Turso へ向けられないよう **`file:` または loopback HTTP/WS 以外は受け付けない**。
 * seed は冪等 (何度実行しても同じ結果) で、先に同じ slug のテナントを消してから作り直す。
 * 実行の最後に、ブラウザへ貼り付けられる session cookie 値 (HS256 JWT) を出力する —
 * ローカルには IdP が無く、OIDC redirect を再現するより session を直接発行するほうが
 * 「画面を見る」目的に対して確実で、認可判定 (role / workspace 所属) は本番と同じ経路を通る。
 */

import { parseArgs } from 'node:util';

import { eq, inArray } from 'drizzle-orm';

import { createTursoClient } from '../connection/turso';
import { newUlid } from '../repository/ulid';
import { catalogEntries, projects, releases, targetChannels } from '../schema/core/catalog';
import { idpConnections, tenants, userSettings, users, userWorkspaces, workspaces } from '../schema/core/identity';
import { publishRequests } from '../schema/core/publish';
import { auditEvents } from '../schema/core/security';
import { displayCodeCounters, hearingSheets, tenantCoefficients } from '../schema/hearing-intake/schema';
import { isLocalDatabaseUrl, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signLocalSessionJwt } from './local-session';

const TENANT_SLUG = 'local';

interface SeedAccount {
  readonly key: 'admin' | 'member';
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: 'workspace-admin' | 'member';
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      url: { type: 'string' },
      'session-secret': { type: 'string' },
    },
  });
  const url = values.url ?? process.env.TURSO_DATABASE_URL;
  const sessionSecret = values['session-secret'] ?? process.env.AUTH_SESSION_SECRET;
  if (url === undefined || url === '') {
    console.error('usage: seed-local --url file:<path> --session-secret <secret>');
    return 2;
  }
  // 事故防止の一次防壁。libsql:// や https:// を渡せてしまうと本番テナントを消しうる。
  // 手元の sqld (http://127.0.0.1:<port>) は apps/hub が file: を拒む都合で必要になるため許可する。
  if (!isLocalDatabaseUrl(url)) {
    console.error(
      `seed-local はローカル DB 専用です (file: / http://127.0.0.1 / http://localhost。受け取った URL: ${url})`,
    );
    return 2;
  }
  if (sessionSecret === undefined || sessionSecret === '') {
    console.error('AUTH_SESSION_SECRET (--session-secret) が必要です');
    return 2;
  }

  const adapter = createTursoClient({ url });
  const db = adapter.client;
  const now = Date.now();

  // ---- 既存の local テナントを消してから作り直す (再実行で行が積み上がらないように)。
  const existing = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, TENANT_SLUG));
  for (const { id: tenantId } of existing) {
    await db.delete(hearingSheets).where(eq(hearingSheets.tenantId, tenantId));
    await db.delete(displayCodeCounters).where(eq(displayCodeCounters.tenantId, tenantId));
    await db.delete(tenantCoefficients).where(eq(tenantCoefficients.tenantId, tenantId));
    await db.delete(catalogEntries).where(eq(catalogEntries.tenantId, tenantId));
    await db.delete(publishRequests).where(eq(publishRequests.tenantId, tenantId));
    await db.delete(releases).where(eq(releases.tenantId, tenantId));
    await db.delete(targetChannels).where(eq(targetChannels.tenantId, tenantId));
    await db.delete(projects).where(eq(projects.tenantId, tenantId));
    await db.delete(auditEvents).where(eq(auditEvents.tenantId, tenantId));
    const members = await db.select({ id: users.id }).from(users).where(eq(users.tenantId, tenantId));
    if (members.length > 0) {
      await db.delete(userSettings).where(
        inArray(
          userSettings.userId,
          members.map((row) => row.id),
        ),
      );
    }
    await db.delete(userWorkspaces).where(eq(userWorkspaces.tenantId, tenantId));
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await db.delete(workspaces).where(eq(workspaces.tenantId, tenantId));
    await db.delete(idpConnections).where(eq(idpConnections.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  }

  const tenantId = newUlid(now);
  const workspaceId = newUlid(now);
  const accounts: readonly SeedAccount[] = [
    {
      key: 'admin',
      id: newUlid(now),
      email: 'admin@local.test',
      name: 'ローカル管理者',
      role: 'workspace-admin',
    },
    { key: 'member', id: newUlid(now), email: 'member@local.test', name: 'ローカル利用者', role: 'member' },
  ];

  await db.insert(tenants).values({
    id: tenantId,
    slug: TENANT_SLUG,
    name: 'ローカル検証テナント',
    plan: 'free',
    status: 'active',
    createdAt: now,
  });
  // ローカルには IdP が無い。サインイン画面のテナント解決だけが参照するので、
  // 到達できない issuer を入れて「この行で外部認証は成立しない」状態にしておく。
  await db.insert(idpConnections).values({
    id: newUlid(now),
    tenantId,
    issuerUrl: 'https://local-seed.invalid/local',
    clientId: 'local-seed',
    clientSecretEnc: 'local-seed:not-a-credential',
    scopes: 'openid email profile',
    credentialMode: 'customer_google',
    allowedWorkspaceDomains: null,
    createdAt: now,
  });
  await db.insert(workspaces).values({
    id: workspaceId,
    tenantId,
    slug: 'ws-local',
    name: 'ローカル Workspace',
    createdAt: now,
  });
  await db.insert(users).values(
    accounts.map((account) => ({
      id: account.id,
      tenantId,
      idpSubject: `local-${account.key}`,
      email: account.email,
      name: account.name,
      department: '業務改善',
      salary: null,
      role: account.role,
      status: 'active' as const,
      lastLoginAt: now,
      createdAt: now,
    })),
  );
  await db
    .insert(userWorkspaces)
    .values(accounts.map((account) => ({ tenantId, userId: account.id, workspaceId, createdAt: now })));

  const adminId = accounts[0]?.id ?? '';
  const memberId = accounts[1]?.id ?? '';

  // ---- カタログ: 公開済み 1 件 + 差戻し中 1 件。S01 一覧 / S02 詳細 / S03 状態確認が全て埋まる。
  const publishedProjectId = newUlid(now);
  const publishedChannelId = newUlid(now);
  const publishedReleaseId = newUlid(now);
  const draftProjectId = newUlid(now);
  const draftChannelId = newUlid(now);

  await db.insert(projects).values([
    {
      id: publishedProjectId,
      tenantId,
      workspaceId,
      slug: 'expense-harness',
      name: '経費精算ハーネス',
      description: '経費精算の入力チェックと差戻し理由の下書きを自動化する',
      ownerUserId: adminId,
      status: 'active',
      createdAt: now - 86_400_000,
    },
    {
      id: draftProjectId,
      tenantId,
      workspaceId,
      slug: 'minutes-harness',
      name: '議事録要約ハーネス',
      description: '会議の文字起こしから決定事項と TODO を抽出する',
      ownerUserId: memberId,
      status: 'active',
      createdAt: now - 3_600_000,
    },
  ]);
  await db.insert(targetChannels).values([
    {
      id: publishedChannelId,
      tenantId,
      projectId: publishedProjectId,
      target: 'skill',
      stableReleaseId: publishedReleaseId,
      createdAt: now - 86_400_000,
    },
    {
      id: draftChannelId,
      tenantId,
      projectId: draftProjectId,
      target: 'skill',
      stableReleaseId: null,
      createdAt: now - 3_600_000,
    },
  ]);
  await db.insert(releases).values({
    id: publishedReleaseId,
    tenantId,
    projectId: publishedProjectId,
    channelId: publishedChannelId,
    version: 'v1',
    packageHash: 'seedhash0000000000000000000000000000000000000000000000000000abcd',
    manifestJson: JSON.stringify({ v: 1, fixture: 'seed-local', content_hash: 'seed' }),
    status: 'available',
    createdBy: adminId,
    createdAt: now - 86_400_000,
  });
  await db.insert(catalogEntries).values({
    id: newUlid(now),
    tenantId,
    workspaceId,
    projectId: publishedProjectId,
    visibility: 'workspace',
    summary: '経費精算の入力チェックを自動化する Skill',
    tagsJson: JSON.stringify(['経理', '入力チェック']),
    dlCount: 12,
    publishedAt: now - 86_400_000,
  });

  // publish_requests は partial UNIQUE index (channel あたり非終端 1 件) に従う。
  // 終端は published / failed / draft なので、published と needs_fix を**別 channel**へ置く。
  await db.insert(publishRequests).values([
    {
      id: newUlid(now),
      tenantId,
      workspaceId,
      projectId: publishedProjectId,
      channelId: publishedChannelId,
      status: 'published',
      verdict: 'green',
      findingsJson: JSON.stringify([]),
      releaseId: publishedReleaseId,
      requestedBy: adminId,
      idempotencyKey: null,
      createdAt: now - 86_400_000,
    },
    {
      id: newUlid(now),
      tenantId,
      workspaceId,
      projectId: draftProjectId,
      channelId: draftChannelId,
      status: 'needs_fix',
      verdict: 'red',
      findingsJson: JSON.stringify([
        {
          rule_id: 'secret-scan/aws-access-key-id',
          severity: 'error',
          message: 'AWS アクセスキーらしき文字列が含まれています',
          path: 'skills/minutes/config.json',
        },
      ]),
      releaseId: null,
      requestedBy: memberId,
      idempotencyKey: null,
      createdAt: now - 3_600_000,
    },
  ]);

  // ---- ヒアリング: 一覧 (S11) と詳細 (S12) が空にならないよう status 違いで 3 件。
  const sheetSeeds = [
    { code: 'HS-0001', title: '経費精算の差戻し対応', status: 'completed' as const, applicant: adminId },
    { code: 'HS-0002', title: '議事録の要約と共有', status: 'review' as const, applicant: memberId },
    { code: 'HS-0003', title: '請求書の突合チェック', status: 'received' as const, applicant: memberId },
  ];
  await db.insert(hearingSheets).values(
    sheetSeeds.map((sheet, index) => ({
      id: newUlid(now),
      tenantId,
      workspaceId,
      code: sheet.code,
      title: sheet.title,
      applicantUserId: sheet.applicant,
      department: '業務改善',
      status: sheet.status,
      // form_json は hearingSheetFormSnapshotSchema (salary を含まない保存形) と同じ 11 項目。
      formJson: JSON.stringify({
        taskName: sheet.title,
        company: 'ローカル株式会社',
        applicant: sheet.applicant === adminId ? 'ローカル管理者' : 'ローカル利用者',
        domain: '経理',
        issue: '手作業の確認に時間がかかり、担当者ごとに判断がぶれる',
        tools: 'Excel / 社内ワークフロー',
        hours: 20 + index,
        people: 5 + index,
        features: '入力チェック・差戻し理由の下書き・履歴の記録',
        output: '確認結果の一覧と差戻しコメント',
        priority: 'high',
      }),
      estimateJson: JSON.stringify({
        savedMinutesPerYear: 24_000,
        savedHoursPerYear: 400,
        savedAmountPerYear: 1_200_000,
      }),
      aiJobId: null,
      generatedDocIdsJson: null,
      buildId: null,
      createdAt: now - (index + 1) * 3_600_000,
      updatedAt: now - index * 1_800_000,
    })),
  );
  // 次に採番される HS コードを seed の続きから始める (画面から作った分が既存と衝突しない)。
  await db.insert(displayCodeCounters).values({ tenantId, kind: 'HS', nextValue: sheetSeeds.length + 1 });
  await db
    .insert(tenantCoefficients)
    .values({ tenantId, annualHours: 2_000, minutesPerRun: 15, sheetReductionRate: 0.35, updatedBy: adminId });

  // ---- ブラウザへ貼る session cookie。role ごとに 1 本ずつ出す。
  const issuedAt = Math.floor(now / 1000);
  const cookies: Record<string, string> = {};
  for (const account of accounts) {
    const token = await signLocalSessionJwt(
      {
        sub: account.id,
        tenant_id: tenantId,
        role: account.role,
        status: 'active',
        workspace_ids: [workspaceId],
        iat: issuedAt,
        exp: issuedAt + SESSION_MAX_AGE_SECONDS,
      },
      sessionSecret,
    );
    cookies[account.key] = token;
  }

  adapter.close();

  console.log(
    JSON.stringify(
      {
        ok: true,
        url,
        tenant: { id: tenantId, slug: TENANT_SLUG },
        workspace: { id: workspaceId, slug: 'ws-local' },
        accounts: accounts.map((account) => ({
          key: account.key,
          userId: account.id,
          email: account.email,
          role: account.role,
        })),
        seeded: {
          projects: 2,
          releases: 1,
          catalog_entries: 1,
          publish_requests: 2,
          hearing_sheets: sheetSeeds.length,
        },
        session_cookie_name: SESSION_COOKIE_NAME,
        session_cookies: cookies,
        session_expires_at: new Date((issuedAt + SESSION_MAX_AGE_SECONDS) * 1000).toISOString(),
      },
      null,
      2,
    ),
  );
  return 0;
}

process.exitCode = await main();
