'use client';

import type { PublishProjectList } from '@harness-hub/schemas';
import { IdBadge } from '@harness-hub/ui';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

export interface FeedbackProjectSummary {
  readonly id: string;
  readonly name: string;
}

interface UseProjectDirectoryResult {
  readonly projects: readonly FeedbackProjectSummary[];
  readonly projectById: ReadonlyMap<string, FeedbackProjectSummary>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => Promise<void>;
}

function isProjectSummary(value: unknown): value is FeedbackProjectSummary {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.name === 'string' && candidate.name.trim().length > 0;
}

/**
 * Project 一覧 API の表示に必要な最小投影だけを受け取る。
 *
 * 現行の `PublishProjectList` envelope (`{ items }`) を正とし、`can_publish` は意図的に
 * 読み捨てる。Feedback で必要なのは表示名だけであり、公開可否の認可規則は API 側を正本とする。
 */
export function parseProjectDirectory(value: unknown): readonly FeedbackProjectSummary[] {
  const candidates =
    typeof value === 'object' && value !== null && Array.isArray((value as Partial<PublishProjectList>).items)
      ? (value as Partial<PublishProjectList>).items
      : [];
  return candidates?.filter(isProjectSummary).map(({ id, name }) => ({ id, name })) ?? [];
}

export function useProjectDirectory(tenantId: string, workspaceId: string): UseProjectDirectoryResult {
  const [projects, setProjects] = useState<readonly FeedbackProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/projects', {
        credentials: 'same-origin',
        headers: {
          'x-harness-tenant-id': tenantId,
          'x-harness-workspace-id': workspaceId,
        },
      });
      if (!response.ok) throw new Error('プロジェクト名を取得できませんでした。');
      setProjects(parseProjectDirectory(await response.json()));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'プロジェクト名を取得できませんでした。');
    } finally {
      setLoading(false);
    }
  }, [tenantId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project] as const)), [projects]);

  return { projects, projectById, loading, error, reload: load };
}

interface ProjectReferenceProps {
  readonly projectId: string;
  readonly project?: FeedbackProjectSummary | undefined;
}

/** 人が読む名前を主表示にし、コピー可能な識別子は補助情報として残す。 */
export function ProjectReference({ projectId, project }: ProjectReferenceProps): ReactNode {
  if (project === undefined) return <IdBadge value={projectId} label="プロジェクト ID" />;
  return (
    <span
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--hh-space-1)' }}
    >
      <span>{project.name}</span>
      <IdBadge value={projectId} label="プロジェクト ID" />
    </span>
  );
}
