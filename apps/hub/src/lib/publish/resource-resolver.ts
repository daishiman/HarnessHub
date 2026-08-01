/**
 * Publish API の認可資源を、申告 header と DB の所有関係から組み立てる。
 *
 * owner は `projects.owner_user_id` が正本であり、要求者や PublishRequest の作成者から
 * 推測しない。最初に header 由来の tenant を固定してから tenant-scoped repository を読むことで、
 * 他テナントの ID を渡されても所有者情報を返さない。
 */

import { createPublishRequestSchema, publishListQuerySchema } from '@harness-hub/schemas';

import { type AuthzPrincipal, type AuthzResourceRef, requestScopedResource } from '../authz/index.js';
import type { PublishScope } from './ports.js';
import { publishRuntime } from './route-support.js';

function scopeFor(resource: AuthzResourceRef, principal: AuthzPrincipal): PublishScope {
  return {
    tenantId: resource.tenantId,
    workspaceId: resource.workspaceId ?? undefined,
    actorId: principal.userId,
  };
}

async function resourceForProject(
  resource: AuthzResourceRef,
  projectId: string,
  principal: AuthzPrincipal,
): Promise<AuthzResourceRef> {
  const runtime = await publishRuntime();
  const project = await runtime.ports.projects.findById(scopeFor(resource, principal), projectId);
  if (project === null) return resource;
  return {
    ...resource,
    workspaceId: project.workspaceId,
    ownerUserId: project.ownerUserId,
  };
}

function claimedResource(
  request: Request,
  input: { readonly type: string; readonly id?: string },
): AuthzResourceRef | null {
  return requestScopedResource(request, input);
}

/** Project ID が URL にある endpoint 用。 */
export async function resolveProjectResource(
  request: Request,
  projectId: string,
  principal: AuthzPrincipal,
): Promise<AuthzResourceRef | null> {
  const resource = claimedResource(request, { type: 'project', id: projectId });
  return resource === null ? null : resourceForProject(resource, projectId, principal);
}

/** PublishRequest → Project を辿り、Project owner を認可資源へ載せる。 */
export async function resolvePublishRequestResource(
  request: Request,
  requestId: string,
  principal: AuthzPrincipal,
): Promise<AuthzResourceRef | null> {
  const resource = claimedResource(request, { type: 'publish_request', id: requestId });
  if (resource === null) return null;

  const runtime = await publishRuntime();
  const record = await runtime.ports.requests.findById(scopeFor(resource, principal), requestId);
  if (record === null) return resource;

  return resourceForProject({ ...resource, workspaceId: record.workspaceId }, record.projectId, principal);
}

/** TargetChannel → Project を辿る endpoint 用。 */
export async function resolveChannelResource(
  request: Request,
  channelId: string,
  principal: AuthzPrincipal,
): Promise<AuthzResourceRef | null> {
  const resource = claimedResource(request, { type: 'target_channel', id: channelId });
  if (resource === null) return null;

  const runtime = await publishRuntime();
  const channel = await runtime.ports.channels.findById(scopeFor(resource, principal), channelId);
  return channel === null ? resource : resourceForProject(resource, channel.projectId, principal);
}

/** Release → Project を辿る endpoint 用。 */
export async function resolveReleaseResource(
  request: Request,
  releaseId: string,
  principal: AuthzPrincipal,
): Promise<AuthzResourceRef | null> {
  const resource = claimedResource(request, { type: 'release', id: releaseId });
  if (resource === null) return null;

  const runtime = await publishRuntime();
  const release = await runtime.ports.releases.findById(scopeFor(resource, principal), releaseId);
  return release === null ? resource : resourceForProject(resource, release.projectId, principal);
}

/**
 * 作成前は URL に Project ID が無いため、複製した Request から検証済み project_id だけを読む。
 * clone を使うので、後段の冪等性指紋・zod 検証が読む本体は消費しない。
 */
export async function resolvePublishCreateResource(
  request: Request,
  principal: AuthzPrincipal,
): Promise<AuthzResourceRef | null> {
  const resource = claimedResource(request, { type: 'publish_request' });
  if (resource === null) return null;
  // 作成 API は Workspace header 必須。DB の Project 行で欠落を補うと、
  // 明示的な scope 契約をすり抜けてしまうため、後段の workspace_required 判定へ渡す。
  if (resource.workspaceId === null) return resource;

  try {
    const parsed = createPublishRequestSchema.safeParse(await request.clone().json());
    return parsed.success ? resourceForProject(resource, parsed.data.project_id, principal) : resource;
  } catch {
    return resource;
  }
}

/**
 * 一覧は project_id / channel_id で所有対象を確定できる場合だけ owner を合成する。
 * 絞り込み無しのテナント全件一覧は workspace-admin 以上に限定される。
 */
export async function resolvePublishListResource(
  request: Request,
  principal: AuthzPrincipal,
): Promise<AuthzResourceRef | null> {
  const resource = claimedResource(request, { type: 'publish_request' });
  if (resource === null) return null;

  const parsed = publishListQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return resource;
  if (parsed.data.project_id !== undefined) {
    return resourceForProject(resource, parsed.data.project_id, principal);
  }
  if (parsed.data.channel_id === undefined) return resource;

  const runtime = await publishRuntime();
  const channel = await runtime.ports.channels.findById(scopeFor(resource, principal), parsed.data.channel_id);
  return channel === null ? resource : resourceForProject(resource, channel.projectId, principal);
}
